export default function Header({ lastUpdated, onRefresh, loading, title }) {
  const formatted = lastUpdated
    ? lastUpdated.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b bg-white"
      style={{ borderColor: '#E2E8F0' }}
    >
      <div>
        <h1 className="text-lg font-bold" style={{ color: '#1E293B' }}>
          {title || 'DCS — Seguimiento de Reclamaciones'}
        </h1>
        {formatted && (
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
            Actualizado a las {formatted}
          </p>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        style={{ background: '#F1F5F9', color: '#475569' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#E2E8F0' }}
        onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}
      >
        <svg
          className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {loading ? 'Actualizando...' : 'Actualizar'}
      </button>
    </header>
  )
}
