import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ComposedChart
} from 'recharts'
import FilterBar from '../components/FilterBar/FilterBar'
import { useFilters, applyFilters } from '../context/FilterContext'
import { LIFECYCLE_CLOSED, SEVERITY_MAP } from '../lib/constants'
import { getSemaforo } from '../lib/semaforo'

const APPLICABLE = { peritos: false, talleres: false, tipoSirweb: false }
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtMoney(n) {
  if (!n) return 'RD$0'
  if (n >= 1_000_000) return `RD$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `RD$${(n / 1_000).toFixed(0)}K`
  return `RD$${n.toFixed(0)}`
}

function ProgressKPI({ label, value, meta, format = 'pct' }) {
  const pct = format === 'pct' ? value : (value / meta) * 100
  const displayVal = format === 'pct' ? `${value.toFixed(1)}%` : `${value.toFixed(0)}`
  const metaLabel = format === 'pct' ? `Meta: ${meta}%` : `Meta: ${meta}`
  const color = pct >= meta ? '#22C55E' : pct >= meta * 0.85 ? '#EAB308' : '#EF4444'
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</p>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${color}18`, color }}>
          {metaLabel}
        </span>
      </div>
      <p className="text-3xl font-bold mb-3" style={{ color }}>{displayVal}</p>
      <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div className="pt-2">
      <h3 className="text-base font-bold" style={{ color: '#1E293B' }}>{title}</h3>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{sub}</p>}
    </div>
  )
}

