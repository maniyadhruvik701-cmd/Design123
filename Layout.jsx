import { Outlet } from 'react-router-dom';
import { Shirt, LogOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Layout() {
  const { logout } = useAppContext();

  return (
    <div className="dashboard-layout">
      <header className="top-nav fancy-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.5rem', color: 'var(--accent-primary)' }}>
          <Shirt size={28} />
          Design Studio
        </div>
        
        <nav className="nav-links">
          <button onClick={logout} className="btn-logout">
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </header>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
