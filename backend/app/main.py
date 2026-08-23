"""
FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload

The import path changed from `main:app` to `app.main:app` because the
code now lives inside the `app/` package.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    categories,
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

# CORS: allows the React frontend (on a different port) to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers under /api/v1
app.include_router(categories.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(warehouses.router, prefix="/api/v1")
app.include_router(suppliers.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(purchase_orders.router, prefix="/api/v1")


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Inventory Management API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
