/**
 * Inventory Page
 * --------------
 * Stock levels across warehouses, with manual adjustments.
 *
 * Backend contract (app/routers/inventory.py):
 *   GET /inventory/  → filters warehouse_id, product_id, low_stock_only,
 *                      page, size (paginated)
 *   POST /inventory/adjust?product_id=&warehouse_id=  → { quantity_change, reason }
 *
 * InventoryListResponse fields: product_sku, product_name, warehouse_name,
 * quantity, reorder_level, is_low_stock. There is no warehouse_code field,
 * so none is displayed.
 */

import { useState, useEffect } from 'react';
import { inventoryAPI, warehouseAPI } from '../api';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import Tabs from '../components/Tabs';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 20;
const REASON_MAX = 255;

export default function Inventory() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canAdjust = hasRole('admin', 'manager');

  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [adjustModal, setAdjustModal] = useState(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, whRes] = await Promise.all([
        inventoryAPI.list({
          warehouse_id: warehouseFilter || undefined,
          low_stock_only: lowOnly || undefined,
          page,
          size: PAGE_SIZE,
        }),
        warehouseAPI.list(),
      ]);
      const data = invRes.data || {};
      setItems(data.items || (Array.isArray(data) ? data : []));
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setWarehouses(whRes.data?.items || whRes.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [warehouseFilter, lowOnly, page]);

  const openAdjust = (item) => {
    setAdjustModal(item);
    setAdjQty('');
    setAdjReason('');
    setModalError('');
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjQty || Number(adjQty) === 0) {
      setModalError('Enter a non-zero quantity to add or remove.');
      return;
    }
    setSaving(true); setError(''); setModalError('');
    try {
      await inventoryAPI.adjust(adjustModal.product_id, adjustModal.warehouse_id, {
        quantity_change: Number(adjQty),
        reason: adjReason.trim() || null,
      });
      const delta = Number(adjQty);
      toast.success(`Stock ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)} for ${adjustModal.product_sku || adjustModal.product_name}`);
      setAdjustModal(null);
      load();
    } catch (err) {
      // stays visible inside the modal instead of behind it
      setModalError(getErrorMessage(err));
    }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="toolbar">
        <select
          className="form-control"
          style={{ width: 200 }}
          value={warehouseFilter}
          onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }}
          aria-label="Filter by warehouse"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <Tabs
          ariaLabel="Stock level filter"
          value={lowOnly}
          onChange={(v) => { setLowOnly(v); setPage(1); }}
          items={[{ value: false, label: 'All stock' }, { value: true, label: 'Low stock' }]}
        />
        <button className="btn btn-secondary" onClick={load}>Refresh</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <TableSkeleton columns={7} /> : items.length === 0 ? (
          <EmptyState
            title="No inventory records found"
            message="Stock will appear here once products are received into warehouses."
          />
        ) : (
          <>
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
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td><strong>{i.product_sku}</strong></td>
                      <td>{i.product_name}</td>
                      <td>{i.warehouse_name}</td>
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
            <Pagination page={page} pages={pages} total={total} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>

      {adjustModal && (
        <Modal title="Adjust Stock" onClose={() => setAdjustModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdjust} disabled={saving}>
              {saving ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </>}>
          <p>
            <strong>{adjustModal.product_name}</strong> in{' '}
            <strong>{adjustModal.warehouse_name}</strong>
          </p>
          <p style={{ marginBottom: 16, color: 'var(--ink-muted)' }}>
            Current quantity: <strong>{adjustModal.quantity}</strong>
          </p>
          <form onSubmit={handleAdjust} noValidate>
            {modalError && <div className="alert alert-danger">{modalError}</div>}
            <div className="form-group">
              <label>Quantity Change (positive to add, negative to remove)<span className="req">*</span></label>
              <input
                type="number"
                className="form-control"
                value={adjQty}
                onChange={(e) => { setAdjQty(e.target.value); setModalError(''); }}
                placeholder="e.g. 10 or -5"
              />
              <small className="field-hint">Enter a positive number to add stock, negative to remove.</small>
            </div>
            <div className="form-group">
              <label>Reason</label>
              <input
                className="form-control"
                value={adjReason}
                maxLength={REASON_MAX}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="e.g. Stock count correction, damaged goods..."
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
