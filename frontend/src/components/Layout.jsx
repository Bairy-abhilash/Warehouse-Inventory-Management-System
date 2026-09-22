/**
 * Layout Component
 * ----------------
 * The main app shell: sidebar + topbar + content area (Outlet).
 */

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

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={title} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
