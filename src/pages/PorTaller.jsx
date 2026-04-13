import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import FilterBar from '../components/FilterBar/FilterBar'
import { useFilters, applyFilters } from '../context/FilterContext'
import { LIFECYCLE_CLOSED } from '../lib/constants'
import { getSemaforo } from '../lib/semaforo'

const APPLICABLE = { talleres: false, peritos: false, tipoSirweb: false, monto: false }
const MIN_CLAIMS = 5

function fmtMoney(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(Math.round(n))
}

function diffDays(a, b) {
  if (!a || !b) return null
  const ms = new Date(b) - new Date(a)
  return ms < 0 ? null : Math.round(ms / (1000 * 60 * 60 * 24))
}

export default function PorTaller({ data, loading }) {
  const navigate = useNavigate()
  const { filters } = useFilters()
  const filtered = useMemo(() => applyFilters(data, filters, APPLICABLE), [data, filters])

  const rows = useMemo(() => {
    const map = {}

    filtered.forEach(c => {
      const key = c.nm_taller || 'Sin Taller'
      if (!map[key]) map[key] = {
        taller: key, total: 0, activos: 0, cerrados: 0,
        monto: 0, montoPagado: 0, repDias: [], verde: 0, amarillo: 0, rojo: 0
      }
      map[key].total++
      const isClosed = LIFECYCLE_CLOSED.includes(c.de_estatus) || c.cd_estatus === 5 || c.cd_estatus === 6
      if (isClosed) map[key].cerrados++
      else map[key].activos++
      map[key].monto += Number(c.mt_estimado_total) || 0
      map[key].montoPagado += Number(c.mt_pagado) || 0
      const rep = diffDays(c.recep_veh, c.fe_entrega)
      if (rep != null) map[key].repDias.push(rep)
      const s = getSemaforo(c)
      if (s) map[key][s.key]++
    })

    return Object.values(map)
      .map(r => ({
        ...r,
        promRep: r.repDias.length ? Math.round(r.repDias.reduce((a, b) => a + b, 0) / r.repDias.length) : null,
        closureRate: r.total > 0 ? ((r.cerrados / r.total) * 100).toFixed(1) : null,
        slaBreached: r.rojo,
      }))
      .sort((a, b) => {
        if (a.taller === 'Sin Taller') return 1
        if (b.taller === 'Sin Taller') return -1
        return b.total - a.total
      })
  }, [filtered])

  const qualified = rows.filter(r => r.taller === 'Sin Taller' || r.total >= MIN_CLAIMS)

  const chartData = useMemo(() =>
    qualified
      .filter(r => r.taller !== 'Sin Taller')
      .slice(0, 10)
      .map(r => ({
        name: r.taller.length > 16 ? r.taller.slice(0, 16) + '…' : r.taller,
        Casos: r.total,
      })), [qualified])

  if (loading && !data.length) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#003DA5', borderTopColor: 'transparent' }} />
    </div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>Por Taller</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Solo talleres con {MIN_CLAIMS}+ reclamaciones — haz clic para ver el detalle
        </p>
      </div>

      <FilterBar data={data} applicableFilters={APPLICABLE} />

      {/* Bar chart */}
      <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Volumen por Taller (Top 10)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={120} />
            <Tooltip />
            <Bar dataKey="Casos" fill="#003DA5" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                {['Taller','Total','Activos','Cerrados','Cierre %','Prom. Reparación','Monto Est.','🟢','🟡','🔴'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                    style={{ color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qualified.map(r => {
                const crColor = r.closureRate == null ? '#94A3B8'
                  : parseFloat(r.closureRate) >= 70 ? '#15803D'
                  : parseFloat(r.closureRate) >= 40 ? '#A16207' : '#B91C1C'
                return (
                  <tr
                    key={r.taller}
                    onClick={() => navigate(`/detalle?taller=${encodeURIComponent(r.taller)}`)}
                    className="border-t cursor-pointer"
                    style={{ borderColor: '#F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate"
                      style={{ color: r.taller === 'Sin Taller' ? '#94A3B8' : '#1E293B' }}>
                      {r.taller === 'Sin Taller' ? <span className="italic">{r.taller}</span> : (
                        <span className="flex items-center gap-2">
                          {r.taller}
                          <svg className="w-3.5 h-3.5 opacity-30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#003DA5' }}>{r.total}</td>
                    <td className="px-4 py-3" style={{ color: '#F97316' }}>{r.activos}</td>
                    <td className="px-4 py-3" style={{ color: '#15803D' }}>{r.cerrados}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-xs" style={{ color: crColor }}>
                        {r.closureRate != null ? `${r.closureRate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>
                      {r.promRep != null ? `${r.promRep}d` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>
                      {fmtMoney(r.monto)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: '#15803D' }}>{r.verde}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: '#A16207' }}>{r.amarillo}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.rojo > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#B91C1C' }}>
                          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
                          {r.rojo}
                        </span>
                      ) : (
                        <span className="text-xs font-medium" style={{ color: '#B91C1C' }}>0</span>
                      )}
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
