import { useCallback, useEffect, useState } from 'react';
import { bloodBankService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState } from '../../components/ui.jsx';
import { BloodGroupBadge, Field } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Users, Check, X, Search } from '../../components/Icons.jsx';

export default function BloodBankDonors() {
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ bloodGroup: '', city: '', eligibility: '' });

  useEffect(() => {
    bloodBankService.metadata().then(({ data }) => setMeta(data.data)).catch((err) => setError(extractError(err)));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    bloodBankService.donors({
      bloodGroup: filters.bloodGroup || undefined,
      city: filters.city || undefined,
      eligibility: filters.eligibility || undefined,
      page: 0, size: 50,
    })
      .then(({ data }) => setRows(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (donor) => {
    const next = donor.eligibility === 'ELIGIBLE' ? 'DEFERRED' : 'ELIGIBLE';
    try {
      await bloodBankService.setDonorEligibility(donor.id, {
        eligibility: next,
        reason: next === 'DEFERRED' ? 'Deferred by blood bank officer' : null,
      });
      toast(`${donor.fullName} → ${next.toLowerCase()}.`, 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const groupOptions = meta?.bloodGroups || [];
  const eligibilityOptions = meta?.eligibilities || [];

  return (
    <div>
      <div className="page-head">
        <h1><Users size={22} /> Donor registry</h1>
        <p>The full donor list with cool-down and eligibility. Only blood bank staff and admins can read this.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="card">
        <div className="filters">
          <Field label="Blood group">
            <select value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
              <option value="">Any group</option>
              {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="City">
            <div className="input-wrap">
              <span className="input-icon"><Search size={15} /></span>
              <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="e.g. Mumbai" />
            </div>
          </Field>
          <Field label="Eligibility">
            <select value={filters.eligibility} onChange={(e) => setFilters({ ...filters, eligibility: e.target.value })}>
              <option value="">Any</option>
              {eligibilityOptions.map((e2) => <option key={e2.name} value={e2.name}>{e2.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {loading ? <Loading /> : null}
      {!loading && rows.length === 0 ? (
        <div className="card"><EmptyState title="No donors match" hint="Try clearing the filters." icon={Users} /></div>
      ) : null}

      {rows.length > 0 ? (
        <div className="card">
          <div className="card-title-row"><h3><Users size={18} /> {rows.length} donor(s)</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Donor</th><th>Group</th><th>City</th><th>Age / weight</th><th>Phone</th><th>Last donation</th><th>Next eligible</th><th>Eligibility</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-strong">{d.fullName}</td>
                    <td><BloodGroupBadge label={d.bloodGroupLabel} /></td>
                    <td>{d.city}</td>
                    <td>{d.age} / {d.weightKg} kg</td>
                    <td>{d.phone || '—'}</td>
                    <td>{d.lastDonationDate || 'never'}</td>
                    <td>{d.nextEligibleDate || '—'}{d.daysUntilEligible > 0 ? ` (${d.daysUntilEligible}d)` : ''}</td>
                    <td>
                      {d.eligibleNow
                        ? <span className="badge badge-green"><span className="dot" />Eligible</span>
                        : <span className="badge badge-amber"><span className="dot" />{d.eligibility}</span>}
                      {d.deferralReason ? <div className="cell-sub">{d.deferralReason}</div> : null}
                    </td>
                    <td className="actions-cell">
                      <button className="btn btn-outline btn-sm" onClick={() => toggle(d)}>
                        {d.eligibility === 'ELIGIBLE' ? <><X size={13} /> Defer</> : <><Check size={13} /> Clear</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
