/* Lightweight inline SVG icon set — keeps the bundle dependency-free.
   Every icon accepts a size prop and inherits currentColor. */

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

export const Plus = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" strokeWidth="2.6" />
  </svg>
);

export const Cross = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 2v20M4 6h16M4 12h16M4 18h16" strokeWidth="2.4" opacity="0" />
    <path d="M12 4v16M4 12h16" strokeWidth="3" />
  </svg>
);

export const Calendar = ({ size = 18 }) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const Clock = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

export const Stethoscope = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M4 3v6a5 5 0 0 0 10 0V3" />
    <path d="M9 14v2a5 5 0 0 0 10 0v-2" />
    <circle cx="19" cy="10" r="2" />
  </svg>
);

export const Money = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.8 2.5 2 2.5.8 2.5 2-1 2-2.5 2A2.5 2.5 0 0 1 9.5 14" />
    <path d="M12 5.5v13" />
  </svg>
);

export const Users = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.4a6.5 6.5 0 0 1 4 5.6" />
  </svg>
);

export const Shield = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 2 4 5.5V11c0 5.2 3.4 9.3 8 11 4.6-1.7 8-5.8 8-11V5.5L12 2z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const Bell = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const Check = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const CheckCircle = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </svg>
);

export const X = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const XCircle = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </svg>
);

export const AlertCircle = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5M12 16h.01" />
  </svg>
);

export const Info = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const Search = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const User = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const Lock = ({ size = 18 }) => (
  <svg {...base(size)}>
    <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
);

export const Mail = ({ size = 18 }) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3 7.5 9 6 9-6" />
  </svg>
);

export const Heart = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 20.5S3.5 15.5 3.5 9.3A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.5 2.9c0 6.2-8.5 11.2-8.5 11.2z" />
  </svg>
);

export const Activity = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M22 12h-4l-3 8-6-16-3 8H2" />
  </svg>
);

export const Droplet = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 2.7S6 10 6 14a6 6 0 0 0 12 0c0-4-6-11.3-6-11.3z" />
  </svg>
);

export const Logout = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

export const TrendingUp = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </svg>
);

export const Sparkle = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

export const ArrowRight = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeft = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const Trash = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const FileText = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" />
    <path d="M14 2v5h5M9 13h6M9 17h4" />
  </svg>
);
