export default function Card({ children, hover = false, className = '', ...rest }) {
  return (
    <div className={`sr-card ${hover ? 'sr-card-hover' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
