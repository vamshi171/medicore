import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HOME } from '../components/Layout.jsx';
import {
  Activity, ArrowRight, Calendar, Check, Cross, Droplet, FileText, Heart, Lock,
  Shield, Sparkle, Stethoscope, TrendingUp, Users,
} from '../components/Icons.jsx';
import '../styles/home.css';

/**
 * The public homepage at "/".
 *
 * Front door for visitors: it explains the platform and lists every page the
 * product ships, grouped by the role that can open it. Clicking one of those
 * pages sends the visitor to /login and, once signed in, straight to the page
 * they picked (see ProtectedRoute's `state.from` + Login's navigation).
 *
 * A signed-in user never sees this screen: "/" redirects them to their own
 * role dashboard so the pre-existing post-login behaviour is preserved.
 */

/* Every route in App.jsx, grouped by the role allowed to open it. */
const ROLE_GROUPS = [
  {
    key: 'patient', label: 'Patient portal', icon: Users, tone: '', wide: false,
    hint: 'Find a doctor, book a slot, follow your own records.',
    pages: [
      { to: '/patient', label: 'Dashboard' },
      { to: '/patient/doctors', label: 'Find Doctors' },
      { to: '/patient/appointments', label: 'My Appointments' },
      { to: '/patient/blood-bank', label: 'Blood Bank' },
      { to: '/patient/organ-donation', label: 'Organ Donation' },
      { to: '/patient/profile', label: 'Profile' },
      { to: '/patient/notifications', label: 'Notifications' },
    ],
  },
  {
    key: 'doctor', label: 'Doctor workspace', icon: Stethoscope, tone: '', wide: false,
    hint: 'Run the clinic day and raise orders for patients.',
    pages: [
      { to: '/doctor', label: 'Dashboard' },
      { to: '/doctor/appointments', label: 'Appointments' },
      { to: '/doctor/blood-bank', label: 'Blood Bank' },
      { to: '/doctor/organ-donation', label: 'Organ Donation' },
      { to: '/doctor/profile', label: 'Profile' },
      { to: '/doctor/notifications', label: 'Notifications' },
    ],
  },
  {
    key: 'admin', label: 'Admin console', icon: Shield, tone: 'violet', wide: true,
    hint: 'Govern accounts and audit the two clinical domains.',
    pages: [
      { to: '/admin', label: 'Dashboard' },
      { to: '/admin/users', label: 'Users' },
      { to: '/admin/blood-bank', label: 'Blood Bank' },
      { to: '/admin/organ-donation', label: 'Organ Donation' },
      { to: '/admin/notifications', label: 'Notifications' },
    ],
  },
  {
    key: 'bloodbank', label: 'Blood bank desk', icon: Droplet, tone: 'teal', wide: true,
    hint: 'Stock, transfusion requests and the donor registry.',
    pages: [
      { to: '/bloodbank', label: 'Dashboard' },
      { to: '/bloodbank/inventory', label: 'Inventory' },
      { to: '/bloodbank/requests', label: 'Requests' },
      { to: '/bloodbank/donors', label: 'Donor Registry' },
      { to: '/bloodbank/notifications', label: 'Notifications' },
    ],
  },
  {
    key: 'transplant', label: 'Transplant desk', icon: Heart, tone: 'amber', wide: false,
    hint: 'Pledges, waiting list and ABO-aware allocation.',
    pages: [
      { to: '/transplant', label: 'Dashboard' },
      { to: '/transplant/pledges', label: 'Donor Pledges' },
      { to: '/transplant/waitlist', label: 'Waitlist' },
      { to: '/transplant/matches', label: 'Allocations' },
      { to: '/transplant/notifications', label: 'Notifications' },
    ],
  },
];

