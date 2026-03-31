import { CLOSED_STATUSES } from './constants'

export const SEMAFORO = {
  verde:    { label: 'Verde',    hex: '#22C55E', bg: '#F0FDF4', text: '#15803D', range: '0–15 días' },
  amarillo: { label: 'Amarillo', hex: '#EAB308', bg: '#FEFCE8', text: '#A16207', range: '16–30 días' },
  rojo:     { label: 'Rojo',     hex: '#EF4444', bg: '#FEF2F2', text: '#B91C1C', range: '31+ días' },
}

export function getSemaforo(claim) {
  const cdEstatus = claim.cd_estatus
  if (cdEstatus != null && CLOSED_STATUSES.includes(Number(cdEstatus))) return null

  const dias = claim.dias_transcurridos
  if (dias == null || isNaN(dias)) return null

  const d = Number(dias)
  if (d <= 15) return { key: 'verde',    ...SEMAFORO.verde }
  if (d <= 30) return { key: 'amarillo', ...SEMAFORO.amarillo }
  return { key: 'rojo', ...SEMAFORO.rojo }
}

export function getDaysWithoutMovement(claim) {
  const candidates = [claim.fe_entrega, claim.recep_veh, claim.fe_declaracion]
  const lastDate = candidates.find(d => d != null)
  if (!lastDate) return null
  const diff = Date.now() - new Date(lastDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
