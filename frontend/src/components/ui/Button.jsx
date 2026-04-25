import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  onClick,
  as: As = 'button',
  ...rest
}) {
  const variantClass =
    {
      primary: 'sr-btn-primary',
      secondary: 'sr-btn-secondary',
      ghost: 'sr-btn-ghost',
      danger: 'sr-btn-danger',
      success: 'sr-btn-success',
    }[variant] || 'sr-btn-primary';

  const sizeClass =
    {
      sm: 'px-3 py-1.5 text-xs',
      md: '',
      lg: 'px-5 py-3 text-base',
    }[size] || '';

  return (
    <As
      type={As === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      className={`sr-btn ${variantClass} ${sizeClass} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </As>
  );
}
