import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import KPICard from '../components/ui/KPICard'
import { STATUS_MAP, CLOSED_STATUSES } from '../lib/constants'
import { getSemaforo } from '../lib/semaforo'

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
  const stats = useMemo(() => {
    if (!data.length) return null

    const total = data.length
    const open = data.filter(c => !CLOSED_STATUSES.includes(c.cd_estatus)).length
    const closed = data.filter(c => c.cd_estatus === 5).length
    const dias = data.filter(c => c.dias_transcurridos != null).map(c => c.dias_transcurridos)
    const promDias = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0
    const montoTotal = data.reduce((s, c) => s + (Number(c.mt_estimado_total) || 0), 0)

    // By status
    const byStatus = Object.entries(
      data.reduce((acc, c) => {
        const label = c.de_estatus || 'Sin Estatus'
        acc[label] = (acc[label] || 0) + 1
        return acc
      }, {})
    ).map(([name, value]) => {
      const info = Object.values(STATUS_MAP).find(s => s.label === name)
      return { name, value, fill: info?.hex || '#94A3B8' }
    }).sort((a, b) => b.value - a.value)

    // Semáforo
    const openClaims = data.filter(c => !CLOSED_STATUSES.includes(c.cd_estatus))
    const verde    = openClaims.filter(c => getSemaforo(c)?.key === 'verde').length
    const amarillo = openClaims.filter(c => getSemaforo(c)?.key === 'amarillo').length
    const rojo     = openClaims.filter(c => getSemaforo(c)?.key === 'rojo').length

    // Monthly (last 12 months)
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      return { year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, abiertos: 0, cerrados: 0 }
    })
    data.forEach(c => {
      if (c.fe_declaracion) {
        const d = new Date(c.fe_declaracion)
        const m = months.find(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (m) m.abiertos++
      }
      if (c.cd_estatus === 5 && c.updated_at) {
        const d = new Date(c.updated_at)
        const m = months.find(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (m) m.cerrados++
      }
    })

    // Top 5 talleres
    const tallerCounts = data.reduce((acc, c) => {
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
    const peritoActive = data.reduce((acc, c) => {
      if (CLOSED_STATUSES.includes(c.cd_estatus)) return acc
      const p = c.perito || 'Sin Asignar'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})
    const topPeritos = Object.entries(peritoActive)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    // By tipo_reclamo
    const byTipo = data.reduce((acc, c) => {
      const t = c.tipo_reclamo || 'Sin Tipo'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})

    return { total, open, closed, promDias, montoTotal, byStatus, verde, amarillo, rojo, months, topTalleres, topPeritos, byTipo }
  }, [data])

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

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-base font-medium" style={{ color: '#94A3B8' }}>No hay datos disponibles</p>
        <p className="text-sm mt-1" style={{ color: '#CBD5E1' }}>Importe un archivo Excel para comenzar</p>
      </div>
    )
  }

  const { total, open, closed, promDias, montoTotal, byStatus, verde, amarillo, rojo, months, topTalleres, topPeritos } = stats

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Total Reclamaciones"
          value={fmt(total)}
          accent="#003DA5"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <KPICard
          label="Casos Abiertos"
          value={fmt(open)}
          accent="#F97316"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KPICard
          label="Casos Cerrados"
          value={fmt(closed)}
          accent="#22C55E"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KPICard
          label="Promedio Días"
          value={fmt(promDias)}
          sub="desde apertura"
          accent="#A855F7"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <KPICard
          label="Monto Total Est."
          value={fmtMoney(montoTotal)}
          accent="#0EA5E9"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Row: Donut + Semáforo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Donut */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Reclamaciones por Estatus</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byStatus} cx="40%" cy="50%" innerRadius={60} outerRadius={90}
                dataKey="value" nameKey="name" paddingAngle={2}>
                {byStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend layout="vertical" align="right" verticalAlign="middle"
                formatter={(val) => <span style={{ fontSize: 11, color: '#475569' }}>{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Semáforo */}
        <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Semáforo — Casos Abiertos</h3>
          <div className="space-y-3">
            {[
              { key: 'verde',    label: 'Verde',    sub: '0–15 días',  count: verde,    hex: '#22C55E', bg: '#F0FDF4' },
              { key: 'amarillo', label: 'Amarillo', sub: '16–30 días', count: amarillo, hex: '#EAB308', bg: '#FEFCE8' },
              { key: 'rojo',     label: 'Rojo',     sub: '31+ días',   count: rojo,     hex: '#EF4444', bg: '#FEF2F2' },
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
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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

      {/* Row: Top Talleres + Top Peritos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Talleres */}
        <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Top 5 Talleres por Volumen</h3>
          <div className="space-y-3">
            {topTalleres.map(({ name, value }, i) => {
              const pct = Math.round((value / topTalleres[0].value) * 100)
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#334155' }}>{name}</span>
                    <span className="font-semibold" style={{ color: '#003DA5' }}>{value}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: i === 0 ? '#003DA5' : '#93C5FD' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Peritos */}
        <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Top 5 Peritos — Casos Activos</h3>
          <div className="space-y-3">
            {topPeritos.map(({ name, value }, i) => {
              const pct = Math.round((value / topPeritos[0].value) * 100)
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#334155' }}>{name}</span>
                    <span className="font-semibold" style={{ color: '#7E22CE' }}>{value}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: i === 0 ? '#A855F7' : '#D8B4FE' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
