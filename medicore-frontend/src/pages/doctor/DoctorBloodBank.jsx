import { useCallback, useEffect, useState } from 'react';
import { bloodBankService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Droplet, Search, Plus, X, Info } from '../../components/Icons.jsx';

const TABS = [
  { value: 'raise', label: 'Raise a request' },
  { value: 'mine', label: 'My requests' },
  { value: 'availability', label: 'Availability' },
];

export default function DoctorBloodBank() {
  const toast = useToast();
  const [tab, setTab] = useState('raise');
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    patientName: '', bloodGroup: '', component: 'RED_CELLS', unitsNeeded: 2,
    urgency: 'ROUTINE', hospital: '', city: 'Hyderabad', reason: '',
  });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);

  const [filters, setFilters] = useState({ bloodGroup: '', component: '', city: '' });
  const [avail, setAvail] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(true);

  useEffect(() => {
    bloodBankService.metadata()
      .then(({ data }) => setMeta(data.data))
      .catch((err) => setError(extractError(err)));
  }, []);

  const loadRequests = useCallback(() => {
    setLoadingReq(true);
    bloodBankService.myRequests({ page: 0, size: 50 })
      .then(({ data }) => setRequests(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingReq(false));
  }, []);

  const loadAvailability = useCallback(() => {
    setLoadingAvail(true);
    bloodBankService.availability({
      bloodGroup: filters.bloodGroup || undefined,
      component: filters.component || undefined,
      city: filters.city || undefined,
    })
      .then(({ data }) => setAvail(data.data))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoadingAvail(false));
  }, [filters]);

  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    try {
      await bloodBankService.raiseRequest({
        ...form,
        unitsNeeded: Number(form.unitsNeeded),
        reason: form.reason || null,
      });
      toast(`Request raised for ${form.patientName}.`, 'success');
      setForm({ ...form, patientName: '', reason: '' });
      loadRequests();
      setTab('mine');
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    try {
      await bloodBankService.cancelRequest(id);
      toast('Request cancelled.', 'success');
      loadRequests();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const groupOptions = meta?.bloodGroups || [];
  const componentOptions = meta?.components || [];
  const urgencyOptions = meta?.urgencies || [];

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Droplet size={13} /> Clinician · blood bank</div>
        <h1>Order blood for your patients</h1>
        <p className="hero-sub">
          Check what is on the shelf across centres, raise a transfusion request for a patient,
          and track the requests you have raised. Only the blood bank approves and issues units.
        </p>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'raise' ? (
        <div className="two-col">
          <div className="card">
            <div className="card-title-row"><h3><Plus size={18} /> New transfusion request</h3></div>
            <form onSubmit={submit}>
              <ErrorBanner message={formError} onClose={() => setFormError('')} />
              <Field label="Patient name">
                <input value={form.patientName} onChange={set('patientName')} required />
              </Field>
              <div className="form-grid">
                <Field label="Blood group">
                  <select value={form.bloodGroup} onChange={set('bloodGroup')} required>
                    <option value="" disabled>Choose…</option>
                    {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                  </select>
                </Field>
                <Field label="Component">
                  <select value={form.component} onChange={set('component')}>
                    {componentOptions.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Units">
                  <input type="number" min="1" max="20" value={form.unitsNeeded} onChange={set('unitsNeeded')} required />
                </Field>
                <Field label="Urgency">
                  <select value={form.urgency} onChange={set('urgency')}>
                    {urgencyOptions.map((u) => <option key={u.name} value={u.name}>{u.label}</option>)}
                  </select>
                </Field>
                <Field label="Hospital">
                  <input value={form.hospital} onChange={set('hospital')} required />
                </Field>
                <Field label="City">
                  <input value={form.city} onChange={set('city')} required />
                </Field>
              </div>
              <Field label="Clinical reason" hint="optional">
                <textarea rows={2} value={form.reason} onChange={set('reason')} />
              </Field>
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit request'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title-row"><h3><Info size={18} /> What happens next</h3></div>
            <div className="kv-list">
              <div className="kv"><span className="k">1. Requested</span><span className="v" style={{ fontWeight: 400 }}>The blood bank sees it on their board</span></div>
              <div className="kv"><span className="k">2. Approved</span><span className="v" style={{ fontWeight: 400 }}>Units are reserved for this patient</span></div>
              <div className="kv"><span className="k">3. Fulfilled</span><span className="v" style={{ fontWeight: 400 }}>Units are issued, soonest-to-expire first</span></div>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              A clinician cannot approve or fulfil their own request — that is a blood bank
              officer decision, enforced both at the gateway and in the service.
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'mine' ? (
        <div className="card">
          <div className="card-title-row">
            <h3><Droplet size={18} /> Requests I raised</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setTab('raise')}><Plus size={14} /> New</button>
          </div>
          {loadingReq ? <Loading /> : null}
          {!loadingReq && requests.length === 0 ? (
            <EmptyState title="No requests raised yet" hint="Requests you raise appear here with their status."
                        icon={Droplet}
                        action={<button className="btn btn-primary" onClick={() => setTab('raise')}>Raise a request</button>} />
          ) : null}
          {requests.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Group</th><th>Component</th><th>Units</th><th>Urgency</th><th>Hospital</th><th>Status</th><th>Issued from</th><th /></tr>
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
                      <td className="cell-sub">{r.fulfilledFrom || '—'}</td>
                      <td className="actions-cell">
                        {(r.status === 'REQUESTED' || r.status === 'APPROVED') ? (
                          <button className="btn btn-outline btn-sm" onClick={() => cancel(r.id)}><X size={13} /> Cancel</button>
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
                  <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="e.g. Hyderabad" />
                </div>
              </Field>
            </div>
          </div>
          {loadingAvail ? <Loading /> : null}
          {!loadingAvail && avail.length === 0 ? (
            <div className="card"><EmptyState title="No matching stock" hint="Try another filter." icon={Droplet} /></div>
          ) : null}
          {avail.length > 0 ? (
            <div className="card">
              <div className="card-title-row"><h3><Droplet size={18} /> Available units</h3></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Centre</th><th>City</th><th>Group</th><th>Component</th><th>Units</th><th>Status</th></tr></thead>
                  <tbody>
                    {avail.map((r, i) => (
                      <tr key={`${r.centerName}-${r.bloodGroup}-${r.component}-${i}`}>
                        <td className="cell-strong">{r.centerName}</td>
                        <td>{r.city}</td>
                        <td><BloodGroupBadge label={r.bloodGroupLabel} /></td>
                        <td>{r.componentLabel}</td>
                        <td className="cell-strong">{r.availableUnits}</td>
                        <td>
                          {r.critical ? <span className="badge badge-red"><span className="dot" />Low</span>
                            : r.expiringSoon ? <span className="badge badge-amber"><span className="dot" />Expiring</span>
                              : <span className="badge badge-green"><span className="dot" />Available</span>}
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
    </div>
  );
}
