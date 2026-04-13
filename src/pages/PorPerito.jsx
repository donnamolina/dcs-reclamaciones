import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import FilterBar from '../components/FilterBar/FilterBar'
import SeverityBadge from '../components/ui/SeverityBadge'
import { useFilters, applyFilters } from '../context/FilterContext'
import { LIFECYCLE_CLOSED, SEVERITY_MAP } from '../lib/constants'
import { getSemaforo } from '../lib/semaforo'

// Peritos filter hidden — this IS the per-perito view
const APPLICABLE = { peritos: false, talleres: false, tipoSirweb: false, monto: false }

function fmtMoney(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(Math.round(n))
}

export default function PorPerito({ data, loading }) {
  const navigate = useNavigate()
  const { filters } = useFilters()
  const filtered = useMemo(() => applyFilters(data, filters, APPLICABLE), [data, filters])
  const claims = useMemo(() => filtered.filter(c => c.fuente !== 'DP_DPA_SHEETS'), [filtered])

  const rows = useMemo(() => {
    const map = {}

    claims.forEach(c => {
      const key = c.perito || 'Sin Asignar'
      if (!map[key]) map[key] = {
        perito: key, activos: 0, cerrados: 0, declinados: 0,
        dias: [], monto: 0, verde: 0, amarillo: 0, rojo: 0,
        sevCounts: {}
      }
      const isClosed = LIFECYCLE_CLOSED.includes(c.de_estatus) || c.cd_estatus === 5
      const isDeclined = c.de_estatus === 'Declinado' || c.cd_estatus === 6
      if (isDeclined) map[key].declinados++
      else if (isClosed) map[key].cerrados++
      else map[key].activos++
      if (c.dias_transcurridos != null) map[key].dias.push(Number(c.dias_transcurridos))
      map[key].monto += Number(c.mt_estimado_total) || 0
      const s = getSemaforo(c)
      if (s) map[key][s.key]++
      if (c.severidad) map[key].sevCounts[c.severidad] = (map[key].sevCounts[c.severidad] || 0) + 1
    })

    return Object.values(map)
      .map(r => ({
        ...r,
        total: r.activos + r.cerrados + r.declinados,
        promDias: r.dias.length ? Math.round(r.dias.reduce((a, b) => a + b, 0) / r.dias.length) : null,
        closureRate: r.activos + r.cerrados > 0
          ? ((r.cerrados / (r.activos + r.cerrados)) * 100).toFixed(1)
          : null,
      }))
      .sort((a, b) => {
        if (a.perito === 'Sin Asignar') return 1
        if (b.perito === 'Sin Asignar') return -1
        return b.activos - a.activos
      })
  }, [filtered])

  const chartData = useMemo(() =>
    rows.filter(r => r.perito !== 'Sin Asignar').map(r => ({
      name: r.perito.split(' ')[0],
      Activos:    r.activos,
      Cerrados:   r.cerrados,
      Declinados: r.declinados,
    })), [rows])

  if (loading && !data.length) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#003DA5', borderTopColor: 'transparent' }} />
    </div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>Por Perito</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Desempeño por perito — haz clic en una fila para ver el detalle
        </p>
      </div>

      <FilterBar data={data} applicableFilters={APPLICABLE} />

      {/* Stacked bar chart */}
      <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Distribución de Casos por Perito</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip />
            <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
            <Bar dataKey="Activos"    stackId="a" fill="#003DA5" />
            <Bar dataKey="Cerrados"   stackId="a" fill="#22C55E" />
            <Bar dataKey="Declinados" stackId="a" fill="#EF4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                {['Perito','Activos','Cerrados','Declin.','Cierre %','Prom. Días','Monto Est.','🟢','🟡','🔴'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                    style={{ color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const crColor = r.closureRate == null ? '#94A3B8'
                  : parseFloat(r.closureRate) >= 70 ? '#15803D'
                  : parseFloat(r.closureRate) >= 40 ? '#A16207' : '#B91C1C'
                return (
                  <tr
                    key={r.perito}
                    onClick={() => navigate(`/detalle?perito=${encodeURIComponent(r.perito)}`)}
                    className="border-t cursor-pointer"
                    style={{ borderColor: '#F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: r.perito === 'Sin Asignar' ? '#94A3B8' : '#1E293B' }}>
                      {r.perito === 'Sin Asignar' ? <span className="italic">{r.perito}</span> : (
                        <span className="flex items-center gap-2">
                          {r.perito}
                          <svg className="w-3.5 h-3.5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#003DA5' }}>{r.activos}</td>
                    <td className="px-4 py-3" style={{ color: '#15803D' }}>{r.cerrados}</td>
                    <td className="px-4 py-3" style={{ color: '#B91C1C' }}>{r.declinados}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-xs" style={{ color: crColor }}>
                        {r.closureRate != null ? `${r.closureRate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>
                      {r.promDias != null ? `${r.promDias}d` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>
                      {fmtMoney(r.monto)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-xs" style={{ color: '#15803D' }}>{r.verde}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-xs" style={{ color: '#A16207' }}>{r.amarillo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-xs" style={{ color: '#B91C1C' }}>{r.rojo}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
