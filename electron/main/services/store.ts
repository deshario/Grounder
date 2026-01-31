import Store from 'electron-store'

interface Connection {
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

interface StoreSchema {
  connections: Connection[]
}

const store = new Store<StoreSchema>({
  name: 'querypad-data',
  defaults: {
    connections: []
  }
})

export const appStore = {
  getConnections: (): Connection[] => {
    return store.get('connections', [])
  },

  saveConnections: (connections: Connection[]): void => {
    store.set('connections', connections)
  },

  addConnection: (connection: Connection): void => {
    const connections = store.get('connections', [])
    connections.push(connection)
    store.set('connections', connections)
  },

  updateConnection: (id: string, updates: Partial<Connection>): void => {
    const connections = store.get('connections', [])
    const index = connections.findIndex((c) => c.id === id)
    if (index !== -1) {
      connections[index] = { ...connections[index], ...updates }
      store.set('connections', connections)
    }
  },

  removeConnection: (id: string): void => {
    const connections = store.get('connections', [])
    store.set(
      'connections',
      connections.filter((c) => c.id !== id)
    )
  }
}
