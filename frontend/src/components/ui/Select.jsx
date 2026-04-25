export default function Select({ label, value, onChange, options = [], placeholder, className = '', ...rest }) {
  return (
    <label className="block">
      {label ? <span className="sr-label">{label}</span> : null}
      <select
        value={value}
        onChange={onChange}
        className={`sr-input appearance-none ${className}`}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>{opt}</option>
          ) : (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )
        )}
      </select>
    </label>
  );
}
