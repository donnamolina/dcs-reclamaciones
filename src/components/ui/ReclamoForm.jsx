import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
  LIFECYCLE_STATUSES, SEVERITY_MAP, TIPO_RECLAMO_NUEVO,
  ZONAS_GEOGRAFICAS, CATEGORIAS_PAGO
} from '../../lib/constants'

const EMPTY = {
  nu_reclamo: '', nombre_asegurado: '', nombre_reclamante: '',
  nu_poliza: '', nu_certificado: '', nu_telefono: '', de_email: '',
  de_sucursal: '', productor: '', corredor: '',
  perito: '', nm_taller: '',
  de_estatus: 'Abierto', severidad: '', tipo_reclamo_nuevo: '', tipo_reclamo: '',
  zona_geografica: '',
  fe_declaracion: '', fe_ocurrencia: '', recep_veh: '', fe_entrega: '',
  dias_transcurridos: '', marca: '', modelo: '', anio: '',
  valor_vehiculo: '', mt_piezas: '', mt_mano_obra: '', mt_estimado_total: '',
  mt_pagado: '', mt_ajuste_siniestro: '', monto_dpa: '', num_dpa: '',
  de_causa_siniestro: '', notas: '',
}

const SECTIONS = [
  {
    title: 'Identificación',
    color: '#003DA5',
    fields: [
      { key: 'nu_reclamo',       label: 'N° Reclamo *', type: 'text',   required: true },
      { key: 'de_estatus',       label: 'Estatus',      type: 'select', options: Object.keys(LIFECYCLE_STATUSES) },
      { key: 'severidad',        label: 'Severidad',    type: 'select', options: Object.entries(SEVERITY_MAP).map(([k,v]) => ({ value: k, label: v.label })) },
      { key: 'tipo_reclamo_nuevo', label: 'Tipo Reclamo', type: 'select', options: TIPO_RECLAMO_NUEVO },
      { key: 'fe_declaracion',   label: 'Fecha Declaración', type: 'date' },
      { key: 'fe_ocurrencia',    label: 'Fecha Ocurrencia',  type: 'date' },
      { key: 'de_causa_siniestro', label: 'Causa Siniestro', type: 'text' },
      { key: 'zona_geografica',  label: 'Zona Geográfica', type: 'select', options: ZONAS_GEOGRAFICAS },
    ]
  },
  {
    title: 'Reclamante / Asegurado',
    color: '#7C3AED',
    fields: [
      { key: 'nombre_asegurado',  label: 'Nombre Asegurado',  type: 'text' },
      { key: 'nombre_reclamante', label: 'Nombre Reclamante', type: 'text' },
      { key: 'nu_poliza',         label: 'N° Póliza',         type: 'text' },
      { key: 'nu_certificado',    label: 'N° Certificado',    type: 'text' },
      { key: 'nu_telefono',       label: 'Teléfono',          type: 'text' },
      { key: 'de_email',          label: 'Email',             type: 'text' },
      { key: 'de_sucursal',       label: 'Sucursal',          type: 'text' },
      { key: 'productor',         label: 'Productor',         type: 'text' },
      { key: 'corredor',          label: 'Corredor',          type: 'text' },
    ]
  },
  {
    title: 'Vehículo',
    color: '#0EA5E9',
    fields: [
      { key: 'marca',          label: 'Marca',  type: 'text' },
      { key: 'modelo',         label: 'Modelo', type: 'text' },
      { key: 'anio',           label: 'Año',    type: 'number' },
      { key: 'valor_vehiculo', label: 'Valor Vehículo', type: 'number' },
    ]
  },
  {
    title: 'Perito y Taller',
    color: '#059669',
    fields: [
      { key: 'perito',              label: 'Perito',               type: 'datalist', listKey: 'peritos' },
      { key: 'nm_taller',           label: 'Taller',               type: 'datalist', listKey: 'talleres' },
      { key: 'recep_veh',           label: 'Recepción Vehículo',   type: 'date' },
      { key: 'fe_entrega',          label: 'Fecha Entrega',        type: 'date' },
      { key: 'dias_transcurridos',  label: 'Días Transcurridos',   type: 'number' },
      { key: 'tiene_piezas',        label: 'Tiene Piezas',         type: 'text' },
    ]
  },
  {
    title: 'Montos',
    color: '#C8A951',
    fields: [
      { key: 'mt_piezas',          label: 'Mt. Piezas',          type: 'number' },
      { key: 'mt_mano_obra',       label: 'Mt. Mano de Obra',    type: 'number' },
      { key: 'mt_estimado_total',  label: 'Estimado Total',      type: 'number' },
      { key: 'mt_ajuste_siniestro', label: 'Ajuste Siniestro',   type: 'number' },
      { key: 'mt_pagado',          label: 'Monto Pagado',        type: 'number' },
      { key: 'num_dpa',            label: 'N° DPA',              type: 'text' },
      { key: 'monto_dpa',          label: 'Monto DPA',           type: 'number' },
    ]
  },
]

