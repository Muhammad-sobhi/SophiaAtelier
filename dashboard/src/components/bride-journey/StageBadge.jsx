export function StageBadge({ stage, journeyMode }) {
  const meta = {
    visit: { label: 'زيارة', className: 'bg-rose-50 text-rose-600 border-rose-100' },
    booking: { label: 'حجز', className: 'bg-amber-50 text-amber-600 border-amber-100' },
    fitting: { label: 'بروفة', className: 'bg-purple-50 text-purple-600 border-purple-100' },
    picked_up: { label: 'استلام', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    returned: { label: 'إرجاع', className: 'bg-blue-50 text-blue-600 border-blue-100' },
  };
  const current = meta[stage] || meta.visit;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${current.className}`}>
      {current.label}
      {journeyMode === 'legacy' && <span className="opacity-70">Legacy</span>}
    </span>
  );
}
