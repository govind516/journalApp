import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { journalAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto';
import { analyzeSentiment } from '../utils/sentiment';

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
  const [decrypted, setDecrypted] = useState(isNew);
  const [sentiment, setSentiment] = useState(null);

  useEffect(() => {
    if (!isNew && id) loadEntry();
  }, [id]);

  const loadEntry = async () => {
    setLoading(true);
    try {
      const res = await journalAPI.getById(id);
      const e = res.data;
      setEntry(e);
      setSentiment(e.sentiment || null);

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

  const handleContentChange = (value) => {
    setContent(value);
    const combined = (title || '') + '\n' + (value || '');
    setSentiment(analyzeSentiment(combined));
  };

  const handleTitleChange = (value) => {
    setTitle(value);
    const combined = (value || '') + '\n' + (content || '');
    setSentiment(analyzeSentiment(combined));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const computedSentiment = analyzeSentiment((title || '') + '\n' + (content || ''));
      let sendTitle = title;
      let sendContent = content;

      if (password) {
        sendTitle = await encrypt(title, password, getUserName());
        sendContent = content ? await encrypt(content, password, getUserName()) : '';
      }

      const payload = {
        title: sendTitle,
        content: sendContent,
        sentiment: computedSentiment,
      };

      if (isNew) {
        const res = await journalAPI.create(payload);
        navigate(`/journal/${res.data.id}`);
      } else {
        const res = await journalAPI.update(id, payload);
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

  const sentimentLabel = sentiment || 'NEUTRAL';

  return (
    <div className="journal-entry-page">
      <button className="btn-back" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back
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
          {isEncrypted(entry.title) && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: 'var(--primary)' }}>Encrypted</span>
            </>
          )}
        </p>
      )}
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder={decrypted ? "What's on your mind?" : 'Decrypting...'}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={decrypted ? 'Write your thoughts here...' : 'Decrypting...'}
            rows={12}
          />
        </div>
        {sentimentLabel && (
          <div className="sentiment-preview">
            Detected mood:{' '}
            <span className={`sentiment sentiment-${sentimentLabel.toLowerCase()}`}>
              {sentimentLabel}
            </span>
          </div>
        )}
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
