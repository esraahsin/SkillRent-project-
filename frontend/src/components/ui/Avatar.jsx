import { avatarGradient, initials } from '../../lib/utils';

export default function Avatar({ name = '', src, size = 40, className = '' }) {
  const s = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={s}
        className={`rounded-full object-cover border border-white/10 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ ...s, background: avatarGradient(name) }}
      className={`flex items-center justify-center rounded-full font-semibold text-white text-sm border border-white/10 ${className}`}
    >
      <span style={{ fontSize: size * 0.38 }}>{initials(name)}</span>
    </div>
  );
}
