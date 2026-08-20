import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg(searchParams.get('error_description') || 'Google sign-in was cancelled or failed');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('No authorization code received from Google');
      return;
    }

    const savedState = sessionStorage.getItem('oauth_state');
    if (savedState && state !== savedState) {
      setStatus('error');
      setErrorMsg('Invalid state parameter — possible CSRF attack');
      return;
    }
    sessionStorage.removeItem('oauth_state');

    googleLogin(code).then((ok) => {
      if (ok) {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1000);
      } else {
        setStatus('error');
        setErrorMsg('Failed to authenticate with Google. The account may not exist or the code expired.');
      }
    });
  }, [searchParams]);

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="google-status-success">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3>Signed in successfully</h3>
            <p>Redirecting you to your journal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="google-status-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h3>Authentication failed</h3>
            <p>{errorMsg}</p>
            <button className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="google-status-processing">
          <div className="spinner" />
          <h3>Authenticating with Google...</h3>
          <p>Please wait while we verify your credentials.</p>
        </div>
      </div>
    </div>
  );
}
