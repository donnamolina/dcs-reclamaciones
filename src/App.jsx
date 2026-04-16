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
      <Routes>
        <Route path="/" element={
          <FilterProvider>
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <Resumen {...sharedProps} />
            </Layout>
          </FilterProvider>
        } />
        <Route path="/perito" element={
          <FilterProvider>
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <PorPerito {...sharedProps} />
            </Layout>
          </FilterProvider>
        } />
        <Route path="/taller" element={
          <FilterProvider>
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <PorTaller {...sharedProps} />
            </Layout>
          </FilterProvider>
        } />
        <Route path="/detalle" element={
          <FilterProvider>
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <Detalle {...sharedProps} />
            </Layout>
          </FilterProvider>
        } />
        <Route path="/kpis" element={
          <FilterProvider>
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <KPIs {...sharedProps} />
            </Layout>
          </FilterProvider>
        } />
        <Route path="/estado-cuenta" element={
          <FilterProvider>
            <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
              <EstadoDeCuenta {...sharedProps} />
            </Layout>
          </FilterProvider>
        } />
        <Route path="/importar" element={
          <Layout onLogout={logout} lastUpdated={lastUpdated} onRefresh={refresh} loading={loading}>
            <Importar onImportComplete={refresh} />
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
