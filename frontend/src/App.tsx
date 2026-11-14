import { useEffect } from 'react'
import { Header } from './components/Header/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { Dashboard } from './components/Dashboard/Dashboard'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { ToastContainer } from './components/Toast/Toast'
import { useUIStore } from './stores'
import { cn } from './utils/helpers'

function App() {
  const { sidebarOpen, settings } = useUIStore()
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [isDark])

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
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
