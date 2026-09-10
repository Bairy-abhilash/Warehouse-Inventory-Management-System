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
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "size" in data
    assert isinstance(data["items"], list)


def test_list_products_pagination_and_sorting(client, admin_headers):
    # Create 2 products with different prices
    p1 = {"name": "Cheap Keyboard", "sku": "SKU-CHEAP-01", "price": 15.00}
    p2 = {"name": "Expensive Monitor", "sku": "SKU-EXP-01", "price": 350.00}
    client.post("/api/v1/products/", json=p1, headers=admin_headers)
    client.post("/api/v1/products/", json=p2, headers=admin_headers)

    # Query with sorting by price desc, page=1, size=2
    res = client.get(
        "/api/v1/products/?sort_by=price&order=desc&page=1&size=2",
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["size"] == 2
    assert data["page"] == 1
    assert data["items"][0]["sku"] == "SKU-EXP-01"  # Highest price first!

    # Query with search filter
    search_res = client.get(
        "/api/v1/products/?search=Cheap",
        headers=admin_headers,
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert len(search_data["items"]) == 1
    assert search_data["items"][0]["sku"] == "SKU-CHEAP-01"
