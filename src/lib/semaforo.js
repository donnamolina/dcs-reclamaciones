import { CLOSED_STATUSES, LIFECYCLE_CLOSED } from './constants'

export const SEMAFORO = {
  verde:    { label: 'Verde',    hex: '#22C55E', bg: '#F0FDF4', text: '#15803D', range: '0–15 días' },
  amarillo: { label: 'Amarillo', hex: '#EAB308', bg: '#FEFCE8', text: '#A16207', range: '16–30 días' },
  rojo:     { label: 'Rojo',     hex: '#EF4444', bg: '#FEF2F2', text: '#B91C1C', range: '31+ días' },
}

// Legacy semaforo (days-based, used for backward compat on open claims)
export function getSemaforo(claim) {
  const cdEstatus = claim.cd_estatus
  if (cdEstatus != null && CLOSED_STATUSES.includes(Number(cdEstatus))) return null

  // Also check new lifecycle status
  const lifecycleStatus = claim.de_estatus
  if (lifecycleStatus && LIFECYCLE_CLOSED.includes(lifecycleStatus)) return null

  const dias = claim.dias_transcurridos
  if (dias == null || isNaN(dias)) return null

  const d = Number(dias)
  if (d <= 15) return { key: 'verde',    ...SEMAFORO.verde }
  if (d <= 30) return { key: 'amarillo', ...SEMAFORO.amarillo }
  return { key: 'rojo', ...SEMAFORO.rojo }
}

// Severity-aware SLA check
// slaConfig is an array from recl_sla_config: [{estatus, severidad, tiempo_maximo_dias}]
export function getSlaStatus(claim, slaConfig) {
  if (!slaConfig || !slaConfig.length) return getSemaforo(claim)

  const estatus = claim.de_estatus
  const severidad = claim.severidad_label || claim.severidad // support both code and label
  const dias = claim.dias_transcurridos

  if (!estatus || !severidad || dias == null) return getSemaforo(claim)
  if (LIFECYCLE_CLOSED.includes(estatus)) return null

  const config = slaConfig.find(s => s.estatus === estatus && s.severidad === severidad)
  if (!config) return getSemaforo(claim)

  const d = Number(dias)
  const max = config.tiempo_maximo_dias
  const warn = max * 0.75

  if (d > max)   return { key: 'rojo',     ...SEMAFORO.rojo,    sla: true, exceeds: d - max }
  if (d > warn)  return { key: 'amarillo', ...SEMAFORO.amarillo, sla: true, exceeds: 0 }
  return          { key: 'verde',    ...SEMAFORO.verde,   sla: true, exceeds: 0 }
}

export function getDaysWithoutMovement(claim) {
  const candidates = [claim.fe_entrega, claim.recep_veh, claim.fe_declaracion]
  const lastDate = candidates.find(d => d != null)
  if (!lastDate) return null
  const diff = Date.now() - new Date(lastDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
