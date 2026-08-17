from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

# ─────────────────────────────────────────────────────
# Temporary in-memory storage.
# This is NOT a real database — data resets whenever the
# server restarts (including when --reload reloads).
# In Phase 4 we replace this with PostgreSQL.
# ─────────────────────────────────────────────────────
products_db = [
    {"id": 1, "name": "Wireless Mouse", "category": "electronics", "price": 499, "in_stock": True},
    {"id": 2, "name": "Office Chair", "category": "furniture", "price": 8999, "in_stock": True},
    {"id": 3, "name": "Mechanical Keyboard", "category": "electronics", "price": 2499, "in_stock": False},
    {"id": 4, "name": "Standing Desk", "category": "furniture", "price": 24999, "in_stock": True},
    {"id": 5, "name": "A4 Paper Ream", "category": "supplies", "price": 250, "in_stock": True},
]
next_id = 6  # auto-incrementing ID for new products


# ─────────────────────────────────────────────────────
# Pydantic model: defines what a valid "create product"
# request looks like.
# ─────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str
    price: float = Field(..., gt=0, description="Price in INR, must be greater than 0")
    in_stock: bool = True


class ProductResponse(BaseModel):
    # Defines exactly what a product looks like when SENT BACK to the client.
    # Notice there is no "Field(..., min_length=...)" — those are input rules.
    # For responses we just declare the types of each field.
    id: int
    name: str
    category: str
    price: float
    in_stock: bool


@app.get("/")
def home():
    return {"message": "Welcome to the Inventory Management API!"}


@app.get("/products")
def list_products(category: str | None = None, limit: int = 10):
    if category is not None:
        results = [p for p in products_db if p["category"] == category]
    else:
        results = products_db

    results = results[:limit]

    return {
        "count": len(results),
        "category_filter": category,
        "limit": limit,
        "products": results,
    }


@app.post("/products", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate):
    """Create a new product from the JSON body."""
    global next_id

    # Reject duplicates: is there already a product with this name?
    for existing in products_db:
        if existing["name"].lower() == product.name.lower():
            raise HTTPException(
                status_code=409,
                detail=f"A product with name '{product.name}' already exists",
            )

    new_product = {
        "id": next_id,
        "name": product.name,
        "category": product.category,
        "price": product.price,
        "in_stock": product.in_stock,
    }
    products_db.append(new_product)
    next_id += 1

    return new_product


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int):
    for product in products_db:
        if product["id"] == product_id:
            return product
    # We didn't find a product with that id — return a proper 404
    raise HTTPException(status_code=404, detail=f"Product with id {product_id} not found")
