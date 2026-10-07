import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState } from '../../components/ui.jsx';
import { StatCard } from '../../components/domain.jsx';
import { Heart, Users, Sparkle, Activity, CheckCircle, XCircle } from '../../components/Icons.jsx';

export default function TransplantDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    organService.stats()
      .then(({ data }) => setStats(data.data))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, []);

  const chartData = stats
    ? [
        { label: 'Waiting', value: stats.waiting, cls: 'red' },
        { label: 'Matched', value: stats.matched, cls: 'cyan' },
        { label: 'Transplanted', value: stats.transplanted, cls: 'green' },
        { label: 'Pledges', value: stats.totalPledges, cls: 'amber' },
      ]
    : [];
  const max = Math.max(1, ...(chartData.map((c) => c.value)));

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Sparkle size={13} /> Transplant coordinator</div>
        <h1>Transplant coordination hub</h1>
        <p className="hero-sub">
          Run the donor pledge chain, manage the waiting list and review ABO-aware
          allocations across the platform.
        </p>
        <div className="hero-actions">
          <Link to="/transplant/pledges" className="btn-hero"><Heart size={16} /> Donor pledges</Link>
          <Link to="/transplant/waitlist" className="btn-hero ghost"><Users size={16} /> Waiting list</Link>
        </div>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />
      {loading ? <Loading /> : null}

      {stats ? (
        <div className="stats-grid">
          <StatCard icon={Heart} tone="amber" value={stats.totalPledges ?? '—'} label="Donor pledges" />
          <StatCard icon={Users} tone="red" value={stats.waiting ?? '—'} label="Patients waiting" />
          <StatCard icon={Sparkle} tone="cyan" value={stats.matched ?? '—'} label="Matched" />
          <StatCard icon={Activity} tone="green" value={stats.transplanted ?? '—'} label="Transplants completed" />
        </div>
      ) : null}

      <div className="two-col">
        <div className="card">
          <div className="card-title-row">
            <h3><Heart size={18} /> By organ type</h3>
          </div>
          {stats?.byOrgan?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Organ</th><th>Waiting</th><th>Usable pledges</th><th>Balance</th></tr>
                </thead>
                <tbody>
                  {stats.byOrgan.map((o) => {
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
          ) : (
            <EmptyState title="No organ data yet" hint="Seed data will populate this view." icon={Heart} />
          )}
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3><Activity size={18} /> Status overview</h3>
          </div>
          <div className="chart">
            {chartData.map((c) => (
              <div className="chart-col" key={c.label}>
                <span className="chart-value">{c.value}</span>
                <div className={`chart-bar ${c.cls}`} style={{ height: `${Math.max(6, Math.round((c.value / max) * 130))}px` }} />
                <span className="chart-label">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
