"""
Inventory Management API — connected to PostgreSQL.

- Categories and Products are now stored in the database.
- Every model column matches the REAL tables (verified with inspect_db.py).
- price uses NUMERIC in the database (exact money), represented as float in JSON.
"""

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel, Field, ConfigDict

from database import get_db
from models import Category, Product

app = FastAPI(title="Inventory Management API")


# ═══════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════════════════════

# ── Categories ──────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None


# ── Products ────────────────────────────────────────────────
# These match the REAL products table columns:
#   name, description, sku, price, category_id
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    sku: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., gt=0, description="Price in INR, must be greater than 0")
    category_id: int | None = Field(None, description="Optional; must reference an existing category")


class ProductUpdate(BaseModel):
    # For PATCH: every field optional. We use exclude_unset to know
    # which fields the client actually sent.
    name: str | None = Field(None, min_length=2, max_length=150)
    description: str | None = None
    sku: str | None = Field(None, min_length=2, max_length=100)
    price: float | None = Field(None, gt=0)
    category_id: int | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    sku: str
    price: float
    category_id: int | None = None
    # Nested category object (may be None if product has no category).
    category: CategoryResponse | None = None


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════
@app.get("/")
def home():
    return {"message": "Welcome to the Inventory Management API!"}


# ── Categories ──────────────────────────────────────────────
@app.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    stmt = select(Category).order_by(Category.name)
    return db.scalars(stmt).all()


@app.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.scalars(
        select(Category).where(Category.name == payload.name)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category name already exists")

    category = Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


# ── Products ────────────────────────────────────────────────
@app.get("/products", response_model=list[ProductResponse])
def list_products(
    category_id: int | None = None,
    search: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    GET /products?category_id=1&search=mouse&limit=50

    selectinload(Product.category) eagerly loads each product's category
    in one extra query, instead of running a separate SELECT per product
    (the "N+1 query" problem). It also guarantees the nested `category`
    is available for the response even after the session closes.
    """
    query = select(Product).options(selectinload(Product.category))

    if category_id is not None:
        query = query.where(Product.category_id == category_id)

    if search is not None:
        # ilike = case-insensitive match; % is a wildcard for "anything"
        like = f"%{search}%"
        query = query.where((Product.name.ilike(like)) | (Product.sku.ilike(like)))

    query = query.order_by(Product.name).limit(limit)
    return db.scalars(query).all()


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    # db.get(Model, pk) is the cleanest way to fetch by primary key.
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    # Access the relationship while the session is open so it gets loaded.
    _ = product.category
    return product


@app.post("/products", response_model=ProductResponse, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    # 1. If a category was given, make sure it exists.
    if payload.category_id is not None:
        category = db.get(Category, payload.category_id)
        if not category:
            raise HTTPException(
                status_code=404,
                detail=f"Category {payload.category_id} not found",
            )

    # 2. SKU must be unique (application-level check; the DB may not enforce it).
    existing = db.scalars(select(Product).where(Product.sku == payload.sku)).first()
    if existing:
        raise HTTPException(status_code=409, detail="A product with this SKU already exists")

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    _ = product.category  # ensure relationship loaded for the response
    return product


@app.patch("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, updates: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    data = updates.model_dump(exclude_unset=True)

    # If changing category, validate the new one exists.
    if "category_id" in data and data["category_id"] is not None:
        if not db.get(Category, data["category_id"]):
            raise HTTPException(
                status_code=404,
                detail=f"Category {data['category_id']} not found",
            )

    # If changing SKU, make sure the new value isn't already taken.
    if "sku" in data:
        clash = db.scalars(
            select(Product).where(Product.sku == data["sku"], Product.id != product_id)
        ).first()
        if clash:
            raise HTTPException(status_code=409, detail="A product with this SKU already exists")

    for key, value in data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    _ = product.category
    return product


@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    try:
        db.delete(product)
        db.commit()
    except IntegrityError:
        # The product is referenced by inventory or purchase_order_items.
        # PostgreSQL blocks the deletion to protect referential integrity.
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this product because it is used in inventory "
                   "or purchase orders. Remove those references first.",
        )
    return None
