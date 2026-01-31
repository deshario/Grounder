import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Connection {
  id: string
  name: string
  adapter: string
  host: string
  port: number
  database: string
  username: string
  ssl: boolean
  ssh: {
    enabled: boolean
    host: string
    port: number
    username: string
    privateKeyPath?: string
  }
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

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      connections: [],
      activeConnectionId: null,
      connectionStatuses: {},

      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, connection],
          connectionStatuses: {
            ...state.connectionStatuses,
            [connection.id]: 'disconnected'
          }
        })),

      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...updates } : conn
          )
        })),

      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
          activeConnectionId:
            state.activeConnectionId === id ? null : state.activeConnectionId,
          connectionStatuses: Object.fromEntries(
            Object.entries(state.connectionStatuses).filter(([key]) => key !== id)
          )
        })),

      setActiveConnection: (id) =>
        set({ activeConnectionId: id }),

      setConnectionStatus: (id, status) =>
        set((state) => ({
          connectionStatuses: {
            ...state.connectionStatuses,
            [id]: status
          }
        }))
    }),
    {
      name: 'querypad-connections',
      partialize: (state) => ({
        connections: state.connections
      })
    }
  )
)
