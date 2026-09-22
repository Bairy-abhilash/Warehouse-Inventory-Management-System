/**
 * Products Page — CRUD for products with category/supplier dropdowns.
 */

import { useState, useEffect } from 'react';
import { productAPI, categoryAPI, supplierAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  sku: '', name: '', description: '', category_id: '', supplier_id: '',
  unit_price: '0.00', reorder_level: 10, unit_of_measure: 'pcs', is_active: 1,
};

export default function Products() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'manager');
  const canDelete = hasRole('admin');

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { search: search || undefined, category_id: catFilter || undefined };
      const [prodRes, catRes, supRes] = await Promise.all([
        productAPI.list(params),
        categoryAPI.list({ limit: 500 }),
        supplierAPI.list({ limit: 500 }),
      ]);
      setItems(prodRes.data?.items || prodRes.data || []);
      setCategories(catRes.data?.items || catRes.data || []);
      setSuppliers(supRes.data?.items || supRes.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search, catFilter, lowOnly]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...EMPTY_FORM, category_id: categories[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setFormData({
      sku: p.sku || '',
      name: p.name || '',
      description: p.description || '',
      category_id: p.category_id || p.category?.id || '',
      supplier_id: p.supplier_id || p.supplier?.id || '',
      price: p.price || p.unit_price || '0.00',
      reorder_level: p.reorder_level || 10,
      unit_of_measure: p.unit_of_measure || 'pcs',
      is_active: p.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || null,
        price: Number(formData.price || formData.unit_price || 0),
        category_id: formData.category_id ? Number(formData.category_id) : null,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
        reorder_level: Number(formData.reorder_level || 10),
        unit_of_measure: formData.unit_of_measure || 'pcs',
        is_active: Boolean(formData.is_active),
      };
      if (editing) await productAPI.update(editing.id, payload);
      else await productAPI.create(payload);
      setModalOpen(false); load();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await productAPI.delete(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (err) { setError(getErrorMessage(err)); setDeleteTarget(null); }
  };

  const fmtPrice = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Search by name, SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 180 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState icon="📦" title="No products found" />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Name</th><th>Category</th><th>Supplier</th>
                  <th>Price</th><th>Stock</th><th>Reorder At</th><th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const currentPrice = p.price || p.unit_price || 0;
                  const isLow = (p.total_stock || 0) <= p.reorder_level;
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.sku}</strong></td>
                      <td>{p.name}</td>
                      <td>{p.category?.name || '-'}</td>
                      <td>{p.supplier?.name || '-'}</td>
                      <td>{fmtPrice(currentPrice)}</td>
                      <td>
                        <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                          {p.total_stock ?? 0} {p.unit_of_measure}
                        </span>
                      </td>
                      <td>{p.reorder_level}</td>
                      <td>
                        <span className={`badge ${p.is_active ? 'badge-success' : 'badge-gray'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canEdit && (
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                          {canDelete && <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => setDeleteTarget(p)}>Delete</button>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setModalOpen(false)} size="lg"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>}>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label>SKU *</label>
                <input className="form-control" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select className="form-control" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} required>
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Supplier</label>
                <select className="form-control" value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}>
                  <option value="">None</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Unit Price (₹)</label>
                <input type="number" step="0.01" min="0" className="form-control" value={formData.price || formData.unit_price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value, unit_price: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Reorder Level</label>
                <input type="number" min="0" className="form-control" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input className="form-control" value={formData.unit_of_measure} onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Product" message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmText="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
