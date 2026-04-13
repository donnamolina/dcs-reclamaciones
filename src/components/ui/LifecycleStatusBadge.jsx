import { LIFECYCLE_STATUSES, STATUS_MAP } from '../../lib/constants'

export default function LifecycleStatusBadge({ deEstatus, cdEstatus, size = 'sm' }) {
  const label = deEstatus || (cdEstatus != null ? STATUS_MAP[cdEstatus]?.label : null)
  if (!label) return <span style={{ color: '#94A3B8', fontSize: 11 }}>Sin Estatus</span>

  const info = LIFECYCLE_STATUSES[label]
  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 12

  if (!info) {
    // Fallback for SIRWEB labels
    const sirwebInfo = Object.values(STATUS_MAP).find(s => s.label === label)
    return (
      <span
        className="inline-flex items-center rounded-full font-medium whitespace-nowrap"
        style={{
          background: sirwebInfo?.bg || '#F1F5F9',
          color: sirwebInfo?.text || '#475569',
          fontSize,
          padding: size === 'xs' ? '1px 6px' : '2px 8px',
        }}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap"
      style={{
        background: info.bg,
        color: info.text,
        fontSize,
        padding: size === 'xs' ? '1px 6px' : '2px 8px',
        border: `1px solid ${info.hex}30`,
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: info.hex }}
      />
      {info.label}
    </span>
  )
}
