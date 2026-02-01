import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToastStore, type ToastType } from '../stores/toastStore'
import { cn } from '../lib/utils'

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info
}

const styles: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-400'
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
              'animate-in slide-in-from-right-full duration-200',
              'bg-[#1a1a1a]',
              styles[toast.type]
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm text-foreground">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
