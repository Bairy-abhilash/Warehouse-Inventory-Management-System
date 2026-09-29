/**
 * Topbar
 * ------
 * Page title, mobile navigation toggle, and the account menu (UserButton).
 */

import UserButton from './UserButton';

export default function Topbar({ title, navOpen, onMenuClick }) {
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
      <UserButton />
    </header>
  );
}
