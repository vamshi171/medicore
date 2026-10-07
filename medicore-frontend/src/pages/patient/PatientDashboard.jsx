import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, StatusBadge, EmptyState, Avatar, Pager } from '../../components/ui.jsx';
import { Calendar, Clock, Stethoscope, TrendingUp, ArrowRight, Heart } from '../../components/Icons.jsx';

export default function PatientDashboard() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (p) => {
    setLoading(true);
    appointmentService.myPatient(p, 5)
      .then(({ data }) => {
        setItems(data.data.content);
        setPage(data.data.page);
        setTotalPages(data.data.totalPages);
      })
      .catch((err) => setError(err?.response?.status === 404
        ? 'Set up your patient profile (Profile page) to start booking appointments.'
        : extractError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(0); }, []);

  const upcoming = useMemo(
    () => items.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED')
      .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))[0],
    [items]
  );

  const counts = useMemo(() => ({
    total: items.length,
    upcoming: items.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
    completed: items.filter((a) => a.status === 'COMPLETED').length,
  }), [items]);

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Heart size={13} /> Patient portal</div>
        <h1>Your care, at a glance</h1>
        <p className="hero-sub">
          Track upcoming visits, discover specialists and manage your bookings —
          all in one place.
        </p>
        <div className="hero-actions">
          <Link to="/patient/doctors" className="btn-hero"><Calendar size={16} /> Book an appointment</Link>
          <Link to="/patient/appointments" className="btn-hero ghost">View my appointments</Link>
        </div>
      </section>

      <ErrorBanner message={error} />

      {upcoming ? (
        <div className="next-appt">
          <span className="feat-icon" style={{ width: 42, height: 42, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--blue-soft)', color: 'var(--blue-dark)' }}>
            <Clock size={20} />
          </span>
          <div>
            <span className="na-label">Next appointment</span>
            <div className="na-when">
              {upcoming.doctorName} · {new Date(upcoming.appointmentDate).toLocaleString()}
            </div>
          </div>
          <span className="spacer" />
          <StatusBadge status={upcoming.status} />
          <Link to="/patient/appointments" className="btn btn-outline btn-sm">Manage <ArrowRight size={13} /></Link>
      </div>
      ) : null}

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-icon blue"><Calendar size={20} /></span>
          <div>
            <span className="stat-value">{loading ? '—' : counts.total}</span>
            <span className="stat-label">Recent appointments</span>
          </div>
          <span className="stat-icon blue" style={{ marginLeft: 'auto', background: 'transparent' }}>
            <TrendingUp size={16} />
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-icon cyan"><Clock size={20} /></span>
          <div>
            <span className="stat-value">{loading ? '—' : counts.upcoming}</span>
            <span className="stat-label">Upcoming visits</span>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon green"><Stethoscope size={20} /></span>
          <div>
            <span className="stat-value">{loading ? '—' : counts.completed}</span>
            <span className="stat-label">Completed visits</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3><Calendar size={18} /> Recent appointments</h3>
          {totalPages > 1 ? <span className="muted" style={{ fontSize: '0.8rem' }}>showing 5 per page</span> : null}
        </div>
        <ErrorBanner message={error} />
        {loading ? <Loading /> : null}

        {!loading && items.length === 0 && !error ? (
          <EmptyState
            title="No appointments yet"
            hint="Find a doctor and book your first visit — it only takes a minute."
            action={<Link to="/patient/doctors" className="btn btn-primary">Find doctors <ArrowRight size={14} /></Link>}
          />
        ) : null}

        {!loading && items.length > 0 ? (
          <table className="table">
            <thead>
              <tr><th>Doctor</th><th>Specialization</th><th>When</th><th>Status</th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={a.doctorName} size="sm" />
                      <div>
                        <span className="cell-strong">{a.doctorName}</span>
                        <span className="cell-sub">₹{a.feeAtBooking} fee</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{a.specialization}</span></td>
                  <td>{new Date(a.appointmentDate).toLocaleString()}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <Pager page={page} totalPages={totalPages} onPage={load} />
      </div>
    </div>
  );
}
