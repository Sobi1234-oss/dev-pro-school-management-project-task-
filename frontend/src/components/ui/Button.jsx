import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink-800 disabled:bg-ink/40',
  accent: 'bg-bus text-ink hover:bg-bus-600 disabled:bg-bus/50',
  secondary: 'bg-white text-ink border border-chalk-300 hover:bg-chalk-200 disabled:text-ink/40',
  ghost: 'text-ink hover:bg-chalk-200 disabled:text-ink/40',
  danger: 'bg-bad text-white hover:bg-red-700 disabled:bg-bad/50',
};
const SIZES = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', icon: 'h-9 w-9' };

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
