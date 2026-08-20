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
      setError('Not found');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (value) => {
    setContent(value);
    setSentiment(analyzeSentiment((title || '') + '\n' + (value || '')));
  };

  const handleTitleChange = (value) => {
    setTitle(value);
    setSentiment(analyzeSentiment((value || '') + '\n' + (content || '')));
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

      const payload = { title: sendTitle, content: sendContent, sentiment: computedSentiment };

      if (isNew) {
        const res = await journalAPI.create(payload);
        navigate(`/journal/${res.data.id}`);
      } else {
        await journalAPI.update(id, payload);
        navigate(`/journal/${id}`);
      }
    } catch (err) {
      setError(err.response?.data || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const sentimentLabel = sentiment || 'NEUTRAL';

  return (
    <div className="journal-entry-page">
      <button className="btn-back" onClick={() => navigate(-1)}>
        &larr; Back
      </button>
      <h2>{isNew ? 'New Entry' : 'Edit'}</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {!password && !isNew && (
        <div className="alert alert-info">
          Encrypted. Log in with a password to decrypt.
        </div>
      )}
      {!isNew && entry && (
        <p className="entry-meta">
          {new Date(entry.date).toLocaleString()}
          {isEncrypted(entry.title) && ' · encrypted'}
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
            placeholder={decrypted ? 'Title' : 'Decrypting...'}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={decrypted ? 'Write...' : 'Decrypting...'}
            rows={12}
          />
        </div>
        {sentimentLabel && (
          <div className="sentiment-preview">
            <span className="sentiment">{sentimentLabel}</span>
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !decrypted}>
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
