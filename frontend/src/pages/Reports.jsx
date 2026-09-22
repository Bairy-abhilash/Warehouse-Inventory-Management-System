/**
 * Reports Page
 * ------------
 * Visual charts using Recharts:
 * - Inventory value by category (pie chart)
 * - Stock by warehouse (bar chart)
 * - Purchase orders by status (bar chart)
 * - Low stock items table
 */

import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lowStock, setLowStock] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byWarehouse, setByWarehouse] = useState([]);
  const [poSummary, setPoSummary] = useState([]);

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
      setByCategory([]);
      setPoSummary([]);
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
      {/* Low Stock Alert */}
      <div className="card">
        <div className="card-header">
          <h3>Low Stock Alerts</h3>
          <span className="badge badge-danger">{lowStock.length} items</span>
        </div>
        {lowStock.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: '#10b981' }}>
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
                {lowStock.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.product_sku}</strong></td>
                    <td>{item.product_name}</td>
                    <td>{item.warehouse_name} ({item.warehouse_code})</td>
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

      {/* Charts */}
      <div className="charts-grid">
        {/* Pie: Inventory Value by Category */}
        <div className="chart-container">
          <h3>Inventory Value by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={byCategory.filter((c) => c.total_value > 0)}
                dataKey="total_value"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
              >
                {byCategory.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Stock by Warehouse */}
        <div className="chart-container">
          <h3>Stock Units by Warehouse</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byWarehouse}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="warehouse_code" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_units" name="Units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Purchase Orders by Status */}
        <div className="chart-container">
          <h3>Purchase Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={poSummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Number of POs" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Warehouse Value */}
        <div className="chart-container">
          <h3>Inventory Value by Warehouse</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byWarehouse}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="warehouse_code" />
              <YAxis />
              <Tooltip formatter={(v) => fmtCurrency(v)} />
              <Legend />
              <Bar dataKey="total_value" name="Value (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
