"""
Application-wide error types and exception handlers.

Why custom exceptions?
  - Services can raise AppException without importing FastAPI, keeping
    business logic independent of the web framework.
  - A single global handler formats every error consistently as JSON:
        {"error": {"code": "...", "message": "...", "details": ...}}
"""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.logging import logger


class AppException(Exception):
    """
    Base class for business-rule errors raised by services.

    Usage:
        raise AppException("Product not found", status_code=404, code="not_found")
    """

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "bad_request",
        details: Any = None,
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
        super().__init__(message)


def _error_response(
    status_code: int, code: str, message: str, details: Any = None
) -> JSONResponse:
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all exception handlers to the FastAPI app."""

    @app.exception_handler(AppException)
    async def handle_app_exception(_: Request, exc: AppException) -> JSONResponse:
        # Expected business errors — log at INFO (not ERROR) because they
        # are part of normal operation (e.g. duplicate SKU, not found).
        logger.info("AppException: %s (%s)", exc.message, exc.code)
        return _error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Pydantic validation errors — reshape into a concise list.
        errors = [
            {
                "field": ".".join(str(p) for p in e.get("loc", []) if p != "body"),
                "message": e.get("msg"),
                "type": e.get("type"),
            }
            for e in exc.errors()
        ]
        logger.info("Validation error: %s", errors)
        return _error_response(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "validation_error",
            "Request validation failed",
            errors,
        )

    @app.exception_handler(IntegrityError)
    async def handle_integrity_error(
        request: Request, exc: IntegrityError
    ) -> JSONResponse:
        # Database constraint violations that slipped past service checks.
        logger.warning(
            "DB integrity error on %s %s: %s",
            request.method,
            request.url.path,
            str(exc.orig),
        )
        return _error_response(
            status.HTTP_409_CONFLICT,
            "conflict",
            "Data conflicts with an existing record",
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_sqlalchemy_error(
        request: Request, exc: SQLAlchemyError
    ) -> JSONResponse:
        # Any other unexpected database error.
        logger.exception("Database error on %s %s", request.method, request.url.path)
        return _error_response(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "database_error",
            "A database error occurred",
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        # Catch-all for anything we didn't anticipate. We log the full
        # traceback (logger.exception) but never leak internal details
        # to the client in production responses.
        logger.exception("Unhandled exception: %s", exc)
        return _error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "internal_error",
            "An unexpected error occurred",
        )
