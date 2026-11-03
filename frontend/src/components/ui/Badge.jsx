const TONES = {
  ok: 'bg-ok-100 text-ok',
  bad: 'bg-bad-100 text-bad',
  warn: 'bg-bus-100 text-[#8a6500]',
  info: 'bg-board-100 text-board',
  neutral: 'bg-chalk-200 text-ink/70',
};

export default function Badge({ tone = 'neutral', children }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
