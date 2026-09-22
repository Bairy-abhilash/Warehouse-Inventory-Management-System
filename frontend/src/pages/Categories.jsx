/**
 * Categories Page — CRUD for product categories.
 */

import { useState, useEffect } from 'react';
import { categoryAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryAPI.list({ search: search || undefined });
      setCategories(res.data?.items || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await categoryAPI.update(editing.id, formData);
      } else {
        await categoryAPI.create(formData);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
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
          <Loading />
        ) : categories.length === 0 ? (
          <EmptyState icon="🏷️" title="No categories found" message="Create your first category to get started." />
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
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td><strong>{cat.name}</strong></td>
                    <td>{cat.description || '-'}</td>
                    <td>{new Date(cat.created_at).toLocaleDateString()}</td>
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
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Name *</label>
              <input
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
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
