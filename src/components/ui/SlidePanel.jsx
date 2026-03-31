import { useEffect } from 'react'
import StatusBadge from './StatusBadge'
import SemaforoTag from './SemaforoTag'

function Field({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</dt>
      <dd className="mt-0.5 text-sm" style={{ color: '#1E293B' }}>{value}</dd>
    </div>
  )
}

function formatDate(val) {
  if (!val) return null
  try {
    return new Date(val).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return val }
}

function formatMoney(val) {
  if (val == null) return null
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(val)
}

export default function SlidePanel({ claim, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!claim) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col"
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: '#E2E8F0' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1E293B' }}>
              Reclamo #{claim.nu_reclamo}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge cdEstatus={claim.cd_estatus} deEstatus={claim.de_estatus} />
              <SemaforoTag claim={claim} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Reclamante / Asegurado */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#003DA5' }}>
              Datos del Reclamante
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Reclamante" value={claim.nombre_reclamante} />
              <Field label="Asegurado" value={claim.nombre_asegurado} />
              <Field label="Póliza" value={claim.nu_poliza} />
              <Field label="Certificado" value={claim.nu_certificado} />
              <Field label="Teléfono" value={claim.nu_telefono} />
              <Field label="Email" value={claim.de_email} />
              <Field label="Sucursal" value={claim.de_sucursal} />
              <Field label="Productor" value={claim.productor} />
            </dl>
          </section>

          {/* Siniestro */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#003DA5' }}>
              Datos del Siniestro
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Tipo de Siniestro" value={claim.de_tp_siniestro} />
              <Field label="Causa" value={claim.de_causa_siniestro} />
              <Field label="Tipo de Reclamo" value={claim.tipo_reclamo} />
              <Field label="Movimiento #" value={claim.nu_movimiento} />
              <Field label="Fecha Declaración" value={formatDate(claim.fe_declaracion)} />
              <Field label="Fecha Ocurrencia" value={formatDate(claim.fe_ocurrencia)} />
              <Field label="Días Transcurridos" value={claim.dias_transcurridos != null ? `${claim.dias_transcurridos} días` : null} />
            </dl>
          </section>

          {/* Vehículo */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#003DA5' }}>
              Vehículo
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Marca" value={claim.marca} />
              <Field label="Modelo" value={claim.modelo} />
              <Field label="Año" value={claim.anio} />
              <Field label="Valor Vehículo" value={formatMoney(claim.valor_vehiculo)} />
            </dl>
          </section>

          {/* Perito / Taller */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#003DA5' }}>
              Perito y Taller
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Perito" value={claim.perito || 'Sin Asignar'} />
              <Field label="Taller" value={claim.nm_taller || 'Sin Taller'} />
              <Field label="Recepción Veh." value={formatDate(claim.recep_veh)} />
              <Field label="Fecha Entrega" value={formatDate(claim.fe_entrega)} />
              <Field label="Tiene Piezas" value={claim.tiene_piezas} />
            </dl>
          </section>

          {/* Montos */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#003DA5' }}>
              Montos
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Mt. Piezas" value={formatMoney(claim.mt_piezas)} />
              <Field label="Mt. Mano de Obra" value={formatMoney(claim.mt_mano_obra)} />
              <Field label="Estimado Total" value={formatMoney(claim.mt_estimado_total)} />
              <Field label="Ajuste Siniestro" value={formatMoney(claim.mt_ajuste_siniestro)} />
              <Field label="Num. DPA" value={claim.num_dpa} />
              <Field label="Monto DPA" value={formatMoney(claim.monto_dpa)} />
            </dl>
          </section>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
