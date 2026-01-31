import { Database, Circle } from 'lucide-react'
import { useConnectionStore, type ConnectionStatus, type Connection } from '@/stores/connectionStore'
import { cn } from '@/lib/utils'
import { ipc } from '@/lib/ipc'

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
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus)

  const handleConnect = async (connection: Connection) => {
    const status = connectionStatuses[connection.id]

    // If already connected, just select it
    if (status === 'connected') {
      setActiveConnection(connection.id)
      return
    }

    // If connecting, ignore
    if (status === 'connecting') return

    setConnectionStatus(connection.id, 'connecting')
    setActiveConnection(connection.id)

    try {
      // Get credentials from keychain
      const creds = await ipc.getCredentials(connection.id)

      // Connect to database
      const result = await ipc.connect(
        connection,
        creds.password || '',
        connection.ssh.enabled ? creds.sshPassword || undefined : undefined
      )

      if (result.success) {
        setConnectionStatus(connection.id, 'connected')
      } else {
        setConnectionStatus(connection.id, 'error')
        console.error('Connection failed:', result.error)
      }
    } catch (err) {
      setConnectionStatus(connection.id, 'error')
      console.error('Connection error:', err)
    }
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 px-4 text-center">
        <div className="w-10 h-10 mb-3 rounded-lg bg-white/5 flex items-center justify-center">
          <Database className="w-5 h-5 opacity-40" />
        </div>
        <p className="text-xs text-muted-foreground">No connections yet</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Click "Add Connection" below</p>
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
            onDoubleClick={() => handleConnect(connection)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left',
              'hover:bg-white/5 transition-colors',
              isActive && 'bg-white/10',
              status === 'connecting' && 'opacity-70'
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
