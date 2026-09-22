/**
 * Topbar
 * ------
 * Page title, mobile navigation toggle, current user, logout.
 */

import { useAuth } from '../context/AuthContext';

export default function Topbar({ title, navOpen, onMenuClick }) {
  const { user, logout } = useAuth();

  const nameStr = user?.username || user?.email || 'Admin';
  const initials = nameStr.substring(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <button
          type="button"
          className="menu-btn"
          onClick={onMenuClick}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <h1>{title}</h1>
      </div>
      <div className="user-menu">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="name">{nameStr}</div>
          <div className="role">{user?.role_name || user?.role?.name || 'Staff'}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
