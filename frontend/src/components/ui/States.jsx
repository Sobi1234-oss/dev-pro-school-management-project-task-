import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import Button from './Button';

function Shimmer({ className = '' }) {
  return (
    <span className={`skeleton-shimmer block rounded-md ${className}`} />
  );
}

export function Spinner({ label = 'Loading…', variant = 'page' }) {
  if (variant === 'table') {
    return (
      <div className="space-y-0 divide-y divide-chalk-200 px-5" role="status" aria-label={label} aria-busy="true">
        <span className="sr-only">{label}</span>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 py-4">
            <Shimmer className="h-4 w-1/4" />
            <Shimmer className="hidden h-4 flex-1 sm:block" />
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="space-y-4 p-5" role="status" aria-label={label} aria-busy="true">
        <span className="sr-only">{label}</span>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3.5 w-2/5" />
              <Shimmer className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'shell') {
    return (
      <div className="min-h-screen lg:pl-60" role="status" aria-label={label} aria-busy="true">
        <span className="sr-only">{label}</span>
        <aside className="ruled-light fixed inset-y-0 left-0 z-30 hidden w-60 bg-ink px-4 pb-4 pt-3 lg:flex lg:flex-col">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="" className="h-20 w-full object-contain object-left" />
          <div className="mt-5 flex-1 space-y-1">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <Shimmer className="h-[18px] w-[18px] rounded" />
                <Shimmer className="h-3.5 w-28 bg-ink-700" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 pt-4">
            <Shimmer className="h-9 w-9 shrink-0 rounded-full bg-ink-700" />
            <div className="flex-1 space-y-2"><Shimmer className="h-3.5 w-24 bg-ink-700" /><Shimmer className="h-3 w-16 bg-ink-700" /></div>
          </div>
        </aside>
        <header className="flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="ProDev Academy" className="h-12 w-[72px] object-contain object-left" />
          <Shimmer className="h-9 w-9 rounded-lg bg-ink-700" />
        </header>
        <main className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2"><Shimmer className="h-8 w-52" /><Shimmer className="h-4 w-72 max-w-full" /></div>
            <Shimmer className="h-11 w-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-chalk-300 bg-white p-4">
                <Shimmer className="h-3.5 w-2/3" /><Shimmer className="h-7 w-1/2" /><Shimmer className="h-3 w-3/4" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((index) => <div key={index} className="space-y-4 rounded-xl border border-chalk-300 bg-white p-5"><Shimmer className="h-5 w-2/5" /><Shimmer className="h-40 w-full rounded-lg" /></div>)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2" role="status" aria-label={label} aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <Shimmer className="h-8 w-52 max-w-full" />
        <Shimmer className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-chalk-300 bg-white p-4">
            <Shimmer className="h-3.5 w-2/3" />
            <Shimmer className="h-7 w-1/2" />
            <Shimmer className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="space-y-4 rounded-xl border border-chalk-300 bg-white p-5">
            <Shimmer className="h-5 w-2/5" />
            <Shimmer className="h-40 w-full rounded-lg" />
            <div className="flex gap-3"><Shimmer className="h-3 w-1/3" /><Shimmer className="h-3 w-1/4" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-chalk-200 text-ink/60"><Icon size={22} /></span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      {message && <p className="mt-1 max-w-xs text-sm text-ink/60">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" role="alert">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-bad-100 text-bad"><AlertTriangle size={22} /></span>
      <h3 className="mt-4 text-base font-bold">Couldn’t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-ink/60">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <Button className="mt-4" variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function FormError({ children }) {
  return children ? <div role="alert" className="mb-4 rounded-lg bg-bad-100 px-3 py-2 text-sm font-medium text-bad">{children}</div> : null;
}
