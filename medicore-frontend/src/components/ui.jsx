import { AlertCircle, CheckCircle, Calendar, Info, X, ArrowRight } from './Icons.jsx';

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="alert alert-error" role="alert">
      <AlertCircle size={16} />
      <span style={{ flex: 1 }}>{message}</span>
      {onClose ? (
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'inline-flex' }}>
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

export function SuccessBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="alert alert-success">
      <CheckCircle size={16} />
      <span style={{ flex: 1 }}>{message}</span>
      {onClose ? (
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'inline-flex' }}>
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

export function InfoBanner({ message }) {
  if (!message) return null;
  return (
    <div className="alert alert-info">
      <Info size={16} />
      <span>{message}</span>
    </div>
  );
}

const STATUS_CLASS = {
  // appointments
  SCHEDULED: 'badge badge-blue',
  CONFIRMED: 'badge badge-cyan',
  COMPLETED: 'badge badge-green',
  CANCELLED: 'badge badge-red',
  // notifications
  SENT: 'badge badge-green',
  QUEUED: 'badge badge-amber',
  FAILED: 'badge badge-red',
  // blood bank requests
  REQUESTED: 'badge badge-amber',
  APPROVED: 'badge badge-cyan',
  FULFILLED: 'badge badge-green',
  REJECTED: 'badge badge-red',
  // organ pledges
  PENDING: 'badge badge-amber',
  VERIFIED: 'badge badge-blue',
  ACTIVE: 'badge badge-green',
  REVOKED: 'badge badge-gray',
  // organ waitlist
  WAITING: 'badge badge-amber',
  MATCHED: 'badge badge-cyan',
  TRANSPLANTED: 'badge badge-green',
  REMOVED: 'badge badge-gray',
  // organ allocations
  PROPOSED: 'badge badge-amber',
  WITHDRAWN: 'badge badge-gray',
};

export function StatusBadge({ status }) {
  return (
    <span className={STATUS_CLASS[status] || 'badge badge-gray'}>
      <span className="dot" />
      {status}
    </span>
  );
}

export function ActiveBadge({ active }) {
  return (
    <span className={active ? 'badge badge-green' : 'badge badge-red'}>
      <span className="dot" />
      {active ? 'ACTIVE' : 'DEACTIVATED'}
    </span>
  );
}

/* Deterministic pastel-from-name avatar with the person's initials. */
const AVATAR_PALETTES = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#2563eb)',
  'linear-gradient(135deg,#10b981,#0d9488)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#ec4899,#be185d)',
];

export function Avatar({ name = '?', size = 'md', ring = false }) {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const style = {
    backgroundImage: AVATAR_PALETTES[hash % AVATAR_PALETTES.length],
    width: undefined,
    height: undefined,
  };
  return (
    <span
      className={`avatar size-${size}${ring ? ' avatar-ring' : ''}`}
      style={style}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function EmptyState({ title, hint, action, icon }) {
  const Icon = icon || Calendar;
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={28} /></div>
      <h3>{title}</h3>
      {hint ? <p>{hint}</p> : null}
      {action || null}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="pager">
      <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
        ← Prev
      </button>
      <span>Page {page + 1} of {totalPages}</span>
      <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
        Next <ArrowRight size={13} />
      </button>
    </div>
  );
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton" />
          <div className="skeleton" style={{ flex: 1 }} />
          <div className="skeleton" style={{ width: '22%' }} />
        </div>
      ))}
    </div>
  );
}
