export default function Card({ title, action, children, className = '', contentClassName = '', pad = true }) {
  return (
    <section className={`min-w-0 rounded-xl border border-chalk-300 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={`${pad ? 'p-5' : ''} ${contentClassName}`}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = 'bg-chalk-200 text-ink' }) {
  return (
    <div className="min-w-0 rounded-xl border border-chalk-300 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink/70">{label}</p>
        {Icon && <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={16} /></span>}
      </div>
      <p className="mt-2 truncate font-display text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink/60">{sub}</p>}
    </div>
  );
}
