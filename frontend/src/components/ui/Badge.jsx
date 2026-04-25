export default function Badge({ children, tone = 'brand', className = '' }) {
  const toneClass =
    {
      green: 'sr-pill-green',
      yellow: 'sr-pill-yellow',
      orange: 'sr-pill-orange',
      red: 'sr-pill-red',
      brand: 'sr-pill-brand',
      cyan: 'sr-pill-cyan',
      slate: '',
    }[tone] || '';
  return <span className={`sr-pill ${toneClass} ${className}`}>{children}</span>;
}
