import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { extractError } from '../services/api.js';
import { useToast } from '../components/Toast.jsx';
import { ErrorBanner } from '../components/ui.jsx';
import { Cross, Lock, Mail, Shield, Calendar, Stethoscope } from '../components/Icons.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@medicore.com', password: 'Admin@123' },
  { label: 'Doctor', email: 'doctor@medicore.com', password: 'Doctor@123' },
  { label: 'Patient', email: 'patient@medicore.com', password: 'Patient@123' },
  { label: 'Blood bank', email: 'bloodbank@medicore.com', password: 'Bloodbank@123' },
  { label: 'Transplant', email: 'coordinator@medicore.com', password: 'Coordinator@123' },
];

/** Post-login landing page per role (the two operator roles need their own homes). */
const HOME_BY_ROLE = {
  ADMIN: '/admin',
  DOCTOR: '/doctor',
  PATIENT: '/patient',
  BLOOD_BANK_OFFICER: '/bloodbank',
  TRANSPLANT_COORDINATOR: '/transplant',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const auth = await login(email, password);
      toast(`Welcome back, ${auth.email}`, 'success');
      // Land on the page they originally asked for (a homepage page link),
      // otherwise fall back to the role's own dashboard.
      const intended = location.state?.from;
      navigate(intended ? `${intended.pathname}${intended.search || ''}` : (HOME_BY_ROLE[auth.role] || '/login'));
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="brand" style={{ color: '#fff' }}>
          <span className="brand-mark"><Cross size={16} /></span> MediCore
        </div>
        <h2>Healthcare management, built on microservices.</h2>
        <p className="lead">
          One platform for patients, doctors, administrators and two domain
          operator roles — appointments, blood banking and organ donation,
          each with its own access rules.
        </p>

        <div className="auth-feature">
          <span className="feat-icon"><Calendar size={18} /></span>
          <div>
            <strong>Smart appointment booking</strong>
            <span>Slot validation, live availability, instant confirmation</span>
          </div>
        </div>
        <div className="auth-feature">
          <span className="feat-icon"><Stethoscope size={18} /></span>
          <div>
            <strong>Doctor discovery</strong>
            <span>Filter by specialization, experience and consultation fee</span>
          </div>
        </div>
        <div className="auth-feature">
          <span className="feat-icon"><Shield size={18} /></span>
          <div>
            <strong>Secure by design</strong>
            <span>JWT auth, API-gateway role checks, per-service verification</span>
          </div>
        </div>

        <div className="auth-stat-row">
          <div className="auth-stat"><b>9</b><span>microservices</span></div>
          <div className="auth-stat"><b>JWT</b><span>end-to-end auth</span></div>
          <div className="auth-stat"><b>5</b><span>roles with scoped access</span></div>
        </div>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-brand-row">
            <span className="brand-mark"><Cross size={16} /></span>
            <h1 className="auth-title">Sign in</h1>
          </div>
          <p className="auth-subtitle">Welcome back — enter your details to continue</p>

          <ErrorBanner message={error} onClose={() => setError('')} />

          <label className="field">
            <span>Email</span>
            <div className="input-wrap">
              <span className="input-icon"><Mail size={16} /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={16} /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            <Lock size={15} /> {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-alt">
            No account? <Link to="/register">Register here</Link>
          </p>

          <div className="demo-accounts">
            <p>Quick demo access — click to fill</p>
            <div className="demo-row">
              {DEMO_ACCOUNTS.map((a) => (
                <button type="button" key={a.email} className="chip" onClick={() => fillDemo(a)}>
                  <span className="chip-role">{a.label}</span> {a.email}
                </button>
              ))}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
