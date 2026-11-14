import { Header } from './components/Header/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { Dashboard } from './components/Dashboard/Dashboard'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { ToastContainer } from './components/Toast/Toast'
import { useUIStore } from './stores'
import { cn } from './utils/helpers'

function App() {
  const { sidebarOpen, settings } = useUIStore()

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        settings.theme === 'dark' ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900',
      )}
    >
      <ToastContainer />
      <Header />
      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => useUIStore.getState().setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-0 min-w-0 overflow-hidden">
          <Dashboard />
        </main>
      </div>
      <SettingsPanel />
    </div>
  )
}

export default App
