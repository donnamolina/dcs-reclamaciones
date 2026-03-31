import * as XLSX from 'xlsx'
import { getSemaforo } from './semaforo'
import { STATUS_MAP } from './constants'

function formatDate(val) {
  if (!val) return ''
  try { return new Date(val).toLocaleDateString('es-DO') } catch { return val }
}

function semaforoText(claim) {
  const s = getSemaforo(claim)
  return s ? s.label : (claim.cd_estatus === 5 || claim.cd_estatus === 6 ? 'Cerrado' : '')
}

function buildDetalleRows(claims) {
  return claims.map(c => ({
    'Nu. Reclamo':        c.nu_reclamo,
    'Asegurado':          c.nombre_asegurado || '',
    'Reclamante':         c.nombre_reclamante || '',
    'Perito':             c.perito || 'Sin Asignar',
    'Taller':             c.nm_taller || 'Sin Taller',
    'Estatus':            c.de_estatus || '',
    'Semáforo':           semaforoText(c),
    'Días Transcurridos': c.dias_transcurridos ?? '',
    'Tipo Reclamo':       c.tipo_reclamo || '',
    'Sucursal':           c.de_sucursal || '',
    'Póliza':             c.nu_poliza ?? '',
    'Certificado':        c.nu_certificado ?? '',
    'Marca':              c.marca || '',
    'Modelo':             c.modelo || '',
    'Año':                c.anio ?? '',
    'Valor Vehículo':     c.valor_vehiculo ?? '',
    'Mt. Piezas':         c.mt_piezas ?? '',
    'Mt. Mano Obra':      c.mt_mano_obra ?? '',
    'Estimado Total':     c.mt_estimado_total ?? '',
    'Ajuste Siniestro':   c.mt_ajuste_siniestro ?? '',
    'Fe. Declaración':    formatDate(c.fe_declaracion),
    'Fe. Ocurrencia':     formatDate(c.fe_ocurrencia),
    'Recep. Vehículo':    formatDate(c.recep_veh),
    'Fe. Entrega':        formatDate(c.fe_entrega),
    'Teléfono':           c.nu_telefono || '',
    'Email':              c.de_email || '',
    'Tipo Siniestro':     c.de_tp_siniestro || '',
    'Causa Siniestro':    c.de_causa_siniestro || '',
    'Tiene Piezas':       c.tiene_piezas || '',
    'Num. DPA':           c.num_dpa ?? '',
    'Monto DPA':          c.monto_dpa ?? '',
  }))
}

function buildPeritoRows(claims) {
  const map = {}
  claims.forEach(c => {
    const key = c.perito || 'Sin Asignar'
    if (!map[key]) map[key] = { activos: 0, cerrados: 0, declinados: 0, dias: [], monto: 0, verde: 0, amarillo: 0, rojo: 0 }
    const cd = c.cd_estatus
    if (cd === 5) map[key].cerrados++
    else if (cd === 6) map[key].declinados++
    else map[key].activos++
    if (c.dias_transcurridos != null) map[key].dias.push(c.dias_transcurridos)
    if (c.mt_estimado_total) map[key].monto += Number(c.mt_estimado_total)
    const s = getSemaforo(c)
    if (s) map[key][s.key]++
  })
  return Object.entries(map).map(([perito, v]) => ({
    'Perito':            perito,
    'Casos Activos':     v.activos,
    'Casos Cerrados':    v.cerrados,
    'Casos Declinados':  v.declinados,
    'Promedio Días':     v.dias.length ? Math.round(v.dias.reduce((a, b) => a + b, 0) / v.dias.length) : '',
    'Monto Total Est.':  v.monto.toFixed(2),
    'Verde (0-15d)':     v.verde,
    'Amarillo (16-30d)': v.amarillo,
    'Rojo (31+d)':       v.rojo,
  }))
}

function buildResumenRows(claims) {
  const total = claims.length
  const abiertos = claims.filter(c => ![5, 6].includes(c.cd_estatus)).length
  const cerrados = claims.filter(c => c.cd_estatus === 5).length
  const dias = claims.filter(c => c.dias_transcurridos != null).map(c => c.dias_transcurridos)
  const promDias = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0
  const monto = claims.reduce((s, c) => s + (Number(c.mt_estimado_total) || 0), 0)
  const conPerito = claims.filter(c => c.perito).length
  const conTaller = claims.filter(c => c.nm_taller).length
  const verde = claims.filter(c => getSemaforo(c)?.key === 'verde').length
  const amarillo = claims.filter(c => getSemaforo(c)?.key === 'amarillo').length
  const rojo = claims.filter(c => getSemaforo(c)?.key === 'rojo').length

  return [
    { 'Métrica': 'Total Reclamaciones',         'Valor': total },
    { 'Métrica': 'Casos Abiertos',               'Valor': abiertos },
    { 'Métrica': 'Casos Cerrados',               'Valor': cerrados },
    { 'Métrica': 'Promedio Días Transcurridos',  'Valor': promDias },
    { 'Métrica': 'Monto Total Estimado (DOP)',   'Valor': monto.toFixed(2) },
    { 'Métrica': '% Con Perito Asignado',        'Valor': `${((conPerito/total)*100).toFixed(1)}%` },
    { 'Métrica': '% Con Taller Asignado',        'Valor': `${((conTaller/total)*100).toFixed(1)}%` },
    { 'Métrica': 'Semáforo Verde (0-15d)',        'Valor': verde },
    { 'Métrica': 'Semáforo Amarillo (16-30d)',    'Valor': amarillo },
    { 'Métrica': 'Semáforo Rojo (31+d)',          'Valor': rojo },
  ]
}

export function exportToExcel(filteredClaims, allClaims, filename = 'DCS_Reclamaciones') {
  const wb = XLSX.utils.book_new()

  const wsDetalle = XLSX.utils.json_to_sheet(buildDetalleRows(filteredClaims))
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

  const wsPerito = XLSX.utils.json_to_sheet(buildPeritoRows(allClaims))
  XLSX.utils.book_append_sheet(wb, wsPerito, 'Resumen por Perito')

  const wsResumen = XLSX.utils.json_to_sheet(buildResumenRows(allClaims))
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`)
}
