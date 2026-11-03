import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { EmptyState, ErrorState, Spinner } from './States';

/**
 * columns: [{ key, header, render?(row), primary?: boolean, align?: 'right' }]
 * Renders a table from `md` up and stacked cards on phones, so nothing ever scrolls sideways.
 */
export default function DataTable({ columns, rows, loading, error, onRetry, empty, meta, onPage, actions }) {
  if (error && !rows?.length) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !rows?.length) return <Spinner variant="table" />;
  if (!rows?.length) return empty || <EmptyState />;

  const cell = (c, row) => (c.render ? c.render(row) : row[c.key] ?? '—');
  const primary = columns.find((c) => c.primary) || columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : ''}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-chalk-300 text-xs font-semibold text-ink/60">
              {columns.map((c) => <th key={c.key} className={`px-5 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>)}
              {actions && <th className="px-5 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-chalk-200">
            {rows.map((row) => (
              <tr key={row.id ?? row.student_id} className="hover:bg-chalk/60">
                {columns.map((c) => <td key={c.key} className={`px-5 py-3 ${c.align === 'right' ? 'text-right' : ''} ${c === primary ? 'font-semibold' : ''}`}>{cell(c, row)}</td>)}
                {actions && <td className="px-5 py-2"><div className="flex justify-end gap-1">{actions(row)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-chalk-200 md:hidden">
        {rows.map((row) => (
          <li key={row.id ?? row.student_id} className="space-y-2 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-words font-semibold">{cell(primary, row)}</div>
              {actions && <div className="flex shrink-0 gap-1">{actions(row)}</div>}
            </div>
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
              {rest.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-ink/60">{c.header}</dt>
                  <dd className="min-w-0 break-words text-right">{cell(c, row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-chalk-200 px-4 py-3 text-sm">
          <span className="text-ink/60">Page {meta.page} of {meta.last_page} · {meta.total} total</span>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft size={16} /></Button>
            <Button variant="secondary" size="icon" aria-label="Next page" disabled={meta.page >= meta.last_page} onClick={() => onPage(meta.page + 1)}><ChevronRight size={16} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
