"""
FastAPI application entry point.

Run:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import logger
from app.core.middleware import register_middleware
from app.db.session import engine
from app.routers import (
    audit_logs,
    auth,
    categories,
    dashboard,
    inventory,
    products,
    purchase_orders,
    suppliers,
    warehouses,
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware (order matters: CORS outermost, then request logging) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
register_middleware(app)

# ── Global exception handlers ─────────────────────────────────────
register_exception_handlers(app)

# ── Routers ──────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(warehouses.router, prefix="/api/v1")
app.include_router(suppliers.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(purchase_orders.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(audit_logs.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    logger.info("%s v%s starting", settings.APP_NAME, settings.APP_VERSION)


@app.get("/", tags=["Health"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """
    Liveness + readiness probe. Returns unhealthy (503) if the
    database cannot be reached.
    """
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check: database unreachable")
        db_ok = False

    status = "healthy" if db_ok else "unhealthy"
    code = 200 if db_ok else 503
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=code, content={"status": status, "database": db_ok})
