/**
 * Settings Page
 * -------------
 * Shows system info and (for admins) user management.
 */

import { useState, useEffect } from 'react';
import { userAPI } from '../api';
import { getErrorMessage } from '../api/client';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = hasRole('admin');

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        userAPI.list(),
        userAPI.roles(),
      ]);
      setUsers(usersRes.data?.items || usersRes.data || []);
      setRoles(rolesRes.data?.items || rolesRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await userAPI.update(u.id, { is_active: !u.is_active });
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const roleName = (roleId) => roles.find((r) => r.id === roleId)?.name || 'Unknown';

  return (
    <div>
      {/* Profile Info */}
      <div className="card">
        <div className="card-header">
          <h3>Your Profile</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, maxWidth: 500 }}>
            <strong>Username:</strong><span>{user?.username || user?.email}</span>
            <strong>Email:</strong><span>{user?.email}</span>
            <strong>Role:</strong>
            <span><span className="badge badge-primary">{user?.role_name || user?.role?.name}</span></span>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="card">
        <div className="card-header">
          <h3>System Information</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, maxWidth: 600 }}>
            <strong>Application:</strong><span>Inventory &amp; Warehouse Management System</span>
            <strong>Version:</strong><span>1.0.0</span>
            <strong>Frontend:</strong><span>React 18</span>
            <strong>Backend:</strong><span>FastAPI + SQLAlchemy</span>
            <strong>Database:</strong><span>PostgreSQL (localhost:5432)</span>
            <strong>API Docs:</strong>
            <span><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">http://localhost:8000/docs</a></span>
          </div>
        </div>
      </div>

      {/* User Management (admin only) */}
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <h3>User Management</h3>
          </div>
          {loading ? <Loading /> : (
            <div className="table-wrapper">
              {error && <div className="alert alert-danger">{error}</div>}
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td><span className="badge badge-info">{roleName(u.role_id)}</span></td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-gray'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => toggleActive(u)}
                          disabled={u.id === user.id}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
