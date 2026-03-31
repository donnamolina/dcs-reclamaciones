import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { CLOSED_STATUSES, STATUS_MAP } from '../lib/constants'
import { getSemaforo } from '../lib/semaforo'

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

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
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function KPIs({ data, loading }) {
  const stats = useMemo(() => {
    if (!data.length) return null

    const total = data.length
    const closed = data.filter(c => c.cd_estatus === 5)
    const withDias = data.filter(c => c.dias_transcurridos != null)

    // % closed < 15 / 30 / 60 days
    const closed15 = closed.filter(c => c.dias_transcurridos != null && c.dias_transcurridos <= 15).length
    const closed30 = closed.filter(c => c.dias_transcurridos != null && c.dias_transcurridos <= 30).length
    const closed60 = closed.filter(c => c.dias_transcurridos != null && c.dias_transcurridos <= 60).length
    const closedWithDias = closed.filter(c => c.dias_transcurridos != null).length

    const pctClosed15 = closedWithDias ? (closed15 / total) * 100 : 0
    const pctClosed30 = closedWithDias ? (closed30 / total) * 100 : 0
    const pctClosed60 = closedWithDias ? (closed60 / total) * 100 : 0
    const pctPerito  = (data.filter(c => c.perito).length / total) * 100
    const pctTaller  = (data.filter(c => c.nm_taller).length / total) * 100

    // Avg days by status
    const byStatus = Object.entries(STATUS_MAP).map(([cd, info]) => {
      const rows = data.filter(c => Number(c.cd_estatus) === Number(cd) && c.dias_transcurridos != null)
      const avg = rows.length ? Math.round(rows.reduce((s, c) => s + c.dias_transcurridos, 0) / rows.length) : 0
      return { name: info.label.split(' ').slice(0, 2).join(' '), avg, fill: info.hex }
    }).filter(r => r.avg > 0)

    // SLA by perito
    const peritoMap = {}
    data.forEach(c => {
      const p = c.perito || 'Sin Asignar'
      if (!peritoMap[p]) peritoMap[p] = { total: 0, dentro15: 0, dentro30: 0, dentro60: 0 }
      peritoMap[p].total++
      if (c.dias_transcurridos != null) {
        if (c.dias_transcurridos <= 15) peritoMap[p].dentro15++
        if (c.dias_transcurridos <= 30) peritoMap[p].dentro30++
        if (c.dias_transcurridos <= 60) peritoMap[p].dentro60++
      }
    })
    const slaTable = Object.entries(peritoMap)
      .map(([perito, v]) => ({
        perito,
        total: v.total,
        pct15: ((v.dentro15 / v.total) * 100).toFixed(1),
        pct30: ((v.dentro30 / v.total) * 100).toFixed(1),
        pct60: ((v.dentro60 / v.total) * 100).toFixed(1),
      }))
      .sort((a, b) => {
        if (a.perito === 'Sin Asignar') return 1
        if (b.perito === 'Sin Asignar') return -1
        return b.total - a.total
      })

    // Monthly avg days to close (last 12 months)
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

    return { pctClosed15, pctClosed30, pctClosed60, pctPerito, pctTaller, byStatus, slaTable, trendData }
  }, [data])

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

  const { pctClosed15, pctClosed30, pctClosed60, pctPerito, pctTaller, byStatus, slaTable, trendData } = stats

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>KPIs y Cumplimiento SLA</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Indicadores clave según normativa DCS-PR-OP-006
        </p>
      </div>

      {/* KPI Progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProgressKPI label="Casos cerrados ≤ 15 días" value={pctClosed15} meta={85} />
        <ProgressKPI label="Casos cerrados ≤ 30 días" value={pctClosed30} meta={95} />
        <ProgressKPI label="Casos cerrados ≤ 60 días (límite legal)" value={pctClosed60} meta={100} />
        <ProgressKPI label="Con perito asignado" value={pctPerito} meta={100} />
        <ProgressKPI label="Con taller asignado" value={pctTaller} meta={100} />
      </div>

      {/* Avg days by status */}
      <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Promedio de Días por Estatus Actual</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byStatus} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip formatter={v => [`${v} días`, 'Promedio']} />
            <Bar dataKey="avg" name="Prom. Días" radius={[3, 3, 0, 0]}>
              {byStatus.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
            <Line
              type="monotone"
              dataKey="Prom. Días"
              stroke="#003DA5"
              strokeWidth={2}
              dot={{ fill: '#003DA5', r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SLA table by perito */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#1E293B' }}>Cumplimiento SLA por Perito</h3>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>% de casos dentro del límite de días</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                {['Perito', 'Total Casos', '≤ 15 días', '≤ 30 días', '≤ 60 días (legal)'].map(h => (
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
                    return (
                      <td key={i} className="px-4 py-3">
                        <span className="font-semibold" style={{ color }}>{pct}%</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
