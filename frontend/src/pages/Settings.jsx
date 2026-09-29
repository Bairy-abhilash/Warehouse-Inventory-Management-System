/**
 * Settings Page
 * -------------
 * Shows the authenticated user's profile and system information.
 */

import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

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
            <strong>Frontend:</strong><span>React 18 (Create React App)</span>
            <strong>Backend:</strong><span>FastAPI + SQLAlchemy 2.0</span>
            <strong>Database:</strong><span>PostgreSQL (localhost:5432)</span>
            <strong>API Docs:</strong>
            <span><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">http://localhost:8000/docs</a></span>
          </div>
        </div>
      </div>
    </div>
  );
}