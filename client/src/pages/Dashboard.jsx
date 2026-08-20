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
    if (!window.confirm('Delete this journal entry?')) return;
    try {
      await journalAPI.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError('Failed to delete entry');
    }
  };

  if (loading) return <div className="loading">Loading your journals...</div>;

  return (
    <div className="dashboard">
      {greeting && (
        <div className="greeting-card">
          <p>{greeting}</p>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {!password && (
        <div className="alert alert-info">
          Journal entries are end-to-end encrypted. Log in with a password to decrypt them.
        </div>
      )}
      <div className="dashboard-header">
        <h2>My Journal</h2>
        <button className="btn btn-primary" onClick={() => navigate('/journal/new')}>
          + New Entry
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>No journal entries yet. Start writing!</p>
          <button className="btn btn-primary" onClick={() => navigate('/journal/new')}>
            Create First Entry
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
                  <span className={`sentiment sentiment-${entry.sentiment.toLowerCase()}`}>
                    {entry.sentiment}
                  </span>
                )}
              </div>
              <p className="entry-date">
                {new Date(entry.date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
              <p className="entry-preview">
                {entry.content?.substring(0, 150)}{entry.content?.length > 150 ? '...' : ''}
              </p>
              <div className="entry-actions">
                <Link to={`/journal/${entry.id}`} className="btn btn-sm">View</Link>
                <Link to={`/journal/${entry.id}`} className="btn btn-sm btn-outline">Edit</Link>
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
