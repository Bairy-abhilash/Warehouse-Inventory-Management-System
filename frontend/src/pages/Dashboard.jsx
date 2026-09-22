/**
 * Dashboard Page
 * --------------
 * Shows summary statistics and recent purchase orders.
 */

import { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await dashboardAPI.stats();
      setStats(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return null;

  const fmtCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const cards = [
    { label: 'Total Products', value: stats.total_products || 0, icon: '📦', color: 'blue' },
    { label: 'Warehouses', value: stats.total_warehouses || 0, icon: '🏭', color: 'green' },
    { label: 'Suppliers', value: stats.total_suppliers || 0, icon: '🚚', color: 'cyan' },
    { label: 'Categories', value: stats.total_categories || 0, icon: '🏷️', color: 'gray' },
    { label: 'Inventory Value', value: fmtCurrency(stats.inventory_value || stats.total_inventory_value || 0), icon: '💰', color: 'green' },
    { label: 'Low Stock Items', value: stats.low_stock_count || 0, icon: '⚠️', color: (stats.low_stock_count || 0) > 0 ? 'red' : 'gray' },
    { label: 'Pending POs', value: stats.pending_pos || stats.pending_purchase_orders || 0, icon: '🛒', color: 'orange' },
  ];

  const recentPOs = stats.recent_purchase_orders || [];

  return (
    <div>
      <div className="stats-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className={`stat-icon ${c.color}`}>{c.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Purchase Orders</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPOs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>
                    No purchase orders yet
                  </td>
                </tr>
              ) : (
                recentPOs.map((po) => (
                  <tr key={po.id}>
                    <td><strong>{po.po_number || `PO #${po.id}`}</strong></td>
                    <td>{po.supplier_name || po.supplier?.name || '-'}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>{fmtCurrency(po.total_amount)}</td>
                    <td>{po.created_at || po.order_date ? new Date(po.created_at || po.order_date).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
