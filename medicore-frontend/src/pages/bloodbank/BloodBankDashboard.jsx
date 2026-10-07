import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bloodBankService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { BloodGroupBadge, StatCard } from '../../components/domain.jsx';
import { Droplet, AlertCircle, Clock, Activity, Users, ArrowRight, Check } from '../../components/Icons.jsx';

export default function BloodBankDashboard() {
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.allSettled([
      bloodBankService.stats(),
      bloodBankService.expiring(30),
      bloodBankService.allRequests({ status: 'REQUESTED', page: 0, size: 5 }),
    ]).then(([s, e, r]) => {
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      if (e.status === 'fulfilled') setExpiring(e.value.data.data);
      if (r.status === 'fulfilled') setPending(r.value.data.data.content);
      const firstError = [s, e, r].find((x) => x.status === 'rejected');
      if (firstError) setError(extractError(firstError.reason));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Droplet size={13} /> Blood bank officer</div>
        <h1>Stock command centre</h1>
        <p className="hero-sub">
          What needs attention today: lots that are critically low, units about to expire, and
          transfusion requests waiting on a decision.
        </p>
        <div className="hero-actions">
          <Link to="/bloodbank/inventory" className="btn-hero"><Droplet size={16} /> Manage inventory</Link>
          <Link to="/bloodbank/requests" className="btn-hero ghost"><Activity size={16} /> Decide requests</Link>
        </div>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />
      {loading ? <Loading /> : null}

      {stats ? (
        <div className="stats-grid">
          <StatCard icon={Droplet} tone="red" value={stats.usableUnits} label="Usable units" />
          <StatCard icon={AlertCircle} tone="amber" value={stats.criticalLots} label="Critically low lots" />
          <StatCard icon={Clock} tone="cyan" value={stats.expiringIn30Days} label="Expiring in 30 days" />
          <StatCard icon={Activity} tone="blue" value={stats.requested} label="Awaiting decision" />
          <StatCard icon={Check} tone="green" value={stats.fulfilled} label="Fulfilled requests" />
          <StatCard icon={Users} tone="violet" value={stats.registeredDonors} label="Registered donors" />
        </div>
      ) : null}

      <div className="two-col">
        <div className="card">
          <div className="card-title-row">
            <h3><AlertCircle size={18} /> Use or discard — approaching expiry</h3>
            <Link to="/bloodbank/inventory" className="btn btn-outline btn-sm">Inventory <ArrowRight size={13} /></Link>
          </div>
          {expiring.length === 0 ? (
            <EmptyState title="Nothing expiring soon" hint="No active lot expires within 30 days." icon={Check} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Centre</th><th>Group</th><th>Component</th><th>Units</th><th>Expiry</th></tr></thead>
                <tbody>
                  {expiring.slice(0, 8).map((i) => (
                    <tr key={i.id}>
                      <td className="cell-strong">{i.centerName}</td>
                      <td><BloodGroupBadge label={i.bloodGroupLabel} /></td>
                      <td>{i.componentLabel}</td>
                      <td>{i.availableUnits}</td>
                      <td>
                        {i.expiryDate}
                        {i.expired
                          ? <span className="badge badge-red" style={{ marginLeft: 6 }}>expired</span>
                          : <span className="badge badge-amber" style={{ marginLeft: 6 }}><span className="dot" />soon</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3><Activity size={18} /> Requests awaiting a decision</h3>
            <Link to="/bloodbank/requests" className="btn btn-outline btn-sm">All requests <ArrowRight size={13} /></Link>
          </div>
          {pending.length === 0 ? (
            <EmptyState title="Decision queue is clear" hint="No REQUESTED items right now." icon={Check} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Patient</th><th>Group</th><th>Units</th><th>Urgency</th><th>Status</th></tr></thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-strong">{r.patientName}<div className="cell-sub">{r.hospital}</div></td>
                      <td><BloodGroupBadge label={r.bloodGroupLabel} /></td>
                      <td>{r.unitsNeeded}</td>
                      <td><span className={`badge ${r.urgency === 'CRITICAL' ? 'badge-red' : r.urgency === 'URGENT' ? 'badge-amber' : 'badge-gray'}`}>{r.urgency}</span></td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
