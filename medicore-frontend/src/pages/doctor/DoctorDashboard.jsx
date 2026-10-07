import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doctorService, appointmentService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, StatusBadge, EmptyState, Avatar } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Stethoscope, Clock, Money, ArrowRight, Calendar } from '../../components/Icons.jsx';

export default function DoctorDashboard() {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.allSettled([doctorService.getMyProfile(), appointmentService.myDoctor(0, 5)])
      .then(([profileRes, apptRes]) => {
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data.data);
        if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data.data.content);
        if (apptRes.status === 'rejected' && apptRes.reason?.response?.status === 404) {
          // No doctor profile yet — the profile CTA below covers onboarding,
          // so don't scare the user with an error banner.
        } else if (apptRes.status === 'rejected') {
          setError(extractError(apptRes.reason));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    setError(''); setToggling(true);
    try {
      const { data } = await doctorService.setAvailability(!profile.available);
      setProfile(data.data);
      toast(
        data.data.available ? 'You are on duty — visible in patient search' : 'You are off duty — hidden from search',
        'success'
      );
    } catch (err) {
      setError(extractError(err));
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <section className="hero">
        <div className="hero-eyebrow"><Stethoscope size={13} /> Doctor portal</div>
        <h1>{profile ? `Good day, ${profile.fullName}` : 'Welcome, doctor'}</h1>
        <p className="hero-sub">
          {profile && profile.available
            ? 'You are on duty — patients can find and book you right now.'
            : profile
              ? 'You are currently off duty. Flip the switch when you are ready to take bookings.'
              : 'Create your professional profile so patients can discover and book you.'}
        </p>
        <div className="hero-actions">
          <Link to="/doctor/appointments" className="btn-hero"><Calendar size={16} /> Manage appointments</Link>
          {!profile ? (
            <Link to="/doctor/profile" className="btn-hero ghost">Create profile</Link>
          ) : (
            <Link to="/doctor/profile" className="btn-hero ghost">Edit profile</Link>
          )}
        </div>
      </section>

      <ErrorBanner message={error} onClose={() => setError('')} />

      {profile ? (
        <div className="two-col">
          <div>
            <div className="card">
              <div className="card-title-row">
                <h3><Calendar size={18} /> Latest bookings</h3>
                <Link to="/doctor/appointments" className="btn btn-outline btn-sm">View all <ArrowRight size={13} /></Link>
              </div>
              {appointments.length === 0 ? (
                <EmptyState title="No bookings yet" hint="They appear here once patients book you." icon={Calendar} />
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Patient</th><th>When</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="cell-person">
                            <Avatar name={a.patientName} size="sm" />
                            <span className="cell-strong">{a.patientName}</span>
                          </div>
                        </td>
                        <td>{new Date(a.appointmentDate).toLocaleString()}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-title-row"><h3>Duty status</h3></div>
              <div className="switch-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!profile.available}
                  className={`switch${profile.available ? ' on' : ''}`}
                  onClick={toggle}
                  disabled={toggling}
                />
                <div>
                  <div className="switch-label">{profile.available ? 'On duty' : 'Off duty'}</div>
                  <div className="switch-sub">
                    {profile.available ? 'Visible in patient search & accepting bookings' : 'Hidden from search & not accepting bookings'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title-row"><h3>Practice summary</h3></div>
              <div className="kv-list">
                <div className="kv"><span className="k">Specialization</span><span className="v"><span className="badge badge-blue">{profile.specialization}</span></span></div>
                <div className="kv"><span className="k">Consultation fee</span><span className="v">₹{profile.consultationFee}</span></div>
                <div className="kv"><span className="k">Experience</span><span className="v">{profile.experienceYears} years</span></div>
                <div className="kv">
                  <span className="k">Working hours</span>
                  <span className="v"><Clock size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {profile.availableFrom}–{profile.availableTo}</span>
                </div>
                <div className="kv"><span className="k">Phone</span><span className="v">{profile.phone || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            title="Create your profile"
            hint="Patients can only find you after your profile exists."
            icon={Stethoscope}
            action={<Link to="/doctor/profile" className="btn btn-primary">Create profile <ArrowRight size={14} /></Link>}
          />
        </div>
      )}
    </div>
  );
}
