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
      {!password && entries.length > 0 && (
        <div className="alert alert-info">
          Journal entries are end-to-end encrypted. Log in with a password to decrypt them.
        </div>
      )}
      <div className="dashboard-header">
        <h2>My Journal</h2>
        <button className="btn btn-primary" onClick={() => navigate('/journal/new')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Entry
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3>No journal entries yet</h3>
          <p>Start writing to capture your thoughts and track your mood over time.</p>
          <button className="btn btn-primary" onClick={() => navigate('/journal/new')}>
            Create Your First Entry
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
                {entry.content?.substring(0, 200)}{entry.content?.length > 200 ? '...' : ''}
              </p>
              <div className="entry-actions">
                <Link to={`/journal/${entry.id}`} className="btn btn-sm btn-primary">View</Link>
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
