import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { extractError } from '../services/api.js';
import { ErrorBanner } from '../components/ui.jsx';
import { ArrowLeft, Cross, Mail, Lock, User as UserIcon, Shield, Calendar, Stethoscope } from '../components/Icons.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', role: 'PATIENT' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register(form.email, form.password, form.role);
      navigate('/login');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link to="/" className="brand" style={{ color: '#fff' }} aria-label="Back to MediCore homepage">
          <span className="brand-mark"><Cross size={16} /></span> MediCore
        </Link>
        <h2>Join MediCore today.</h2>
        <p className="lead">
          Create an account as a patient to book appointments, or as a doctor to
          publish your profile and receive bookings.
        </p>

        <div className="auth-feature">
          <span className="feat-icon"><Calendar size={18} /></span>
          <div>
            <strong>Patients</strong>
            <span>Find specialists, book 30-minute slots, track visit history</span>
          </div>
        </div>
        <div className="auth-feature">
          <span className="feat-icon"><Stethoscope size={18} /></span>
          <div>
            <strong>Doctors</strong>
            <span>Publish profile, set fees &amp; hours, go on/off duty anytime</span>
          </div>
        </div>
        <div className="auth-feature">
          <span className="feat-icon"><Shield size={18} /></span>
          <div>
            <strong>Admin approved</strong>
            <span>Admins manage accounts and can restore deactivated users</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-brand-row">
            <span className="brand-mark"><Cross size={16} /></span>
            <h1 className="auth-title">Create account</h1>
          </div>
          <p className="auth-subtitle">It takes less than a minute</p>

          <ErrorBanner message={error} onClose={() => setError('')} />

          <label className="field">
            <span>Email</span>
            <div className="input-wrap">
              <span className="input-icon"><Mail size={16} /></span>
              <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
            </div>
          </label>

          <label className="field">
            <span>Password (min 8 chars)</span>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={16} /></span>
              <input type="password" value={form.password} onChange={update('password')} placeholder="••••••••" minLength={8} required />
            </div>
          </label>

          <label className="field">
            <span>Confirm password</span>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={16} /></span>
              <input type="password" value={form.confirm} onChange={update('confirm')} placeholder="••••••••" required />
            </div>
          </label>

          <label className="field">
            <span>I am registering as</span>
            <div className="input-wrap">
              <span className="input-icon"><UserIcon size={16} /></span>
              <select value={form.role} onChange={update('role')}>
                <option value="PATIENT">Patient — I want to book appointments</option>
                <option value="DOCTOR">Doctor — I want to receive bookings</option>
              </select>
            </div>
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>

          <p className="auth-alt">
            Already registered? <Link to="/login">Sign in</Link>
          </p>

          <p className="auth-alt back-home">
            <Link to="/"><ArrowLeft size={13} /> Back to homepage</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
