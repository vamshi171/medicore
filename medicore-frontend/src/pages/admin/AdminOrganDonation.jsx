import { useCallback, useEffect, useState } from 'react';
import { organService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field, Modal, StatCard, TierBadge } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Heart, Shield, Check, Users, Activity, Info, Sparkle } from '../../components/Icons.jsx';

const TABS = [
  { value: 'pledges', label: 'Donor pledges' },
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'matches', label: 'Allocations' },
];

export default function AdminOrganDonation() {
  const toast = useToast();
  const [tab, setTab] = useState('pledges');
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [pledges, setPledges] = useState([]);
  const [loadingPledges, setLoadingPledges] = useState(true);
  const [pledgeFilter, setPledgeFilter] = useState('PENDING');

  const [waitlist, setWaitlist] = useState([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(true);
  const [waitFilter, setWaitFilter] = useState('WAITING');

  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [verify, setVerify] = useState(null);
  const [candidates, setCandidates] = useState(null); // { entry, list }
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    organService.metadata().then(({ data }) => setMeta(data.data)).catch((err) => setError(extractError(err)));
  }, []);

  const loadStats = useCallback(() => {
    organService.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  const loadPledges = useCallback(() => {
    setLoadingPledges(true);
    organService.pledges({ status: pledgeFilter || undefined, page: 0, size: 50 })
      .then(({ data }) => setPledges(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingPledges(false));
  }, [pledgeFilter]);

  const loadWaitlist = useCallback(() => {
    setLoadingWaitlist(true);
    organService.waitlist({ status: waitFilter || undefined, page: 0, size: 50 })
      .then(({ data }) => setWaitlist(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingWaitlist(false));
  }, [waitFilter]);

  const loadMatches = useCallback(() => {
    setLoadingMatches(true);
    organService.matches({ page: 0, size: 50 })
      .then(({ data }) => setMatches(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingMatches(false));
  }, []);

  useEffect(() => { loadStats(); loadMatches(); }, [loadStats, loadMatches]);
  useEffect(() => { loadPledges(); }, [loadPledges]);
  useEffect(() => { loadWaitlist(); }, [loadWaitlist]);

  const submitVerify = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    try {
      await organService.verifyPledge(verify.id, { status: f.get('status'), note: f.get('note') || null });
      toast(`Pledge ${verify.id} set to ${String(f.get('status')).toLowerCase()}.`, 'success');
      setVerify(null);
      loadPledges(); loadStats();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const openCandidates = async (entry) => {
    setLoadingCandidates(true);
    setCandidates({ entry, list: [] });
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
    setBusy(true);
    try {
      await organService.proposeMatch({ donorId, recipientId: candidates.entry.id, notes: 'Proposed from the admin console' });
      toast('Allocation proposed.', 'success');
      setCandidates(null);
      loadWaitlist(); loadMatches(); loadStats();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const setWaitStatus = async (id, status) => {
    try {
      await organService.setWaitlistStatus(id, { status });
      toast(`Waitlist entry ${id} → ${status.toLowerCase()}.`, 'success');
      loadWaitlist(); loadStats();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const setMatchStatus = async (id, status) => {
    try {
      await organService.setMatchStatus(id, { status });
      toast(`Allocation ${id} → ${status.toLowerCase()}.`, 'success');
      loadMatches(); loadWaitlist(); loadStats();
    } catch (err) {
      setError(extractError(err));
    }
  };

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Shield size={13} /> Admin · organ donation</div>
        <h1>Transplant operations</h1>
        <p className="hero-sub">
          Verify donor pledges, manage the waiting list, and run ABO-aware allocations — the
          same authority a transplant coordinator has, plus platform oversight.
        </p>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="stats-grid">
        <StatCard icon={Check} tone="amber" value={stats?.pendingPledges ?? '—'} label="Pledges to verify" />
        <StatCard icon={Heart} tone="blue" value={stats?.totalPledges ?? '—'} label="Total pledges" />
        <StatCard icon={Users} tone="red" value={stats?.waiting ?? '—'} label="Patients waiting" />
        <StatCard icon={Sparkle} tone="cyan" value={stats?.matched ?? '—'} label="Matched" />
        <StatCard icon={Activity} tone="green" value={stats?.completedMatches ?? '—'} label="Transplants completed" />
      </div>

      {stats?.byOrgan?.length ? (
        <div className="card">
          <div className="card-title-row"><h3><Info size={18} /> Supply vs. demand by organ</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Organ</th><th>Waiting</th><th>Usable pledges</th><th>Balance</th></tr></thead>
              <tbody>
                {stats.byOrgan.filter((o) => o.waiting > 0 || o.pledges > 0).map((o) => {
                  const balance = o.pledges - o.waiting;
                  return (
                    <tr key={o.organ}>
                      <td className="cell-strong">{o.label}</td>
                      <td>{o.waiting}</td>
                      <td>{o.pledges}</td>
                      <td>
                        <span className={`badge ${balance >= 0 ? 'badge-green' : 'badge-red'}`}>
                          <span className="dot" />{balance >= 0 ? '+' : ''}{balance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'pledges' ? (
        <div className="card">
          <div className="card-title-row">
            <h3><Heart size={18} /> Donor pledges</h3>
            <select value={pledgeFilter} onChange={(e) => setPledgeFilter(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="PENDING">Awaiting verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="ACTIVE">Active</option>
              <option value="REVOKED">Revoked</option>
              <option value="">All statuses</option>
            </select>
          </div>
          {loadingPledges ? <Loading /> : null}
          {!loadingPledges && pledges.length === 0 ? (
            <EmptyState title="No pledges with this status" hint="Donors pledge themselves from their own portal." icon={Heart} />
          ) : null}
          {pledges.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Donor</th><th>Group</th><th>City</th><th>Organs pledged</th><th>Consent</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {pledges.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-strong">{p.fullName}<div className="cell-sub">{p.age} yrs · {p.city}</div></td>
                      <td><BloodGroupBadge label={p.bloodGroupLabel} /></td>
                      <td>{p.city}</td>
                      <td>
                        {(p.organs || []).map((o) => (
                          <span className="badge badge-blue" key={o.name} style={{ marginRight: 4 }}>{o.label}</span>
                        ))}
                      </td>
                      <td>{p.consentSigned ? <span className="badge badge-green"><span className="dot" />Signed</span> : <span className="badge badge-red"><span className="dot" />Withdrawn</span>}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="actions-cell">
                        <button className="btn btn-primary btn-sm" onClick={() => { setVerify(p); setFormError(''); }}>
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'waitlist' ? (
        <div className="card">
          <div className="card-title-row">
            <h3><Users size={18} /> Waiting list</h3>
            <select value={waitFilter} onChange={(e) => setWaitFilter(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="WAITING">Waiting</option>
              <option value="MATCHED">Matched</option>
              <option value="TRANSPLANTED">Transplanted</option>
              <option value="">All statuses</option>
            </select>
          </div>
          {loadingWaitlist ? <Loading /> : null}
          {!loadingWaitlist && waitlist.length === 0 ? (
            <EmptyState title="Nobody is waiting" hint="Clinicians list patients from their portal." icon={Users} />
          ) : null}
          {waitlist.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Organ</th><th>Group</th><th>Urgency</th><th>Hospital</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id}>
                      <td className="cell-strong">{w.patientName}</td>
                      <td>{w.organLabel}</td>
                      <td><BloodGroupBadge label={w.bloodGroupLabel} /></td>
                      <td><span className={`badge ${w.urgencyScore >= 8 ? 'badge-red' : w.urgencyScore >= 5 ? 'badge-amber' : 'badge-gray'}`}>{w.urgencyScore}/10</span></td>
                      <td>{w.hospital}<div className="cell-sub">{w.city}</div></td>
                      <td><StatusBadge status={w.status} /></td>
                      <td className="actions-cell">
                        {w.status === 'WAITING' ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => openCandidates(w)}>
                              <Sparkle size={13} /> Find donors
                            </button>{' '}
                            <button className="btn btn-outline btn-sm" onClick={() => setWaitStatus(w.id, 'REMOVED')}>Remove</button>
                          </>
                        ) : null}
                        {w.status === 'MATCHED' ? (
                          <button className="btn btn-green btn-sm" onClick={() => setWaitStatus(w.id, 'TRANSPLANTED')}>Mark transplanted</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'matches' ? (
        <div className="card">
          <div className="card-title-row"><h3><Sparkle size={18} /> Allocations</h3></div>
          {loadingMatches ? <Loading /> : null}
          {!loadingMatches && matches.length === 0 ? (
            <EmptyState title="No allocations yet" hint="Propose one from a waiting-list entry." icon={Sparkle} />
          ) : null}
          {matches.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Organ</th><th>Donor</th><th>Recipient</th><th>Match quality</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="cell-strong">{m.organLabel}</td>
                      <td>{m.donorName}</td>
                      <td>{m.recipientName}</td>
                      <td><TierBadge tier={null} label={m.compatibilityTier} /></td>
                      <td><StatusBadge status={m.status} /></td>
                      <td className="actions-cell">
                        {m.status === 'PROPOSED' ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => setMatchStatus(m.id, 'CONFIRMED')}>Confirm</button>{' '}
                            <button className="btn btn-outline btn-sm" onClick={() => setMatchStatus(m.id, 'WITHDRAWN')}>Withdraw</button>
                          </>
                        ) : null}
                        {m.status === 'CONFIRMED' ? (
                          <button className="btn btn-green btn-sm" onClick={() => setMatchStatus(m.id, 'COMPLETED')}>Complete</button>
                        ) : null}
                        {m.status === 'COMPLETED' || m.status === 'WITHDRAWN' ? <span className="muted">final</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {verify ? (
        <Modal title={`Verify pledge #${verify.id}`} icon={Check} onClose={() => setVerify(null)}>
          <div className="booking-summary">
            <b>{verify.fullName}</b>
            <span className="muted"><BloodGroupBadge label={verify.bloodGroupLabel} /> · {verify.age} yrs · {verify.city}</span>
            <span className="muted">{(verify.organs || []).map((o) => o.label).join(', ')}</span>
          </div>
          <form onSubmit={submitVerify}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <Field label="New status">
              <select name="status" defaultValue="ACTIVE">
                <option value="ACTIVE">Active — usable for allocation</option>
                <option value="VERIFIED">Verified</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </Field>
            <Field label="Clinical note" hint="optional">
              <textarea name="note" rows={2} placeholder="e.g. serology clear, fit for donation" />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setVerify(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Apply'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {candidates ? (
        <Modal title={`Compatible donors for ${candidates.entry.patientName}`} icon={Sparkle} onClose={() => setCandidates(null)} wide>
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
                <thead><tr><th>Donor</th><th>Group</th><th>Match</th><th /></tr></thead>
                <tbody>
                  {candidates.list.map((c) => (
                    <tr key={c.donorId}>
                      <td className="cell-strong">{c.donorName}<div className="cell-sub">{c.age} yrs · {c.city}</div></td>
                      <td><BloodGroupBadge label={c.bloodGroupLabel} /></td>
                      <td><TierBadge tier={c.tier} label={c.tierLabel} /></td>
                      <td className="actions-cell">
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => propose(c.donorId)}>
                          Propose
                        </button>
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
