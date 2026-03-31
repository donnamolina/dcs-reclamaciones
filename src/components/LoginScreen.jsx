import { useState } from 'react'

export default function LoginScreen({ login, error }) {
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    login(password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F8' }}>
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: '#003DA5' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DCS</h1>
          <p className="text-sm text-gray-500 mt-1">Seguimiento de Reclamaciones</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition"
                style={{
                  borderColor: error ? '#EF4444' : '#D1D5DB',
                  boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.1)' : undefined
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = '#003DA5' }}
                onBlur={e => { e.target.style.borderColor = error ? '#EF4444' : '#D1D5DB' }}
                autoFocus
              />
              {error && (
                <p className="mt-1.5 text-xs text-red-600">{error}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: '#003DA5' }}
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dominicana Compañía de Seguros © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