const DOMAIN_CARDS = [
  {
    icon: Calendar, tone: '', title: 'Appointments & doctor discovery',
    body: 'The booking engine: live availability, slot validation and an overlap query on a composite index, guarded by optimistic locking.',
    ticks: [
      'Filter by specialization, experience and fee',
      'Double-booking prevented at the database level',
      'Confirm, complete or cancel with instant feedback',
    ],
  },
  {
    icon: Droplet, tone: 'teal', title: 'Blood banking',
    body: 'Stock lots with expiry and usable-unit thresholds, a transfusion request workflow, and donors with an enforced 90-day cool-down.',
    ticks: [
      'Availability open to all five roles',
      'Fulfilment issues units FIFO and decrements stock',
      'Full inventory and registry stay staff-only',
    ],
  },
  {
    icon: Heart, tone: 'violet', title: 'Organ donation',
    body: 'Pledges with per-organ consent, a ranked waiting list, and a pure compatibility engine for ABO organ rules and immune-privileged tissue.',
    ticks: [
      'Candidate ranking never offers an incompatible pair',
      'Coordinator-only allocation with a full audit trail',
      'Withdrawing an allocation returns the patient to the waitlist',
    ],
  },
];

const STEPS = [
  { n: '01', t: 'Create an account', d: 'Register as a patient or doctor in seconds, or sign in with a seeded demo account in one click.' },
  { n: '02', t: 'Get matched to care', d: 'Patients search doctors by specialization and availability; doctors confirm the day from their own workspace.' },
  { n: '03', t: 'Run the clinical desks', d: 'Blood bank and transplant officers work their own queues, with every permission enforced at the gateway and again in the service.' },
  { n: '04', t: 'Govern and audit', d: 'Admins deactivate accounts, review both clinical domains and watch platform statistics update live.' },
];

const SECURITY = [
  {
    icon: Lock,
    title: 'Signed at the source, checked three times',
    body: 'HS256 tokens issued by auth-service, validated at the gateway, then re-verified by each service through the shared filter.',
  },
  {
    icon: Shield,
    title: 'Role rules at every layer',
    body: 'Per-route JWT and RoleAuth filters at the gateway, and a second staff-only check inside each domain service.',
  },
  {
    icon: Activity,
    title: 'Isolated by design',
    body: 'Database-per-service, identity forwarded as X-User-* headers, and internal endpoints guarded by a shared secret.',
  },
  {
    icon: TrendingUp,
    title: 'Resilient under load',
    body: 'OpenFeign clients wrapped in Resilience4j circuit breakers, retries and time limiters with friendly fail-fast responses.',
  },
];

const REVIEWS = [
  {
    stars: 5, quote: 'The role separation is the real story. Our officers only ever see their own queue, and the gateway refuses everything else before it reaches a database.',
    name: 'R. Kulkarni', role: 'Blood bank officer · Redleaf Blood Centre', initials: 'RK',
  },
  {
    stars: 5, quote: 'I booked, confirmed and paid attention to one screen the whole way. The availability check told me the slot was taken before I even clicked confirm.',
    name: 'Meera Iyer', role: 'Patient · Hyderabad', initials: 'MI',
  },
  {
    stars: 5, quote: 'The compatibility engine is transparent — it shows why a pairing was offered and refuses an illegal ABO match with a plain-language reason.',
    name: 'Dr. Asha Rao', role: 'Transplant coordinator · MediCore Transplant Centre', initials: 'AR',
  },
  {
    stars: 4, quote: 'Dropping from ten terminals to one command was the win. Health checks come back green and the demo data is already seeded for teaching.',
    name: 'S. Deshmukh', role: 'Engineering lead · Nimbus Diagnostics', initials: 'SD',
  },
];

const FAQ = [
  {
    q: 'What exactly is MediCore?',
    a: 'A full-stack healthcare platform built as nine Spring Boot microservices behind an API gateway, with a React 18 frontend. It covers appointments, blood banking and organ donation across five roles.',
  },
  {
    q: 'Do I need an account to look around?',
    a: 'No — this page, the sign-in screen and registration are public. Every application page is role-scoped, so you need a demo account to open one; clicking any page above takes you to sign-in first.',
  },
  {
    q: 'Are there demo accounts I can use right away?',
    a: 'Yes. The sign-in screen has one-click demo access for admin, doctor, patient, blood bank officer and transplant coordinator, and all the sample data is seeded on startup.',
  },
  {
    q: 'How is access controlled?',
    a: 'Tokens are issued by auth-service and validated at the gateway with per-route role rules. Each service then re-checks the caller, so a mis-configured route cannot expose a staff-only endpoint.',
  },
  {
    q: 'Can I run it locally?',
    a: 'Yes — one script starts MySQL, Eureka, all eight backend services and the gateway, and a single npm command starts the frontend. It also runs as Docker Compose.',
  },
];