const NUMERIC_KEYS = new Set([
  'nu_reclamo','nu_poliza','nu_certificado','anio','valor_vehiculo',
  'mt_piezas','mt_mano_obra','mt_estimado_total','mt_ajuste_siniestro',
  'mt_pagado','monto_dpa','dias_transcurridos'
])

function toForm(claim) {
  if (!claim) return { ...EMPTY }
  const f = { ...EMPTY }
  for (const k of Object.keys(EMPTY)) {
    const v = claim[k]
    if (v == null) { f[k] = ''; continue }
    if (k.startsWith('fe_') || k === 'recep_veh') {
      f[k] = v ? v.slice(0, 10) : ''
    } else {
      f[k] = String(v)
    }
  }
  return f
}

function fromForm(form) {
  const row = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === '' || v === null) { row[k] = null; continue }
    if (NUMERIC_KEYS.has(k)) {
      const n = Number(v)
      row[k] = isNaN(n) ? null : n
    } else if (k.startsWith('fe_') || k === 'recep_veh') {
      row[k] = v || null
    } else {
      row[k] = v.trim() || null
    }
  }
  return row
}

export default function ReclamoForm({ claim, onClose, onSaved, existingData = [] }) {
  const isEdit = Boolean(claim)
  const [form, setForm] = useState(() => toForm(claim))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState(0)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Datalist options from existing data
  const datalists = useMemo(() => ({
    peritos:  [...new Set(existingData.map(c => c.perito).filter(Boolean))].sort(),
    talleres: [...new Set(existingData.map(c => c.nm_taller).filter(Boolean))].sort(),
  }), [existingData])

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.nu_reclamo.trim()) { setError('El N° de Reclamo es requerido.'); return }
    setSaving(true)
    setError(null)
    try {
      const row = fromForm(form)
      const { error: err } = await supabase
        .from('recl_reclamaciones')
        .upsert(row, { onConflict: 'nu_reclamo', ignoreDuplicates: false })
      if (err) throw err
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function renderField(f, sectionIdx) {
    const v = form[f.key] ?? ''
    const base = "w-full py-1.5 px-2.5 text-sm rounded-lg border outline-none transition-colors focus:ring-2"
    const style = { borderColor: '#E2E8F0', color: '#334155' }

    if (f.type === 'select') {
      const opts = Array.isArray(f.options)
        ? f.options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
        : []
      return (
        <select key={f.key} value={v} onChange={e => set(f.key, e.target.value)}
          className={base} style={style}>
          <option value="">—</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }

    if (f.type === 'datalist') {
      const listId = `dl-${f.key}`
      return (
        <div key={f.key} className="relative">
          <input list={listId} value={v} onChange={e => set(f.key, e.target.value)}
            className={base} style={style} />
          <datalist id={listId}>
            {(datalists[f.listKey] || []).map(opt => <option key={opt} value={opt} />)}
          </datalist>
        </div>
      )
    }

    return (
      <input key={f.key} type={f.type} value={v}
        onChange={e => set(f.key, e.target.value)}
        className={base} style={style} />
    )
  }

  const section = SECTIONS[activeSection]

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col"
        style={{ animation: 'slideIn 0.2s ease-out' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1E293B' }}>
              {isEdit ? `Editar Reclamo #${claim.nu_reclamo}` : 'Nueva Reclamación'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
              {isEdit ? 'Modifica los campos y guarda' : 'Completa los campos necesarios'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto" style={{ borderColor: '#F1F5F9' }}>
          {SECTIONS.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setActiveSection(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                background: i === activeSection ? s.color : 'transparent',
                color: i === activeSection ? 'white' : '#64748B',
              }}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: section.color }} />
            <h3 className="text-sm font-semibold" style={{ color: '#1E293B' }}>{section.title}</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {section.fields.map(f => (
              <div key={f.key} className={f.key === 'de_causa_siniestro' || f.key === 'notas' ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                  {f.label}
                </label>
                {renderField(f, activeSection)}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: '#E2E8F0' }}>
          {error && (
            <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {SECTIONS.map((_, i) => (
                <button key={i} onClick={() => setActiveSection(i)}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ background: i === activeSection ? '#003DA5' : '#E2E8F0' }} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              {activeSection > 0 && (
                <button onClick={() => setActiveSection(i => i - 1)}
                  className="px-4 py-2 text-sm rounded-lg"
                  style={{ color: '#64748B', background: '#F1F5F9' }}>
                  Atrás
                </button>
              )}
              {activeSection < SECTIONS.length - 1 ? (
                <button onClick={() => setActiveSection(i => i + 1)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ background: '#003DA5' }}>
                  Siguiente
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60"
                  style={{ background: '#003DA5' }}>
                  {saving ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Reclamación'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  )
}
