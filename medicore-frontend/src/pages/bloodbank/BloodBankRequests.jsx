import { useCallback, useEffect, useState } from 'react';
import { bloodBankService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field, Modal, StatCard } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Activity, AlertCircle, Check, Clock, Droplet } from '../../components/Icons.jsx';

const TABS = [
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];

export default function BloodBankRequests() {
  const toast = useToast();
  const [tab, setTab] = useState('REQUESTED');
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decide, setDecide] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const loadStats = useCallback(() => {
    bloodBankService.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    bloodBankService.allRequests({ status: tab || undefined, page: 0, size: 50 })
      .then(({ data }) => setRows(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    try {
      await bloodBankService.decideRequest(decide.id, { status: f.get('status'), note: f.get('note') || null });
      toast(`Request ${decide.id} → ${String(f.get('status')).toLowerCase()}.`, 'success');
      setDecide(null);
      load(); loadStats();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1><Activity size={22} /> Transfusion requests</h1>
        <p>Approving reserves units for the patient; fulfilling issues them, soonest-to-expire first.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="stats-grid">
        <StatCard icon={Activity} tone="blue" value={stats?.requested ?? '—'} label="Awaiting decision" />
        <StatCard icon={Clock} tone="cyan" value={stats?.approved ?? '—'} label="Approved" />
        <StatCard icon={Check} tone="green" value={stats?.fulfilled ?? '—'} label="Fulfilled" />
        <StatCard icon={AlertCircle} tone="red" value={stats?.criticalLots ?? '—'} label="Critically low lots" />
      </div>

      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      {loading ? <Loading /> : null}
      {!loading && rows.length === 0 ? (
        <div className="card"><EmptyState title="No requests here" hint="Nothing with this status." icon={Droplet} /></div>
      ) : null}

      {rows.length > 0 ? (
        <div className="card">
          <div className="card-title-row"><h3><Activity size={18} /> {rows.length} request(s)</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Requester</th><th>Patient</th><th>Group</th><th>Component</th><th>Units</th><th>Urgency</th><th>Hospital</th><th>Status</th><th>Issued from</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.requesterName}<div className="cell-sub">{r.requesterRole}</div></td>
                    <td className="cell-strong">{r.patientName}</td>
                    <td><BloodGroupBadge label={r.bloodGroupLabel} /></td>
                    <td>{r.componentLabel}</td>
                    <td>{r.unitsNeeded}</td>
                    <td><span className={`badge ${r.urgency === 'CRITICAL' ? 'badge-red' : r.urgency === 'URGENT' ? 'badge-amber' : 'badge-gray'}`}>{r.urgency}</span></td>
                    <td>{r.hospital}<div className="cell-sub">{r.city}</div></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="cell-sub">{r.fulfilledFrom || '—'}</td>
                    <td className="actions-cell">
                      {(r.status === 'REQUESTED' || r.status === 'APPROVED') ? (
                        <button className="btn btn-primary btn-sm" onClick={() => { setDecide(r); setFormError(''); }}>Decide</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {decide ? (
        <Modal title={`Decide request #${decide.id}`} icon={Activity} onClose={() => setDecide(null)}>
          <div className="booking-summary">
            <b>{decide.patientName}</b>
            <span className="muted">{decide.bloodGroupLabel} · {decide.componentLabel} · {decide.unitsNeeded} unit(s) · {decide.urgency}</span>
            <span className="muted">Requested by {decide.requesterName} ({decide.requesterRole})</span>
            <span className="muted">{decide.hospital}, {decide.city}</span>
          </div>
          <form onSubmit={submit}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <Field label="Decision">
              <select name="status" defaultValue={decide.status === 'APPROVED' ? 'FULFILLED' : 'APPROVED'}>
                <option value="APPROVED">Approve — reserve units</option>
                <option value="FULFILLED">Fulfil — issue units (soonest expiry first)</option>
                <option value="REJECTED">Reject</option>
              </select>
            </Field>
            <Field label="Note" hint="optional">
              <textarea name="note" rows={2} placeholder="e.g. units reserved at MediCore Central Blood Bank" />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setDecide(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Apply decision'}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
