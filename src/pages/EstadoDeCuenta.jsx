import { useMemo, useState } from 'react'
import KPICard from '../components/ui/KPICard'

const TIPO_PAGO_ORDER = [
  'DPA', 'TALLER', 'SUPLIDOR', 'CRISTAL', 'LIQUIDACION',
  'RENT A CAR', 'ASEGURADO', 'DPA/HONORARIOS', 'FACTORING',
]

function fmtRD(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace('DOP', 'RD$')
    .trim()
}

function SemaforoPago({ dias }) {
  if (dias == null || isNaN(Number(dias))) return <span style={{ color: '#94A3B8' }}>—</span>
  const d = Number(dias)
  if (d <= 0)  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#F0FDF4', color: '#15803D' }}>Al día</span>
  if (d <= 15) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#FEFCE8', color: '#A16207' }}>{d}d venc.</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{d}d venc.</span>
}

export default function EstadoDeCuenta({ data, loading }) {
  const [search, setSearch]     = useState('')
  const [zonaFilt, setZonaFilt] = useState('Todas')
  const [tipoFilt, setTipoFilt] = useState('Todos')
  const [sort, setSort]         = useState({ col: 'dias_vencimiento_pago', dir: 'desc' })

  const pending = useMemo(
    () => data.filter(r => Number(r.monto_por_pagar) > 0),
    [data]
  )

  const stats = useMemo(() => {
    if (!pending.length) return null
    const total = pending.reduce((s, r) => s + (Number(r.monto_por_pagar) || 0), 0)

    const byTipo = TIPO_PAGO_ORDER.map(tipo => {
      const rows = pending.filter(r => (r.tipo_pago || '').toUpperCase() === tipo)
      return { tipo, count: rows.length, monto: rows.reduce((s, r) => s + (Number(r.monto_por_pagar) || 0), 0) }
    }).filter(e => e.count > 0)

    const otros = pending.filter(r => {
      const t = (r.tipo_pago || '').toUpperCase()
      return !TIPO_PAGO_ORDER.includes(t)
    })
    if (otros.length) {
      byTipo.push({ tipo: 'OTROS', count: otros.length, monto: otros.reduce((s, r) => s + (Number(r.monto_por_pagar) || 0), 0) })
    }

    const norte   = pending.filter(r => (r.zona || '').toUpperCase() === 'NORTE').reduce((s, r) => s + (Number(r.monto_por_pagar) || 0), 0)
    const sdEste  = pending.filter(r => (r.zona || '').toUpperCase() === 'SD-ESTE').reduce((s, r) => s + (Number(r.monto_por_pagar) || 0), 0)

    const vencidos = pending.filter(r => Number(r.dias_vencimiento_pago) > 0).length
    const criticos = pending.filter(r => Number(r.dias_vencimiento_pago) > 15).length

    return { total, byTipo, norte, sdEste, vencidos, criticos }
  }, [pending])

  const tipoOptions = useMemo(() => {
    const all = [...new Set(pending.map(r => r.tipo_pago).filter(Boolean))]
    return ['Todos', ...all.sort()]
  }, [pending])

  const zonaOptions = useMemo(() => {
    const all = [...new Set(pending.map(r => r.zona).filter(Boolean))]
    return ['Todas', ...all.sort()]
  }, [pending])

  const filtered = useMemo(() => {
    let rows = pending
    if (zonaFilt !== 'Todas') rows = rows.filter(r => r.zona === zonaFilt)
    if (tipoFilt !== 'Todos') rows = rows.filter(r => r.tipo_pago === tipoFilt)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(r =>
        String(r.nu_reclamo || '').includes(q) ||
        (r.beneficiario_pago || '').toLowerCase().includes(q) ||
        (r.nm_taller || '').toLowerCase().includes(q)
      )
    }
    return [...rows].sort((a, b) => {
      const av = a[sort.col] ?? (sort.dir === 'asc' ? Infinity : -Infinity)
      const bv = b[sort.col] ?? (sort.dir === 'asc' ? Infinity : -Infinity)
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [pending, zonaFilt, tipoFilt, search, sort])

  function toggleSort(col) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })
  }

  const SortIcon = ({ col }) => {
    if (sort.col !== col) return <span style={{ color: '#CBD5E1' }}>↕</span>
    return <span style={{ color: '#003DA5' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
  }

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
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>Estado de Cuenta</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Pagos pendientes por reclamación — fusión SIRWEB + Estado de Cuenta
        </p>
      </div>

      {!stats ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-base font-medium" style={{ color: '#94A3B8' }}>No hay pagos pendientes</p>
          <p className="text-sm mt-1" style={{ color: '#CBD5E1' }}>Importe el archivo fusionado para ver el estado de cuenta</p>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total por Pagar"
              value={fmtRD(stats.total)}
              sub={`${pending.length} reclamaciones`}
              accent="#DC2626"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>}
            />
            <KPICard
              label="Norte"
              value={fmtRD(stats.norte)}
              sub="Zona Norte"
              accent="#003DA5"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <KPICard
              label="SD-Este"
              value={fmtRD(stats.sdEste)}
              sub="Zona SD-Este"
              accent="#7C3AED"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <KPICard
              label="Críticos (>15d)"
              value={stats.criticos}
              sub={`${stats.vencidos} vencidos en total`}
              accent="#EF4444"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            />
          </div>

          {/* By Tipo Pago */}
          <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Desglose por Tipo de Pago</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {stats.byTipo.map(({ tipo, count, monto }) => (
                <div key={tipo} className="p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: '#64748B' }}>{tipo}</p>
                  <p className="text-base font-bold mt-1" style={{ color: '#1E293B' }}>{fmtRD(monto)}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{count} recl.</p>
                </div>
              ))}
            </div>
          </div>

          {/* Zona breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { zona: 'NORTE', label: 'Norte', accent: '#003DA5', bg: '#EFF6FF' },
              { zona: 'SD-ESTE', label: 'SD-Este', accent: '#7C3AED', bg: '#F5F3FF' },
            ].map(({ zona, label, accent, bg }) => {
              const rows = pending.filter(r => (r.zona || '').toUpperCase() === zona)
              const tipos = TIPO_PAGO_ORDER.map(tipo => {
                const t = rows.filter(r => (r.tipo_pago || '').toUpperCase() === tipo)
                return { tipo, monto: t.reduce((s, r) => s + (Number(r.monto_por_pagar) || 0), 0) }
              }).filter(e => e.monto > 0)
              const total = rows.reduce((s, r) => s + (Number(r.monto_por_pagar) || 0), 0)
              return (
                <div key={zona} className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold" style={{ color: '#1E293B' }}>Zona {label}</h3>
                    <span className="text-sm font-bold" style={{ color: accent }}>{fmtRD(total)}</span>
                  </div>
                  <div className="space-y-2">
                    {tipos.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Sin datos</p>}
                    {tipos.map(({ tipo, monto }) => {
                      const pct = total > 0 ? Math.round((monto / total) * 100) : 0
                      return (
                        <div key={tipo}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span style={{ color: '#475569' }}>{tipo}</span>
                            <span className="font-medium" style={{ color: accent }}>{fmtRD(monto)}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#F1F5F9' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: accent }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 flex flex-wrap gap-3 items-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <input
              type="text"
              placeholder="Buscar por reclamo, beneficiario, taller…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-48 px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ borderColor: '#E2E8F0', color: '#334155' }}
            />
            <select
              value={zonaFilt}
              onChange={e => setZonaFilt(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              {zonaOptions.map(z => <option key={z}>{z}</option>)}
            </select>
            <select
              value={tipoFilt}
              onChange={e => setTipoFilt(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              {tipoOptions.map(t => <option key={t}>{t}</option>)}
            </select>
            <span className="text-xs" style={{ color: '#94A3B8' }}>{filtered.length} registros</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    {[
                      { col: 'nu_reclamo',          label: 'No. Reclamo' },
                      { col: 'beneficiario_pago',   label: 'Beneficiario' },
                      { col: 'tipo_pago',           label: 'Tipo Pago' },
                      { col: 'zona',                label: 'Zona' },
                      { col: 'monto_por_pagar',     label: 'Monto por Pagar' },
                      { col: 'dp_dpa_total',        label: 'Total DPA' },
                      { col: 'estatus_pago',        label: 'Estatus Pago' },
                      { col: 'dias_vencimiento_pago', label: 'Vencimiento' },
                      { col: 'fuente',              label: 'Fuente' },
                    ].map(({ col, label }) => (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
                        style={{ color: '#64748B' }}
                      >
                        {label} <SortIcon col={col} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: '#94A3B8' }}>
                        Sin resultados
                      </td>
                    </tr>
                  )}
                  {filtered.map((r, i) => (
                    <tr
                      key={`${r.id}-${i}`}
                      className="border-t"
                      style={{ borderColor: '#F1F5F9' }}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: '#003DA5' }}>
                        {r.nu_reclamo}
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-40 truncate" style={{ color: '#334155' }}>
                        {r.beneficiario_pago || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.tipo_pago ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                            {r.tipo_pago}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: '#475569' }}>
                        {r.zona || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-right" style={{ color: '#DC2626' }}>
                        {fmtRD(r.monto_por_pagar)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right" style={{ color: '#475569' }}>
                        {r.dp_dpa_total ? fmtRD(r.dp_dpa_total) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#64748B' }}>
                        {r.estatus_pago || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <SemaforoPago dias={r.dias_vencimiento_pago} />
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#94A3B8' }}>
                        {r.fuente || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
