import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { journalAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto';

export default function JournalEntryPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { password, getUserName } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [decrypted, setDecrypted] = useState(false);

  useEffect(() => {
    if (!isNew && id) loadEntry();
  }, [id]);

  const loadEntry = async () => {
    setLoading(true);
    try {
      const res = await journalAPI.getById(id);
      const e = res.data;
      setEntry(e);

      if (password && isEncrypted(e.title)) {
        const dTitle = await decrypt(e.title, password, getUserName());
        const dContent = e.content ? await decrypt(e.content, password, getUserName()) : '';
        setTitle(dTitle);
        setContent(dContent);
        setDecrypted(true);
      } else {
        setTitle(e.title);
        setContent(e.content || '');
        setDecrypted(true);
      }
    } catch {
      setError('Entry not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let sendTitle = title;
      let sendContent = content;

      if (password) {
        sendTitle = await encrypt(title, password, getUserName());
        sendContent = content ? await encrypt(content, password, getUserName()) : '';
      }

      if (isNew) {
        const res = await journalAPI.create({ title: sendTitle, content: sendContent });
        navigate(`/journal/${res.data.id}`);
      } else {
        const res = await journalAPI.update(id, { title: sendTitle, content: sendContent });
        setEntry(res.data);
        navigate(`/journal/${id}`);
      }
    } catch (err) {
      setError(err.response?.data || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading entry...</div>;

  return (
    <div className="journal-entry-page">
      <button className="btn btn-sm btn-back" onClick={() => navigate(-1)}>
        &larr; Back
      </button>
      <h2>{isNew ? 'New Journal Entry' : 'Edit Entry'}</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {!password && !isNew && (
        <div className="alert alert-info">
          E2EE is active. Log in with a password (not Google) to decrypt entries.
        </div>
      )}
      {!isNew && entry && (
        <p className="entry-meta">
          Created: {new Date(entry.date).toLocaleString()}
          {entry.sentiment && <> | Sentiment: <strong>{entry.sentiment}</strong></>}
          {isEncrypted(entry.title) && <> | 🔒 Encrypted</>}
        </p>
      )}
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={decrypted ? "What's on your mind?" : 'Decrypting...'}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={decrypted ? 'Write your thoughts here...' : 'Decrypting...'}
            rows={12}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !decrypted}>
            {saving ? 'Saving...' : isNew ? 'Create Entry' : 'Save Changes'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
