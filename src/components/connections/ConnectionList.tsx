import { Database, Circle } from 'lucide-react'
import { useConnectionStore, type ConnectionStatus } from '@/stores/connectionStore'
import { cn } from '@/lib/utils'

const statusColors: Record<ConnectionStatus, string> = {
  disconnected: 'text-muted',
  connecting: 'text-yellow-500',
  connected: 'text-green-500',
  error: 'text-red-500'
}

export function ConnectionList() {
  const connections = useConnectionStore((state) => state.connections)
  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)
  const connectionStatuses = useConnectionStore((state) => state.connectionStatuses)
  const setActiveConnection = useConnectionStore((state) => state.setActiveConnection)

  if (connections.length === 0) {
    return (
      <div className="text-xs text-muted px-2 py-4 text-center">
        No connections yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {connections.map((connection) => {
        const status = connectionStatuses[connection.id] || 'disconnected'
        const isActive = activeConnectionId === connection.id

        return (
          <button
            key={connection.id}
            onClick={() => setActiveConnection(connection.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left',
              'hover:bg-white/5 transition-colors',
              isActive && 'bg-white/10'
            )}
          >
            <Database className="w-4 h-4 text-muted shrink-0" />
            <span className="truncate flex-1">{connection.name}</span>
            <Circle
              className={cn('w-2 h-2 fill-current', statusColors[status])}
            />
          </button>
        )
      })}
    </div>
  )
}