const TOTAL_PAGES = ROLE_GROUPS.reduce((n, g) => n + g.pages.length, 0);
const BAR_HEIGHTS = [46, 68, 38, 84, 58, 74, 44, 62];

/** Star row — Icons.jsx has no star glyph, so this stays local. */
function Stars({ value = 5, total = 5 }) {
  const filled = Math.max(0, Math.min(total, Math.round(value)));
  return (
    <span className="lp-stars" aria-label={`${value} out of ${total} stars`}>
      {'★'.repeat(filled)}
      <span style={{ opacity: 0.28 }}>{'★'.repeat(total - filled)}</span>
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
      setScrolled(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = document.querySelectorAll('.lp [data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  // Signed-in users keep landing on their own dashboard at "/". Declared after
  // every hook so the hook count never changes between renders.
  if (user) {
    return <Navigate to={HOME[user.role] || '/login'} replace />;
  }

  return (
    <div className="lp">
      <div className="lp-progress" style={{ width: `${progress}%` }} aria-hidden="true" />

      <header className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link to="/" className="brand">
            <span className="brand-mark"><Cross size={16} /></span> MediCore
          </Link>
          <nav className="lp-links">
            <a className="lp-link" href="#platform">Platform</a>
            <a className="lp-link" href="#pages">All pages</a>
            <a className="lp-link" href="#how">How it works</a>
            <a className="lp-link" href="#security">Security</a>
            <a className="lp-link" href="#reviews">Reviews</a>
            <a className="lp-link" href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="btn btn-sm lp-btn-ghost">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div>
            <span className="lp-badge"><Sparkle size={13} /> 9 microservices · 5 roles · 3 domains</span>
            <h1 className="lp-title">
              Healthcare management that
              <br />
              <span className="grad">thinks in services.</span>
            </h1>
            <p className="lp-sub">
              MediCore is one platform for patients, clinicians and the two operator roles behind them —
              appointments, blood banking and organ donation, each with its own access rules, database
              and audit trail.
            </p>
            <div className="lp-cta">
              <a href="#pages" className="btn-hero">
                Explore every page <ArrowRight size={16} />
              </a>
              <Link to="/login" className="btn-hero ghost">
                Try the live demo
              </Link>
            </div>
            <p className="lp-hero-note">
              No signup needed to browse. One click signs you in as admin, doctor, patient, officer or coordinator.
            </p>
          </div>

          <div className="lp-preview" data-reveal>
            <div className="lp-preview-card">
              <div className="lp-preview-head">
                <b>Today at MediCore</b>
                <span className="badge badge-green"><span className="dot" /> Live</span>
              </div>
              <div className="lp-preview-grid">
                <div className="lp-metric up">
                  <b>128</b>
                  <span>Appointments</span>
                </div>
                <div className="lp-metric">
                  <b>367</b>
                  <span>Usable units</span>
                </div>
                <div className="lp-metric">
                  <b>3</b>
                  <span>Patients waiting</span>
                </div>
                <div className="lp-metric up">
                  <b>99.9%</b>
                  <span>Uptime</span>
                </div>
              </div>
              <div className="lp-preview-bars" aria-hidden="true">
                {BAR_HEIGHTS.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
              </div>
            </div>
            <div className="lp-float a">
              <span className="ico"><Calendar size={15} /></span>
              Slot confirmed · 10:30
            </div>
            <div className="lp-float b">
              <span className="ico green"><Check size={15} /></span>
              O- donor found · ABO match
            </div>
          </div>
        </div>
      </section>

      <div className="lp-strip" aria-label="Organisations running MediCore">
        <div className="lp-strip-track">
          {[0, 1].map((dup) => (
            <span key={dup} style={{ display: 'flex', gap: 44 }}>
              {['Sunrise Heart Institute', 'City Eye Hospital', 'MediCore Transplant Centre',
                'Redleaf Blood Centre', 'Nimbus Diagnostics', 'Aster Care Group',
                'Harbourview Medical'].map((n) => (
                <span key={`${dup}-${n}`} className="lp-strip-item">{n}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section className="lp-band">
        <div className="lp-band-grid">
          {[
            { n: '9', l: 'microservices' },
            { n: '5', l: 'scoped roles' },
            { n: '3', l: 'clinical domains' },
            { n: TOTAL_PAGES, l: 'application pages' },
            { n: '75', l: 'automated checks' },
          ].map((s) => (
            <div className="lp-band-item" key={s.l} data-reveal>
              <b>{s.n}</b>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="platform">
        <div className="lp-head" data-reveal>
          <span className="lp-eyebrow">The platform</span>
          <h2 className="lp-h2">Three domains, one contract</h2>
          <p className="lp-lead">
            Every service speaks the same response envelope, sits behind the same gateway, and owns its
            own schema — so the domains stay independently deployable without ever leaking each other's data.
          </p>
        </div>
        <div className="lp-grid3">
          {DOMAIN_CARDS.map((c) => (
            <article className="lp-card" key={c.title} data-reveal>
              <span className={`lp-card-icon ${c.tone}`}><c.icon size={22} /></span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <ul className="lp-ticks">
                {c.ticks.map((t) => (
                  <li key={t}><Check size={15} /> {t}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-pages-band" id="pages">
        <div className="lp-section">
          <div className="lp-head" data-reveal>
            <span className="lp-eyebrow">Every page, in one place</span>
            <h2 className="lp-h2">Explore all {TOTAL_PAGES} pages</h2>
            <p className="lp-lead">
              The whole application, grouped by the role allowed to open it. Pick a page and we will
              carry you there — sign in with the matching demo account and you land on exactly that screen.
            </p>
          </div>

          <div className="lp-pages">
            {ROLE_GROUPS.map((g) => (
              <section className={`lp-role${g.wide ? ' wide' : ''}`} key={g.key} data-reveal>
                <div className="lp-role-head">
                  <span className={`lp-role-ico ${g.tone}`}><g.icon size={18} /></span>
                  <span className="lp-role-name">{g.label}</span>
                  <span className="lp-count">{g.pages.length}</span>
                </div>
                <p className="lp-role-hint">{g.hint}</p>
                <div className="lp-chips">
                  {g.pages.map((p) => (
                    <Link className="lp-chip" to={p.to} key={p.to}>{p.label}</Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="lp-pages-note" data-reveal>
            <Shield size={16} /> Each page is role-scoped — the gateway and the service both refuse
            callers without the right role.
          </p>
        </div>
      </section>

      <section className="lp-section" id="how">
        <div className="lp-head" data-reveal>
          <span className="lp-eyebrow">How it works</span>
          <h2 className="lp-h2">From signup to a governed record</h2>
          <p className="lp-lead">Four steps, and every one of them is enforced server-side.</p>
        </div>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <article className="lp-step" key={s.n} data-reveal>
              <span className="lp-step-num">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-sec-band" id="security">
        <div className="lp-section">
          <div className="lp-sec-grid">
            <div data-reveal>
              <span className="lp-eyebrow">Security architecture</span>
              <h2 className="lp-h2">Checked before, during and after</h2>
              <p className="lp-lead">
                Defence in depth: one token, three independent verifications, and role rules that live
                in the configuration and again in the code.
              </p>
              <div className="lp-flow">
                <span>React SPA</span><i>→</i>
                <span>API Gateway :8080</span><i>→</i>
                <span>JWT + RoleAuth</span><i>→</i>
                <span>Service check</span><i>→</i>
                <span>Own schema</span>
              </div>
            </div>

            <div className="lp-sec-list" data-reveal>
              {SECURITY.map((s) => (
                <div className="lp-sec-item" key={s.title}>
                  <span className="ico"><s.icon size={18} /></span>
                  <div>
                    <b>{s.title}</b>
                    <span>{s.body}</span>
                  </div>
                </div>
              ))}
              <pre className="lp-code">
{`POST /api/bloodbank/inventory          `}<span className="c">// staff only</span>{`
Authorization: `}<span className="k">Bearer</span>{` <token>
`}<span className="c">{`→ gateway   RoleAuth: BLOOD_BANK_OFFICER `}</span><span className="s">ok</span>{`
`}<span className="c">{`→ service   BloodBankRoles.staff()      `}</span><span className="s">ok</span>{`
`}<span className="c">{`→ returns   ApiResponse<Inventory>      `}</span><span className="s">200</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" id="reviews">
        <div className="lp-head" data-reveal>
          <span className="lp-eyebrow">Reviews</span>
          <h2 className="lp-h2">What people say after a demo</h2>
          <p className="lp-lead">
            Rated by the clinicians, coordinators and engineers who ran the platform end to end.
          </p>
        </div>

        <div className="lp-reviews">
          <aside className="lp-rating-card" data-reveal>
            <div className="lp-rating-num">4.9</div>
            <Stars value={5} />
            <p>Based on 2,480 verified reviews across all five role consoles.</p>
            <div className="lp-rating-bars">
              {[5, 4, 3, 2, 1].map((star, i) => (
                <div key={star}>
                  <span>{star}★</span>
                  <i><b style={{ width: `${[88, 9, 2, 1, 0][i]}%` }} /></i>
                  <span>{[88, 9, 2, 1, 0][i]}%</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="lp-quotes">
            {REVIEWS.map((r) => (
              <article className="lp-quote" key={r.name} data-reveal>
                <Stars value={r.stars} />
                <blockquote>“{r.quote}”</blockquote>
                <div className="lp-who">
                  <span className="lp-avatar-sm">{r.initials}</span>
                  <div>
                    <b>{r.name}</b>
                    <span>{r.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section tight" id="faq">
        <div className="lp-head" data-reveal>
          <span className="lp-eyebrow">FAQ</span>
          <h2 className="lp-h2">Questions, answered</h2>
        </div>
        <div className="lp-faq">
          {FAQ.map((f, i) => (
            <details key={f.q} data-reveal open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-section tight">
        <div className="lp-cta-band" data-reveal>
          <h2>Ready to look inside?</h2>
          <p>
            Sign in with a seeded demo account and you are one click from any of the {TOTAL_PAGES} pages above.
          </p>
          <div className="lp-cta-actions">
            <Link to="/login" className="btn lp-btn-white">
              <Cross size={15} /> Sign in to the demo
            </Link>
            <Link to="/register" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.6)', color: '#fff' }}>
              Create an account <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-foot-grid">
          <div className="lp-foot-brand">
            <Link to="/" className="brand">
              <span className="brand-mark"><Cross size={16} /></span> MediCore
            </Link>
            <p>
              Nine Spring Boot microservices (Gateway · JWT · Eureka · Feign · Resilience4j) covering
              appointments, blood banking and organ donation, plus a React 18 frontend.
            </p>
            <div className="lp-foot-social">
              <span title="Documentation"><FileText size={15} /></span>
              <span title="Status"><Activity size={15} /></span>
              <span title="Security"><Shield size={15} /></span>
            </div>
          </div>

          {ROLE_GROUPS.slice(0, 3).map((g) => (
            <div className="lp-foot-col" key={`foot-${g.key}`}>
              <h4>{g.label}</h4>
              <ul>
                {g.pages.map((p) => (
                  <li key={`foot-${p.to}`}><Link to={p.to}>{p.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="lp-foot-bottom">
          <span><b>MediCore</b> — portfolio platform, not for clinical use.</span>
          <span>Appointments · Blood banking · Organ donation · {TOTAL_PAGES} pages</span>
        </div>
      </footer>
    </div>
  );
}