export default function KPIs({ data, loading }) {
  const { filters } = useFilters()
  const filtered = useMemo(() => applyFilters(data, filters, APPLICABLE), [data, filters])

  const stats = useMemo(() => {
    if (!filtered.length) return null

    const total = filtered.length
    const closed = filtered.filter(c => LIFECYCLE_CLOSED.includes(c.de_estatus) || c.cd_estatus === 5)
    const open   = filtered.filter(c => !LIFECYCLE_CLOSED.includes(c.de_estatus) && c.cd_estatus !== 5 && c.cd_estatus !== 6)

    // === VOLUMEN ===
    const pctPerito = (filtered.filter(c => c.perito).length / total) * 100
    const pctTaller = (filtered.filter(c => c.nm_taller).length / total) * 100
    const pctSeveridad = (filtered.filter(c => c.severidad).length / total) * 100
    const pctTipoNuevo = (filtered.filter(c => c.tipo_reclamo_nuevo).length / total) * 100

    // === TIEMPO ===
    const closedWithDias = closed.filter(c => c.dias_transcurridos != null)
    const pctClosed15 = closedWithDias.length ? (closedWithDias.filter(c => c.dias_transcurridos <= 15).length / total) * 100 : 0
    const pctClosed30 = closedWithDias.length ? (closedWithDias.filter(c => c.dias_transcurridos <= 30).length / total) * 100 : 0
    const pctClosed60 = closedWithDias.length ? (closedWithDias.filter(c => c.dias_transcurridos <= 60).length / total) * 100 : 0

    // SLA breach: rojo semaforo on open claims
    const slaBreachCount = open.filter(c => getSemaforo(c)?.key === 'rojo').length
    const pctSlaOk = open.length ? ((open.length - slaBreachCount) / open.length) * 100 : 100

    // SLA table by perito
    const peritoMap = {}
    filtered.forEach(c => {
      const p = c.perito || 'Sin Asignar'
      if (!peritoMap[p]) peritoMap[p] = { total: 0, d15: 0, d30: 0, d60: 0 }
      peritoMap[p].total++
      if (c.dias_transcurridos != null) {
        if (c.dias_transcurridos <= 15) peritoMap[p].d15++
        if (c.dias_transcurridos <= 30) peritoMap[p].d30++
        if (c.dias_transcurridos <= 60) peritoMap[p].d60++
      }
    })
    const slaTable = Object.entries(peritoMap)
      .map(([perito, v]) => ({
        perito, total: v.total,
        pct15: ((v.d15 / v.total) * 100).toFixed(1),
        pct30: ((v.d30 / v.total) * 100).toFixed(1),
        pct60: ((v.d60 / v.total) * 100).toFixed(1),
      }))
      .sort((a, b) => { if (a.perito === 'Sin Asignar') return 1; if (b.perito === 'Sin Asignar') return -1; return b.total - a.total })

    // Monthly trend
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      return { year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, dias: [] }
    })
    closed.forEach(c => {
      if (!c.fe_declaracion || c.dias_transcurridos == null) return
      const d = new Date(c.fe_declaracion)
      const m = months.find(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
      if (m) m.dias.push(c.dias_transcurridos)
    })
    const trendData = months.map(m => ({
      label: m.label,
      'Prom. Días': m.dias.length ? Math.round(m.dias.reduce((a, b) => a + b, 0) / m.dias.length) : null
    }))

    // === MONTOS ===
    const montoTotal   = filtered.reduce((s, c) => s + (Number(c.mt_estimado_total) || 0), 0)
    const montoPagado  = filtered.reduce((s, c) => s + (Number(c.mt_pagado) || 0), 0)
    const montoPend    = montoTotal - montoPagado
    const pctPagado    = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0

    // Estimado vs Pagado by severity
    const montosBySev = Object.entries(SEVERITY_MAP).map(([code, info]) => {
      const rows = filtered.filter(c => c.severidad === code)
      return {
        name: info.label,
        Estimado: rows.reduce((s, c) => s + (Number(c.mt_estimado_total) || 0), 0),
        Pagado:   rows.reduce((s, c) => s + (Number(c.mt_pagado) || 0), 0),
        fill: info.hex,
      }
    }).filter(r => r.Estimado > 0 || r.Pagado > 0)

    // Estimado vs Pagado monthly
    const montosByMonth = months.map(m => {
      const rows = filtered.filter(c => {
        if (!c.fe_declaracion) return false
        const d = new Date(c.fe_declaracion)
        return d.getFullYear() === m.year && d.getMonth() === m.month
      })
      return {
        label: m.label,
        Estimado: rows.reduce((s, c) => s + (Number(c.mt_estimado_total) || 0), 0) / 1000,
        Pagado:   rows.reduce((s, c) => s + (Number(c.mt_pagado) || 0), 0) / 1000,
      }
    })

    return {
      pctPerito, pctTaller, pctSeveridad, pctTipoNuevo,
      pctClosed15, pctClosed30, pctClosed60, pctSlaOk,
      slaTable, trendData,
      montoTotal, montoPagado, montoPend, pctPagado, montosBySev, montosByMonth
    }
  }, [filtered])

  if (loading && !data.length) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#003DA5', borderTopColor: 'transparent' }} />
    </div>
  }

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-base font-medium" style={{ color: '#94A3B8' }}>No hay datos disponibles</p>
    </div>
  )

  const { pctPerito, pctTaller, pctSeveridad, pctTipoNuevo,
    pctClosed15, pctClosed30, pctClosed60, pctSlaOk,
    slaTable, trendData,
    montoTotal, montoPagado, montoPend, pctPagado, montosBySev, montosByMonth } = stats

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>KPIs y Cumplimiento SLA</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Indicadores clave según normativa DCS-PR-OP-006</p>
      </div>

      <FilterBar data={data} applicableFilters={APPLICABLE} />

      {/* === BLOQUE 1: VOLUMEN === */}
      <SectionHeader title="Completitud de Datos" sub="Porcentaje de reclamaciones con campos críticos asignados" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressKPI label="Con perito asignado"      value={pctPerito}    meta={100} />
        <ProgressKPI label="Con taller asignado"      value={pctTaller}    meta={100} />
        <ProgressKPI label="Con severidad asignada"   value={pctSeveridad} meta={100} />
        <ProgressKPI label="Con tipo reclamo asignado" value={pctTipoNuevo} meta={100} />
      </div>

      {/* === BLOQUE 2: TIEMPO === */}
      <SectionHeader title="Cumplimiento de Tiempos" sub="% de casos cerrados dentro del límite de días" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressKPI label="Cerrados ≤ 15 días"    value={pctClosed15} meta={85} />
        <ProgressKPI label="Cerrados ≤ 30 días"    value={pctClosed30} meta={95} />
        <ProgressKPI label="Cerrados ≤ 60 días (legal)" value={pctClosed60} meta={100} />
        <ProgressKPI label="Casos abiertos en SLA" value={pctSlaOk}    meta={85} />
      </div>

      {/* Monthly trend */}
      <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>
          Tendencia — Promedio de Días al Cierre (últimos 12 meses)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData} margin={{ top: 0, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip formatter={v => v != null ? [`${v} días`, 'Prom. Días'] : ['Sin datos', '']} />
            <Line type="monotone" dataKey="Prom. Días" stroke="#003DA5" strokeWidth={2}
              dot={{ fill: '#003DA5', r: 3 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SLA table by perito */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#1E293B' }}>Cumplimiento SLA por Perito</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                {['Perito', 'Total', '≤ 15 días', '≤ 30 días', '≤ 60 días (legal)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slaTable.map(r => (
                <tr key={r.perito} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: r.perito === 'Sin Asignar' ? '#94A3B8' : '#1E293B' }}>
                    {r.perito === 'Sin Asignar' ? <span className="italic">{r.perito}</span> : r.perito}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#475569' }}>{r.total}</td>
                  {[r.pct15, r.pct30, r.pct60].map((pct, i) => {
                    const n = parseFloat(pct)
                    const metas = [85, 95, 100]
                    const color = n >= metas[i] ? '#15803D' : n >= metas[i] * 0.85 ? '#A16207' : '#B91C1C'
                    return <td key={i} className="px-4 py-3"><span className="font-semibold" style={{ color }}>{pct}%</span></td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === BLOQUE 3: MONTOS === */}
      <SectionHeader title="Análisis de Montos" sub="Estimado vs. pagado por mes y por severidad" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Estimado', value: fmtMoney(montoTotal), color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Total Pagado',   value: fmtMoney(montoPagado), color: '#15803D', bg: '#F0FDF4' },
          { label: 'Pendiente',      value: fmtMoney(montoPend),   color: '#D97706', bg: '#FFFBEB' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-xl p-5" style={{ background: bg, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Estimado vs Pagado monthly */}
      <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#1E293B' }}>Estimado vs. Pagado por Mes (RD$ miles)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={montosByMonth} margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip formatter={(v, n) => [`RD$${v.toFixed(0)}K`, n]} />
            <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
            <Bar dataKey="Estimado" fill="#003DA5" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Pagado"   fill="#22C55E" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Estimado vs Pagado by severity */}
      {montosBySev.length > 0 && (
        <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Estimado vs. Pagado por Severidad</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={montosBySev} margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip formatter={(v, n) => [fmtMoney(v), n]} />
              <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="Estimado" fill="#003DA5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Pagado"   fill="#22C55E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
