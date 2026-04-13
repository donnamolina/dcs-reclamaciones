import { SEVERITY_MAP } from '../../lib/constants'

export default function SeverityBadge({ code, size = 'sm' }) {
  if (!code) return <span style={{ color: '#94A3B8', fontSize: 11 }}>—</span>

  const info = SEVERITY_MAP[code]
  if (!info) return <span style={{ color: '#94A3B8', fontSize: 11 }}>{code}</span>

  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 12

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap"
      style={{
        background: info.bg,
        color: info.text,
        fontSize,
        padding: size === 'xs' ? '1px 6px' : '2px 8px',
        border: `1px solid ${info.hex}40`,
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
