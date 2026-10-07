import { useCallback, useEffect, useState } from 'react';
import { bloodBankService, extractError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field, Modal } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Droplet, Search, Calendar, Plus, Check, X, Heart, Clock } from '../../components/Icons.jsx';

const TABS = [
  { value: 'availability', label: 'Availability' },
  { value: 'requests', label: 'My requests' },
  { value: 'donor', label: 'Donor profile' },
];

function nameFromEmail(email) {
  if (!email) return '';
  const local = email.substring(0, email.indexOf('@'));
  return local.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PatientBloodBank() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('availability');
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  // availability
  const [filters, setFilters] = useState({ bloodGroup: '', component: '', city: '' });
  const [rows, setRows] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(true);

  // my requests
  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  // donor
  const [donor, setDonor] = useState(null);
  const [donorMissing, setDonorMissing] = useState(false);
  const [showDonor, setShowDonor] = useState(false);

  useEffect(() => {
    bloodBankService.metadata()
      .then(({ data }) => setMeta(data.data))
      .catch((err) => setError(extractError(err)));
  }, []);

  const loadAvailability = useCallback(() => {
    setLoadingAvail(true);
    bloodBankService.availability({
      bloodGroup: filters.bloodGroup || undefined,
      component: filters.component || undefined,
      city: filters.city || undefined,
    })
      .then(({ data }) => { setRows(data.data); setError(''); })
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingAvail(false));
  }, [filters]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  const loadRequests = useCallback(() => {
    setLoadingReq(true);
    bloodBankService.myRequests({ page: 0, size: 50 })
      .then(({ data }) => setRequests(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingReq(false));
  }, []);

  const loadDonor = useCallback(() => {
    bloodBankService.myDonor()
      .then(({ data }) => { setDonor(data.data); setDonorMissing(false); })
      .catch((err) => {
        // 404 simply means "not a registered donor yet" — offer the form.
        if (err?.response?.status === 404) { setDonor(null); setDonorMissing(true); } else setError(extractError(err));
      });
  }, []);

  useEffect(() => { loadRequests(); loadDonor(); }, [loadRequests, loadDonor]);

  const submitRequest = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    try {
      await bloodBankService.raiseRequest({
        patientName: f.get('patientName'),
        bloodGroup: f.get('bloodGroup'),
        component: f.get('component'),
        unitsNeeded: Number(f.get('unitsNeeded')),
        urgency: f.get('urgency'),
        hospital: f.get('hospital'),
        city: f.get('city'),
        reason: f.get('reason') || null,
      });
      toast('Blood request submitted — the blood bank will review it.', 'success');
      setShowRequest(false);
      loadRequests();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async (id) => {
    try {
      await bloodBankService.cancelRequest(id);
      toast('Request cancelled.', 'success');
      loadRequests();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const submitDonor = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    const payload = {
      fullName: f.get('fullName'),
      bloodGroup: f.get('bloodGroup'),
      age: Number(f.get('age')),
      weightKg: Number(f.get('weightKg')),
      phone: f.get('phone') || null,
      city: f.get('city'),
      lastDonationDate: f.get('lastDonationDate') || null,
    };
    try {
      if (donor) await bloodBankService.updateDonor(payload);
      else await bloodBankService.registerDonor(payload);
      toast(donor ? 'Donor details updated.' : 'Registered as a blood donor — thank you!', 'success');
      setShowDonor(false);
      loadDonor();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const groupOptions = meta?.bloodGroups || [];
  const componentOptions = meta?.components || [];
  const urgencyOptions = meta?.urgencies || [];

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Droplet size={13} /> Blood bank</div>
        <h1>Blood availability &amp; requests</h1>
        <p className="hero-sub">
          Search live stock across blood centres, raise a transfusion request, and register
          yourself as a donor — all through the blood bank service.
        </p>
        <div className="hero-actions">
          <button className="btn-hero" onClick={() => { setShowRequest(true); setFormError(''); }}>
            <Plus size={16} /> New blood request
          </button>
          <button className="btn-hero ghost" onClick={() => setTab('donor')}>
            <Heart size={16} /> Donor profile
          </button>
        </div>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'availability' ? (
        <>
          <div className="card">
            <div className="filters">
              <Field label="Blood group">
                <select value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
                  <option value="">Any group</option>
                  {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                </select>
              </Field>
              <Field label="Component">
                <select value={filters.component} onChange={(e) => setFilters({ ...filters, component: e.target.value })}>
                  <option value="">Any component</option>
                  {componentOptions.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="City">
                <div className="input-wrap">
                  <span className="input-icon"><Search size={15} /></span>
                  <input placeholder="e.g. Hyderabad" value={filters.city}
                         onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
                </div>
              </Field>
            </div>
          </div>

          {loadingAvail ? <Loading /> : null}
          {!loadingAvail && rows.length === 0 ? (
            <div className="card">
              <EmptyState title="No matching stock" hint="Try another group, component or city." icon={Droplet} />
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="card">
              <div className="card-title-row"><h3><Droplet size={18} /> Available units</h3></div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Centre</th><th>City</th><th>Group</th><th>Component</th><th>Units</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.centerName}-${r.bloodGroup}-${r.component}-${i}`}>
                        <td className="cell-strong">{r.centerName}</td>
                        <td>{r.city}</td>
                        <td><BloodGroupBadge label={r.bloodGroupLabel} /></td>
                        <td>{r.componentLabel}</td>
                        <td className="cell-strong">{r.availableUnits}</td>
                        <td>
                          {r.critical ? <span className="badge badge-red"><span className="dot" />Low</span> : null}
                          {r.expiringSoon ? <span className="badge badge-amber" style={{ marginLeft: 6 }}><span className="dot" />Expiring</span> : null}
                          {!r.critical && !r.expiringSoon ? <span className="badge badge-green"><span className="dot" />Available</span> : null}
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
          <div className="card-title-row">
            <h3><Calendar size={18} /> My blood requests</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowRequest(true); setFormError(''); }}>
              <Plus size={14} /> New request
            </button>
          </div>
          {loadingReq ? <Loading /> : null}
          {!loadingReq && requests.length === 0 ? (
            <EmptyState title="No requests yet" hint="Raise a request and it will appear here with its status."
                        icon={Droplet}
                        action={<button className="btn btn-primary" onClick={() => setShowRequest(true)}>New request</button>} />
          ) : null}
          {requests.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Group</th><th>Component</th><th>Units</th><th>Urgency</th><th>Hospital</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-strong">{r.patientName}</td>
                      <td><BloodGroupBadge label={r.bloodGroupLabel} /></td>
                      <td>{r.componentLabel}</td>
                      <td>{r.unitsNeeded}</td>
                      <td>
                        <span className={`badge ${r.urgency === 'CRITICAL' ? 'badge-red' : r.urgency === 'URGENT' ? 'badge-amber' : 'badge-gray'}`}>
                          {r.urgency}
                        </span>
                      </td>
                      <td>{r.hospital}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="actions-cell">
                        {(r.status === 'REQUESTED' || r.status === 'APPROVED') ? (
                          <button className="btn btn-outline btn-sm" onClick={() => cancelRequest(r.id)}>
                            <X size={13} /> Cancel
                          </button>
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

      {tab === 'donor' ? (
        <div className="two-col">
          <div className="card">
            <div className="card-title-row">
              <h3><Heart size={18} /> {donor ? 'Your donor profile' : 'Become a blood donor'}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowDonor(true); setFormError(''); }}>
                {donor ? 'Edit' : 'Register'}
              </button>
            </div>
            {donor ? (
              <div className="kv-list">
                <div className="kv"><span className="k">Name</span><span className="v">{donor.fullName}</span></div>
                <div className="kv"><span className="k">Blood group</span><span className="v"><BloodGroupBadge label={donor.bloodGroupLabel} /></span></div>
                <div className="kv"><span className="k">City</span><span className="v">{donor.city}</span></div>
                <div className="kv"><span className="k">Age / weight</span><span className="v">{donor.age} yrs · {donor.weightKg} kg</span></div>
                <div className="kv"><span className="k">Last donation</span><span className="v">{donor.lastDonationDate || '—'}</span></div>
                <div className="kv">
                  <span className="k">Eligibility</span>
                  <span className="v">
                    {donor.eligibleNow
                      ? <span className="badge badge-green"><span className="dot" />Eligible now</span>
                      : <span className="badge badge-amber"><span className="dot" />{donor.eligibility}</span>}
                  </span>
                </div>
                {donor.nextEligibleDate && !donor.eligibleNow ? (
                  <div className="kv"><span className="k">Eligible again</span><span className="v">{donor.nextEligibleDate} ({donor.daysUntilEligible} days)</span></div>
                ) : null}
              </div>
            ) : donorMissing ? (
              <EmptyState title="You are not a registered donor"
                          hint="Register once and blood centres can reach you when your group is needed."
                          icon={Heart}
                          action={<button className="btn btn-primary" onClick={() => setShowDonor(true)}>Register as donor</button>} />
            ) : <Loading />}
          </div>

          <div className="card">
            <div className="card-title-row"><h3><Clock size={18} /> Donation rules</h3></div>
            <div className="kv-list">
              <div className="kv"><span className="k">Age</span><span className="v">18–65 years</span></div>
              <div className="kv"><span className="k">Minimum weight</span><span className="v">45 kg</span></div>
              <div className="kv"><span className="k">Cool-down</span><span className="v">90 days between whole-blood donations</span></div>
              <div className="kv"><span className="k">Your eligibility</span><span className="v">{donor?.eligibleNow ? 'Cleared to donate' : 'Pending / in cool-down'}</span></div>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Eligibility is recalculated from your last donation date, and the blood bank can
              defer you for clinical reasons.
            </p>
          </div>
        </div>
      ) : null}

      {showRequest ? (
        <Modal title="New blood request" icon={Droplet} onClose={() => setShowRequest(false)} wide>
          <form onSubmit={submitRequest}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <Field label="Patient name">
              <input name="patientName" defaultValue={nameFromEmail(user?.email)} required />
            </Field>
            <div className="form-grid">
              <Field label="Blood group needed">
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
              <Field label="Units">
                <input type="number" name="unitsNeeded" min="1" max="20" defaultValue="2" required />
              </Field>
              <Field label="Urgency">
                <select name="urgency" defaultValue="ROUTINE">
                  {urgencyOptions.map((u) => <option key={u.name} value={u.name}>{u.label}</option>)}
                </select>
              </Field>
              <Field label="Hospital">
                <input name="hospital" required />
              </Field>
              <Field label="City">
                <input name="city" defaultValue="Hyderabad" required />
              </Field>
            </div>
            <Field label="Reason" hint="optional">
              <textarea name="reason" rows={2} placeholder="e.g. post-operative anaemia" />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowRequest(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showDonor ? (
        <Modal title={donor ? 'Edit donor profile' : 'Register as a blood donor'} icon={Heart} onClose={() => setShowDonor(false)} wide>
          <form onSubmit={submitDonor}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <div className="form-grid">
              <Field label="Full name">
                <input name="fullName" defaultValue={donor?.fullName || nameFromEmail(user?.email)} required />
              </Field>
              <Field label="Blood group">
                <select name="bloodGroup" required defaultValue={donor?.bloodGroup || ''}>
                  <option value="" disabled>Choose…</option>
                  {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                </select>
              </Field>
              <Field label="Age">
                <input type="number" name="age" min="18" max="65" defaultValue={donor?.age || 30} required />
              </Field>
              <Field label="Weight (kg)">
                <input type="number" name="weightKg" min="45" max="200" defaultValue={donor?.weightKg || 70} required />
              </Field>
              <Field label="Phone" hint="optional">
                <input name="phone" defaultValue={donor?.phone || ''} />
              </Field>
              <Field label="City">
                <input name="city" defaultValue={donor?.city || 'Hyderabad'} required />
              </Field>
              <Field label="Last donation" hint="optional">
                <input type="date" name="lastDonationDate" defaultValue={donor?.lastDonationDate || ''} />
              </Field>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowDonor(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>
                <Check size={15} /> {busy ? 'Saving…' : donor ? 'Save changes' : 'Register'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
