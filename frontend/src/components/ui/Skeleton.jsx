export default function Skeleton({ className = 'h-4 w-full', style }) {
  return <div className={`sr-skeleton ${className}`} style={style} />;
}
