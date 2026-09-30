/**
 * Suppliers Page — CRUD for suppliers.
 *
 * Backend contract (app/schemas/supplier.py) is exactly:
 *   name (2–150, required), email (EmailStr ≤150), phone (≤30), address (TEXT)
 * There is no contact_person / is_active field on this resource, so the form
 * and table only show what the API stores and returns. The list endpoint
 * returns the full list without query params → search is client-side.
 */

import { useState, useEffect } from 'react';
import { supplierAPI } from '../api';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const ADDRESS_MAX = 500; // frontend-only cap (backend stores TEXT)
const EMPTY_FORM = { name: '', email: '', phone: '', address: '' };

export default function Suppliers() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canEdit = hasRole('admin', 'manager');
  const canDelete = hasRole('admin');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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
      const res = await supplierAPI.list();
      setItems(res.data?.items || res.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((s) => `${s.name} ${s.email || ''} ${s.phone || ''}`.toLowerCase().includes(q))
    : items;

  const openCreate = () => {
    setEditing(null); setFormData(EMPTY_FORM);
    setFieldErrors({}); setModalError('');
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setFormData({
      name: s.name || '', email: s.email || '',
      phone: s.phone || '', address: s.address || '',
    });
    setFieldErrors({}); setModalError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setModalError('');
    const errs = {};
    const name = formData.name.trim();
    const email = formData.email.trim();
    if (!name) errs.name = 'Company name is required.';
    else if (name.length < 2) errs.name = 'Company name must be at least 2 characters.';
    // backend email column is EmailStr — validate before it reaches the API
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        name,
        email: email || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      };
      if (editing) await supplierAPI.update(editing.id, payload);
      else await supplierAPI.create(payload);
      setModalOpen(false);
      toast.success(editing ? `Supplier "${payload.name}" updated` : `Supplier "${payload.name}" created`);
      load();
    } catch (err) { setModalError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await supplierAPI.delete(deleteTarget.id);
      toast.success(`Supplier "${deleteTarget.name}" deleted`);
      setDeleteTarget(null); load();
    }
    catch (err) { setError(getErrorMessage(err)); setDeleteTarget(null); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>+ Add Supplier</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <TableSkeleton columns={5} /> : filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? 'No suppliers found' : 'No matching suppliers'}
            message={items.length === 0 ? 'Add a supplier to get started.' : 'Try a different search term.'}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Phone</th><th>Address</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.address || '-'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        {canDelete && (
                          <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => setDeleteTarget(s)}>Delete</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit Supplier' : 'Add Supplier'} onClose={() => setModalOpen(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>}>
          <form onSubmit={handleSave} noValidate>
            {modalError && <div className="alert alert-danger">{modalError}</div>}
            <div className="form-group">
              <label>Company Name<span className="req">*</span></label>
              <input
                className="form-control"
                value={formData.name}
                maxLength={150}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFieldErrors({ ...fieldErrors, name: '' }); }}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? (
                <div className="form-error">{fieldErrors.name}</div>
              ) : (
                <small className="field-hint">Max 150 characters</small>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  maxLength={150}
                  placeholder="e.g. sales@supplier.com"
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFieldErrors({ ...fieldErrors, email: '' }); }}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? (
                  <div className="form-error">{fieldErrors.email}</div>
                ) : (
                  <small className="field-hint">Max 150 characters</small>
                )}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  className="form-control"
                  value={formData.phone}
                  maxLength={30}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <small className="field-hint">Max 30 characters</small>
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                className="form-control"
                value={formData.address}
                maxLength={ADDRESS_MAX}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <small className="field-hint">Max {ADDRESS_MAX} characters</small>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Supplier" message={`Delete "${deleteTarget.name}"?`}
          confirmText="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
