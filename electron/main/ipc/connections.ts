import { ipcMain } from 'electron'
import { pluginRegistry } from '../plugins/registry'
import { createPostgresAdapter } from '../plugins/adapters/postgres'
import { keychainService } from '../services/keychain'
import { appStore } from '../services/store'
import type { ConnectionConfig } from '../plugins/types'

// Register PostgreSQL adapter
pluginRegistry.register('postgres', createPostgresAdapter)

interface TestConnectionParams {
  config: ConnectionConfig
  password: string
}

interface ConnectParams {
  config: ConnectionConfig
  password: string
}

export function registerConnectionHandlers() {
  // Test connection
  ipcMain.handle('connection:test', async (_event, params: TestConnectionParams) => {
    const { config, password } = params

    try {
      // Create adapter and test
      const adapter = createPostgresAdapter()
      const result = await adapter.testConnection(config, password)

      return { success: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Save connection credentials
  ipcMain.handle('connection:save-credentials', async (_event, connectionId: string, password: string) => {
    try {
      await keychainService.setPassword({ connectionId, type: 'database' }, password)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get connection credentials
  ipcMain.handle('connection:get-credentials', async (_event, connectionId: string) => {
    try {
      const password = await keychainService.getPassword({ connectionId, type: 'database' })
      return { password }
    } catch (error) {
      return { password: null, error: String(error) }
    }
  })

  // Delete connection credentials
  ipcMain.handle('connection:delete-credentials', async (_event, connectionId: string) => {
    try {
      await keychainService.deleteConnectionCredentials(connectionId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Connect to database
  ipcMain.handle('connection:connect', async (_event, params: ConnectParams) => {
    const { config, password } = params

    try {
      // Create and connect adapter
      const adapter = pluginRegistry.createInstance(config.adapter, config.id)
      await adapter.connect(config, password)

      return { success: true }
    } catch (error) {
      pluginRegistry.removeInstance(config.id)
      return { success: false, error: String(error) }
    }
  })

  // Disconnect from database
  ipcMain.handle('connection:disconnect', async (_event, connectionId: string) => {
    try {
      pluginRegistry.removeInstance(connectionId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Load saved connections from disk
  ipcMain.handle('store:get-connections', async () => {
    return appStore.getConnections()
  })

  // Save connections to disk
  ipcMain.handle('store:save-connections', async (_event, connections) => {
    appStore.saveConnections(connections)
    return { success: true }
  })
}
