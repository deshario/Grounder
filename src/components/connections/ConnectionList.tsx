import { Database, Trash2, Loader2, Plug, Unplug, Circle } from 'lucide-react'
import { useConnectionStore, type Connection } from '@/stores/connectionStore'
import { cn } from '@/lib/utils'
import { ipc } from '@/lib/ipc'
import { toast } from '@/stores/toastStore'

export function ConnectionList() {
  const connections = useConnectionStore((state) => state.connections)
  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)
  const connectionStatuses = useConnectionStore((state) => state.connectionStatuses)
  const setActiveConnection = useConnectionStore((state) => state.setActiveConnection)
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus)
  const removeConnection = useConnectionStore((state) => state.removeConnection)

  const handleConnect = async (e: React.MouseEvent, connection: Connection) => {
    e.stopPropagation()
    const status = connectionStatuses[connection.id]
    if (status === 'connecting') return

    setConnectionStatus(connection.id, 'connecting')
    setActiveConnection(connection.id)

    try {
      const creds = await ipc.getCredentials(connection.id)
      const result = await ipc.connect(connection, creds.password || '')

      if (result.success) {
        setConnectionStatus(connection.id, 'connected')
        toast.success(`Connected to ${connection.name}`)
      } else {
        setConnectionStatus(connection.id, 'error')
        toast.error(result.error || 'Connection failed')
      }
    } catch (err) {
      setConnectionStatus(connection.id, 'error')
      toast.error(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  const handleDisconnect = async (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation()
    await ipc.disconnect(connectionId)
    setConnectionStatus(connectionId, 'disconnected')
  }

  const handleDelete = async (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation()
    const status = connectionStatuses[connectionId]
    if (status === 'connected') {
      await ipc.disconnect(connectionId)
    }
    await ipc.deleteCredentials(connectionId)
    removeConnection(connectionId)
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
        const isConnected = status === 'connected'
        const isConnecting = status === 'connecting'

        return (
          <div
            key={connection.id}
            onClick={() => setActiveConnection(connection.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left cursor-pointer group',
              'hover:bg-white/5 transition-colors',
              isActive && 'bg-white/10'
            )}
          >
            <div className="relative shrink-0">
              <Database className="w-4 h-4 text-muted" />
              {isConnected && (
                <Circle className="w-2 h-2 fill-green-500 text-green-500 absolute -bottom-0.5 -right-0.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="truncate block">{connection.name}</span>
              <span className="text-[10px] text-muted truncate block">
                {connection.host}:{connection.port}/{connection.database}
              </span>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {isConnecting ? (
                <div className="p-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                </div>
              ) : isConnected ? (
                <button
                  onClick={(e) => handleDisconnect(e, connection.id)}
                  className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                  title="Disconnect"
                >
                  <Unplug className="w-3.5 h-3.5 text-red-400" />
                </button>
              ) : (
                <button
                  onClick={(e) => handleConnect(e, connection)}
                  className="p-1.5 rounded hover:bg-green-500/20 transition-colors"
                  title="Connect"
                >
                  <Plug className="w-3.5 h-3.5 text-green-400" />
                </button>
              )}
              <button
                onClick={(e) => handleDelete(e, connection.id)}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
