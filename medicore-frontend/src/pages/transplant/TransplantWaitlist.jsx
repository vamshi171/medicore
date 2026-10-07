import { useCallback, useEffect, useState } from 'react';
import { organService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, Modal, StatCard, TierBadge } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Users, Heart, Sparkle, Activity } from '../../components/Icons.jsx';

const STATUSES = [
  { value: 'WAITING', label: 'Waiting' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'TRANSPLANTED', label: 'Transplanted' },
  { value: 'REMOVED', label: 'Removed' },
];

export default function TransplantWaitlist() {
  const toast = useToast();
  const [status, setStatus] = useState('WAITING');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // { entry, list } while the ranked-donor modal is open.
  const [candidates, setCandidates] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const loadStats = useCallback(() => {
    organService.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  // The counters must move with the table, otherwise a proposal leaves the
  // cards claiming one more waiting patient than the list actually shows.
  const load = useCallback(() => {
    setLoading(true);
    organService.waitlist({ status: status || undefined, page: 0, size: 50 })
      .then(({ data }) => setRows(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
    loadStats();
  }, [status, loadStats]);

  useEffect(() => { load(); }, [load]);

  const setStatusAction = async (id, next) => {
    try {
      await organService.setWaitlistStatus(id, { status: next });
      toast(`Entry ${id} → ${next.toLowerCase()}.`, 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  // Ranked, ABO-checked donors for one entry, straight from the matching engine.
  const openCandidates = async (entry) => {
    setCandidates({ entry, list: [] });
    setLoadingCandidates(true);
    try {
      const { data } = await organService.candidates(entry.id);
      setCandidates({ entry, list: data.data });
    } catch (err) {
      setError(extractError(err));
      setCandidates(null);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const propose = async (donorId) => {
    try {
      await organService.proposeMatch({
        donorId,
        recipientId: candidates.entry.id,
        notes: 'Proposed from the transplant desk',
      });
      toast('Allocation proposed — track it under Allocations.', 'success');
      setCandidates(null);
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1><Users size={22} /> Transplant waiting list</h1>
        <p>Patients awaiting an organ. Coordinators triage, match and move entries through the chain.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="stats-grid">
        <StatCard icon={Heart} tone="red" value={stats?.waiting ?? '—'} label="Waiting" />
        <StatCard icon={Sparkle} tone="cyan" value={stats?.matched ?? '—'} label="Matched" />
        <StatCard icon={Activity} tone="green" value={stats?.transplanted ?? '—'} label="Transplanted" />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3><Sparkle size={18} /> Filter by status</h3>
        </div>
        <div className="filters">
          <div className="grow">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Loading /> : null}
      {!loading && rows.length === 0 ? (
        <div className="card"><EmptyState title="Nobody is waiting" hint="Clinicians list patients from their portal." icon={Users} /></div>
      ) : null}

      {rows.length > 0 ? (
        <div className="card">
          <div className="card-title-row">
            <h3><Users size={18} /> {rows.length} entry(s)</h3>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Patient</th><th>Organ</th><th>Group</th><th>Urgency</th><th>Hospital</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td className="cell-strong">{w.patientName}</td>
                    <td>{w.organLabel}</td>
                    <td><span className="badge badge-blue">{w.bloodGroupLabel}</span></td>
                    <td><span className={`badge ${w.urgencyScore >= 8 ? 'badge-red' : w.urgencyScore >= 5 ? 'badge-amber' : 'badge-gray'}`}>{w.urgencyScore}/10</span></td>
                    <td>{w.hospital}</td>
                    <td><StatusBadge status={w.status} /></td>
                    <td className="actions-cell">
                      {w.status === 'WAITING' ? (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => openCandidates(w)}>Find donors</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setStatusAction(w.id, 'REMOVED')}>Remove</button>
                        </>
                      ) : null}
                      {w.status === 'MATCHED' ? (
                        <button className="btn btn-green btn-sm" onClick={() => setStatusAction(w.id, 'TRANSPLANTED')}>Mark transplanted</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {candidates ? (
        <Modal
          title={`Compatible donors for ${candidates.entry.patientName}`}
          icon={Sparkle}
          onClose={() => setCandidates(null)}
          wide
        >
          <div className="booking-summary">
            <b>Needs {candidates.entry.organLabel}</b>
            <span className="muted">
              Recipient group <BloodGroupBadge label={candidates.entry.bloodGroupLabel} /> · urgency {candidates.entry.urgencyScore}/10
            </span>
          </div>
          {loadingCandidates ? <Loading label="Ranking donors…" /> : null}
          {!loadingCandidates && candidates.list.length === 0 ? (
            <EmptyState title="No compatible donors" hint="Nobody with a usable pledge matches this recipient yet." icon={Heart} />
          ) : null}
          {!loadingCandidates && candidates.list.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Donor</th><th>Group</th><th>Organs pledged</th><th>Match</th><th /></tr></thead>
                <tbody>
                  {candidates.list.map((c) => (
                    <tr key={c.donorId}>
                      <td className="cell-strong">{c.donorName}<div className="cell-sub">{c.age} yrs · {c.city}</div></td>
                      <td><BloodGroupBadge label={c.bloodGroupLabel} /></td>
                      <td>{(c.organs || []).map((o) => <span className="badge badge-blue" key={o.name} style={{ marginRight: 4 }}>{o.label}</span>)}</td>
                      <td><TierBadge tier={c.tier} label={c.tierLabel} /></td>
                      <td className="actions-cell">
                        <button className="btn btn-primary btn-sm" onClick={() => propose(c.donorId)}>Propose</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
