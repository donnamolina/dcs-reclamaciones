import { getSemaforo } from '../../lib/semaforo'

export default function SemaforoTag({ claim, dotOnly = false }) {
  const sem = getSemaforo(claim)
  if (!sem) {
    return dotOnly
      ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-200" title="Cerrado" />
      : <span className="text-xs text-gray-400">—</span>
  }

  if (dotOnly) {
    return (
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: sem.hex }}
        title={`${sem.label} (${claim.dias_transcurridos} días)`}
      />
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: sem.bg, color: sem.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sem.hex }} />
      {sem.label}
    </span>
  )
}
