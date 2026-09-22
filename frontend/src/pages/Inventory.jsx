/**
 * Inventory Page
 * --------------
 * Shows stock levels across warehouses.
 * Allows manual stock adjustments (add/remove).
 */

import { useState, useEffect } from 'react';
import { inventoryAPI, warehouseAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { hasRole } = useAuth();
  const canAdjust = hasRole('admin', 'manager');

  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, whRes] = await Promise.all([
        inventoryAPI.list({ low_stock_only: lowOnly || undefined }),
        warehouseAPI.list({ active_only: true, limit: 500 }),
      ]);
      setItems(invRes.data?.items || invRes.data || []);
      setWarehouses(whRes.data?.items || whRes.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [lowOnly]);

  const filtered = warehouseFilter
    ? items.filter((i) => i.warehouse_id === Number(warehouseFilter))
    : items;

  const openAdjust = (item) => {
    setAdjustModal(item);
    setAdjQty(0);
    setAdjReason('');
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjQty) return;
    setSaving(true); setError('');
    try {
      await inventoryAPI.adjust(adjustModal.product_id, adjustModal.warehouse_id, {
        quantity_change: Number(adjQty),
        reason: adjReason,
      });
      setAdjustModal(null);
      load();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="toolbar">
        <select className="form-control" style={{ width: 200 }} value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          <option value="">All Warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
        <button className="btn btn-secondary" onClick={load}>🔄 Refresh</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <Loading /> : filtered.length === 0 ? (
          <EmptyState icon="📋" title="No inventory records found" message="Stock will appear here once products are in warehouses." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Product</th><th>Warehouse</th>
                  <th>Quantity</th><th>Reorder Level</th><th>Status</th>
                  {canAdjust && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td><strong>{i.product_sku}</strong></td>
                    <td>{i.product_name}</td>
                    <td>{i.warehouse_name} ({i.warehouse_code})</td>
                    <td><strong>{i.quantity}</strong></td>
                    <td>{i.reorder_level}</td>
                    <td>
                      <span className={`badge ${i.is_low_stock ? 'badge-danger' : 'badge-success'}`}>
                        {i.is_low_stock ? 'LOW STOCK' : 'OK'}
                      </span>
                    </td>
                    {canAdjust && (
                      <td>
                        <button className="btn btn-warning btn-sm" onClick={() => openAdjust(i)}>Adjust Stock</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjustModal && (
        <Modal title="Adjust Stock" onClose={() => setAdjustModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdjust} disabled={saving || !adjQty}>
              {saving ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </>}>
          <p>
            <strong>{adjustModal.product_name}</strong> in{' '}
            <strong>{adjustModal.warehouse_name}</strong>
          </p>
          <p style={{ marginBottom: 16, color: '#6b7280' }}>
            Current quantity: <strong>{adjustModal.quantity}</strong>
          </p>
          <form onSubmit={handleAdjust}>
            <div className="form-group">
              <label>Quantity Change (positive to add, negative to remove) *</label>
              <input
                type="number"
                className="form-control"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Reason</label>
              <input
                className="form-control"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="e.g., Stock count correction, damaged goods..."
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
