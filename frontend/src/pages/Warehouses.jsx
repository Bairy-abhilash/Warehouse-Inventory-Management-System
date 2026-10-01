/**
 * Warehouses Page — CRUD for warehouses.
 *
 * Backend contract (app/schemas/warehouse.py) is exactly:
 *   name (2–150, required), location (≤255, optional)
 * There is NO code / address / is_active field on this resource, so the
 * form and table only show what the API can actually store and return.
 * The list endpoint takes no query params and returns the full list, so
 * search is applied client-side over that complete dataset.
 */

import { useState, useEffect } from 'react';
import { warehouseAPI } from '../api';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', location: '' };

export default function Warehouses() {
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
      const res = await warehouseAPI.list();
      setItems(res.data?.items || res.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((w) => `${w.name} ${w.location || ''}`.toLowerCase().includes(q))
    : items;

  const openCreate = () => {
    setEditing(null); setFormData(EMPTY_FORM);
    setFieldErrors({}); setModalError('');
    setModalOpen(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    setFormData({ name: w.name || '', location: w.location || '' });
    setFieldErrors({}); setModalError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setModalError('');
    const errs = {};
    const name = formData.name.trim();
    if (!name) errs.name = 'Name is required.';
    else if (name.length < 2) errs.name = 'Name must be at least 2 characters.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = { name, location: formData.location.trim() || null };
      if (editing) await warehouseAPI.update(editing.id, payload);
      else await warehouseAPI.create(payload);
      setModalOpen(false);
      toast.success(editing ? `Warehouse "${name}" updated` : `Warehouse "${name}" created`);
      load();
    } catch (err) { setModalError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await warehouseAPI.delete(deleteTarget.id);
      toast.success(`Warehouse "${deleteTarget.name}" deleted`);
      setDeleteTarget(null); load();
    } catch (err) { setError(getErrorMessage(err)); setDeleteTarget(null); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <input
            placeholder="Search warehouses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>+ Add Warehouse</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <TableSkeleton columns={4} /> : filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? 'No warehouses found' : 'No matching warehouses'}
            message={items.length === 0 ? 'Add a warehouse to get started.' : 'Try a different search term.'}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Location</th><th>Created</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td><strong>{w.name}</strong></td>
                    <td>{w.location || '-'}</td>
                    <td>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '-'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(w)}>Edit</button>
                        {canDelete && (
                          <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => setDeleteTarget(w)}>Delete</button>
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
        <Modal title={editing ? 'Edit Warehouse' : 'Add Warehouse'} onClose={() => setModalOpen(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>}>
          <form onSubmit={handleSave} noValidate>
            {modalError && <div className="alert alert-danger">{modalError}</div>}
            <div className="form-group">
              <label>Name<span className="req">*</span></label>
              <input
                className="form-control"
                value={formData.name}
                maxLength={150}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFieldErrors({ ...fieldErrors, name: '' }); }}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                className="form-control"
                value={formData.location}
                maxLength={255}
                placeholder="e.g. Bengaluru, Karnataka"
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Warehouse" message={`Delete "${deleteTarget.name}"?`}
          confirmText="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
