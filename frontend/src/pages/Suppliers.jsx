/**
 * Suppliers Page — CRUD for suppliers.
 */

import { useState, useEffect } from 'react';
import { supplierAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', contact_person: '', email: '', phone: '', address: '', is_active: true };

export default function Suppliers() {
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
      const res = await supplierAPI.list({ search: search || undefined });
      setItems(res.data?.items || res.data || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditing(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setFormData({
      name: s.name, contact_person: s.contact_person || '', email: s.email || '',
      phone: s.phone || '', address: s.address || '', is_active: s.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await supplierAPI.update(editing.id, formData);
      else await supplierAPI.create(formData);
      setModalOpen(false); load();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await supplierAPI.delete(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (err) { setError(getErrorMessage(err)); setDeleteTarget(null); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>+ Add Supplier</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState icon="🚚" title="No suppliers found" />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.contact_person || '-'}</td>
                    <td>{s.email || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-gray'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        {canDelete && <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => setDeleteTarget(s)}>Delete</button>}
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
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Company Name *</label>
              <input className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Contact Person</label>
                <input className="form-control" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea className="form-control" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
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
