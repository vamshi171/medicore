import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, StatusBadge, EmptyState, Avatar, Pager } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Calendar, Search } from '../../components/Icons.jsx';

const TABS = ['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function MyAppointments() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(null); // appointment pending cancellation
  const [busyId, setBusyId] = useState(null);

  const load = useCallback((p) => {
    setLoading(true);
    appointmentService.myPatient(p, 10)
      .then(({ data }) => {
        setItems(data.data.content);
        setPage(data.data.page);
        setTotalPages(data.data.totalPages);
      })
      .catch((err) => setError(err?.response?.status === 404
        ? 'Set up your patient profile (Profile page) to start booking appointments.'
        : extractError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const filtered = useMemo(() => {
    if (tab === 'ALL') return items;
    return items.filter((a) => a.status === tab);
  }, [items, tab]);

  const counts = useMemo(() => ({
    ALL: items.length,
    SCHEDULED: items.filter((a) => a.status === 'SCHEDULED').length,
    CONFIRMED: items.filter((a) => a.status === 'CONFIRMED').length,
    COMPLETED: items.filter((a) => a.status === 'COMPLETED').length,
    CANCELLED: items.filter((a) => a.status === 'CANCELLED').length,
  }), [items]);

  const doCancel = async (appointment) => {
    setBusyId(appointment.id);
    setError('');
    try {
      await appointmentService.cancel(appointment.id);
      toast('Appointment cancelled', 'success');
      setConfirmCancel(null);
      load(page);
    } catch (err) {
      setError(extractError(err));
      toast(extractError(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1><Calendar size={22} /> My appointments</h1>
        <Link to="/patient/doctors" className="btn btn-primary"><Search size={15} /> Book new</Link>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      {loading && items.length === 0 ? <Loading /> : null}

      <div className="filter-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`filter-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            <span className="count"> ({counts[t]})</span>
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 && !error ? (
        <div className="card">
          <EmptyState
            title={tab === 'ALL' ? 'Nothing here yet' : `No ${tab.toLowerCase()} appointments on this page`}
            hint={tab === 'ALL' ? 'Book an appointment from Find Doctors.' : 'Try another filter or page.'}
          />
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Doctor</th><th>When</th><th>Fee</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={a.doctorName} size="sm" />
                      <div>
                        <span className="cell-strong">{a.doctorName}</span>
                        <span className="cell-sub">{a.specialization}</span>
                      </div>
                    </div>
                  </td>
                  <td>{new Date(a.appointmentDate).toLocaleString()}</td>
                  <td className="cell-strong">₹{a.feeAtBooking}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    {a.status === 'SCHEDULED' || a.status === 'CONFIRMED' ? (
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmCancel(a)}>
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Pager page={page} totalPages={totalPages} onPage={load} />

      {confirmCancel ? (
        <div className="modal-backdrop" onClick={() => setConfirmCancel(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel this appointment?</h3>
            <div className="booking-summary">
              <b>{confirmCancel.doctorName}</b>
              <span className="muted">{new Date(confirmCancel.appointmentDate).toLocaleString()}</span>
            </div>
            <p className="muted" style={{ fontSize: '0.88rem' }}>
              The slot will be released and the doctor will be notified. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setConfirmCancel(null)}>Keep it</button>
              <button className="btn btn-danger" disabled={busyId === confirmCancel.id} onClick={() => doCancel(confirmCancel)}>
                {busyId === confirmCancel.id ? 'Cancelling…' : 'Yes, cancel it'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
