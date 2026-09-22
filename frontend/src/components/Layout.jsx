/**
 * Layout Component
 * ----------------
 * The main app shell: sidebar + topbar + content area (Outlet).
 * Owns the mobile navigation open/closed state (client/UI state only).
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/categories': 'Categories',
  '/warehouses': 'Warehouses',
  '/suppliers': 'Suppliers',
  '/inventory': 'Inventory',
  '/purchase-orders': 'Purchase Orders',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Layout() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Inventory Management';

  // Mobile drawer state — closed again whenever the route changes
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="main-content">
        <Topbar
          title={title}
          navOpen={navOpen}
          onMenuClick={() => setNavOpen((open) => !open)}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
