import { create } from 'zustand'
import { ipc } from '@/lib/ipc'

export interface Connection {
  id: string
  name: string
  adapter: string
  host: string
  port: number
  database: string
  username: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ConnectionState {
  connections: Connection[]
  activeConnectionId: string | null
  connectionStatuses: Record<string, ConnectionStatus>

  // Actions
  addConnection: (connection: Connection) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void
  removeConnection: (id: string) => void
  setActiveConnection: (id: string | null) => void
  setConnectionStatus: (id: string, status: ConnectionStatus) => void
}

export const useConnectionStore = create<ConnectionState>()((set, get) => ({
  connections: [],
  activeConnectionId: null,
  connectionStatuses: {},

  addConnection: (connection) => {
    set((state) => ({
      connections: [...state.connections, connection],
      connectionStatuses: {
        ...state.connectionStatuses,
        [connection.id]: 'disconnected'
      }
    }))
    // Persist to disk
    ipc.saveStoredConnections(get().connections)
  },

  updateConnection: (id, updates) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.id === id ? { ...conn, ...updates } : conn
      )
    }))
    // Persist to disk
    ipc.saveStoredConnections(get().connections)
  },

  removeConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter((conn) => conn.id !== id),
      activeConnectionId:
        state.activeConnectionId === id ? null : state.activeConnectionId,
      connectionStatuses: Object.fromEntries(
        Object.entries(state.connectionStatuses).filter(([key]) => key !== id)
      )
    }))
    // Persist to disk
    ipc.saveStoredConnections(get().connections)
  },

  setActiveConnection: (id) =>
    set({ activeConnectionId: id }),

  setConnectionStatus: (id, status) =>
    set((state) => ({
      connectionStatuses: {
        ...state.connectionStatuses,
        [id]: status
      }
    }))
}))

// Load connections from disk on app start
ipc.getStoredConnections().then((connections) => {
  if (connections && connections.length > 0) {
    useConnectionStore.setState({
      connections: connections as Connection[],
      connectionStatuses: Object.fromEntries(
        connections.map((c) => [c.id, 'disconnected' as ConnectionStatus])
      )
    })
  }
})
