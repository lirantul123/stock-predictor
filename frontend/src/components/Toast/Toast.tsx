import { cn } from '@/utils/helpers'
import type { Toast, ToastType } from '@/stores/toast'
import { useToastStore } from '@/stores/toast'

const typeConfig: Record<ToastType, { icon: string; bg: string; border: string; text: string }> = {
  success: {
    icon: 'M5 13l4 4L19 7',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
  },
  error: {
    icon: 'M6 18L18 6M6 6l12 12',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
  warning: {
    icon: 'M9 16l-4-4l6-6l4 4l-6 6-4-4z',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
  },
  info: {
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/30',
    text: 'text-primary-400',
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const config = typeConfig[toast.type]
  const { remove } = useToastStore()

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl p-4 border shadow-lg backdrop-blur-xl animate-slide-up',
        config.bg,
        config.border,
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <svg className={cn('h-5 w-5', config.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-100 leading-tight">{toast.title}</h4>
        {toast.message && (
          <p className="mt-0.5 text-sm text-slate-400 leading-snug">{toast.message}</p>
        )}
      </div>
      <div className="ml-2 flex-shrink-0">
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              remove(toast.id)
            }}
            className="ml-1 p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        onClick={() => remove(toast.id)}
        className="-mr-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-slate-300"
        aria-label="Close"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
