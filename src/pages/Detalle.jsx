import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import StatusBadge from '../components/ui/StatusBadge'
import SeverityBadge from '../components/ui/SeverityBadge'
import LifecycleStatusBadge from '../components/ui/LifecycleStatusBadge'
import SemaforoTag from '../components/ui/SemaforoTag'
import SlidePanel from '../components/ui/SlidePanel'
import ReclamoForm from '../components/ui/ReclamoForm'
import FilterBar from '../components/FilterBar/FilterBar'
import { useFilters, applyFilters } from '../context/FilterContext'
import { getSemaforo } from '../lib/semaforo'
import { exportToExcel } from '../lib/exportExcel'

const PAGE_SIZE = 50
const APPLICABLE = { monto: false }

function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort() }

function formatDate(val) {
  if (!val) return '—'
  try { return new Date(val).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return val }
}

function fmtMoney(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
}

const ESTADO_PAGO_COLORS = {
  'Pagado':      { bg: '#F0FDF4', text: '#15803D' },
  'Pendiente':   { bg: '#FFFBEB', text: '#A16207' },
  'Parcial':     { bg: '#EFF6FF', text: '#1D4ED8' },
  'En Proceso':  { bg: '#F5F3FF', text: '#6D28D9' },
}

export default function Detalle({ data, loading, refresh }) {
  const location = useLocation()
  const { filters } = useFilters()

  const [search, setSearch]               = useState('')
  const [filterPeritos, setFilterPeritos]   = useState([])
  const [filterTallers, setFilterTallers]   = useState([])
  const [filterProductores, setFilterProductores] = useState([])
  const [filterSems, setFilterSems]         = useState([])
  const [productorSearch, setProductorSearch] = useState('')
  const [productorOpen, setProductorOpen]   = useState(false)
  const [sortKey, setSortKey]               = useState('fe_declaracion')
  const [sortDir, setSortDir]               = useState('desc')  // 'asc' | 'desc' | null
  const [page, setPage]                     = useState(1)
  const [selected, setSelected]             = useState(null)
  const [showForm, setShowForm]             = useState(false)
  const [showPaymentOnly, setShowPaymentOnly] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const p = params.get('perito')
    const t = params.get('taller')
    if (p) setFilterPeritos([p])
    if (t) setFilterTallers([t])
  }, [location.search])

  function toggleChip(setter, val) {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
    setPage(1)
  }

  // Apply global filters first
  const globalFiltered = useMemo(() => applyFilters(data, filters, APPLICABLE), [data, filters])
  // Hide payment-only rows by default; show them only when the toggle is on
  const baseData = useMemo(
    () => showPaymentOnly
      ? globalFiltered.filter(c => c.fuente === 'DP_DPA_SHEETS')
      : globalFiltered.filter(c => c.fuente !== 'DP_DPA_SHEETS'),
    [globalFiltered, showPaymentOnly]
  )

  const options = useMemo(() => ({
    peritos:     uniq(baseData.map(c => c.perito || 'Sin Asignar')),
    talleres:    uniq(baseData.map(c => c.nm_taller || 'Sin Taller')),
    productores: uniq(baseData.map(c => c.productor || 'Sin Productor')),
  }), [baseData])

  const filteredProductorOptions = useMemo(() =>
    options.productores.filter(p =>
      p.toLowerCase().includes(productorSearch.toLowerCase()) &&
      !filterProductores.includes(p)
    ), [options.productores, productorSearch, filterProductores])

  const filtered = useMemo(() => {
    let rows = baseData
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(c =>
        String(c.nu_reclamo).includes(q) ||
        (c.nombre_asegurado || '').toLowerCase().includes(q) ||
        (c.nombre_reclamante || '').toLowerCase().includes(q) ||
        (c.perito || '').toLowerCase().includes(q) ||
        (c.nm_taller || '').toLowerCase().includes(q)
      )
    }
    if (filterPeritos.length) {
      rows = rows.filter(c => filterPeritos.includes(c.perito || 'Sin Asignar'))
    }
    if (filterTallers.length) {
      rows = rows.filter(c => filterTallers.includes(c.nm_taller || 'Sin Taller'))
    }
    if (filterProductores.length) {
      rows = rows.filter(c => filterProductores.includes(c.productor || 'Sin Productor'))
    }
    if (filterSems.length) {
      rows = rows.filter(c => {
        const s = getSemaforo(c)
        if (filterSems.includes('ninguno')) return !s || filterSems.includes(s?.key)
        return s && filterSems.includes(s?.key)
      })
    }
    return rows
  }, [baseData, search, filterPeritos, filterTallers, filterProductores, filterSems])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else if (sortDir === 'desc') { setSortKey(null); setSortDir(null) }
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function clearLocal() {
    setSearch('')
    setFilterPeritos([]); setFilterTallers([]); setFilterProductores([]); setFilterSems([])
    setProductorSearch('')
    setPage(1)
  }

  const hasLocal = search || filterPeritos.length || filterTallers.length || filterProductores.length || filterSems.length

  const SortIcon = ({ col }) => {
    if (sortKey !== col || !sortDir) return <span className="ml-1 opacity-20">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const COLS = [
    { key: 'nu_reclamo',         label: 'Reclamo' },
    { key: 'nombre_asegurado',   label: 'Asegurado' },
    { key: 'severidad',          label: 'Sev.' },
    { key: 'perito',             label: 'Perito' },
    { key: 'nm_taller',          label: 'Taller' },
    { key: 'de_estatus',         label: 'Estatus' },
    { key: 'tipo_reclamo_nuevo', label: 'Tipo' },
    { key: 'fe_declaracion',     label: 'Declaración' },
    { key: 'dias_transcurridos', label: 'Días' },
    { key: null,                 label: 'Sem.' },
    { key: 'mt_estimado_total',  label: 'Estimado' },
    { key: 'mt_pagado',          label: 'Pagado' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>Detalle de Reclamaciones</h2>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            {filtered.length} de {baseData.length} reclamaciones
            {showPaymentOnly && <span className="ml-2 text-xs font-medium" style={{ color: '#7C3AED' }}>— Solo pago</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#003DA5', color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Reclamación
          </button>
          <button
            onClick={() => { setShowPaymentOnly(v => !v); setPage(1) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: showPaymentOnly ? '#F5F3FF' : '#F1F5F9',
              color: showPaymentOnly ? '#7C3AED' : '#475569',
              border: showPaymentOnly ? '1px solid #DDD6FE' : '1px solid transparent',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            {showPaymentOnly ? 'Ocultar solo pago' : 'Solo pago'}
          </button>
          <button
            onClick={() => exportToExcel(filtered, data)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#F1F5F9', color: '#475569' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      {/* Global FilterBar */}
      <FilterBar data={data} applicableFilters={APPLICABLE} />

      {/* Local quick filters */}
      <div className="bg-white rounded-xl p-4 space-y-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Row 1: search + clear */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por reclamo, asegurado, perito..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: '#E2E8F0', color: '#334155' }}
            />
          </div>
          {hasLocal && (
            <button onClick={clearLocal} className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
              style={{ color: '#EF4444', background: '#FEF2F2' }}>
              Limpiar
            </button>
          )}
        </div>

        {/* Row 2: Perito multi-select */}
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>PERITO</p>
          <div className="flex flex-wrap gap-1.5">
            {options.peritos.map(p => (
              <button key={p} onClick={() => toggleChip(setFilterPeritos, p)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{
                  background: filterPeritos.includes(p) ? '#003DA5' : '#F8FAFC',
                  color: filterPeritos.includes(p) ? 'white' : '#475569',
                  borderColor: filterPeritos.includes(p) ? '#003DA5' : '#E2E8F0',
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Taller multi-select */}
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>TALLER</p>
          <div className="flex flex-wrap gap-1.5">
            {options.talleres.map(t => (
              <button key={t} onClick={() => toggleChip(setFilterTallers, t)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{
                  background: filterTallers.includes(t) ? '#003DA5' : '#F8FAFC',
                  color: filterTallers.includes(t) ? 'white' : '#475569',
                  borderColor: filterTallers.includes(t) ? '#003DA5' : '#E2E8F0',
                }}>
                {t.length > 28 ? t.slice(0, 28) + '…' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Productor — searchable */}
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>PRODUCTOR</p>
          {filterProductores.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {filterProductores.map(p => (
                <button key={p} onClick={() => toggleChip(setFilterProductores, p)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: '#003DA5', color: 'white' }}>
                  {p} ×
                </button>
              ))}
            </div>
          )}
          <div className="relative" style={{ maxWidth: 320 }}>
            <input
              value={productorSearch}
              onChange={e => { setProductorSearch(e.target.value); setProductorOpen(true) }}
              onFocus={() => setProductorOpen(true)}
              onBlur={() => setTimeout(() => setProductorOpen(false), 150)}
              placeholder="Buscar productor..."
              className="w-full pl-3 pr-3 py-1.5 text-xs rounded-lg border outline-none"
              style={{ borderColor: '#E2E8F0', color: '#334155' }}
            />
            {productorOpen && filteredProductorOptions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border overflow-y-auto"
                style={{ borderColor: '#E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200 }}>
                {filteredProductorOptions.slice(0, 30).map(p => (
                  <button key={p} onMouseDown={() => { toggleChip(setFilterProductores, p); setProductorSearch('') }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
                    style={{ color: '#334155' }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 5: Semáforo multi-select */}
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>SEMÁFORO</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { val: 'verde',    label: '🟢 Verde' },
              { val: 'amarillo', label: '🟡 Amarillo' },
              { val: 'rojo',     label: '🔴 Rojo' },
              { val: 'ninguno',  label: '⚪ Sin semáforo' },
            ].map(({ val, label }) => (
              <button key={val} onClick={() => toggleChip(setFilterSems, val)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{
                  background: filterSems.includes(val) ? '#1E293B' : '#F8FAFC',
                  color: filterSems.includes(val) ? 'white' : '#475569',
                  borderColor: filterSems.includes(val) ? '#1E293B' : '#E2E8F0',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                {COLS.map(({ key, label }) => (
                  <th
                    key={label}
                    onClick={key ? () => toggleSort(key) : undefined}
                    className={`px-4 py-3 text-left text-xs font-semibold whitespace-nowrap ${key ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
                    style={{ color: '#64748B' }}
                  >
                    {label}{key && <SortIcon col={key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-12 text-center text-sm" style={{ color: '#94A3B8' }}>
                    No hay reclamaciones con los filtros seleccionados
                  </td>
                </tr>
              )}
              {pageData.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="border-t cursor-pointer"
                  style={{ borderColor: '#F1F5F9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#003DA5' }}>
                    {c.nu_reclamo}
                  </td>
                  <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: '#334155' }}>
                    {c.nombre_asegurado || c.nombre_reclamante || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge code={c.severidad} size="xs" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#334155' }}>
                    {c.perito || <span style={{ color: '#94A3B8' }}>Sin Asignar</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[130px] truncate" style={{ color: '#334155' }}>
                    {c.nm_taller || <span style={{ color: '#94A3B8' }}>Sin Taller</span>}
                  </td>
                  <td className="px-4 py-3">
                    <LifecycleStatusBadge deEstatus={c.de_estatus} cdEstatus={c.cd_estatus} size="xs" />
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#64748B' }}>
                    {c.tipo_reclamo_nuevo || c.tipo_reclamo || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: '#64748B' }}>
                    {formatDate(c.fe_declaracion)}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: '#334155' }}>
                    {c.dias_transcurridos ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SemaforoTag claim={c} dotOnly />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-xs" style={{ color: '#475569' }}>
                    {c.mt_estimado_total ? fmtMoney(c.mt_estimado_total) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-xs">
                    {c.mt_pagado ? (
                      <span style={{ color: '#15803D' }}>{fmtMoney(c.mt_pagado)}</span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#F1F5F9' }}>
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)}
              className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#64748B' }}>«</button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#64748B' }}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded text-xs font-medium"
                  style={{ background: p === page ? '#003DA5' : 'transparent', color: p === page ? 'white' : '#64748B' }}>
                  {p}
                </button>
              )
            })}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#64748B' }}>›</button>
            <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
              className="px-2 py-1 rounded text-xs disabled:opacity-30" style={{ color: '#64748B' }}>»</button>
          </div>
        </div>
      </div>

      <SlidePanel
        claim={selected}
        onClose={() => setSelected(null)}
        onEditSaved={refresh}
        existingData={data}
      />

      {showForm && (
        <ReclamoForm
          existingData={data}
          onClose={() => setShowForm(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
