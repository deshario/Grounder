import { cn } from '../../lib/utils'

interface StatusBarProps {
  className?: string
}

export function StatusBar({ className }: StatusBarProps) {
  return (
    <div className={cn('h-6 flex items-center px-3 bg-background border-t border-border text-xs text-muted', className)}>
      <span>Ready</span>
      <span className="ml-auto">Grounder v1.0.0</span>
    </div>
  )
}
