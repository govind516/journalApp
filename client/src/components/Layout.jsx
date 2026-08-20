import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { token, logout, isAdmin, getUserName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="nav-brand">JournalApp</Link>
        <div className="nav-links">
          {token ? (
            <>
              <span className="nav-user">Hi, {getUserName()}</span>
              {isAdmin() && (
                <Link to="/admin" className="nav-link">Admin</Link>
              )}
              <button onClick={handleLogout} className="btn btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="nav-link">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
