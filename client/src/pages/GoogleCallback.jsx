import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { googleLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      googleLogin(code).then((ok) => {
        if (ok) navigate('/');
        else navigate('/login');
      });
    } else {
      navigate('/login');
    }
  }, [searchParams]);

  return <div className="loading">Authenticating with Google...</div>;
}
