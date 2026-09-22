/**
 * Sidebar Navigation
 * ------------------
 * Fixed left navigation, grouped by business area.
 * On mobile it becomes an off-canvas drawer controlled by Layout.
 */

import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/reports', label: 'Reports' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/products', label: 'Products' },
      { to: '/categories', label: 'Categories' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/inventory', label: 'Inventory' },
      { to: '/warehouses', label: 'Warehouses' },
      { to: '/suppliers', label: 'Suppliers' },
      { to: '/purchase-orders', label: 'Purchase Orders' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings' },
    ],
  },
];

export default function Sidebar({ open = false, onNavigate }) {
  const { user } = useAuth();

  return (
    <aside id="app-sidebar" className={open ? 'sidebar open' : 'sidebar'}>
      <div className="sidebar-header">
        <h2>INVENTORY MS</h2>
        <p>Inventory &amp; Warehouse System</p>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="sidebar-section">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        Signed in as <strong>{user?.username || user?.email || 'User'}</strong>
        <br />
        Role: <span style={{ textTransform: 'capitalize' }}>{user?.role_name || user?.role?.name || 'Staff'}</span>
      </div>
    </aside>
  );
}
