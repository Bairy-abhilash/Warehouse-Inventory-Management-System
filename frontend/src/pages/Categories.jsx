/**
 * Categories Page — CRUD for product categories.
 *
 * Backend contract (app/schemas/category.py): name (2–100, required),
 * description (TEXT, optional). The list endpoint returns the full list
 * without query params → search is client-side over the complete dataset.
 */

import { useState, useEffect } from 'react';
import { categoryAPI } from '../api';
import { getErrorMessage } from '../api/client';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const DESC_MAX = 500; // frontend-only cap (backend stores TEXT)

export default function Categories() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'manager');
  const canDelete = hasRole('admin');

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalError, setModalError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryAPI.list();
      setCategories(res.data?.items || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? categories.filter((c) => c.name.toLowerCase().includes(q))
    : categories;

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', description: '' });
    setFieldErrors({}); setModalError('');
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
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
      const payload = { name, description: formData.description.trim() || null };
      if (editing) await categoryAPI.update(editing.id, payload);
      else await categoryAPI.create(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await categoryAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Category</button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? (
          <TableSkeleton columns={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={categories.length === 0 ? 'No categories found' : 'No matching categories'}
            message={categories.length === 0 ? 'Create your first category to get started.' : 'Try a different search term.'}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Created</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr key={cat.id}>
                    <td><strong>{cat.name}</strong></td>
                    <td>{cat.description || '-'}</td>
                    <td>{cat.created_at ? new Date(cat.created_at).toLocaleDateString() : '-'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cat)}>Edit</button>
                        {canDelete && (
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ marginLeft: 6 }}
                            onClick={() => setDeleteTarget(cat)}
                          >
                            Delete
                          </button>
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
        <Modal
          title={editing ? 'Edit Category' : 'Add Category'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSave} noValidate>
            {modalError && <div className="alert alert-danger">{modalError}</div>}
            <div className="form-group">
              <label>Name<span className="req">*</span></label>
              <input
                className="form-control"
                value={formData.name}
                maxLength={100}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFieldErrors({ ...fieldErrors, name: '' }); }}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? (
                <div className="form-error">{fieldErrors.name}</div>
              ) : (
                <small className="field-hint">Max 100 characters</small>
              )}
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                value={formData.description}
                maxLength={DESC_MAX}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <small className="field-hint">Max {DESC_MAX} characters</small>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Category"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmText="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
