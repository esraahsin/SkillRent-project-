import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, hint, error, className = '', as = 'input', rows, ...rest },
  ref
) {
  const Tag = as;
  return (
    <label className="block">
      {label ? <span className="sr-label">{label}</span> : null}
      <Tag
        ref={ref}
        rows={as === 'textarea' ? rows || 3 : undefined}
        className={`sr-input ${error ? 'border-red-400' : ''} ${className}`}
        {...rest}
      />
      {hint && !error ? <span className="mt-1 block text-xs" style={{ color: 'var(--text-dim)' }}>{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-red-400">{error}</span> : null}
    </label>
  );
});

export default Input;
