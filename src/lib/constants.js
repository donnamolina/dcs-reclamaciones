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

export const COLUMN_MAP = {
  'NU_RECLAMO':         'nu_reclamo',
  'NU_POLIZA':          'nu_poliza',
  'NU_CERTIFICADO':     'nu_certificado',
  'FE_DECLARACION':     'fe_declaracion',
  'FE_OCURRENCIA':      'fe_ocurrencia',
  'NOMBRE_RECLAMANTE':  'nombre_reclamante',
  'NOMBRE_ASEGURADO':   'nombre_asegurado',
  'DIAS_TRANSCURRIDOS': 'dias_transcurridos',
  'MARCA':              'marca',
  'MODELO':             'modelo',
  'ANIO':               'anio',
  'PERITO':             'perito',
  'PRODUCTOR':          'productor',
  'VALOR_VEHICULO':     'valor_vehiculo',
  'MT_PIEZAS':          'mt_piezas',
  'MT_MANO_OBRA':       'mt_mano_obra',
  'MT_ESTIMADO_TOTAL':  'mt_estimado_total',
  'RECEP_VEH':          'recep_veh',
  'FE_ENTREGA':         'fe_entrega',
  'NM_TALLER':          'nm_taller',
  'DE_ESTATUS':         'de_estatus',
  'NU_TELEFONO':        'nu_telefono',
  'DE_EMAIL':           'de_email',
  'NU_MOVIMIENTO':      'nu_movimiento',
  'DE_SUCURSAL':        'de_sucursal',
  'DE_TP_SINIESTRO':    'de_tp_siniestro',
  'DE_CAUSA_SINIESTRO': 'de_causa_siniestro',
  'CD_ESTATUS':         'cd_estatus',
  'TIENE_PIEZAS':       'tiene_piezas',
  'TIPO_RECLAMO':       'tipo_reclamo',
  'MT_AJUSTE_SINIESTRO':'mt_ajuste_siniestro',
  'NUM_DPA':            'num_dpa',
  'MONTO_DPA':          'monto_dpa',
  'CD_TIPO_RECLAMO':    'cd_tipo_reclamo',
}

export const TEMPLATE_HEADERS = Object.keys(COLUMN_MAP)

export const NAV_ITEMS = [
  { path: '/',         label: 'Resumen',    icon: 'chart-pie' },
  { path: '/perito',   label: 'Por Perito', icon: 'user-group' },
  { path: '/taller',   label: 'Por Taller', icon: 'wrench' },
  { path: '/detalle',  label: 'Detalle',    icon: 'table-cells' },
  { path: '/importar', label: 'Importar',   icon: 'arrow-up-tray' },
  { path: '/kpis',     label: 'KPIs',       icon: 'chart-bar' },
]
