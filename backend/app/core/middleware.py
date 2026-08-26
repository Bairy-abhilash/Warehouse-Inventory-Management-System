"""
HTTP middleware: request logging and timing.

Middleware runs for EVERY request before (and after) the route handler,
making it the right place for cross-cutting concerns like logging.
"""

import time

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()

        # Process the request (this calls down into the router/endpoint)
        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s -> %s (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        response.headers["X-Process-Time-ms"] = f"{elapsed_ms:.1f}"
        return response


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(RequestLoggingMiddleware)
