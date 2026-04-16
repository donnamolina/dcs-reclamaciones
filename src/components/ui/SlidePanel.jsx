import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import SeverityBadge from './SeverityBadge'
import LifecycleStatusBadge from './LifecycleStatusBadge'
import SemaforoTag from './SemaforoTag'
import ReclamoForm from './ReclamoForm'

function Field({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</dt>
      <dd className="mt-0.5 text-sm" style={{ color: '#1E293B', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{value}</dd>
    </div>
  )
}

function formatDate(val) {
  if (!val) return null
  try { return new Date(val).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return val }
}

function formatMoney(val) {
  if (val == null) return null
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 0 }).format(val)
}

export default function SlidePanel({ claim, onClose, onEditSaved, existingData = [] }) {
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !showEdit) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, showEdit])

  if (!claim) return null

  if (showEdit) {
    return (
      <ReclamoForm
        claim={claim}
        existingData={existingData}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); onEditSaved?.(); onClose() }}
      />
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col"
        style={{ animation: 'slideIn 0.2s ease-out' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: '#E2E8F0' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1E293B' }}>
              Reclamo #{claim.nu_reclamo}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <LifecycleStatusBadge deEstatus={claim.de_estatus} cdEstatus={claim.cd_estatus} />
              {claim.severidad && <SeverityBadge code={claim.severidad} />}
              <SemaforoTag claim={claim} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#EFF6FF', color: '#003DA5' }}
              onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
              onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#94A3B8' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#003DA5' }}>
              Clasificación
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Tipo Reclamo" value={claim.tipo_reclamo_nuevo || claim.tipo_reclamo} />
              <Field label="Zona Geográfica" value={claim.zona_geografica} />
              <Field label="Corredor" value={claim.corredor} />
              <Field label="Causa" value={claim.de_causa_siniestro} />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#7C3AED' }}>
              Datos del Reclamante
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Reclamante"        value={claim.nombre_reclamante} />
              <Field label="Asegurado"         value={claim.nombre_asegurado} />
              <Field label="Beneficiario Pago" value={claim.beneficiario_pago} />
              <Field label="Póliza"            value={claim.nu_poliza} />
              <Field label="Certificado"       value={claim.nu_certificado} />
              <Field label="Teléfono"          value={claim.nu_telefono} />
              <Field label="Email"             value={claim.de_email} />
              <Field label="Sucursal"          value={claim.de_sucursal} />
              <Field label="Productor"         value={claim.productor} />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#0EA5E9' }}>
              Siniestro
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Fecha Declaración" value={formatDate(claim.fe_declaracion)} />
              <Field label="Fecha Ocurrencia"  value={formatDate(claim.fe_ocurrencia)} />
              <Field label="Días Transcurridos" value={claim.dias_transcurridos != null ? `${claim.dias_transcurridos} días` : null} />
              <Field label="Movimiento #"      value={claim.nu_movimiento} />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#0EA5E9' }}>
              Vehículo
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Marca"          value={claim.marca} />
              <Field label="Modelo"         value={claim.modelo} />
              <Field label="Año"            value={claim.anio} />
              <Field label="Valor Vehículo" value={formatMoney(claim.valor_vehiculo)} />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#059669' }}>
              Perito y Taller
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Perito"            value={claim.perito || 'Sin Asignar'} />
              <Field label="Taller"            value={claim.nm_taller || 'Sin Taller'} />
              <Field label="Recepción Veh."    value={formatDate(claim.recep_veh)} />
              <Field label="Fecha Entrega"     value={formatDate(claim.fe_entrega)} />
              <Field label="Tiene Piezas"      value={claim.tiene_piezas} />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#C8A951' }}>
              Montos
            </h3>
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Mt. Piezas"       value={formatMoney(claim.mt_piezas)} />
              <Field label="Mt. Mano de Obra" value={formatMoney(claim.mt_mano_obra)} />
              <Field label="Estimado Total"   value={formatMoney(claim.mt_estimado_total)} />
              <Field label="Ajuste Siniestro" value={formatMoney(claim.mt_ajuste_siniestro)} />
              <Field label="Monto Pagado"     value={claim.mt_pagado ? formatMoney(claim.mt_pagado) : null} />
              <Field label="N° DPA"           value={claim.num_dpa} />
              <Field label="Monto DPA"        value={formatMoney(claim.monto_dpa)} />
            </dl>
          </section>

          {(claim.monto_por_pagar > 0 || claim.tipo_pago || claim.dias_vencimiento_pago != null) && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#DC2626' }}>
                Pago Pendiente
              </h3>
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Monto por Pagar"  value={claim.monto_por_pagar ? formatMoney(claim.monto_por_pagar) : null} />
                <Field label="Tipo de Pago"     value={claim.tipo_pago} />
                <Field label="Días Vencimiento" value={claim.dias_vencimiento_pago != null ? `${claim.dias_vencimiento_pago} días` : null} />
                <Field label="Estatus Pago"     value={claim.estatus_pago} />
                <Field label="Zona"             value={claim.zona} />
              </dl>
            </section>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  )
}
