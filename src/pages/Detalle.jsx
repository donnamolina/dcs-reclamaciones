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

  const [search, setSearch]           = useState('')
  const [filterPerito, setFilterPerito]     = useState('')
  const [filterTaller, setFilterTaller]     = useState('')
  const [filterSem, setFilterSem]           = useState('')
  const [sortKey, setSortKey]               = useState('fe_declaracion')
  const [sortDir, setSortDir]               = useState('desc')
  const [page, setPage]                     = useState(1)
  const [selected, setSelected]             = useState(null)
  const [showForm, setShowForm]             = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const p = params.get('perito')
    const t = params.get('taller')
    if (p) setFilterPerito(p)
    if (t) setFilterTaller(t)
  }, [location.search])

  // Apply global filters first
  const globalFiltered = useMemo(() => applyFilters(data, filters, APPLICABLE), [data, filters])

  const options = useMemo(() => ({
    peritos:   uniq(globalFiltered.map(c => c.perito || 'Sin Asignar')),
    talleres:  uniq(globalFiltered.map(c => c.nm_taller || 'Sin Taller')),
  }), [globalFiltered])

  const filtered = useMemo(() => {
    let rows = globalFiltered
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
    if (filterPerito) {
      rows = rows.filter(c => filterPerito === 'Sin Asignar' ? !c.perito : c.perito === filterPerito)
    }
    if (filterTaller) {
      rows = rows.filter(c => filterTaller === 'Sin Taller' ? !c.nm_taller : c.nm_taller === filterTaller)
    }
    if (filterSem) {
      rows = rows.filter(c => {
        const s = getSemaforo(c)
        if (filterSem === 'ninguno') return !s
        return s?.key === filterSem
      })
    }
    return rows
  }, [globalFiltered, search, filterPerito, filterTaller, filterSem])

  const sorted = useMemo(() => {
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
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function clearLocal() {
    setSearch(''); setFilterPerito(''); setFilterTaller(''); setFilterSem(''); setPage(1)
  }

  const hasLocal = search || filterPerito || filterTaller || filterSem

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="ml-1 opacity-20">↕</span>
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
            {filtered.length} de {data.length} reclamaciones
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
      <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 relative">
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

          <select value={filterPerito} onChange={e => { setFilterPerito(e.target.value); setPage(1) }}
            className="py-2 px-3 text-sm rounded-lg border outline-none" style={{ borderColor: '#E2E8F0', color: '#334155' }}>
            <option value="">Todos los Peritos</option>
            {options.peritos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filterTaller} onChange={e => { setFilterTaller(e.target.value); setPage(1) }}
            className="py-2 px-3 text-sm rounded-lg border outline-none" style={{ borderColor: '#E2E8F0', color: '#334155' }}>
            <option value="">Todos los Talleres</option>
            {options.talleres.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={filterSem} onChange={e => { setFilterSem(e.target.value); setPage(1) }}
            className="py-2 px-3 text-sm rounded-lg border outline-none" style={{ borderColor: '#E2E8F0', color: '#334155' }}>
            <option value="">Todo Semáforo</option>
            <option value="verde">🟢 Verde</option>
            <option value="amarillo">🟡 Amarillo</option>
            <option value="rojo">🔴 Rojo</option>
            <option value="ninguno">Sin Semáforo</option>
          </select>

          {hasLocal && (
            <button onClick={clearLocal}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: '#EF4444', background: '#FEF2F2' }}>
              Limpiar local
            </button>
          )}
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
