"""
Inventory Management API — Phase 3 version (in-memory storage).
We will replace this with PostgreSQL-backed code during Phase 4.
"""

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, ConfigDict

from database import get_db
from models import Category

app = FastAPI(title="Inventory Management API")

# ── Temporary in-memory storage (resets on reload) ──────────
products_db = [
    {"id": 1, "name": "Wireless Mouse", "category": "electronics", "price": 499.0, "in_stock": True},
    {"id": 2, "name": "Office Chair", "category": "furniture", "price": 8999.0, "in_stock": True},
    {"id": 3, "name": "USB-C Cable", "category": "electronics", "price": 299.0, "in_stock": False},
]
next_id = 4


# ── Pydantic schemas ────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str
    price: float = Field(..., gt=0)
    in_stock: bool = True


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    category: str | None = None
    price: float | None = Field(None, gt=0)
    in_stock: bool | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str
    price: float
    in_stock: bool


# ── Pydantic schemas for categories ─────────────────────────
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = None


class CategoryResponse(BaseModel):
    # from_attributes lets Pydantic read from a SQLAlchemy model object
    # (not just a dict) — product.category → JSON.
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None


# ── Routes ──────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "Welcome to the Inventory Management API!"}


# ── Categories (DATABASE-BACKED) ───────────────────────────
@app.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """
    GET /categories → read ALL rows from the PostgreSQL categories table.

    Request flow:
      Browser → Uvicorn → FastAPI → get_db() opens a session
      → this endpoint runs SELECT ... → PostgreSQL returns rows
      → SQLAlchemy builds Category objects → Pydantic → JSON response
      → get_db() closes the session
    """
    # select(Category) builds: SELECT * FROM categories ORDER BY name
    # scalars().all() executes it and returns a list of Category objects.
    stmt = select(Category).order_by(Category.name)
    return db.scalars(stmt).all()


@app.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    """
    POST /categories → insert one new row.

    Pydantic has ALREADY validated the body before this function runs:
      - name is required, 2–100 characters
      - description is optional
    """
    # Business rule: category names must be unique.
    existing = db.scalars(
        select(Category).where(Category.name == payload.name)
    ).first()
    if existing:
        # 409 Conflict = valid request, but it conflicts with current data.
        raise HTTPException(status_code=409, detail="Category name already exists")

    # Create the Python object. payload.model_dump() returns a dict
    # like {"name": "...", "description": "..."} which we unpack with **.
    category = Category(**payload.model_dump())

    db.add(category)   # STAGE: SQLAlchemy remembers this new object
    db.commit()        # FLUSH + COMMIT: the INSERT runs and is saved permanently
    db.refresh(category)  # reload from DB so we have id, created_at, etc.

    return category


@app.get("/products", response_model=list[ProductResponse])
def list_products(category: str | None = None, limit: int = 10):
    results = products_db
    if category is not None:
        results = [p for p in results if p["category"] == category]
    return results[:limit]


@app.post("/products", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate):
    global next_id
    for existing in products_db:
        if existing["name"].lower() == product.name.lower():
            raise HTTPException(status_code=409, detail="A product with this name already exists")
    new_product = {"id": next_id, **product.model_dump()}
    products_db.append(new_product)
    next_id += 1
    return new_product


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int):
    for p in products_db:
        if p["id"] == product_id:
            return p
    raise HTTPException(status_code=404, detail=f"Product {product_id} not found")


@app.patch("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, updates: ProductUpdate):
    for p in products_db:
        if p["id"] == product_id:
            data = updates.model_dump(exclude_unset=True)
            for key, value in data.items():
                p[key] = value
            return p
    raise HTTPException(status_code=404, detail=f"Product {product_id} not found")


@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int):
    for i, p in enumerate(products_db):
        if p["id"] == product_id:
            products_db.pop(i)
            return
    raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
