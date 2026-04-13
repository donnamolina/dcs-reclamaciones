import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useReclamaciones } from './hooks/useReclamaciones'
import { FilterProvider } from './context/FilterContext'
import LoginScreen from './components/LoginScreen'
import Layout from './components/Layout/Layout'
import Resumen from './pages/Resumen'
import PorPerito from './pages/PorPerito'
import PorTaller from './pages/PorTaller'
import Detalle from './pages/Detalle'
import Importar from './pages/Importar'
import KPIs from './pages/KPIs'
import CuentasPendientes from './pages/CuentasPendientes'
import EstadoDeCuenta from './pages/EstadoDeCuenta'

function App() {
  const { authed, login, logout, error } = useAuth()
  const { data, loading, error: dataError, lastUpdated, refresh } = useReclamaciones()

  if (!authed) {
    return <LoginScreen login={login} error={error} />
  }

  const sharedProps = { data, loading, dataError, lastUpdated, refresh }

  return (
    <BrowserRouter>
      <FilterProvider>
        <Routes>
          <Route path="/" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <Resumen {...sharedProps} />
            </Layout>
          } />
          <Route path="/perito" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <PorPerito {...sharedProps} />
            </Layout>
          } />
          <Route path="/taller" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <PorTaller {...sharedProps} />
            </Layout>
          } />
          <Route path="/detalle" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <Detalle {...sharedProps} />
            </Layout>
          } />
          <Route path="/kpis" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <KPIs {...sharedProps} />
            </Layout>
          } />
          <Route path="/cuentas" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <CuentasPendientes {...sharedProps} />
            </Layout>
          } />
          <Route path="/estado-cuenta" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <EstadoDeCuenta {...sharedProps} />
            </Layout>
          } />
          <Route path="/importar" element={
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <Importar onImportComplete={refresh} />
            </Layout>
          } />
        </Routes>
      </FilterProvider>
    </BrowserRouter>
  )
}

export default App
