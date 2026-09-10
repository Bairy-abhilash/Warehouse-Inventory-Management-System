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
