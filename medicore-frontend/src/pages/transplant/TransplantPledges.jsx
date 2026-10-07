import { useCallback, useEffect, useState } from 'react';
import { organService, extractError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { StatCard } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Heart, Check, X, Sparkle } from '../../components/Icons.jsx';

const TABS = [
  { value: 'PENDING', label: 'Pending verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: '', label: 'All' },
];

export default function TransplantPledges() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('PENDING');
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organService.metadata()
      .then(({ data }) => setMeta(data.data))
      .catch((err) => setError(extractError(err)));
    organService.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    organService.pledges({ status: tab || undefined, page: 0, size: 50 })
      .then(({ data }) => setRows(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const verify = async (p) => {
    try {
      await organService.verifyPledge(p.id, { status: 'VERIFIED', note: null });
      toast('Pledge verified — usable for allocation.', 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const revoke = async (p) => {
    try {
      await organService.verifyPledge(p.id, { status: 'REVOKED', note: 'Revoked by coordinator' });
      toast('Pledge revoked.', 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const organOptions = meta?.organs || [];
  const groupOptions = meta?.bloodGroups || [];

  return (
    <div>
      <div className="page-head">
        <h1><Heart size={22} /> Donor pledges</h1>
        <p>Every registered pledge, its organs and consent status, ready for coordinator verification.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="stats-grid">
        <StatCard icon={Heart} tone="amber" value={stats?.pendingPledges ?? '—'} label="Pledges to verify" />
        <StatCard icon={Check} tone="green" value={stats?.activePledges ?? '—'} label="Active pledges" />
        <StatCard icon={X} tone="red" value={stats?.revokedPledges ?? '—'} label="Revoked" />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3><Sparkle size={18} /> Filters</h3>
        </div>
        <div className="filters">
          <div className="grow">
            <select value={tab} onChange={(e) => setTab(e.target.value)}>
              <option value="">All statuses</option>
              {TABS.filter((t) => t.value).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Loading /> : null}
      {!loading && rows.length === 0 ? (
        <div className="card"><EmptyState title="No pledges match" hint="Altruistic donors register themselves from the patient portal." icon={Heart} /></div>
      ) : null}

      {rows.length > 0 ? (
        <div className="card">
          <div className="card-title-row">
            <h3><Heart size={18} /> {rows.length} pledge(s)</h3>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Donor</th><th>Group</th><th>City</th><th>Organs pledged</th><th>Consent</th><th>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.fullName}</td>
                    <td><span className="badge badge-blue">{p.bloodGroupLabel}</span></td>
                    <td>{p.city}</td>
                    <td>
                      {(p.organs || []).map((o) => <span className="badge badge-blue" key={o.name} style={{ marginRight: 4 }}>{o.label}</span>)}
                    </td>
                    <td>{p.consentSigned ? <span className="badge badge-green"><span className="dot" />Signed</span> : <span className="badge badge-red"><span className="dot" />Withdrawn</span>}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="actions-cell">
                      {p.status === 'PENDING' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => verify(p)}>Verify</button>
                      ) : null}
                      {p.status === 'ACTIVE' ? (
                        <button className="btn btn-outline btn-sm" onClick={() => revoke(p)}><X size={13} /> Revoke</button>
                      ) : null}
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
