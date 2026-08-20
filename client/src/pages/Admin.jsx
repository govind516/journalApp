import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newAdmin, setNewAdmin] = useState({ userName: '', password: '', email: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllUsers();
      setUsers(res.data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await adminAPI.createAdmin(newAdmin);
      setNewAdmin({ userName: '', password: '', email: '' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await adminAPI.clearCache();
      alert('Cache cleared');
    } catch {
      setError('Failed to clear cache');
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="admin-page">
      <h2>Admin Dashboard</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-section">
        <h3>All Users ({users.length})</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Journal Entries</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.userName}</td>
                <td>{user.email || '-'}</td>
                <td>{user.roles?.join(', ') || '-'}</td>
                <td>{user.journalEntryList?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-section">
        <h3>Create Admin User</h3>
        <form onSubmit={handleCreateAdmin} className="admin-form">
          <input
            type="text"
            placeholder="Username"
            value={newAdmin.userName}
            onChange={(e) => setNewAdmin({ ...newAdmin, userName: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating...' : 'Create Admin'}
          </button>
        </form>
      </div>

      <div className="admin-section">
        <button className="btn btn-outline" onClick={handleClearCache}>
          Clear App Cache
        </button>
      </div>
    </div>
  );
}
