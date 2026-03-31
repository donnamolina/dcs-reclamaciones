import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { COLUMN_MAP, TEMPLATE_HEADERS } from '../lib/constants'

// Date fields that need parsing
const DATE_FIELDS = ['fe_declaracion', 'fe_ocurrencia', 'recep_veh', 'fe_entrega']
// Numeric fields
const NUMERIC_FIELDS = [
  'nu_reclamo','nu_poliza','nu_certificado','dias_transcurridos','anio',
  'valor_vehiculo','mt_piezas','mt_mano_obra','mt_estimado_total',
  'mt_ajuste_siniestro','num_dpa','monto_dpa','cd_estatus','cd_tipo_reclamo','nu_movimiento'
]

function parseExcelDate(val) {
  if (!val) return null
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val)
    if (!date) return null
    return new Date(Date.UTC(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0)).toISOString()
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (val instanceof Date) return val.toISOString()
  return null
}

function parseRow(rawRow, headerMap) {
  const row = {}
  for (const [excelCol, supabaseCol] of Object.entries(headerMap)) {
    let val = rawRow[excelCol]
    if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
      row[supabaseCol] = null
      continue
    }
    if (DATE_FIELDS.includes(supabaseCol)) {
      row[supabaseCol] = parseExcelDate(val)
    } else if (NUMERIC_FIELDS.includes(supabaseCol)) {
      const n = Number(val)
      row[supabaseCol] = isNaN(n) ? null : n
    } else {
      row[supabaseCol] = String(val).trim() || null
    }
  }
  return row
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, 'DCS_Plantilla_Importacion.xlsx')
}

export default function Importar({ onImportComplete }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [headers, setHeaders] = useState([])
  const [headerMap, setHeaderMap] = useState({})
  const [unmapped, setUnmapped] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  function processFile(f) {
    setFile(f)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: null })
        if (!rows.length) { setError('El archivo está vacío.'); return }

        const fileHeaders = Object.keys(rows[0])
        const mapped = {}
        const notMapped = []

        fileHeaders.forEach(h => {
          const key = h.trim().toUpperCase()
          if (COLUMN_MAP[key]) mapped[h] = COLUMN_MAP[key]
          else notMapped.push(h)
        })

        setHeaders(fileHeaders)
        setHeaderMap(mapped)
        setUnmapped(notMapped.filter(h => !['CD_ENTIDAD','CD_AREA'].includes(h.trim().toUpperCase())))
        setPreview(rows.slice(0, 10))
      } catch (err) {
        setError('Error al leer el archivo: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [])

  const onDragOver = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  async function handleImport() {
    if (!preview.length) return
    setImporting(true)
    setResult(null)
    setError(null)

    try {
      const wb = XLSX.read(
        await file.arrayBuffer(),
        { type: 'array', cellDates: false }
      )
      const ws = wb.Sheets[wb.SheetNames[0]]
      const allRows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: null })

      const parsed = allRows.map(r => parseRow(r, headerMap)).filter(r => r.nu_reclamo != null)

      const BATCH = 200
      let inserted = 0, updated = 0, errors = 0

      for (let i = 0; i < parsed.length; i += BATCH) {
        const batch = parsed.slice(i, i + BATCH)
        const { data, error: err } = await supabase
          .from('recl_reclamaciones')
          .upsert(batch, { onConflict: 'nu_reclamo', ignoreDuplicates: false })
          .select('id')

        if (err) {
          errors += batch.length
          console.error('Batch error:', err)
        } else {
          // Supabase upsert doesn't distinguish insert vs update easily
          // so we count non-error rows as processed
          inserted += data?.length || batch.length
        }
      }

      setResult({ total: parsed.length, inserted, errors })
      if (onImportComplete) onImportComplete()
    } catch (err) {
      setError('Error durante la importación: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setFile(null); setPreview([]); setHeaders([])
    setHeaderMap({}); setUnmapped([]); setResult(null); setError(null)
  }

  const mappedCount = Object.keys(headerMap).length
  const hasPreview = preview.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>Importar Datos</h2>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Carga el archivo Excel exportado desde SIRWEB
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: '#F1F5F9', color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar Plantilla
        </button>
      </div>

      {/* Drop Zone */}
      {!hasPreview && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current.click()}
          className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragging ? '#003DA5' : '#CBD5E1',
            background: dragging ? '#EFF6FF' : '#FAFAFA',
          }}
        >
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: dragging ? '#003DA5' : '#94A3B8' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-base font-medium" style={{ color: '#334155' }}>
            Arrastra el archivo aquí o haz clic para seleccionar
          </p>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
            Acepta archivos .xlsx y .xls
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]) }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-5 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
          <p className="font-semibold" style={{ color: '#15803D' }}>Importación completada</p>
          <div className="flex gap-6 mt-2 text-sm" style={{ color: '#166534' }}>
            <span><strong>{result.total}</strong> filas procesadas</span>
            <span><strong>{result.inserted}</strong> registros actualizados/insertados</span>
            {result.errors > 0 && <span className="text-red-600"><strong>{result.errors}</strong> errores</span>}
          </div>
          <button onClick={reset} className="mt-3 text-xs font-medium underline" style={{ color: '#15803D' }}>
            Importar otro archivo
          </button>
        </div>
      )}

      {/* Preview */}
      {hasPreview && !result && (
        <div className="space-y-4">
          {/* File info + mapping summary */}
          <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{file?.name}</p>
                <div className="flex gap-4 mt-2 text-sm" style={{ color: '#64748B' }}>
                  <span>
                    <span className="font-medium" style={{ color: '#15803D' }}>{mappedCount}</span>
                    {' '}columnas mapeadas
                  </span>
                  {unmapped.length > 0 && (
                    <span>
                      <span className="font-medium" style={{ color: '#D97706' }}>{unmapped.length}</span>
                      {' '}columnas ignoradas: {unmapped.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={reset} className="text-xs" style={{ color: '#94A3B8' }}>
                Cambiar archivo
              </button>
            </div>

            {/* Column mapping table */}
            <div className="mt-4 max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: '#94A3B8' }}>
                    <th className="text-left py-1 font-medium">Columna Excel</th>
                    <th className="text-left py-1 font-medium">Campo Supabase</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(headerMap).map(([excel, supa]) => (
                    <tr key={excel} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                      <td className="py-1 font-mono" style={{ color: '#475569' }}>{excel}</td>
                      <td className="py-1 font-mono" style={{ color: '#003DA5' }}>{supa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: '#F1F5F9' }}>
              <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>
                Vista previa — primeras 10 filas
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    {Object.values(headerMap).slice(0, 8).map(col => (
                      <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap"
                        style={{ color: '#64748B' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const parsed = parseRow(row, headerMap)
                    return (
                      <tr key={i} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                        {Object.values(headerMap).slice(0, 8).map(col => (
                          <td key={col} className="px-3 py-1.5 whitespace-nowrap" style={{ color: '#334155' }}>
                            {parsed[col] != null ? String(parsed[col]).slice(0, 30) : '—'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={importing || mappedCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#003DA5' }}
            >
              {importing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Importando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Confirmar Importación
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
