import { Link } from 'react-router-dom';

export default function Logo({ size = 28, showText = true, to = '/' }) {
  const body = (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="SkillRent">
        <defs>
          <linearGradient id="sr-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#sr-logo-grad)" />
        <path
          d="M13 25c0 2 1.8 3.5 4.5 3.5 2.8 0 4.3-1.3 4.3-3.1 0-1.5-0.9-2.5-3.2-3l-2-0.45c-1.2-0.3-1.7-0.7-1.7-1.35 0-0.85 0.8-1.45 2-1.45 1.35 0 2.15 0.6 2.3 1.7h2.5c-0.2-2.25-1.95-3.75-4.75-3.75-2.7 0-4.45 1.4-4.45 3.5 0 1.55 1 2.65 3.1 3.1l2.05 0.45c1.2 0.25 1.75 0.7 1.75 1.35 0 0.9-0.85 1.5-2.15 1.5-1.45 0-2.3-0.6-2.55-1.75H13z"
          fill="white"
        />
        <circle cx="28" cy="14" r="2.5" fill="#22d3ee" stroke="white" strokeWidth="1.2" />
      </svg>
      {showText ? (
        <span className="font-display text-lg font-bold tracking-tight">
          Skill<span className="sr-gradient-text">Rent</span>
        </span>
      ) : null}
    </span>
  );
  if (to) return <Link to={to}>{body}</Link>;
  return body;
}
