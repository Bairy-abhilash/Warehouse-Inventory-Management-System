/**
 * Topbar
 * ------
 * Shows the page title and current user info with a logout button.
 */

import { useAuth } from '../context/AuthContext';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();

  const nameStr = user?.username || user?.email || 'Admin';
  const initials = nameStr.substring(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="user-menu">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="name">{nameStr}</div>
          <div className="role" style={{ textTransform: 'capitalize' }}>{user?.role_name || user?.role?.name || 'Staff'}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
