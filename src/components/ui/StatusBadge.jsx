import { STATUS_MAP } from '../../lib/constants'

export default function StatusBadge({ cdEstatus, deEstatus }) {
  const info = STATUS_MAP[cdEstatus]
  const label = deEstatus || info?.label || 'Sin Estatus'
  const bg = info?.bg || '#F9FAFB'
  const text = info?.text || '#374151'

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  )
}
