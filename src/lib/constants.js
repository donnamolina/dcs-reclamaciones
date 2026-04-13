// SIRWEB legacy status codes (for import compatibility)
export const STATUS_MAP = {
  1: { label: 'EN EVALUACION',       color: 'blue',   hex: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  2: { label: 'PROCESO DE COMPRA',   color: 'orange', hex: '#F97316', bg: '#FFF7ED', text: '#C2410C' },
  3: { label: 'LABOR DE TRABAJO',    color: 'yellow', hex: '#EAB308', bg: '#FEFCE8', text: '#A16207' },
  4: { label: 'LISTO PARA ENTREGA',  color: 'green',  hex: '#22C55E', bg: '#F0FDF4', text: '#15803D' },
  5: { label: 'SINIESTRO CERRADO',   color: 'gray',   hex: '#6B7280', bg: '#F9FAFB', text: '#374151' },
  6: { label: 'SINIESTRO DECLINADO', color: 'red',    hex: '#EF4444', bg: '#FEF2F2', text: '#B91C1C' },
  7: { label: 'EN PROCESO DE PAGO',  color: 'purple', hex: '#A855F7', bg: '#FAF5FF', text: '#7E22CE' },
}

export const CLOSED_STATUSES = [5, 6]

// New lifecycle statuses
export const LIFECYCLE_STATUSES = {
  'Abierto':               { hex: '#3498DB', bg: '#EBF5FB', text: '#1A5276', label: 'Abierto' },
  'En Proceso':            { hex: '#F39C12', bg: '#FEF9E7', text: '#7D6608', label: 'En Proceso' },
  'En Proceso de Compra':  { hex: '#E67E22', bg: '#FDF2E9', text: '#784212', label: 'En Proceso de Compra' },
  'En Taller':             { hex: '#1B6FA8', bg: '#EBF5FB', text: '#154360', label: 'En Taller' },
  'Ajustado':              { hex: '#8E44AD', bg: '#F5EEF8', text: '#4A235A', label: 'Ajustado' },
  'Cerrado':               { hex: '#27AE60', bg: '#EAFAF1', text: '#1E8449', label: 'Cerrado' },
  'Declinado':             { hex: '#E74C3C', bg: '#FDEDEC', text: '#922B21', label: 'Declinado' },
}

export const LIFECYCLE_CLOSED = ['Cerrado', 'Declinado']

// Severity levels
export const SEVERITY_MAP = {
  '01': { label: 'Cristal',       hex: '#60A5FA', bg: '#EFF6FF', text: '#1D4ED8', range: '$150–$500',      desc: 'Vidrios y cristales únicamente' },
  '02': { label: 'Leve',          hex: '#34D399', bg: '#ECFDF5', text: '#065F46', range: '$500–$2,000',    desc: 'Daños superficiales menores' },
  '03': { label: 'Medio',         hex: '#FBBF24', bg: '#FFFBEB', text: '#92400E', range: '$2,000–$8,000',  desc: 'Daños estructurales moderados' },
  '04': { label: 'Crítico',       hex: '#F97316', bg: '#FFF7ED', text: '#9A3412', range: '$8,000–$20,000', desc: 'Daños graves al vehículo' },
  '05': { label: 'Pérdida Total', hex: '#EF4444', bg: '#FEF2F2', text: '#991B1B', range: '$15,000–$60,000+', desc: 'Vehículo irreparable' },
}

export const TIPO_RECLAMO_NUEVO = [
  'Colisión', 'Robo', 'Incendio', 'Fenómeno Natural', 'Responsabilidad Civil', 'Otro'
]

export const CATEGORIAS_PAGO = [
  'Asegurado', 'Liquidación DPA', 'DPA/Honorarios', 'Taller', 'Suplidor', 'Cristal', 'Rent a Car'
]

export const ZONAS_GEOGRAFICAS = [
  'Norte', 'Sur', 'Este', 'Oeste', 'Región Capital'
]

export const COLUMN_MAP = {
  'NU_RECLAMO':            'nu_reclamo',
  'NO_RECLAMACION':        'nu_reclamo',   // alias used in fused Excel
  'NU_POLIZA':             'nu_poliza',
  'NU_CERTIFICADO':        'nu_certificado',
  'FE_DECLARACION':        'fe_declaracion',
  'FE_OCURRENCIA':         'fe_ocurrencia',
  'NOMBRE_RECLAMANTE':     'nombre_reclamante',
  'NOMBRE_ASEGURADO':      'nombre_asegurado',
  'DIAS_TRANSCURRIDOS':    'dias_transcurridos',
  'MARCA':                 'marca',
  'MODELO':                'modelo',
  'ANIO':                  'anio',
  'PERITO':                'perito',
  'PRODUCTOR':             'productor',
  'VALOR_VEHICULO':        'valor_vehiculo',
  'MT_PIEZAS':             'mt_piezas',
  'MT_MANO_OBRA':          'mt_mano_obra',
  'MT_ESTIMADO_TOTAL':     'mt_estimado_total',
  'RECEP_VEH':             'recep_veh',
  'FE_ENTREGA':            'fe_entrega',
  'NM_TALLER':             'nm_taller',
  'DE_ESTATUS':            'de_estatus',
  'NU_TELEFONO':           'nu_telefono',
  'DE_EMAIL':              'de_email',
  'NU_MOVIMIENTO':         'nu_movimiento',
  'DE_SUCURSAL':           'de_sucursal',
  'DE_TP_SINIESTRO':       'de_tp_siniestro',
  'DE_CAUSA_SINIESTRO':    'de_causa_siniestro',
  'CD_ESTATUS':            'cd_estatus',
  'TIENE_PIEZAS':          'tiene_piezas',
  'TIPO_RECLAMO':          'tipo_reclamo',
  'MT_AJUSTE_SINIESTRO':   'mt_ajuste_siniestro',
  'NUM_DPA':               'num_dpa',
  'MONTO_DPA':             'monto_dpa',
  'CD_TIPO_RECLAMO':       'cd_tipo_reclamo',
  // Legacy enrichment columns
  'SEVERIDAD':             'severidad',
  'TIPO_RECLAMO_NUEVO':    'tipo_reclamo_nuevo',
  'MT_PAGADO':             'mt_pagado',
  'ZONA_GEOGRAFICA':       'zona_geografica',
  'CORREDOR':              'corredor',
  // New payment-tracking columns (Estado de Cuenta fusion)
  'BENEFICIARIO_PAGO':     'beneficiario_pago',
  'TIPO_PAGO':             'tipo_pago',
  'MONTO_POR_PAGAR':       'monto_por_pagar',
  'ZONA':                  'zona',
  'DIAS_VENCIMIENTO_PAGO': 'dias_vencimiento_pago',
  'ESTATUS_PAGO':          'estatus_pago',
  'DP_DPA_DETALLE':        'dp_dpa_detalle',
  'DP_DPA_TOTAL':          'dp_dpa_total',
  'FUENTE':                'fuente',
}

export const TEMPLATE_HEADERS = Object.keys(COLUMN_MAP)

export const NAV_ITEMS = [
  { path: '/',               label: 'Resumen',           icon: 'chart-pie' },
  { path: '/perito',         label: 'Por Perito',         icon: 'user-group' },
  { path: '/taller',         label: 'Por Taller',         icon: 'wrench' },
  { path: '/detalle',        label: 'Detalle',            icon: 'table-cells' },
  { path: '/kpis',           label: 'KPIs',               icon: 'chart-bar' },
  { path: '/cuentas',        label: 'Cuentas Pendientes', icon: 'currency' },
  { path: '/estado-cuenta',  label: 'Estado de Cuenta',   icon: 'banknotes' },
  { path: '/importar',       label: 'Importar',           icon: 'arrow-up-tray' },
]
