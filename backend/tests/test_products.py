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


def test_delete_product_with_stock_is_blocked_with_clear_message(client, admin_headers, db_session):
    """
    A product that has inventory rows cannot be deleted. The API must return
    409 with a human-readable message (no raw SQL) and structured details.
    """
    from app.models import Warehouse

    wh = Warehouse(name="Delete Test WH", location="Zone D")
    db_session.add(wh)
    db_session.commit()

    res = client.post(
        "/api/v1/products/",
        json={"name": "Boxed Item", "sku": "SKU-DEL-001", "price": 5.0, "reorder_level": 1},
        headers=admin_headers,
    )
    assert res.status_code == 201
    pid = res.json()["id"]

    res = client.post(
        f"/api/v1/inventory/adjust?product_id={pid}&warehouse_id={wh.id}",
        json={"quantity_change": 3, "reason": "seed"},
        headers=admin_headers,
    )
    assert res.status_code == 200

    res = client.delete(f"/api/v1/products/{pid}", headers=admin_headers)
    assert res.status_code == 409
    err = res.json()["error"]
    assert err["code"] == "conflict"
    assert "Boxed Item" in err["message"]
    assert "stock records in 1 warehouse" in err["message"]
    assert "violates" not in err["message"]  # no leaked SQL
    assert err["details"] == {"inventory_rows": 1, "purchase_order_lines": 0}


def test_product_audit_rows_record_user_and_entity_id(client, admin_headers):
    """CREATE / UPDATE / DELETE on a product must be attributed to the acting user."""
    res = client.post(
        "/api/v1/products/",
        json={"name": "Audited Item", "sku": "SKU-AUD-001", "price": 9.0},
        headers=admin_headers,
    )
    assert res.status_code == 201
    pid = res.json()["id"]

    assert client.patch(f"/api/v1/products/{pid}", json={"price": 12.5}, headers=admin_headers).status_code == 200
    assert client.delete(f"/api/v1/products/{pid}", headers=admin_headers).status_code == 204

    logs = client.get("/api/v1/audit-logs/?entity_type=product&size=50", headers=admin_headers).json()["items"]
    mine = [l for l in logs if l["entity_id"] == pid]
    actions = sorted(l["action"] for l in mine)
    assert actions == ["CREATE", "DELETE", "UPDATE"]
    for l in mine:
        assert l["username"] == "admin_test"
        assert l["user_id"] is not None
    upd = next(l for l in mine if l["action"] == "UPDATE")
    assert "price" in upd["details"]
