import { createContext, useContext, useState, useCallback } from 'react'

const FilterContext = createContext(null)

const DEFAULT_FILTERS = {
  severidad: [],
  estatus: [],
  tipoReclamoNuevo: [],
  tipoSirweb: [],
  peritos: [],
  talleres: [],
  suplidores: [],
  corredores: [],
  sucursales: [],
  zonas: [],
  dateFrom: '',
  dateTo: '',
  montoMin: '',
  montoMax: '',
  estadoPago: [],
}

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleArrayFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const activeCount = Object.entries(filters).reduce((count, [key, val]) => {
    if (Array.isArray(val)) return count + (val.length > 0 ? 1 : 0)
    return count + (val !== '' ? 1 : 0)
  }, 0)

  return (
    <FilterContext.Provider value={{ filters, setFilter, toggleArrayFilter, clearFilters, activeCount }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}

// Apply filters to a dataset, respecting which filters are applicable per page
export function applyFilters(data, filters, applicableFilters = {}) {
  let rows = data

  if (applicableFilters.severidad !== false && filters.severidad.length) {
    rows = rows.filter(c => filters.severidad.includes(c.severidad))
  }
  if (applicableFilters.estatus !== false && filters.estatus.length) {
    rows = rows.filter(c => filters.estatus.includes(c.de_estatus))
  }
  if (applicableFilters.tipoReclamoNuevo !== false && filters.tipoReclamoNuevo.length) {
    rows = rows.filter(c => filters.tipoReclamoNuevo.includes(c.tipo_reclamo_nuevo))
  }
  if (applicableFilters.tipoSirweb !== false && filters.tipoSirweb.length) {
    rows = rows.filter(c => filters.tipoSirweb.includes(c.tipo_reclamo))
  }
  if (applicableFilters.peritos !== false && filters.peritos.length) {
    rows = rows.filter(c => filters.peritos.includes(c.perito || 'Sin Asignar'))
  }
  if (applicableFilters.talleres !== false && filters.talleres.length) {
    rows = rows.filter(c => filters.talleres.includes(c.nm_taller || 'Sin Taller'))
  }
  if (applicableFilters.corredores !== false && filters.corredores.length) {
    rows = rows.filter(c => filters.corredores.includes(c.corredor))
  }
  if (applicableFilters.sucursales !== false && filters.sucursales.length) {
    rows = rows.filter(c => filters.sucursales.includes(c.de_sucursal))
  }
  if (applicableFilters.zonas !== false && filters.zonas.length) {
    rows = rows.filter(c => filters.zonas.includes(c.zona_geografica))
  }
  if (applicableFilters.dateRange !== false) {
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      rows = rows.filter(c => c.fe_declaracion && new Date(c.fe_declaracion) >= from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59)
      rows = rows.filter(c => c.fe_declaracion && new Date(c.fe_declaracion) <= to)
    }
  }
  if (applicableFilters.monto !== false) {
    if (filters.montoMin !== '') {
      rows = rows.filter(c => (Number(c.mt_estimado_total) || 0) >= Number(filters.montoMin))
    }
    if (filters.montoMax !== '') {
      rows = rows.filter(c => (Number(c.mt_estimado_total) || 0) <= Number(filters.montoMax))
    }
  }

  return rows
}
