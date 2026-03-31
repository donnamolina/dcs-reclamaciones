import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children, onLogout, lastUpdated, onRefresh, loading, title }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col" style={{ marginLeft: '224px' }}>
        <Header
          lastUpdated={lastUpdated}
          onRefresh={onRefresh}
          loading={loading}
          title={title}
        />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
