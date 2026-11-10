import { Header } from './components/Header/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { Dashboard } from './components/Dashboard/Dashboard'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { useUIStore } from './stores'
import { cn } from './utils/helpers'

function App() {
  const { sidebarOpen, settings } = useUIStore()

  return (
    <div className={cn('min-h-screen bg-slate-950', settings.theme === 'dark' && 'dark')}>
      <Header />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => useUIStore.getState().setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-0 min-w-0">
          <Dashboard />
        </main>
      </div>
      <SettingsPanel />
    </div>
  )
}

export default App