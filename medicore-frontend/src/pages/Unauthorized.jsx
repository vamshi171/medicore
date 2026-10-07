import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from '../components/Icons.jsx';

export default function Unauthorized() {
  return (
    <div className="auth-page" style={{ gridTemplateColumns: '1fr' }}>
      <main className="auth-main">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="empty-icon" style={{ margin: '0 auto 16px' }}><Shield size={30} /></div>
          <h1 className="auth-title">403 — No access</h1>
          <p className="auth-subtitle">
            You don't have permission to view this page. If you believe this is a
            mistake, contact an administrator.
          </p>
          <Link className="btn btn-primary btn-block" to="/login">Go to login</Link>
          <Link className="btn btn-outline btn-block" to="/" style={{ marginTop: 8 }}>
            <ArrowLeft size={14} /> Back to homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
