import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { journalAPI, userAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { decrypt, isEncrypted } from '../utils/crypto';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, password, getUserName } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [journalRes, greetingRes] = await Promise.allSettled([
        journalAPI.getAll(),
        userAPI.getGreeting(),
      ]);
      if (journalRes.status === 'fulfilled') {
        const raw = journalRes.value.data;
        if (password) {
          const decrypted = await Promise.all(
            raw.map(async (e) => ({
              ...e,
              title: isEncrypted(e.title) ? await decrypt(e.title, password, getUserName()) : e.title,
              content: e.content && isEncrypted(e.content)
                ? await decrypt(e.content, password, getUserName())
                : e.content,
            }))
          );
          setEntries(decrypted);
        } else {
          setEntries(raw);
        }
      }
      if (greetingRes.status === 'fulfilled') {
        setGreeting(greetingRes.value.data);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await journalAPI.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError('Failed to delete');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      {greeting && (
        <div className="greeting-card">
          <p>{greeting}</p>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {!password && entries.length > 0 && (
        <div className="alert alert-info">
          Entries are encrypted. Log in with a password to decrypt.
        </div>
      )}
      <div className="dashboard-header">
        <h2>Journal</h2>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/journal/new')}>
          + New
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Write your first entry.</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/journal/new')}>
            + New Entry
          </button>
        </div>
      ) : (
        <div className="entries-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="entry-card">
              <div className="entry-card-header">
                <h3>
                  <Link to={`/journal/${entry.id}`}>{entry.title}</Link>
                </h3>
                {entry.sentiment && (
                  <span className="sentiment">{entry.sentiment}</span>
                )}
              </div>
              <p className="entry-date">
                {new Date(entry.date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
              <p className="entry-preview">
                {entry.content?.substring(0, 200)}{entry.content?.length > 200 ? '...' : ''}
              </p>
              <div className="entry-actions">
                <Link to={`/journal/${entry.id}`} className="btn btn-sm">Open</Link>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(entry.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
