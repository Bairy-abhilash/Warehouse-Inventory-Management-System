/**
 * Products Page — CRUD for products with category/supplier dropdowns.
 *
 * Field rules mirror the backend exactly (app/schemas/product.py):
 *   name 2–150 · sku 2–100 · price required, > 0
 *   unit_of_measure ≤ 20 (default "pcs" server-side)
 *   description: TEXT in the DB (no backend limit) — 500-char cap is a
 *   frontend UX choice, change the constant below if you want another value.
 *
 * The list endpoint is paginated (backend default size=10), so this page
 * passes size=20 and renders the shared Pagination component.
 *
 * Not displayed here: per-product stock. ProductResponse has no stock field;
 * real stock lives on the Inventory page (GET /inventory/).
 */

import { useState, useEffect } from 'react';
import { productAPI, categoryAPI, supplierAPI } from '../api';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 20;
const DESC_MAX = 500; // frontend-only cap (backend stores TEXT)

const EMPTY_FORM = {
  sku: '', name: '', description: '', category_id: '', supplier_id: '',
  price: '', reorder_level: 10, unit_of_measure: '', is_active: true,
};

export default function Products() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canEdit = hasRole('admin', 'manager');
  const canDelete = hasRole('admin');

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalError, setModalError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        category_id: catFilter || undefined,
        page,
        size: PAGE_SIZE,
      };
      const [prodRes, catRes, supRes] = await Promise.all([
        productAPI.list(params),
        categoryAPI.list(),
        supplierAPI.list(),
      ]);
      const data = prodRes.data || {};
      setItems(data.items || (Array.isArray(data) ? data : []));
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setCategories(catRes.data?.items || catRes.data || []);
      setSuppliers(supRes.data?.items || supRes.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search, catFilter, page]);

  const clearFieldError = (field) =>
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...EMPTY_FORM }); // no category pre-selected — shows "Select category..."
    setFieldErrors({});
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setFormData({
      sku: p.sku || '',
      name: p.name || '',
      description: p.description || '',
      category_id: p.category_id || '',
      supplier_id: p.supplier_id || '',
      price: p.price ?? '',
      reorder_level: p.reorder_level ?? 10,
      unit_of_measure: p.unit_of_measure || '',
      is_active: p.is_active ?? true,
    });
    setFieldErrors({});
    setModalError('');
    setModalOpen(true);
  };

  // Client-side guards that mirror the backend's own rules
  const validate = () => {
    const errs = {};
    const sku = formData.sku.trim();
    const name = formData.name.trim();
    const price = Number(formData.price);

    if (!sku) errs.sku = 'SKU is required.';
    else if (sku.length < 2) errs.sku = 'SKU must be at least 2 characters.';

    if (!name) errs.name = 'Name is required.';
    else if (name.length < 2) errs.name = 'Name must be at least 2 characters.';

    if (formData.price === '' || formData.price === null) errs.price = 'Unit price is required.';
    else if (Number.isNaN(price) || price <= 0) errs.price = 'Unit price must be greater than 0.';

    if (!formData.category_id) errs.category_id = 'Category is required.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setModalError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description || null,
        price: Number(formData.price),
        category_id: formData.category_id ? Number(formData.category_id) : null,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
        reorder_level: Number(formData.reorder_level || 0),
        unit_of_measure: formData.unit_of_measure.trim() || 'pcs',
        is_active: Boolean(formData.is_active),
      };
      if (editing) await productAPI.update(editing.id, payload);
      else await productAPI.create(payload);
      setModalOpen(false);
      toast.success(editing ? `Product ${payload.sku} updated` : `Product ${payload.sku} created`);
      load();
    } catch (err) {
      const msg = getErrorMessage(err);
      const code = err.response?.data?.error?.code;
      // Duplicate-SKU conflict belongs under the SKU field
      if (code === 'conflict' && /sku/i.test(msg)) {
        setFieldErrors((prev) => ({ ...prev, sku: msg }));
      } else {
        setModalError(msg); // stay inside the modal, not behind it
      }
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await productAPI.delete(deleteTarget.id);
      toast.success(`Product ${deleteTarget.sku} deleted`);
      setDeleteTarget(null); load();
    }
    catch (err) { setError(getErrorMessage(err)); setDeleteTarget(null); }
  };

  const fmtPrice = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <input
            placeholder="Search by name, SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 180 }}
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <TableSkeleton columns={8} /> : items.length === 0 ? (
          <EmptyState title="No products found" message="Add a product to get started." />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th><th>Name</th><th>Category</th><th>Supplier</th>
                    <th>Price</th><th>Reorder At</th><th>Status</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.sku}</strong></td>
                      <td>{p.name}</td>
                      <td>{p.category?.name || '-'}</td>
                      <td>{p.supplier?.name || '-'}</td>
                      <td>{fmtPrice(p.price)}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pages} total={total} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setModalOpen(false)} size="lg"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>}>
          <form onSubmit={handleSave} noValidate>
            {modalError && <div className="alert alert-danger">{modalError}</div>}
            <div className="form-row">
              <div className="form-group">
                <label>SKU<span className="req">*</span></label>
                <input
                  className="form-control"
                  value={formData.sku}
                  maxLength={100}
                  placeholder="e.g. OFFC-001"
                  onChange={(e) => { setFormData({ ...formData, sku: e.target.value }); clearFieldError('sku'); }}
                  aria-invalid={Boolean(fieldErrors.sku)}
                />
                {fieldErrors.sku && <div className="form-error">{fieldErrors.sku}</div>}
              </div>
              <div className="form-group">
                <label>Name<span className="req">*</span></label>
                <input
                  className="form-control"
                  value={formData.name}
                  maxLength={150}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name'); }}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                value={formData.description}
                maxLength={DESC_MAX}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category<span className="req">*</span></label>
                <select
                  className="form-control"
                  value={formData.category_id}
                  onChange={(e) => { setFormData({ ...formData, category_id: e.target.value }); clearFieldError('category_id'); }}
                  aria-invalid={Boolean(fieldErrors.category_id)}
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {fieldErrors.category_id && <div className="form-error">{fieldErrors.category_id}</div>}
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
                <label>Unit Price (₹)<span className="req">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => { setFormData({ ...formData, price: e.target.value }); clearFieldError('price'); }}
                  aria-invalid={Boolean(fieldErrors.price)}
                />
                {fieldErrors.price && <div className="form-error">{fieldErrors.price}</div>}
              </div>
              <div className="form-group">
                <label>Reorder Level</label>
                <input type="number" min="0" className="form-control" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input
                  className="form-control"
                  value={formData.unit_of_measure}
                  maxLength={20}
                  placeholder="pcs"
                  onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                />
                <small className="field-hint">Defaults to pcs</small>
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
