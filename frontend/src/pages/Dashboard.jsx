/**
 * Dashboard Page
 * --------------
 * Asymmetric composition per the approved design brief:
 * a KPI strip, then a wide primary column (Recent Purchase Orders)
 * with an intentionally narrower secondary column (attention + actions).
 *
 * All numbers come from real endpoints:
 *   - KPI cards / attention panel → GET /dashboard/stats
 *   - Recent POs table            → GET /purchase-orders/?sort_by=id&order=desc&size=5
 *   - Supplier names              → GET /suppliers/ (PurchaseOrderResponse only
 *                                   carries supplier_id, so names are looked up)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, poAPI, supplierAPI } from '../api';
import { getErrorMessage } from '../api/client';
import { DashboardSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin', 'manager');

  const [stats, setStats] = useState(null);
  const [recentPOs, setRecentPOs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, posRes, suppliersRes] = await Promise.all([
        dashboardAPI.stats(),
        poAPI.list({ page: 1, size: 5, sort_by: 'id', order: 'desc' }),
        supplierAPI.list(),
      ]);
      setStats(statsRes.data);
      // /purchase-orders/ is paginated: { items, total, page, size, pages }
      setRecentPOs(posRes.data?.items || []);
      // /suppliers/ returns a plain list
      setSuppliers(suppliersRes.data?.items || suppliersRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return null;

  const fmtCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const supplierName = (id) =>
    suppliers.find((s) => s.id === id)?.name || `Supplier #${id}`;

  const lowStock = stats.low_stock_count || 0;
  const pendingPOs = stats.pending_pos || 0;

  const cards = [
    { label: 'Total Products', value: stats.total_products || 0, icon: '📦', color: 'blue' },
    { label: 'Warehouses', value: stats.total_warehouses || 0, icon: '🏭', color: 'green' },
    { label: 'Suppliers', value: stats.total_suppliers || 0, icon: '🚚', color: 'cyan' },
    { label: 'Categories', value: stats.total_categories || 0, icon: '🏷️', color: 'gray' },
    { label: 'Inventory Value', value: fmtCurrency(stats.inventory_value || 0), icon: '💰', color: 'green' },
    { label: 'Low Stock Items', value: lowStock, icon: '⚠️', color: lowStock > 0 ? 'red' : 'gray' },
    { label: 'Pending POs', value: pendingPOs, icon: '🛒', color: 'orange' },
  ];

  return (
    <div>
      {/* KPI strip (7 cards → naturally uneven 4+3 wrap on wide screens) */}
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

      {/* Asymmetric composition: wide primary + narrow secondary column */}
      <div className="dashboard-grid">
        {/* Primary column */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Purchase Orders</h3>
            <Link to="/purchase-orders">View all</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Order Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                      No purchase orders yet
                    </td>
                  </tr>
                ) : (
                  recentPOs.map((po) => (
                    <tr key={po.id}>
                      <td><strong>PO #{po.id}</strong></td>
                      <td>{supplierName(po.supplier_id)}</td>
                      <td><StatusBadge status={po.status} /></td>
                      <td>{po.total_amount != null ? fmtCurrency(po.total_amount) : '-'}</td>
                      <td>{po.order_date ? new Date(po.order_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Narrow secondary column — real stats, real navigation only */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Needs Attention</h3>
            </div>
            <div className="card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {lowStock === 0 && pendingPOs === 0 ? (
                <p style={{ color: 'var(--ink-muted)', fontSize: 14, padding: '8px 0' }}>
                  Nothing needs attention right now.
                </p>
              ) : (
                <>
                  {lowStock > 0 && (
                    <div className="attention-row">
                      <span>
                        <span className="badge badge-danger">{lowStock}</span> low stock item{lowStock !== 1 ? 's' : ''}
                      </span>
                      <Link to="/reports">View report</Link>
                    </div>
                  )}
                  {pendingPOs > 0 && (
                    <div className="attention-row">
                      <span>
                        <span className="badge badge-warning">{pendingPOs}</span> pending purchase order{pendingPOs !== 1 ? 's' : ''}
                      </span>
                      <Link to="/purchase-orders">Review</Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {canManage && (
            <div className="card">
              <div className="card-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/purchase-orders" className="btn btn-primary">New Purchase Order</Link>
                <Link to="/products" className="btn btn-secondary">Add Product</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
