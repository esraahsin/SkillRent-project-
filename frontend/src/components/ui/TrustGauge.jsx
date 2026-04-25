export default function TrustGauge({ value = 0, band = 'orange', size = 100, label = 'Trust' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (v / 100) * circumference;
  const color =
    band === 'green'
      ? '#10b981'
      : band === 'yellow'
      ? '#eab308'
      : band === 'orange'
      ? '#f97316'
      : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} className="sr-ring">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={8}
            stroke="rgba(255,255,255,0.08)"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={8}
            stroke={color}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 800ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold" style={{ color }}>{Math.round(v)}</span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{label}</span>
        </div>
      </div>
    </div>
  );
}
