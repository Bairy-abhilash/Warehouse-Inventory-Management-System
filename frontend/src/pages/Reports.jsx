/**
 * Reports Page
 * ------------
 * Built ONLY from GET /dashboard/reports, which returns exactly:
 *   - low_stock[]               → Low Stock Alerts table
 *   - inventory_by_warehouse[]  → two bar charts (units and value)
 *
 * Anything the backend doesn't provide (value-by-category, PO status
 * summary) is intentionally NOT rendered — no fake charts.
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lowStock, setLowStock] = useState([]);
  const [byWarehouse, setByWarehouse] = useState([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.reports();
      const data = res.data || {};
      setLowStock(data.low_stock || []);
      setByWarehouse(data.inventory_by_warehouse || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Generating reports..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const fmtCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div>
      {/* Low Stock Alerts — real fields: sku, product_name, warehouse, quantity, reorder_level */}
      <div className="card">
        <div className="card-header">
          <h3>Low Stock Alerts</h3>
          <span className="badge badge-danger">{lowStock.length} items</span>
        </div>
        {lowStock.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--success)' }}>
            All products are well-stocked.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Product</th><th>Warehouse</th>
                  <th>Current Qty</th><th>Reorder Level</th><th>Shortfall</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  /* Shortfall is a documented derivation: reorder_level - quantity */
                  <tr key={`${item.product_id}-${item.warehouse}`}>
                    <td><strong>{item.sku}</strong></td>
                    <td>{item.product_name}</td>
                    <td>{item.warehouse}</td>
                    <td><span className="badge badge-danger">{item.quantity}</span></td>
                    <td>{item.reorder_level}</td>
                    <td>{Math.max(0, item.reorder_level - item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warehouse charts — both computed from the same real payload */}
      {byWarehouse.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
            No warehouses found. Create a warehouse to see stock and value reports.
          </div>
        </div>
      ) : (
        <div className="charts-grid">
          <div className="chart-container">
            <h3>Stock Units by Warehouse</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byWarehouse}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="warehouse" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="units" name="Units in stock" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Inventory Value by Warehouse</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byWarehouse}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="warehouse" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmtCurrency(v)} />
                <Legend />
                <Bar dataKey="value" name="Stock value (₹)" fill="#047857" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
