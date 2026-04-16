import { useState, useMemo } from 'react'
import { useFilters } from '../../context/FilterContext'
import { SEVERITY_MAP, LIFECYCLE_STATUSES, TIPO_RECLAMO_NUEVO } from '../../lib/constants'

// applicableFilters: object with keys set to false to hide them
export default function FilterBar({ data = [], applicableFilters = {} }) {
  const { filters, setFilter, toggleArrayFilter, clearFilters, activeCount } = useFilters()
  const [expanded, setExpanded] = useState(false)

  // Derive options from data
  const options = useMemo(() => ({
    peritos:    [...new Set(data.map(c => c.perito || 'Sin Asignar').filter(Boolean))].sort(),
    talleres:   [...new Set(data.map(c => c.nm_taller || 'Sin Taller').filter(Boolean))].sort(),
    suplidores: [...new Set(data.map(c => c.corredor).filter(Boolean))].sort(),
    corredores: [...new Set(data.map(c => c.corredor).filter(Boolean))].sort(),
    sucursales: [...new Set(data.map(c => c.de_sucursal).filter(Boolean))].sort(),
    zonas:      [...new Set(data.map(c => c.zona_geografica).filter(Boolean))].sort(),
    tipoSirweb: [...new Set(data.map(c => c.tipo_reclamo).filter(Boolean))].sort(),
    // Derive actual estatus values from data so SIRWEB labels match
    estatuses:  [...new Set(data.map(c => c.de_estatus).filter(Boolean))].sort(),
  }), [data])

  const show = (key) => applicableFilters[key] !== false

  return (
    <div className="bg-white rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: '#64748B' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span className="text-sm font-medium" style={{ color: '#334155' }}>Filtros</span>
          {activeCount > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#003DA5', color: 'white' }}
            >
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearFilters() }}
              className="text-xs font-medium"
              style={{ color: '#EF4444' }}
            >
              Limpiar filtros
            </button>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: '#94A3B8' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t space-y-4" style={{ borderColor: '#F1F5F9' }}>
          {/* Severidad */}
          {show('severidad') && (
            <div className="pt-3">
              <p className="text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>SEVERIDAD</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SEVERITY_MAP).map(([code, info]) => {
                  const active = filters.severidad.includes(code)
                  return (
                    <button
                      key={code}
                      onClick={() => toggleArrayFilter('severidad', code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                      style={{
                        background: active ? info.hex : info.bg,
                        color: active ? 'white' : info.text,
                        borderColor: active ? info.hex : `${info.hex}50`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: active ? 'white' : info.hex }} />
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Row 1: Estatus + Tipo Reclamo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {show('estatus') && options.estatuses.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>ESTATUS</p>
                <div className="flex flex-wrap gap-1">
                  {options.estatuses.map(st => {
                    const active = filters.estatus.includes(st)
                    const info = LIFECYCLE_STATUSES[st]
                    return (
                      <button
                        key={st}
                        onClick={() => toggleArrayFilter('estatus', st)}
                        className="px-2 py-1 rounded text-xs font-medium border transition-all"
                        style={{
                          background: active ? (info?.hex || '#475569') : '#F8FAFC',
                          color: active ? 'white' : '#475569',
                          borderColor: active ? (info?.hex || '#475569') : '#E2E8F0',
                        }}
                      >
                        {st}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {show('tipoReclamoNuevo') && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>TIPO DE RECLAMO</p>
                <div className="flex flex-wrap gap-1">
                  {TIPO_RECLAMO_NUEVO.map(tipo => {
                    const active = filters.tipoReclamoNuevo.includes(tipo)
                    return (
                      <button
                        key={tipo}
                        onClick={() => toggleArrayFilter('tipoReclamoNuevo', tipo)}
                        className="px-2 py-1 rounded text-xs font-medium border transition-all"
                        style={{
                          background: active ? '#003DA5' : '#F8FAFC',
                          color: active ? 'white' : '#475569',
                          borderColor: active ? '#003DA5' : '#E2E8F0',
                        }}
                      >
                        {tipo}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {show('peritos') && options.peritos.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>PERITO</p>
                <select
                  className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#334155' }}
                  value=""
                  onChange={e => { if (e.target.value) toggleArrayFilter('peritos', e.target.value) }}
                >
                  <option value="">+ Agregar perito</option>
                  {options.peritos.filter(p => !filters.peritos.includes(p)).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1 mt-1">
                  {filters.peritos.map(p => (
                    <button
                      key={p}
                      onClick={() => toggleArrayFilter('peritos', p)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                    >
                      {p} ×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {show('talleres') && options.talleres.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>TALLER</p>
                <select
                  className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#334155' }}
                  value=""
                  onChange={e => { if (e.target.value) toggleArrayFilter('talleres', e.target.value) }}
                >
                  <option value="">+ Agregar taller</option>
                  {options.talleres.filter(t => !filters.talleres.includes(t)).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1 mt-1">
                  {filters.talleres.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleArrayFilter('talleres', t)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                    >
                      {t.length > 20 ? t.slice(0, 20) + '…' : t} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Sucursal, Zona, Corredor, Fechas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {show('sucursales') && options.sucursales.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>SUCURSAL</p>
                <select
                  className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#334155' }}
                  value=""
                  onChange={e => { if (e.target.value) toggleArrayFilter('sucursales', e.target.value) }}
                >
                  <option value="">+ Agregar</option>
                  {options.sucursales.filter(s => !filters.sucursales.includes(s)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {filters.sucursales.map(s => (
                  <button key={s} onClick={() => toggleArrayFilter('sucursales', s)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mr-1 mt-1"
                    style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                    {s} ×
                  </button>
                ))}
              </div>
            )}

            {show('corredores') && options.corredores.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>CORREDOR</p>
                <select
                  className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#334155' }}
                  value=""
                  onChange={e => { if (e.target.value) toggleArrayFilter('corredores', e.target.value) }}
                >
                  <option value="">+ Agregar</option>
                  {options.corredores.filter(c => !filters.corredores.includes(c)).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {show('dateRange') !== false && (
              <>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>DESDE</p>
                  <input type="date" value={filters.dateFrom}
                    onChange={e => setFilter('dateFrom', e.target.value)}
                    className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                    style={{ borderColor: '#E2E8F0', color: '#334155' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>HASTA</p>
                  <input type="date" value={filters.dateTo}
                    onChange={e => setFilter('dateTo', e.target.value)}
                    className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                    style={{ borderColor: '#E2E8F0', color: '#334155' }} />
                </div>
              </>
            )}
          </div>

          {/* Monto range (only shown if explicitly enabled) */}
          {show('monto') && applicableFilters.monto === true && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>MONTO MÍN.</p>
                <input type="number" value={filters.montoMin}
                  onChange={e => setFilter('montoMin', e.target.value)}
                  placeholder="0"
                  className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#334155' }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>MONTO MÁX.</p>
                <input type="number" value={filters.montoMax}
                  onChange={e => setFilter('montoMax', e.target.value)}
                  placeholder="Sin límite"
                  className="w-full py-1.5 px-2 text-xs rounded border outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#334155' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
