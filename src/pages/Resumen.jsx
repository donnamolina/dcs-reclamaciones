import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import KPICard from '../components/ui/KPICard'
import FilterBar from '../components/FilterBar/FilterBar'
import { useFilters, applyFilters } from '../context/FilterContext'
import { LIFECYCLE_STATUSES, SEVERITY_MAP, LIFECYCLE_CLOSED, TIPO_RECLAMO_NUEVO } from '../lib/constants'
import { getSemaforo } from '../lib/semaforo'

const APPLICABLE = { peritos: false, talleres: false, tipoSirweb: false, monto: false }

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtMoney(n) {
  if (!n) return 'RD$0'
  if (n >= 1_000_000) return `RD$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `RD$${(n / 1_000).toFixed(0)}K`
  return `RD$${n.toFixed(0)}`
}

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function Resumen({ data, loading }) {
  const { filters } = useFilters()
  const filtered = useMemo(() => applyFilters(data, filters, APPLICABLE), [data, filters])
  // Exclude payment-only rows (fuente = 'DP_DPA_SHEETS') from claim stats;
  // they are still counted in montoPorPagar below.
  const claims = useMemo(() => filtered.filter(c => c.fuente !== 'DP_DPA_SHEETS'), [filtered])

  const stats = useMemo(() => {
    if (!filtered.length) return null

    const total = claims.length
    const open    = claims.filter(c => !LIFECYCLE_CLOSED.includes(c.de_estatus) && c.cd_estatus !== 5 && c.cd_estatus !== 6).length
    const closed  = claims.filter(c => LIFECYCLE_CLOSED.includes(c.de_estatus) || c.cd_estatus === 5).length
    const dias    = claims.filter(c => c.dias_transcurridos != null).map(c => c.dias_transcurridos)
    const promDias = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0
    const montoTotal  = claims.reduce((s, c) => s + (Number(c.mt_estimado_total) || 0), 0)
    const montoPagado = claims.reduce((s, c) => s + (Number(c.mt_pagado) || 0), 0)
    const montoPendiente = montoTotal - montoPagado
    // montoPorPagar includes DP_DPA_SHEETS rows — they are payment-only records
    const montoPorPagar = filtered.reduce((s, c) => s + (Number(c.monto_por_pagar) || 0), 0)

    // Severity donut
    const bySeverity = Object.entries(SEVERITY_MAP).map(([code, info]) => ({
      name: info.label,
      value: claims.filter(c => c.severidad === code).length,
      fill: info.hex,
    })).filter(e => e.value > 0)
    const sinSeveridad = claims.filter(c => !c.severidad).length
    if (sinSeveridad > 0) bySeverity.push({ name: 'Sin Severidad', value: sinSeveridad, fill: '#CBD5E1' })

    // Tipo reclamo nuevo
    const byTipo = TIPO_RECLAMO_NUEVO.map(tipo => ({
      name: tipo,
      value: claims.filter(c => c.tipo_reclamo_nuevo === tipo).length,
    })).filter(e => e.value > 0)
    const sinTipo = claims.filter(c => !c.tipo_reclamo_nuevo).length
    if (sinTipo > 0) byTipo.push({ name: 'Sin Tipo', value: sinTipo })

    // Semáforo
    const openClaims = claims.filter(c => !LIFECYCLE_CLOSED.includes(c.de_estatus) && c.cd_estatus !== 5 && c.cd_estatus !== 6)
    const verde    = openClaims.filter(c => getSemaforo(c)?.key === 'verde').length
    const amarillo = openClaims.filter(c => getSemaforo(c)?.key === 'amarillo').length
    const rojo     = openClaims.filter(c => getSemaforo(c)?.key === 'rojo').length

    // Monthly (last 12 months)
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      return { year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, abiertos: 0, cerrados: 0 }
    })
    claims.forEach(c => {
      if (c.fe_declaracion) {
        const d = new Date(c.fe_declaracion)
        const m = months.find(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (m) m.abiertos++
      }
      if ((c.de_estatus === 'Cerrado' || c.cd_estatus === 5) && c.updated_at) {
        const d = new Date(c.updated_at)
        const m = months.find(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (m) m.cerrados++
      }
    })

    // Top 5 talleres
    const tallerCounts = claims.reduce((acc, c) => {
      const t = c.nm_taller || 'Sin Taller'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const topTalleres = Object.entries(tallerCounts)
      .filter(([t]) => t !== 'Sin Taller')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, value }))

    // Top 5 peritos by active
    const peritoActive = claims.reduce((acc, c) => {
      if (LIFECYCLE_CLOSED.includes(c.de_estatus) || c.cd_estatus === 5) return acc
      const p = c.perito || 'Sin Asignar'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})
    const topPeritos = Object.entries(peritoActive)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    return { total, open, closed, promDias, montoTotal, montoPagado, montoPendiente, montoPorPagar, bySeverity, byTipo, verde, amarillo, rojo, months, topTalleres, topPeritos }
  }, [filtered])

  if (loading && !data.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#003DA5', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FilterBar data={data} applicableFilters={APPLICABLE} />

      {!stats ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-base font-medium" style={{ color: '#94A3B8' }}>No hay datos disponibles</p>
          <p className="text-sm mt-1" style={{ color: '#CBD5E1' }}>Importe un archivo Excel para comenzar</p>
        </div>
      ) : (() => {
        const { total, open, closed, promDias, montoTotal, montoPagado, montoPendiente, montoPorPagar, bySeverity, byTipo, verde, amarillo, rojo, months, topTalleres, topPeritos } = stats
        return (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KPICard label="Total Reclamaciones" value={fmt(total)} accent="#003DA5"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
              <KPICard label="Casos Abiertos" value={fmt(open)} accent="#F97316"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <KPICard label="Casos Cerrados" value={fmt(closed)} accent="#22C55E"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <KPICard label="Monto Estimado" value={fmtMoney(montoTotal)} accent="#0EA5E9"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <KPICard label="Monto Pagado" value={fmtMoney(montoPagado)} sub={`Pendiente: ${fmtMoney(montoPendiente)}`} accent="#C8A951"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>} />
              <KPICard label="Pendiente de Pago" value={fmtMoney(montoPorPagar)} sub="Estado de Cuenta" accent="#DC2626"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>} />
            </div>

            {/* Row: Severity + Tipo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Severity Donut */}
              <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Distribución por Severidad</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={bySeverity} cx="40%" cy="50%" innerRadius={55} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={2}>
                      {bySeverity.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend layout="vertical" align="right" verticalAlign="middle"
                      formatter={(val) => <span style={{ fontSize: 11, color: '#475569' }}>{val}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Tipo Reclamo Bar */}
              <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Tipo de Reclamo</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byTipo} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={110} />
                    <Tooltip />
                    <Bar dataKey="value" name="Casos" fill="#003DA5" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row: Semáforo + Monthly */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Semáforo */}
              <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Semáforo — Casos Abiertos</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Verde',    sub: '0–15 días',  count: verde,    hex: '#22C55E', bg: '#F0FDF4' },
                    { label: 'Amarillo', sub: '16–30 días', count: amarillo, hex: '#EAB308', bg: '#FEFCE8' },
                    { label: 'Rojo',     sub: '31+ días',   count: rojo,     hex: '#EF4444', bg: '#FEF2F2' },
                  ].map(({ label, sub, count, hex, bg }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: bg }}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: hex }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: '#334155' }}>{label}</p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>{sub}</p>
                      </div>
                      <span className="text-2xl font-bold" style={{ color: hex }}>{count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3 text-center" style={{ color: '#CBD5E1' }}>
                  Solo casos abiertos ({open} total)
                </p>
              </div>

              {/* Monthly Bar */}
              <div className="lg:col-span-2 bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Reclamaciones Mensuales — Últimos 12 Meses</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={months} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                    <Bar dataKey="abiertos" name="Abiertos" fill="#003DA5" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cerrados" name="Cerrados" fill="#22C55E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row: Top Talleres + Top Peritos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Top 5 Talleres por Volumen</h3>
                <div className="space-y-3">
                  {topTalleres.map(({ name, value }, i) => {
                    const pct = Math.round((value / (topTalleres[0]?.value || 1)) * 100)
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: '#334155' }}>{name}</span>
                          <span className="font-semibold" style={{ color: '#003DA5' }}>{value}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#003DA5' : '#93C5FD' }} />
                        </div>
                      </div>
                    )
                  })}
                  {topTalleres.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Sin datos</p>}
                </div>
              </div>

              <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Top 5 Peritos — Casos Activos</h3>
                <div className="space-y-3">
                  {topPeritos.map(({ name, value }, i) => {
                    const pct = Math.round((value / (topPeritos[0]?.value || 1)) * 100)
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: '#334155' }}>{name}</span>
                          <span className="font-semibold" style={{ color: '#7E22CE' }}>{value}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#A855F7' : '#D8B4FE' }} />
                        </div>
                      </div>
                    )
                  })}
                  {topPeritos.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Sin datos</p>}
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
