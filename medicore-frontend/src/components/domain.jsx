import { X } from './Icons.jsx';

/**
 * Presentational helpers shared by the blood-bank and organ-donation pages.
 *
 * Kept here rather than duplicated per page: the two domains render the same
 * ideas (a blood group, a compatibility tier, a status tab strip, a modal) on
 * every screen, and the existing ui.jsx already owns the truly generic pieces
 * (loading, errors, empty states, pagination).
 */

/** Blood group as a compact pill. Colour signals the group family, not urgency. */
export function BloodGroupBadge({ label, size = 'md' }) {
  if (!label) return <span className="muted">—</span>;
  const family = String(label).replace(/[+-]/g, '');
  const cls =
    family === 'O' ? 'badge-red'
      : family === 'A' ? 'badge-blue'
        : family === 'B' ? 'badge-cyan'
          : 'badge-amber';
  return (
    <span className={`badge ${cls}`} style={size === 'sm' ? { fontSize: '0.72rem', padding: '2px 8px' } : undefined}>
      {label}
    </span>
  );
}

const TIER_CLASS = {
  EXACT: 'badge-green',
  ABO_COMPATIBLE: 'badge-blue',
  IMMUNE_PRIVILEGED: 'badge-cyan',
  INCOMPATIBLE: 'badge-red',
};

/** Compatibility tier returned by the organ matching engine. */
export function TierBadge({ tier, label }) {
  if (!tier) return <span className="muted">—</span>;
  const text = label || String(tier).replace(/_/g, ' ').toLowerCase();
  return (
    <span className={`badge ${TIER_CLASS[tier] || 'badge-gray'}`}>
      <span className="dot" />
      {text}
    </span>
  );
}

/**
 * Status tab strip with optional counts, using the stylesheet's existing
 * .filter-tabs / .filter-tab rules.
 */
export function DomainTabs({ options, value, onChange }) {
  return (
    <div className="filter-tabs">
      {options.map((o) => (
        <button
          key={o.value ?? 'ALL'}
          type="button"
          className={`filter-tab${value === (o.value ?? 'ALL') ? ' active' : ''}`}
          onClick={() => onChange(o.value ?? 'ALL')}
        >
          {o.label}
          {o.count !== undefined && o.count !== null ? <span className="count"> ({o.count})</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Minimal modal shell matching the app's existing .modal-backdrop/.modal styles. */
export function Modal({ title, icon: Icon, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal card"
        style={wide ? { maxWidth: 640 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-title-row" style={{ marginBottom: 10 }}>
          <h3>{Icon ? <Icon size={18} /> : null} {title}</h3>
          <button type="button" className="btn btn-icon btn-outline" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Small labelled statistic used across the operator dashboards. */
export function StatCard({ icon: Icon, tone = 'blue', value, label }) {
  return (
    <div className="card stat-card">
      <span className={`stat-icon ${tone}`}>{Icon ? <Icon size={20} /> : null}</span>
      <div>
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

/** Renders a "field" labelled control, so forms stay visually consistent. */
export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}{hint ? <span className="muted"> — {hint}</span> : null}</span>
      {children}
    </label>
  );
}
