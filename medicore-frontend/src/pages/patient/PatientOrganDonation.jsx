import { useCallback, useEffect, useState } from 'react';
import { organService, extractError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field, Modal, TierBadge } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Heart, Info, Check, Plus, AlertCircle } from '../../components/Icons.jsx';

const TABS = [
  { value: 'pledge', label: 'My pledge' },
  { value: 'waitlist', label: 'My waitlist' },
  { value: 'matches', label: 'My allocations' },
];

function nameFromEmail(email) {
  if (!email) return '';
  return email.substring(0, email.indexOf('@')).replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PatientOrganDonation() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('pledge');
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [pledge, setPledge] = useState(null);
  const [noPledge, setNoPledge] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [waitlist, setWaitlist] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organService.metadata()
      .then(({ data }) => setMeta(data.data))
      .catch((err) => setError(extractError(err)));
  }, []);

  const loadPledge = useCallback(() => {
    organService.myPledge()
      .then(({ data }) => { setPledge(data.data); setNoPledge(false); })
      .catch((err) => {
        if (err?.response?.status === 404) { setPledge(null); setNoPledge(true); }
        else setError(extractError(err));
      });
  }, []);

  const loadAll = useCallback(() => {
    setLoading(true);
    loadPledge();
    organService.myWaitlist()
      .then(({ data }) => setWaitlist(data.data))
      .catch((err) => setError(extractError(err)));
    organService.myMatches()
      .then(({ data }) => setMatches(data.data))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, [loadPledge]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const submitPledge = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    const organs = f.getAll('organs');
    const payload = {
      fullName: f.get('fullName'),
      bloodGroup: f.get('bloodGroup'),
      age: Number(f.get('age')),
      city: f.get('city'),
      phone: f.get('phone') || null,
      organs,
      consentSigned: f.get('consentSigned') === 'on',
      medicalNotes: f.get('medicalNotes') || null,
    };
    try {
      if (pledge) await organService.updatePledge(payload);
      else await organService.createPledge(payload);
      toast(pledge ? 'Pledge updated.' : 'Your donor pledge has been recorded.', 'success');
      setShowForm(false);
      loadPledge();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    try {
      await organService.revokePledge();
      toast('Consent withdrawn — your pledge can no longer be used for allocation.', 'success');
      loadPledge();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const organOptions = meta?.organs || [];
  const groupOptions = meta?.bloodGroups || [];
  const rules = meta?.compatibilityRules || [];

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Heart size={13} /> Organ donation</div>
        <h1>Pledge, waitlist and allocations</h1>
        <p className="hero-sub">
          Register your decision to donate, follow your own transplant waiting-list status,
          and see any allocation you are part of.
        </p>
        <div className="hero-actions">
          <button className="btn-hero" onClick={() => { setShowForm(true); setFormError(''); }}>
            <Plus size={16} /> {pledge ? 'Update my pledge' : 'Pledge to donate'}
          </button>
        </div>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      {tab === 'pledge' ? (
        <div className="two-col">
          <div className="card">
            <div className="card-title-row">
              <h3><Heart size={18} /> {pledge ? 'Your donor pledge' : 'Donor pledge'}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(true); setFormError(''); }}>
                {pledge ? 'Edit' : 'Pledge'}
              </button>
            </div>

            {loading && !pledge && !noPledge ? <Loading /> : null}

            {pledge ? (
              <>
                <div className="kv-list">
                  <div className="kv"><span className="k">Name</span><span className="v">{pledge.fullName}</span></div>
                  <div className="kv"><span className="k">Blood group</span><span className="v"><BloodGroupBadge label={pledge.bloodGroupLabel} /></span></div>
                  <div className="kv"><span className="k">City</span><span className="v">{pledge.city}</span></div>
                  <div className="kv">
                    <span className="k">Status</span>
                    <span className="v"><StatusBadge status={pledge.status} /></span>
                  </div>
                  <div className="kv">
                    <span className="k">Consent</span>
                    <span className="v">
                      {pledge.consentSigned
                        ? <span className="badge badge-green"><span className="dot" />Signed {pledge.consentSignedAt ? new Date(pledge.consentSignedAt).toLocaleDateString() : ''}</span>
                        : <span className="badge badge-red"><span className="dot" />Withdrawn</span>}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Pledged organs</span>
                    <span className="v">
                      {(pledge.organs || []).map((o) => (
                        <span className="badge badge-blue" key={o.name} style={{ marginRight: 4 }}>{o.label}</span>
                      ))}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Usable for allocation</span>
                    <span className="v">{pledge.committed ? 'Yes — verified and consented' : 'Not yet'}</span>
                  </div>
                </div>
                {pledge.consentSigned ? (
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 10, color: 'var(--red)' }} onClick={revoke}>
                    <AlertCircle size={14} /> Withdraw consent
                  </button>
                ) : null}
              </>
            ) : noPledge ? (
              <EmptyState
                title="You have not pledged yet"
                hint="Pledging records your decision to donate organs. You can withdraw consent at any time."
                icon={Heart}
                action={<button className="btn btn-primary" onClick={() => setShowForm(true)}>Pledge to donate</button>}
              />
            ) : null}
          </div>

          <div className="card">
            <div className="card-title-row"><h3><Info size={18} /> How matching works</h3></div>
            <div className="kv-list">
              {rules.map((r) => (
                <div className="kv" key={r.name}>
                  <span className="k">{r.name.replace(/_/g, ' ')}</span>
                  <span className="v" style={{ fontWeight: 400 }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'waitlist' ? (
        <div className="card">
          <div className="card-title-row"><h3><Heart size={18} /> My waiting-list entries</h3></div>
          {loading ? <Loading /> : null}
          {!loading && waitlist.length === 0 ? (
            <EmptyState title="You are not on the waiting list"
                        hint="A doctor or transplant coordinator lists patients who need an organ."
                        icon={Heart} />
          ) : null}
          {waitlist.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Organ</th><th>Blood group</th><th>Urgency</th><th>Hospital</th><th>Listed</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id}>
                      <td className="cell-strong">{w.organLabel}</td>
                      <td><BloodGroupBadge label={w.bloodGroupLabel} /></td>
                      <td><span className={`badge ${w.urgencyScore >= 8 ? 'badge-red' : w.urgencyScore >= 5 ? 'badge-amber' : 'badge-gray'}`}>{w.urgencyScore}/10</span></td>
                      <td>{w.hospital}</td>
                      <td>{w.listedAt ? new Date(w.listedAt).toLocaleDateString() : '—'}</td>
                      <td><StatusBadge status={w.status} /></td>
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
          <div className="card-title-row"><h3><Heart size={18} /> My allocations</h3></div>
          {loading ? <Loading /> : null}
          {!loading && matches.length === 0 ? (
            <EmptyState title="No allocations yet"
                        hint="Allocations appear here if you are a donor or a recipient in a match."
                        icon={Heart} />
          ) : null}
          {matches.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Organ</th><th>Donor</th><th>Recipient</th><th>Match</th><th>Proposed</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="cell-strong">{m.organLabel}</td>
                      <td>{m.donorName}</td>
                      <td>{m.recipientName}</td>
                      <td><TierBadge tier={null} label={m.compatibilityTier} /></td>
                      <td>{m.proposedAt ? new Date(m.proposedAt).toLocaleDateString() : '—'}</td>
                      <td><StatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
        <Modal title={pledge ? 'Update your pledge' : 'Pledge to donate organs'} icon={Heart} onClose={() => setShowForm(false)} wide>
          <form onSubmit={submitPledge}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <div className="form-grid">
              <Field label="Full name">
                <input name="fullName" defaultValue={pledge?.fullName || nameFromEmail(user?.email)} required />
              </Field>
              <Field label="Blood group">
                <select name="bloodGroup" required defaultValue={pledge?.bloodGroup || ''}>
                  <option value="" disabled>Choose…</option>
                  {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                </select>
              </Field>
              <Field label="Age">
                <input type="number" name="age" min="18" max="80" defaultValue={pledge?.age || 30} required />
              </Field>
              <Field label="City">
                <input name="city" defaultValue={pledge?.city || 'Hyderabad'} required />
              </Field>
              <Field label="Phone" hint="optional">
                <input name="phone" defaultValue={pledge?.phone || ''} />
              </Field>
            </div>

            <Field label="Organs you wish to pledge" hint="choose one or more">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {organOptions.map((o) => {
                  const checked = (pledge?.organs || []).some((x) => x.name === o.name);
                  return (
                    <label key={o.name} className="chip" style={{ cursor: 'pointer' }}>
                      <input type="checkbox" name="organs" value={o.name} defaultChecked={checked} style={{ marginRight: 6 }} />
                      {o.label}
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Medical notes" hint="optional">
              <textarea name="medicalNotes" rows={2} defaultValue={pledge?.medicalNotes || ''} />
            </Field>

            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" name="consentSigned" defaultChecked={pledge ? pledge.consentSigned : false} />
              <span style={{ fontWeight: 600 }}>
                I give my informed consent to donate the organs selected above.
              </span>
            </label>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>
                <Check size={15} /> {busy ? 'Saving…' : 'Save pledge'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
