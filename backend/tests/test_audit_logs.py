"""
Audit Logging Tests.
"""


def test_audit_logs_recorded_and_retrieved(client, admin_headers):
    # 1. Create a product (Triggers AuditLog entry)
    prod_payload = {
        "name": "Audit Test Headset",
        "sku": "SKU-AUDIT-001",
        "price": 89.99,
    }
    create_res = client.post("/api/v1/products/", json=prod_payload, headers=admin_headers)
    assert create_res.status_code == 201

    # 2. Query Audit Logs endpoint as Admin
    audit_res = client.get("/api/v1/audit-logs/", headers=admin_headers)
    assert audit_res.status_code == 200
    data = audit_res.json()
    assert "items" in data
    logs = data["items"]
    assert len(logs) >= 1
    assert logs[0]["action"] == "CREATE"
    assert logs[0]["entity_type"] == "product"
    assert "SKU-AUDIT-001" in logs[0]["details"]


def test_audit_logs_staff_forbidden(client, staff_headers):
    # Staff cannot view audit logs (Restricted to Admin / Manager)
    res = client.get("/api/v1/audit-logs/", headers=staff_headers)
    assert res.status_code == 403