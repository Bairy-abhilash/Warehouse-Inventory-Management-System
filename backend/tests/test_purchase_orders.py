"""
Purchase Order Lifecycle Workflow & Inventory Receiving Tests.
"""

from app.models import Product, Supplier, Warehouse


def _setup_po_dependencies(db_session):
    """Helper to create supplier, warehouse, and product in test DB."""
    supplier = Supplier(name="Test Supplier Inc", email="sup@test.com")
    warehouse = Warehouse(name="Test Warehouse", location="Dock 1")
    db_session.add_all([supplier, warehouse])
    db_session.commit()

    product = Product(
        name="PO Test Widget",
        sku="SKU-PO-001",
        price=100.00,
        supplier_id=supplier.id,
        reorder_level=10,
    )
    db_session.add(product)
    db_session.commit()
    return supplier.id, warehouse.id, product.id


def test_po_full_lifecycle_and_receiving(client, admin_headers, db_session):
    supplier_id, warehouse_id, product_id = _setup_po_dependencies(db_session)

    # 1. Create Purchase Order (Draft)
    po_payload = {
        "supplier_id": supplier_id,
        "items": [
            {"product_id": product_id, "quantity": 20, "unit_price": 80.00}
        ],
        "notes": "Testing PO receiving",
    }
    res = client.post("/api/v1/purchase-orders/", json=po_payload, headers=admin_headers)
    assert res.status_code == 201
    po_data = res.json()
    po_id = po_data["id"]
    po_item_id = po_data["items"][0]["id"]
    assert po_data["status"] == "draft"
    assert po_data["total_amount"] == "1600.00"

    # 2. Invalid status transition: draft -> approved (Must fail with 409 Conflict)
    res_invalid = client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert res_invalid.status_code == 409

    # 3. Valid transition: draft -> submitted
    res_sub = client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        json={"status": "submitted"},
        headers=admin_headers,
    )
    assert res_sub.status_code == 200
    assert res_sub.json()["status"] == "submitted"

    # 4. Valid transition: submitted -> approved
    res_app = client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "approved"

    # 5. Over-receive attempt (25 items when only 20 were ordered -> expect 400 Bad Request)
    over_receive_payload = {
        "items": [{"item_id": po_item_id, "quantity": 25}]
    }
    res_over = client.post(
        f"/api/v1/purchase-orders/{po_id}/receive?warehouse_id={warehouse_id}",
        json=over_receive_payload,
        headers=admin_headers,
    )
    assert res_over.status_code == 400

    # 6. Valid receiving: receive 20 items
    receive_payload = {
        "items": [{"item_id": po_item_id, "quantity": 20}]
    }
    res_recv = client.post(
        f"/api/v1/purchase-orders/{po_id}/receive?warehouse_id={warehouse_id}",
        json=receive_payload,
        headers=admin_headers,
    )
    assert res_recv.status_code == 200
    assert res_recv.json()["status"] == "received"
    assert res_recv.json()["items"][0]["received_quantity"] == 20

    # 7. Check inventory stock updated
    inv_res = client.get(f"/api/v1/inventory/?warehouse_id={warehouse_id}", headers=admin_headers)
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert "items" in inv_data
    assert len(inv_data["items"]) == 1
    assert inv_data["items"][0]["quantity"] == 20


def test_list_purchase_orders_pagination(client, admin_headers, db_session):
    supplier_id, warehouse_id, product_id = _setup_po_dependencies(db_session)

    # Create 2 POs
    po1 = {"supplier_id": supplier_id, "items": [{"product_id": product_id, "quantity": 5, "unit_price": 10.00}]}
    po2 = {"supplier_id": supplier_id, "items": [{"product_id": product_id, "quantity": 10, "unit_price": 20.00}]}
    client.post("/api/v1/purchase-orders/", json=po1, headers=admin_headers)
    client.post("/api/v1/purchase-orders/", json=po2, headers=admin_headers)

    # List POs with page=1&size=1
    res = client.get("/api/v1/purchase-orders/?page=1&size=1&sort_by=id&order=desc", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["page"] == 1
    assert data["size"] == 1
    assert data["total"] == 2
    assert len(data["items"]) == 1
