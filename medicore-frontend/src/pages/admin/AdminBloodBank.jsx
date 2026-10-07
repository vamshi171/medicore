import { useCallback, useEffect, useState } from 'react';
import { bloodBankService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field, Modal, StatCard } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Droplet, Shield, Plus, Check, X, Users, AlertCircle, Activity, Clock, Trash } from '../../components/Icons.jsx';

const TABS = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'requests', label: 'Requests' },
  { value: 'donors', label: 'Donor registry' },
];

const REQUEST_TABS = [
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
];

export default function AdminBloodBank() {
  const toast = useToast();
  const [tab, setTab] = useState('inventory');
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const [inventory, setInventory] = useState([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [invFilters, setInvFilters] = useState({ bloodGroup: '', component: '', city: '' });

  const [statusTab, setStatusTab] = useState('REQUESTED');
  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [decide, setDecide] = useState(null);

  const [donors, setDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(true);

  const [showLot, setShowLot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    bloodBankService.metadata().then(({ data }) => setMeta(data.data)).catch((err) => setError(extractError(err)));
  }, []);

  const loadStats = useCallback(() => {
    bloodBankService.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  const loadInventory = useCallback(() => {
    setLoadingInv(true);
    bloodBankService.inventory({
      bloodGroup: invFilters.bloodGroup || undefined,
      component: invFilters.component || undefined,
      city: invFilters.city || undefined,
    })
      .then(({ data }) => setInventory(data.data))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingInv(false));
  }, [invFilters]);

  const loadRequests = useCallback(() => {
    setLoadingReq(true);
    bloodBankService.allRequests({ status: statusTab || undefined, page: 0, size: 50 })
      .then(({ data }) => setRequests(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingReq(false));
  }, [statusTab]);

  const loadDonors = useCallback(() => {
    setLoadingDonors(true);
    bloodBankService.donors({ page: 0, size: 50 })
      .then(({ data }) => setDonors(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingDonors(false));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadInventory(); }, [loadInventory]);
  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => { loadDonors(); }, [loadDonors]);

  const createLot = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    try {
      await bloodBankService.createLot({
        centerName: f.get('centerName'),
        city: f.get('city'),
        bloodGroup: f.get('bloodGroup'),
        component: f.get('component'),
        unitsAvailable: Number(f.get('unitsAvailable')),
        unitsReserved: Number(f.get('unitsReserved') || 0),
        criticalThreshold: Number(f.get('criticalThreshold') || 3),
        expiryDate: f.get('expiryDate'),
        notes: f.get('notes') || null,
      });
      toast('Stock lot recorded.', 'success');
      setShowLot(false);
      loadInventory(); loadStats();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const adjust = async (id, delta) => {
    try {
      await bloodBankService.adjustLot(id, delta);
      toast(delta > 0 ? `Added ${delta} unit(s).` : `Removed ${Math.abs(delta)} unit(s).`, 'success');
      loadInventory(); loadStats();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const discard = async (id) => {
    try {
      await bloodBankService.discardLot(id);
      toast('Lot withdrawn from circulation.', 'success');
      loadInventory(); loadStats();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    try {
      await bloodBankService.decideRequest(decide.id, { status: f.get('status'), note: f.get('note') || null });
      toast(`Request ${decide.id} marked ${String(f.get('status')).toLowerCase()}.`, 'success');
      setDecide(null);
      loadRequests(); loadInventory(); loadStats();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleEligibility = async (donor) => {
    const next = donor.eligibility === 'ELIGIBLE' ? 'DEFERRED' : 'ELIGIBLE';
    try {
      await bloodBankService.setDonorEligibility(donor.id, {
        eligibility: next,
        reason: next === 'DEFERRED' ? 'Deferred by blood bank officer' : null,
      });
      toast(`${donor.fullName} is now ${next.toLowerCase()}.`, 'success');
      loadDonors(); loadStats();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const groupOptions = meta?.bloodGroups || [];
  const componentOptions = meta?.components || [];

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Shield size={13} /> Admin · blood bank</div>
        <h1>Blood banking operations</h1>
        <p className="hero-sub">
          Full stock control with expiry tracking, the request decision board, and the donor
          registry — the operational view patients and doctors deliberately do not get.
        </p>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="stats-grid">
        <StatCard icon={Droplet} tone="red" value={stats?.usableUnits ?? '—'} label="Usable units" />
        <StatCard icon={AlertCircle} tone="amber" value={stats?.criticalLots ?? '—'} label="Critically low lots" />
        <StatCard icon={Clock} tone="cyan" value={stats?.expiringIn30Days ?? '—'} label="Expiring in 30 days" />
        <StatCard icon={Activity} tone="blue" value={stats?.requested ?? '—'} label="Requests to decide" />
        <StatCard icon={Users} tone="green" value={stats?.registeredDonors ?? '—'} label="Registered donors" />
      </div>

      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'inventory' ? (
        <>
          <div className="card">
            <div className="filters">
              <Field label="Blood group">
                <select value={invFilters.bloodGroup} onChange={(e) => setInvFilters({ ...invFilters, bloodGroup: e.target.value })}>
                  <option value="">Any group</option>
                  {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                </select>
              </Field>
              <Field label="Component">
                <select value={invFilters.component} onChange={(e) => setInvFilters({ ...invFilters, component: e.target.value })}>
                  <option value="">Any component</option>
                  {componentOptions.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="City">
                <input value={invFilters.city} onChange={(e) => setInvFilters({ ...invFilters, city: e.target.value })} placeholder="e.g. Mumbai" />
              </Field>
              <div style={{ marginLeft: 'auto' }}>
                <button className="btn btn-primary" onClick={() => { setShowLot(true); setFormError(''); }}>
                  <Plus size={15} /> New stock lot
                </button>
              </div>
            </div>
          </div>

          {loadingInv ? <Loading /> : null}
          {!loadingInv && inventory.length === 0 ? (
            <div className="card"><EmptyState title="No stock lots" hint="Record the first lot for this filter." icon={Droplet} /></div>
          ) : null}

          {inventory.length > 0 ? (
            <div className="card">
              <div className="card-title-row"><h3><Droplet size={18} /> Stock lots ({inventory.length})</h3></div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Centre</th><th>Group</th><th>Component</th><th>Available</th><th>Reserved</th><th>Expiry</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {inventory.map((i) => (
                      <tr key={i.id}>
                        <td className="cell-strong">{i.centerName}<div className="cell-sub">{i.city}</div></td>
                        <td><BloodGroupBadge label={i.bloodGroupLabel} /></td>
                        <td>{i.componentLabel}</td>
                        <td className="cell-strong">{i.availableUnits}</td>
                        <td>{i.unitsReserved}</td>
                        <td>{i.expiryDate}{i.expired ? <span className="badge badge-red" style={{ marginLeft: 6 }}>expired</span> : null}</td>
                        <td>
                          {i.critical ? <span className="badge badge-red"><span className="dot" />Low</span> : null}
                          {i.expiringSoon ? <span className="badge badge-amber" style={{ marginLeft: i.critical ? 6 : 0 }}><span className="dot" />Expiring</span> : null}
                          {!i.critical && !i.expiringSoon ? <span className="badge badge-green"><span className="dot" />OK</span> : null}
                        </td>
                        <td className="actions-cell">
                          <button className="btn btn-outline btn-sm" onClick={() => adjust(i.id, 1)}>+1</button>{' '}
                          <button className="btn btn-outline btn-sm" onClick={() => adjust(i.id, -1)}>−1</button>{' '}
                          <button className="btn btn-outline btn-sm" onClick={() => discard(i.id)}><Trash size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'requests' ? (
        <div className="card">
          <div className="card-title-row"><h3><Activity size={18} /> Request board</h3></div>
          <DomainTabs options={REQUEST_TABS} value={statusTab} onChange={setStatusTab} />
          {loadingReq ? <Loading /> : null}
          {!loadingReq && requests.length === 0 ? (
            <EmptyState title="Nothing here" hint="No requests with this status." icon={Droplet} />
          ) : null}
          {requests.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Requester</th><th>Patient</th><th>Group</th><th>Component</th><th>Units</th><th>Urgency</th><th>Hospital</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.requesterName}<div className="cell-sub">{r.requesterRole}</div></td>
                      <td className="cell-strong">{r.patientName}</td>
                      <td><BloodGroupBadge label={r.bloodGroupLabel} /></td>
                      <td>{r.componentLabel}</td>
                      <td>{r.unitsNeeded}</td>
                      <td><span className={`badge ${r.urgency === 'CRITICAL' ? 'badge-red' : r.urgency === 'URGENT' ? 'badge-amber' : 'badge-gray'}`}>{r.urgency}</span></td>
                      <td>{r.hospital}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="actions-cell">
                        {(r.status === 'REQUESTED' || r.status === 'APPROVED') ? (
                          <button className="btn btn-primary btn-sm" onClick={() => { setDecide(r); setFormError(''); }}>
                            Decide
                          </button>
                        ) : <span className="muted">{r.fulfilledFrom || '—'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'donors' ? (
        <div className="card">
          <div className="card-title-row"><h3><Users size={18} /> Donor registry ({donors.length})</h3></div>
          {loadingDonors ? <Loading /> : null}
          {!loadingDonors && donors.length === 0 ? (
            <EmptyState title="No donors registered" hint="Patients, doctors and officers can register themselves." icon={Users} />
          ) : null}
          {donors.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Donor</th><th>Group</th><th>City</th><th>Age / weight</th><th>Last donation</th><th>Next eligible</th><th>Eligibility</th><th /></tr>
                </thead>
                <tbody>
                  {donors.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-strong">{d.fullName}</td>
                      <td><BloodGroupBadge label={d.bloodGroupLabel} /></td>
                      <td>{d.city}</td>
                      <td>{d.age} / {d.weightKg} kg</td>
                      <td>{d.lastDonationDate || '—'}</td>
                      <td>{d.nextEligibleDate || '—'}{d.daysUntilEligible > 0 ? ` (${d.daysUntilEligible}d)` : ''}</td>
                      <td>
                        {d.eligibleNow
                          ? <span className="badge badge-green"><span className="dot" />Eligible</span>
                          : <span className="badge badge-amber"><span className="dot" />{d.eligibility}</span>}
                        <div className="cell-sub">{d.deferralReason || ''}</div>
                      </td>
                      <td className="actions-cell">
                        <button className="btn btn-outline btn-sm" onClick={() => toggleEligibility(d)}>
                          {d.eligibility === 'ELIGIBLE' ? <><X size={13} /> Defer</> : <><Check size={13} /> Clear</>}
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

      {showLot ? (
        <Modal title="Record a stock lot" icon={Droplet} onClose={() => setShowLot(false)} wide>
          <form onSubmit={createLot}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <div className="form-grid">
              <Field label="Centre">
                <input name="centerName" required />
              </Field>
              <Field label="City">
                <input name="city" defaultValue="Hyderabad" required />
              </Field>
              <Field label="Blood group">
                <select name="bloodGroup" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                </select>
              </Field>
              <Field label="Component">
                <select name="component" required defaultValue="RED_CELLS">
                  {componentOptions.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Units available">
                <input type="number" name="unitsAvailable" min="0" defaultValue="10" required />
              </Field>
              <Field label="Units reserved">
                <input type="number" name="unitsReserved" min="0" defaultValue="0" />
              </Field>
              <Field label="Critical threshold">
                <input type="number" name="criticalThreshold" min="0" defaultValue="3" />
              </Field>
              <Field label="Expiry date">
                <input type="date" name="expiryDate" required />
              </Field>
            </div>
            <Field label="Notes" hint="optional">
              <input name="notes" />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowLot(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Record lot'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {decide ? (
        <Modal title={`Decide request #${decide.id}`} icon={Activity} onClose={() => setDecide(null)}>
          <div className="booking-summary">
            <b>{decide.patientName}</b>
            <span className="muted">{decide.bloodGroupLabel} · {decide.componentLabel} · {decide.unitsNeeded} unit(s) · {decide.urgency}</span>
            <span className="muted">{decide.hospital}, {decide.city}</span>
          </div>
          <form onSubmit={submitDecision}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <Field label="Decision">
              <select name="status" defaultValue="APPROVED">
                <option value="APPROVED">Approve — reserve units</option>
                <option value="FULFILLED">Fulfil — issue units (soonest expiry first)</option>
                <option value="REJECTED">Reject</option>
              </select>
            </Field>
            <Field label="Note" hint="optional">
              <textarea name="note" rows={2} placeholder="e.g. reserved at City Care Blood Centre" />
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
