/**
 * Reports Page
 * ------------
 * Built ONLY from GET /dashboard/reports, which returns exactly:
 *   - low_stock[]               → Low Stock Alerts table
 *   - inventory_by_warehouse[]  → two horizontal bar charts + exact-value table
 *
 * Anything the backend doesn't provide (value-by-category, PO status
 * summary) is intentionally NOT rendered — no fake charts.
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
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

  // Exact rupee amount (tooltips and the table)
  const fmtCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  // Compact axis labels: 12,50,000 → ₹12.5L, 3,00,00,000 → ₹3Cr
  const fmtCompactINR = (val) =>
    '₹' + new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
  const fmtUnits = (val) => new Intl.NumberFormat('en-IN').format(val);

  // Chart height grows with the number of warehouses so bars never get squashed
  const chartHeight = Math.max(160, 48 * byWarehouse.length + 40);
  const chartData = byWarehouse.map((w) => ({ ...w, value: Number(w.value) }));
  const totalUnits = chartData.reduce((sum, w) => sum + w.units, 0);
  const totalValue = chartData.reduce((sum, w) => sum + w.value, 0);

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
        <>
          <div className="charts-grid">
            <div className="chart-container">
              <h3>Stock Units by Warehouse</h3>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tickFormatter={fmtUnits} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="warehouse" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [fmtUnits(v), 'Units in stock']} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="units" fill="#1d4ed8" radius={[0, 4, 4, 0]} barSize={22}>
                    <LabelList dataKey="units" position="right" formatter={fmtUnits} style={{ fontSize: 12, fill: '#0f172a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Inventory Value by Warehouse</h3>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={fmtCompactINR} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="warehouse" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [fmtCurrency(v), 'Stock value']} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" fill="#047857" radius={[0, 4, 4, 0]} barSize={22}>
                    <LabelList dataKey="value" position="right" formatter={fmtCompactINR} style={{ fontSize: 12, fill: '#0f172a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Exact figures — same payload as the charts, no rounding */}
          <div className="card">
            <div className="card-header">
              <h3>Warehouse Summary</h3>
              <span className="badge badge-primary">{chartData.length} warehouses</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th style={{ textAlign: 'right' }}>Units in Stock</th>
                    <th style={{ textAlign: 'right' }}>Stock Value</th>
                    <th style={{ textAlign: 'right' }}>Share of Value</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((w) => (
                    <tr key={w.warehouse_id}>
                      <td><strong>{w.warehouse}</strong></td>
                      <td style={{ textAlign: 'right' }}>{fmtUnits(w.units)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtCurrency(w.value)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {totalValue > 0 ? `${((w.value / totalValue) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtUnits(totalUnits)}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtCurrency(totalValue)}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{totalValue > 0 ? '100%' : '—'}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
