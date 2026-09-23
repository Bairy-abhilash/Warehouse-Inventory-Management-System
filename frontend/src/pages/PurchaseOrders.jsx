/**
 * Purchase Orders Page
 * ---------------------
 * Full PO lifecycle:
 * - List POs with status filter
 * - Create new PO (draft) with multiple line items
 * - View PO details
 * - Transition status (submit, approve, cancel)
 * - Receive items into an explicitly chosen warehouse (adds to inventory)
 *
 * Backend contract note: PurchaseOrderCreate has NO warehouse field.
 * The warehouse is a parameter of POST /purchase-orders/{id}/receive —
 * i.e. the backend's business rule is "warehouse is decided when stock
 * physically arrives". The create form therefore does not ask for one.
 */

import { useState, useEffect } from 'react';
import { poAPI, supplierAPI, warehouseAPI, productAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export default function PurchaseOrders() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin', 'manager');
  const canReceive = hasRole('admin', 'manager', 'staff');

  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [viewPO, setViewPO] = useState(null);
  const [statusChange, setStatusChange] = useState(null); // {po, newStatus}
  const [receiveOpen, setReceiveOpen] = useState(null);
  const [receiveItems, setReceiveItems] = useState({});
  const [receiveWarehouse, setReceiveWarehouse] = useState(''); // chosen explicitly at receive time
  const [saving, setSaving] = useState(false);

  // Create form state (backend PurchaseOrderCreate = supplier_id, items, notes —
  // warehouse is NOT part of a PO; it is chosen when the stock is received)
  const [form, setForm] = useState({ supplier_id: '', notes: '' });
  const [lineItems, setLineItems] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, whRes, prodRes] = await Promise.all([
        poAPI.list({ status_filter: statusFilter || undefined }),
        supplierAPI.list({ active_only: true, limit: 500 }),
        warehouseAPI.list({ active_only: true, limit: 500 }),
        productAPI.list({ limit: 500 }),
      ]);
      setPos(poRes.data?.items || poRes.data || []);
      setSuppliers(supRes.data?.items || supRes.data || []);
      setWarehouses(whRes.data?.items || whRes.data || []);
      setProducts(prodRes.data?.items || prodRes.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [statusFilter]);

  const fmtPrice = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // ── Create PO ──────────────────────────────────────
  const openCreate = () => {
    setForm({ supplier_id: '', notes: '' });
    setLineItems([{ product_id: '', quantity_ordered: 1, unit_price: '' }]);
    setCreateOpen(true);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: '', quantity_ordered: 1, unit_price: '' }]);
  };

  const updateLineItem = (idx, field, value) => {
    const updated = [...lineItems];
    updated[idx][field] = value;
    // Auto-fill price when product selected
    if (field === 'product_id' && value) {
      const prod = products.find((p) => p.id === Number(value));
      if (prod) updated[idx].unit_price = prod.price || prod.unit_price || 0;
    }
    setLineItems(updated);
  };

  const removeLineItem = (idx) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const poTotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity_ordered || item.quantity) || 0),
    0
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) {
      setError('Please select supplier');
      return;
    }
    if (lineItems.length === 0 || lineItems.some((i) => !i.product_id)) {
      setError('Please add at least one valid line item');
      return;
    }
    setSaving(true); setError('');
    try {
      await poAPI.create({
        supplier_id: Number(form.supplier_id),
        notes: form.notes || null,
        items: lineItems.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity_ordered || i.quantity || 1),
          unit_price: Number(i.unit_price || 0),
        })),
      });
      setCreateOpen(false);
      load();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  // ── Status Change ──────────────────────────────────
  const confirmStatusChange = async () => {
    setSaving(true);
    try {
      await poAPI.updateStatus(statusChange.po.id, statusChange.newStatus);
      setStatusChange(null);
      load();
      if (viewPO) {
        const res = await poAPI.get(viewPO.id);
        setViewPO(res.data);
      }
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  // ── Receive Items ──────────────────────────────────
  const openReceive = (po) => {
    const items = {};
    (po.items || []).forEach((item) => {
      const remaining = (item.quantity || 0) - (item.received_quantity || 0);
      items[item.id] = remaining > 0 ? remaining : 0;
    });
    setReceiveItems(items);
    // Visible default — the user sees and can change where the stock lands.
    setReceiveWarehouse(warehouses[0]?.id ? String(warehouses[0].id) : '');
    setReceiveOpen(po);
  };

  const handleReceive = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const items = Object.entries(receiveItems)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([itemId, qty]) => ({ item_id: Number(itemId), quantity: Number(qty) }));

      if (items.length === 0) {
        setError('Enter at least one item to receive');
        setSaving(false);
        return;
      }

      if (!receiveWarehouse) {
        setError('Please select the warehouse receiving the stock');
        setSaving(false);
        return;
      }

      await poAPI.receive(receiveOpen.id, Number(receiveWarehouse), { items });
      setReceiveOpen(null);
      load();
      if (viewPO) {
        const res = await poAPI.get(viewPO.id);
        setViewPO(res.data);
      }
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const viewDetails = async (po) => {
    try {
      const res = await poAPI.get(po.id);
      setViewPO(res.data);
    } catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <div>
      <div className="toolbar">
        <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {canManage && <button className="btn btn-primary" onClick={openCreate}>+ New Purchase Order</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <Loading /> : pos.length === 0 ? (
          <EmptyState title="No purchase orders found" message="Create your first purchase order to start tracking procurement." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>PO Number</th><th>Supplier</th><th>Status</th><th>Total Amount</th><th>Order Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => {
                  const supName = suppliers.find((s) => s.id === po.supplier_id)?.name || po.supplier?.name || `Supplier #${po.supplier_id}`;
                  const poDate = po.order_date || po.created_at;
                  return (
                    <tr key={po.id}>
                      <td><strong>PO #{po.id}</strong></td>
                      <td>{supName}</td>
                      <td><StatusBadge status={po.status} /></td>
                      <td><strong>{fmtPrice(po.total_amount)}</strong></td>
                      <td>{poDate ? new Date(poDate).toLocaleDateString() : '-'}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => viewDetails(po)}>View Details</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create PO Modal ─────────────────────────── */}
      {createOpen && (
        <Modal title="Create Purchase Order" onClose={() => setCreateOpen(false)} size="lg"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : `Create PO (${fmtPrice(poTotal)})`}
            </button>
          </>}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Supplier *</label>
              <select className="form-control" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} required>
                <option value="">Select supplier...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <h4 style={{ margin: '16px 0 8px' }}>Line Items</h4>
            <div className="po-items-list">
              {lineItems.map((item, idx) => (
                <div className="po-item-row" key={idx}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <select className="form-control" value={item.product_id}
                      onChange={(e) => updateLineItem(idx, 'product_id', e.target.value)} required>
                      <option value="">Select product...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input type="number" min="1" className="form-control" placeholder="Qty"
                      value={item.quantity_ordered} onChange={(e) => updateLineItem(idx, 'quantity_ordered', e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input type="number" step="0.01" min="0" className="form-control" placeholder="Price"
                      value={item.unit_price} onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)} required />
                  </div>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLineItem(idx)}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Notes</label>
              <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {/* ── View PO Modal ───────────────────────────── */}
      {viewPO && (
        <Modal title={`Purchase Order # ${viewPO.id}`} onClose={() => setViewPO(null)} size="lg"
          footer={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canManage && viewPO.status === 'draft' && (
                <button className="btn btn-warning" onClick={() => setStatusChange({ po: viewPO, newStatus: 'submitted' })}>Submit for Review</button>
              )}
              {canManage && viewPO.status === 'submitted' && (
                <>
                  <button className="btn btn-success" onClick={() => setStatusChange({ po: viewPO, newStatus: 'approved' })}>Approve Order</button>
                  <button className="btn btn-secondary" onClick={() => setStatusChange({ po: viewPO, newStatus: 'draft' })}>Revert to Draft</button>
                </>
              )}
              {canReceive && viewPO.status === 'approved' && (
                <button className="btn btn-success" onClick={() => openReceive(viewPO)}>Receive Stock</button>
              )}
              {canManage && (viewPO.status === 'draft' || viewPO.status === 'submitted') && (
                <button className="btn btn-danger" onClick={() => setStatusChange({ po: viewPO, newStatus: 'cancelled' })}>Cancel Order</button>
              )}
            </div>
          }>
          <div style={{ marginBottom: 16 }}>
            <p><strong>Supplier:</strong> {suppliers.find((s) => s.id === viewPO.supplier_id)?.name || viewPO.supplier?.name || `Supplier #${viewPO.supplier_id}`}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewPO.status} /></p>
            <p><strong>Total Amount:</strong> <strong>{fmtPrice(viewPO.total_amount)}</strong></p>
            {viewPO.notes && <p><strong>Notes:</strong> {viewPO.notes}</p>}
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Ordered Qty</th><th>Received Qty</th><th>Unit Price</th><th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(viewPO.items || []).map((item) => {
                  const prod = products.find((p) => p.id === item.product_id);
                  const prodName = prod?.name || item.product_name || item.product_sku || `Product #${item.product_id}`;
                  const qtyOrdered = item.quantity || item.quantity_ordered || 0;
                  const qtyReceived = item.received_quantity || item.quantity_received || 0;
                  return (
                    <tr key={item.id}>
                      <td>{prodName}</td>
                      <td>{qtyOrdered}</td>
                      <td>
                        <span className={`badge ${qtyReceived >= qtyOrdered ? 'badge-success' : 'badge-warning'}`}>
                          {qtyReceived} / {qtyOrdered}
                        </span>
                      </td>
                      <td>{fmtPrice(item.unit_price)}</td>
                      <td>{fmtPrice(Number(item.unit_price) * qtyOrdered)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* ── Status Change Confirm ───────────────────── */}
      {statusChange && (
        <ConfirmDialog
          title="Change PO Status"
          message={`Are you sure you want to change status of "PO #${statusChange.po.id}" to ${statusChange.newStatus}?`}
          confirmText="Confirm Status Change"
          danger={statusChange.newStatus === 'cancelled'}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusChange(null)}
        />
      )}

      {/* ── Receive Items Modal ─────────────────────── */}
      {receiveOpen && (
        <Modal title={`Receive Items — PO #${receiveOpen.id}`} onClose={() => setReceiveOpen(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setReceiveOpen(null)}>Cancel</button>
            <button
              className="btn btn-success"
              onClick={handleReceive}
              disabled={saving || !receiveWarehouse || warehouses.length === 0}
            >
              {saving ? 'Receiving...' : 'Confirm Stock Receipt'}
            </button>
          </>}>
          <form onSubmit={handleReceive}>
            {warehouses.length === 0 ? (
              <div className="alert alert-warning">
                No warehouses exist yet. Create a warehouse before receiving stock.
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="receive-warehouse">Receive into warehouse *</label>
                <select
                  id="receive-warehouse"
                  className="form-control"
                  value={receiveWarehouse}
                  onChange={(e) => setReceiveWarehouse(e.target.value)}
                  required
                >
                  <option value="" disabled>Select warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={String(w.id)}>{w.name}</option>
                  ))}
                </select>
                <small style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                  Received quantities will be added to this warehouse's inventory.
                </small>
              </div>
            )}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th><th>Ordered</th><th>Already Received</th><th>Receive Now</th>
                  </tr>
                </thead>
                <tbody>
                  {(receiveOpen.items || []).map((item) => {
                    const prod = products.find((p) => p.id === item.product_id);
                    const prodName = prod?.name || item.product_name || item.product_sku || `Product #${item.product_id}`;
                    const qtyOrdered = item.quantity || item.quantity_ordered || 0;
                    const qtyReceived = item.received_quantity || item.quantity_received || 0;
                    const remaining = qtyOrdered - qtyReceived;
                    return (
                      <tr key={item.id}>
                        <td>{prodName}</td>
                        <td>{qtyOrdered}</td>
                        <td>{qtyReceived}</td>
                        <td>
                          {remaining > 0 ? (
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              className="form-control"
                              style={{ width: 100 }}
                              value={receiveItems[item.id] || 0}
                              onChange={(e) => setReceiveItems({ ...receiveItems, [item.id]: e.target.value })}
                            />
                          ) : (
                            <span className="badge badge-success">Fully received</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
