import { useCallback, useEffect, useState } from 'react';
import { organService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field, StatCard } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Heart, Plus, Users, Info, Activity } from '../../components/Icons.jsx';

const TABS = [
  { value: 'list', label: 'Register a patient' },
  { value: 'board', label: 'Waiting list' },
];

export default function DoctorOrganDonation() {
  const toast = useToast();
  const [tab, setTab] = useState('list');
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('WAITING');

  const [form, setForm] = useState({
    patientEmail: '', patientName: '', organNeeded: '', bloodGroup: '',
    urgencyScore: 5, hospital: '', city: 'Hyderabad', notes: '',
  });

  useEffect(() => {
    organService.metadata().then(({ data }) => setMeta(data.data)).catch((err) => setError(extractError(err)));
    organService.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    organService.waitlist({ status: statusFilter || undefined, page: 0, size: 50 })
      .then(({ data }) => setWaitlist(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    try {
      await organService.addToWaitlist({
        patientEmail: form.patientEmail || null,
        patientName: form.patientName || null,
        organNeeded: form.organNeeded,
        bloodGroup: form.bloodGroup,
        urgencyScore: Number(form.urgencyScore),
        hospital: form.hospital,
        city: form.city,
        notes: form.notes || null,
      });
      toast(`Added ${form.patientName || form.patientEmail} to the transplant waitlist.`, 'success');
      setForm({ ...form, patientEmail: '', patientName: '', notes: '' });
      load();
      setTab('board');
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const organOptions = meta?.organs || [];
  const groupOptions = meta?.bloodGroups || [];

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Heart size={13} /> Clinician · transplant</div>
        <h1>Register patients for transplant</h1>
        <p className="hero-sub">
          List a patient who needs an organ and follow the waiting list by urgency. Allocation
          itself is a transplant coordinator decision, so a clinician cannot create a match.
        </p>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="stats-grid">
        <StatCard icon={Users} tone="amber" value={stats?.waiting ?? '—'} label="Patients waiting" />
        <StatCard icon={Heart} tone="cyan" value={stats?.matched ?? '—'} label="Matched" />
        <StatCard icon={Activity} tone="green" value={stats?.transplanted ?? '—'} label="Transplanted" />
        <StatCard icon={Info} tone="blue" value={stats?.totalPledges ?? '—'} label="Donor pledges" />
      </div>

      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'list' ? (
        <div className="two-col">
          <div className="card">
            <div className="card-title-row"><h3><Plus size={18} /> Add a patient to the waitlist</h3></div>
            <form onSubmit={submit}>
              <ErrorBanner message={formError} onClose={() => setFormError('')} />
              <Field label="Patient email" hint="their MediCore login; resolved over the internal API">
                <input type="email" value={form.patientEmail} onChange={set('patientEmail')} placeholder="patient@medicore.com" required />
              </Field>
              <Field label="Patient name" hint="optional — derived from the email if left blank">
                <input value={form.patientName} onChange={set('patientName')} />
              </Field>
              <div className="form-grid">
                <Field label="Organ needed">
                  <select value={form.organNeeded} onChange={set('organNeeded')} required>
                    <option value="" disabled>Choose…</option>
                    {organOptions.map((o) => <option key={o.name} value={o.name}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Recipient blood group">
                  <select value={form.bloodGroup} onChange={set('bloodGroup')} required>
                    <option value="" disabled>Choose…</option>
                    {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                  </select>
                </Field>
                <Field label="Urgency score" hint="1 = stable, 10 = imminent risk">
                  <input type="number" min="1" max="10" value={form.urgencyScore} onChange={set('urgencyScore')} required />
                </Field>
                <Field label="Hospital">
                  <input value={form.hospital} onChange={set('hospital')} required />
                </Field>
                <Field label="City">
                  <input value={form.city} onChange={set('city')} required />
                </Field>
              </div>
              <Field label="Notes" hint="optional">
                <textarea rows={2} value={form.notes} onChange={set('notes')} />
              </Field>
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Adding…' : 'Add to waitlist'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title-row"><h3><Info size={18} /> Urgency drives priority</h3></div>
            <div className="kv-list">
              <div className="kv"><span className="k">1–4</span><span className="v">Stable — routine listing</span></div>
              <div className="kv"><span className="k">5–7</span><span className="v">Moderate — monitor closely</span></div>
              <div className="kv"><span className="k">8–10</span><span className="v">High — allocate as soon as a donor matches</span></div>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              A recipient can only be listed once per organ while the entry is WAITING.
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'board' ? (
        <div className="card">
          <div className="card-title-row">
            <h3><Users size={18} /> Transplant waiting list</h3>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="WAITING">Waiting only</option>
              <option value="MATCHED">Matched</option>
              <option value="TRANSPLANTED">Transplanted</option>
              <option value="">All statuses</option>
            </select>
          </div>
          {loading ? <Loading /> : null}
          {!loading && waitlist.length === 0 ? (
            <EmptyState title="Nothing on the list" hint="Patients you register appear here." icon={Heart} />
          ) : null}
          {waitlist.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Organ</th><th>Group</th><th>Urgency</th><th>Hospital</th><th>City</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id}>
                      <td className="cell-strong">{w.patientName}</td>
                      <td>{w.organLabel}</td>
                      <td><BloodGroupBadge label={w.bloodGroupLabel} /></td>
                      <td><span className={`badge ${w.urgencyScore >= 8 ? 'badge-red' : w.urgencyScore >= 5 ? 'badge-amber' : 'badge-gray'}`}>{w.urgencyScore}/10</span></td>
                      <td>{w.hospital}</td>
                      <td>{w.city}</td>
                      <td><StatusBadge status={w.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
