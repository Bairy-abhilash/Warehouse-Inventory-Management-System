/**
 * Warehouses Page — CRUD for warehouses.
 */

import { useState, useEffect } from 'react';
import { warehouseAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', code: '', location: '', address: '', is_active: true };

export default function Warehouses() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'manager');
  const canDelete = hasRole('admin');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await warehouseAPI.list({ search: search || undefined });
      setItems(res.data?.items || res.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditing(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (w) => {
    setEditing(w);
    setFormData({ name: w.name, code: w.code, location: w.location || '', address: w.address || '', is_active: w.is_active });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await warehouseAPI.update(editing.id, formData);
      else await warehouseAPI.create(formData);
      setModalOpen(false);
      load();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await warehouseAPI.delete(deleteTarget.id);
      setDeleteTarget(null); load();
    } catch (err) { setError(getErrorMessage(err)); setDeleteTarget(null); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Search warehouses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>+ Add Warehouse</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState icon="🏭" title="No warehouses found" />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Location</th><th>Status</th><th>Created</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id}>
                    <td><strong>{w.code}</strong></td>
                    <td>{w.name}</td>
                    <td>{w.location || '-'}</td>
                    <td>
                      <span className={`badge ${w.is_active ? 'badge-success' : 'badge-gray'}`}>
                        {w.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(w.created_at).toLocaleDateString()}</td>
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
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Code *</label>
                <input className="form-control" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input className="form-control" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea className="form-control" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} /> Active
              </label>
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
