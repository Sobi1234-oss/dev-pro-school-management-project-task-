import { Search } from 'lucide-react';

export default function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className="relative block min-w-0 flex-1 sm:max-w-xs">
      <span className="sr-only">{placeholder}</span>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-chalk-300 bg-white pl-9 pr-3 text-sm placeholder:text-ink/40 focus:border-board focus:outline-none focus:ring-2 focus:ring-board/20" />
    </label>
  );
}
