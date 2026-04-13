import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIAS_PAGO } from '../lib/constants'

function fmtMoney(val) {
  if (val == null || val === '') return '—'
  return 'RD$' + new Intl.NumberFormat('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
}

function formatDate(val) {
  if (!val) return '—'
  try { return new Date(val).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return val }
}

const ESTADO_STYLES = {
  'Pendiente':  { bg: '#FFFBEB', text: '#A16207', dot: '#EAB308' },
  'En Proceso': { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  'Parcial':    { bg: '#F5F3FF', text: '#6D28D9', dot: '#8B5CF6' },
  'Pagado':     { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
}

export default function CuentasPendientes({ data: reclamaciones }) {
  const [cuentas, setCuentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado]   = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterReclamo, setFilterReclamo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { data, error } = await supabase
        .from('recl_cuentas_pendientes')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setCuentas(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const stats = useMemo(() => {
    const pendiente  = cuentas.filter(c => c.estado_pago !== 'Pagado')
    const totalEst   = cuentas.reduce((s, c) => s + (Number(c.mt_estimado) || 0), 0)
    const totalFact  = cuentas.reduce((s, c) => s + (Number(c.mt_facturado) || 0), 0)
    const totalPag   = cuentas.reduce((s, c) => s + (Number(c.mt_pagado) || 0), 0)
    const totalPend  = cuentas.filter(c => c.estado_pago !== 'Pagado')
      .reduce((s, c) => s + (Number(c.mt_facturado) || Number(c.mt_estimado) || 0) - (Number(c.mt_pagado) || 0), 0)

    // By categoria
    const byCat = CATEGORIAS_PAGO.map(cat => {
      const rows = cuentas.filter(c => c.categoria === cat)
      return {
        categoria: cat,
        count: rows.length,
        pendiente: rows.filter(c => c.estado_pago !== 'Pagado').length,
        monto: rows.reduce((s, c) => s + (Number(c.mt_facturado) || Number(c.mt_estimado) || 0), 0),
        pagado: rows.reduce((s, c) => s + (Number(c.mt_pagado) || 0), 0),
      }
    }).filter(r => r.count > 0)

    return { totalEst, totalFact, totalPag, totalPend, byCat, countPendiente: pendiente.length }
  }, [cuentas])

  const filtered = useMemo(() => {
    let rows = cuentas
    if (filterEstado)    rows = rows.filter(c => c.estado_pago === filterEstado)
    if (filterCategoria) rows = rows.filter(c => c.categoria === filterCategoria)
    if (filterReclamo)   rows = rows.filter(c => c.nu_reclamo === filterReclamo)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(c =>
        String(c.nu_reclamo).includes(q) ||
        (c.proveedor || '').toLowerCase().includes(q) ||
        (c.descripcion || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [cuentas, filterEstado, filterCategoria, filterReclamo, search])

  const reclamoOptions = useMemo(() =>
    [...new Set(cuentas.map(c => c.nu_reclamo).filter(Boolean))].sort(),
    [cuentas])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: '#003DA5', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>Cuentas Pendientes</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Pagos pendientes por categoría — asegurado, taller, suplidor, DPA
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Facturado',  value: fmtMoney(stats.totalFact), color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Total Pagado',     value: fmtMoney(stats.totalPag),  color: '#15803D', bg: '#F0FDF4' },
          { label: 'Saldo Pendiente',  value: fmtMoney(stats.totalPend), color: '#D97706', bg: '#FFFBEB' },
          { label: 'Transacciones Pendientes', value: stats.countPendiente, color: '#B91C1C', bg: '#FEF2F2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: bg, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* By category cross-tab */}
      {stats.byCat.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#1E293B' }}>Resumen por Categoría</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  {['Categoría', 'Registros', 'Pendientes', 'Monto Total', 'Pagado', 'Saldo'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.byCat.map(r => {
                  const saldo = r.monto - r.pagado
                  return (
                    <tr key={r.categoria} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#1E293B' }}>{r.categoria}</td>
                      <td className="px-4 py-3" style={{ color: '#475569' }}>{r.count}</td>
                      <td className="px-4 py-3">
                        {r.pendiente > 0 ? (
                          <span className="font-semibold" style={{ color: '#B91C1C' }}>{r.pendiente}</span>
                        ) : (
                          <span style={{ color: '#15803D' }}>0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{fmtMoney(r.monto)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#15803D' }}>{fmtMoney(r.pagado)}</td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: saldo > 0 ? '#D97706' : '#15803D' }}>
                        {fmtMoney(saldo)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por reclamo, proveedor, descripción..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: '#E2E8F0', color: '#334155' }} />
          </div>

          <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
            className="py-2 px-3 text-sm rounded-lg border outline-none" style={{ borderColor: '#E2E8F0', color: '#334155' }}>
            <option value="">Todas las Categorías</option>
            {CATEGORIAS_PAGO.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="py-2 px-3 text-sm rounded-lg border outline-none" style={{ borderColor: '#E2E8F0', color: '#334155' }}>
            <option value="">Todos los Estados</option>
            {Object.keys(ESTADO_STYLES).map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
          <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>
            {filtered.length} registros
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              {cuentas.length === 0
                ? 'No hay cuentas registradas. Agregue registros desde la tabla de Supabase.'
                : 'No hay registros con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  {['Reclamo','Categoría','Proveedor','Descripción','Estimado','Facturado','Pagado','Estado','F. Factura','F. Pago'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                      style={{ color: '#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const estStyle = ESTADO_STYLES[c.estado_pago] || { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' }
                  return (
                    <tr key={c.id} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                      <td className="px-4 py-3 font-mono font-semibold text-xs" style={{ color: '#003DA5' }}>
                        {c.nu_reclamo}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#475569' }}>
                        {c.categoria}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[130px] truncate" style={{ color: '#334155' }}>
                        {c.proveedor || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: '#64748B' }}>
                        {c.descripcion || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-right whitespace-nowrap" style={{ color: '#475569' }}>
                        {fmtMoney(c.mt_estimado)}
                      </td>
                      <td className="px-4 py-3 text-xs text-right whitespace-nowrap" style={{ color: '#475569' }}>
                        {fmtMoney(c.mt_facturado)}
                      </td>
                      <td className="px-4 py-3 text-xs text-right whitespace-nowrap" style={{ color: '#15803D' }}>
                        {fmtMoney(c.mt_pagado)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                          style={{ background: estStyle.bg, color: estStyle.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: estStyle.dot }} />
                          {c.estado_pago || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#64748B' }}>
                        {formatDate(c.fe_factura)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#64748B' }}>
                        {formatDate(c.fe_pago)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
