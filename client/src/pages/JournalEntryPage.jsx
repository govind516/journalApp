import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { journalAPI } from '../api/api';

export default function JournalEntryPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isNew && id) loadEntry();
  }, [id]);

  const loadEntry = async () => {
    setLoading(true);
    try {
      const res = await journalAPI.getById(id);
      setEntry(res.data);
      setTitle(res.data.title);
      setContent(res.data.content || '');
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
      if (isNew) {
        const res = await journalAPI.create({ title, content });
        navigate(`/journal/${res.data.id}`);
      } else {
        const res = await journalAPI.update(id, { title, content });
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
      {!isNew && entry && (
        <p className="entry-meta">
          Created: {new Date(entry.date).toLocaleString()}
          {entry.sentiment && <> | Sentiment: <strong>{entry.sentiment}</strong></>}
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
            placeholder="What's on your mind?"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts here..."
            rows={12}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
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
