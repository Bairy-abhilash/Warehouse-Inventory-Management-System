"""
Dashboard Metrics & Reports Tests.
"""


def test_dashboard_stats_and_reports(client, staff_headers):
    # 1. Fetch Dashboard Stats
    res_stats = client.get("/api/v1/dashboard/stats", headers=staff_headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_products" in stats
    assert "total_warehouses" in stats
    assert "total_inventory_units" in stats
    assert "inventory_value" in stats
    assert "low_stock_count" in stats
    assert "pending_pos" in stats

    # 2. Fetch Dashboard Operational Reports
    res_reports = client.get("/api/v1/dashboard/reports", headers=staff_headers)
    assert res_reports.status_code == 200
    reports = res_reports.json()
    assert "low_stock" in reports
    assert "inventory_by_warehouse" in reports
