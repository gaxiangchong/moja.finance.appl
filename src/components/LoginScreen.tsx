import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { session, login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return null;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const err = await login(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      setPassword('');
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={onSubmit}>
        <div className="login-logo">
          <h1>💰 Moja Finance</h1>
          <p>Finance Agent v1.0 — Please sign in</p>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="login-error">{error}</div>
        <button type="submit" className="btn-login" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
