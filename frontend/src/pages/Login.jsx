import { useState } from 'react';
import useAuth from '../context/useAuth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img src="/logo.png" alt="Kaan Takograf Taksimetre" className="login-logo" />
        <h1 id="login-title">Kaan Taksimetre</h1>
        <p>Yönetim sistemine giriş yapın.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={10}
            required
          />

          {error && <div className="login-error" role="alert">{error}</div>}

          <button type="submit" className="btn btn-primary login-button" disabled={submitting}>
            {submitting ? <span className="spinner" aria-hidden="true" /> : <span className="material-icons-outlined">login</span>}
            {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </section>
    </main>
  );
}
