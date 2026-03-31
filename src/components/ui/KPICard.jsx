export default function KPICard({ label, value, sub, accent, icon }) {
  return (
    <div
      className="bg-white rounded-xl p-5 flex items-start gap-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      {icon && (
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
          style={{ background: accent ? `${accent}18` : '#F1F5F9' }}
        >
          <span style={{ color: accent || '#64748B' }}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: accent || '#1E293B' }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
