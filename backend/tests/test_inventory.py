"""
Inventory Adjustments & Stock Level Tests.
"""

from app.models import Product, Warehouse


def test_inventory_adjust_and_list(client, admin_headers, db_session):
    # Setup test warehouse and product
    warehouse = Warehouse(name="Inventory Test WH", location="Zone B")
    db_session.add(warehouse)
    db_session.commit()

    product = Product(
        name="Inventory Widget",
        sku="SKU-INV-001",
        price=50.00,
        reorder_level=5,
    )
    db_session.add(product)
    db_session.commit()

    # 1. Adjust Stock (+15)
    adjust_payload = {
        "quantity_change": 15,
        "reason": "Initial stock addition",
    }
    res = client.post(
        f"/api/v1/inventory/adjust?product_id={product.id}&warehouse_id={warehouse.id}",
        json=adjust_payload,
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["quantity"] == 15

    # 2. List Inventory and verify stock item
    res_list = client.get(
        f"/api/v1/inventory/?warehouse_id={warehouse.id}",
        headers=admin_headers,
    )
    assert res_list.status_code == 200
    data = res_list.json()
    assert "items" in data
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 15
    assert data["items"][0]["product_sku"] == "SKU-INV-001"


def test_low_stock_is_strictly_below_reorder_level(client, admin_headers, db_session):
    """
    Business rule: an item is 'low stock' only when quantity < reorder_level.
    Quantity exactly AT the reorder level (shortfall 0) must NOT be flagged.
    """
    warehouse = Warehouse(name="Low Stock WH", location="Zone C")
    db_session.add(warehouse)
    db_session.commit()

    at_level = Product(name="At Level", sku="SKU-LOW-AT", price=10.00, reorder_level=10)
    below = Product(name="Below Level", sku="SKU-LOW-BELOW", price=10.00, reorder_level=10)
    db_session.add_all([at_level, below])
    db_session.commit()

    # Stock one product exactly at its reorder level, the other below it.
    for product, qty in ((at_level, 10), (below, 9)):
        res = client.post(
            f"/api/v1/inventory/adjust?product_id={product.id}&warehouse_id={warehouse.id}",
            json={"quantity_change": qty, "reason": "seed"},
            headers=admin_headers,
        )
        assert res.status_code == 200

    # Inventory list with low_stock_only must return ONLY the below-level product
    res = client.get(
        f"/api/v1/inventory/?warehouse_id={warehouse.id}&low_stock_only=true",
        headers=admin_headers,
    )
    assert res.status_code == 200
    skus = [i["product_sku"] for i in res.json()["items"]]
    assert skus == ["SKU-LOW-BELOW"]

    # Full list: is_low_stock flag must agree with the same rule
    res = client.get(f"/api/v1/inventory/?warehouse_id={warehouse.id}", headers=admin_headers)
    flags = {i["product_sku"]: i["is_low_stock"] for i in res.json()["items"]}
    assert flags["SKU-LOW-AT"] is False
    assert flags["SKU-LOW-BELOW"] is True

    # Reports low_stock must exclude the at-level product
    res = client.get("/api/v1/dashboard/reports", headers=admin_headers)
    assert res.status_code == 200
    report_skus = [i["sku"] for i in res.json()["low_stock"]]
    assert "SKU-LOW-BELOW" in report_skus
    assert "SKU-LOW-AT" not in report_skus
