"""
Product Catalog & Role-Based Authorization Tests.
"""


def test_create_product_admin_success(client, admin_headers):
    payload = {
        "name": "Test Wireless Mouse",
        "sku": "SKU-WM-001",
        "price": 29.99,
        "description": "Ergonomic mouse",
        "reorder_level": 10,
        "unit_of_measure": "pcs",
    }
    response = client.post("/api/v1/products/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Wireless Mouse"
    assert data["sku"] == "SKU-WM-001"


def test_create_product_staff_forbidden(client, staff_headers):
    payload = {
        "name": "Test Keyboard",
        "sku": "SKU-KB-001",
        "price": 49.99,
    }
    response = client.post("/api/v1/products/", json=payload, headers=staff_headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_create_product_negative_price_validation(client, admin_headers):
    payload = {
        "name": "Invalid Price Item",
        "sku": "SKU-BAD-001",
        "price": -10.00,  # Negative price should trigger Pydantic validation
    }
    response = client.post("/api/v1/products/", json=payload, headers=admin_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_create_product_duplicate_sku(client, admin_headers):
    payload = {
        "name": "Product 1",
        "sku": "SKU-DUP-111",
        "price": 10.00,
    }
    client.post("/api/v1/products/", json=payload, headers=admin_headers)

    # Duplicate SKU attempt
    response = client.post("/api/v1/products/", json=payload, headers=admin_headers)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


def test_list_products(client, staff_headers):
    response = client.get("/api/v1/products/", headers=staff_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
