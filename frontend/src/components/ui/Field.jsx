import { useId } from 'react';

const base = 'block w-full min-w-0 rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-board focus:outline-none focus:ring-2 focus:ring-board/20 disabled:bg-chalk-200';

function Wrapper({ label, error, hint, id, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>}
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-bad">{error}</p>
        : hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  );
}

export function Input({ label, error, hint, className = '', wrapperClass = '', ...rest }) {
  const id = useId();
  return (
    <Wrapper {...{ label, error, hint, id }} className={wrapperClass}>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined}
        className={`${base} h-11 ${error ? 'border-bad' : 'border-chalk-300'} ${className}`} {...rest} />
    </Wrapper>
  );
}

export function Textarea({ label, error, hint, className = '', wrapperClass = '', ...rest }) {
  const id = useId();
  return (
    <Wrapper {...{ label, error, hint, id }} className={wrapperClass}>
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined}
        className={`${base} min-h-32 py-3 ${error ? 'border-bad' : 'border-chalk-300'} ${className}`} {...rest} />
    </Wrapper>
  );
}

export function Select({ label, error, hint, options = [], placeholder, className = '', wrapperClass = '', ...rest }) {
  const id = useId();
  return (
    <Wrapper {...{ label, error, hint, id }} className={wrapperClass}>
      <select id={id} aria-invalid={Boolean(error)} className={`${base} h-11 ${error ? 'border-bad' : 'border-chalk-300'} ${className}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Wrapper>
  );
}
