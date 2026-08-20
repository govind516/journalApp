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
      setErrorMsg(searchParams.get('error_description') || 'Google sign-in was cancelled');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('No authorization code received');
      return;
    }

    const savedState = sessionStorage.getItem('oauth_state');
    if (savedState && state !== savedState) {
      setStatus('error');
      setErrorMsg('Invalid state parameter');
      return;
    }
    sessionStorage.removeItem('oauth_state');

    googleLogin(code).then((ok) => {
      if (ok) {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 800);
      } else {
        setStatus('error');
        setErrorMsg('Authentication failed. Please try again.');
      }
    });
  }, [searchParams]);

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="google-status-success">
            <h3>Signed in</h3>
            <p>Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="google-status-error">
            <h3>Failed</h3>
            <p>{errorMsg}</p>
            <button className="btn btn-sm" onClick={() => navigate('/login', { replace: true })}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="google-status-processing">
          <div className="spinner" />
          <p>Authenticating...</p>
        </div>
      </div>
    </div>
  );
}
