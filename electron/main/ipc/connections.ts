import { ipcMain } from 'electron'
import { pluginRegistry } from '../plugins/registry'
import { createPostgresAdapter } from '../plugins/adapters/postgres'
import { keychainService } from '../services/keychain'
import { sshTunnelManager } from '../services/ssh-tunnel'
import { appStore } from '../services/store'
import type { ConnectionConfig } from '../plugins/types'

// Register PostgreSQL adapter
pluginRegistry.register('postgres', createPostgresAdapter)

interface TestConnectionParams {
  config: ConnectionConfig
  password: string
  sshPassword?: string
}

interface ConnectParams {
  config: ConnectionConfig
  password: string
  sshPassword?: string
}

export function registerConnectionHandlers() {
  // Test connection
  ipcMain.handle('connection:test', async (_event, params: TestConnectionParams) => {
    const { config, password, sshPassword } = params

    try {
      let effectiveHost = config.host
      let effectivePort = config.port

      // Set up SSH tunnel if enabled
      if (config.ssh?.enabled) {
        const tunnel = await sshTunnelManager.createTunnel(`test-${config.id}`, {
          sshHost: config.ssh.host,
          sshPort: config.ssh.port,
          sshUsername: config.ssh.username,
          sshPassword,
          sshPrivateKeyPath: config.ssh.privateKeyPath,
          remoteHost: config.host,
          remotePort: config.port
        })
        effectiveHost = '127.0.0.1'
        effectivePort = tunnel.localPort
      }

      // Create adapter and test
      const adapter = createPostgresAdapter()
      const result = await adapter.testConnection(
        { ...config, host: effectiveHost, port: effectivePort },
        password
      )

      // Clean up SSH tunnel
      if (config.ssh?.enabled) {
        await sshTunnelManager.closeTunnel(`test-${config.id}`)
      }

      return { success: result }
    } catch (error) {
      await sshTunnelManager.closeTunnel(`test-${config.id}`)
      return { success: false, error: String(error) }
    }
  })

  // Save connection credentials
  ipcMain.handle('connection:save-credentials', async (_event, connectionId: string, password: string, sshPassword?: string) => {
    try {
      await keychainService.setPassword({ connectionId, type: 'database' }, password)

      if (sshPassword) {
        await keychainService.setPassword({ connectionId, type: 'ssh' }, sshPassword)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get connection credentials
  ipcMain.handle('connection:get-credentials', async (_event, connectionId: string) => {
    try {
      const password = await keychainService.getPassword({ connectionId, type: 'database' })
      const sshPassword = await keychainService.getPassword({ connectionId, type: 'ssh' })

      return { password, sshPassword }
    } catch (error) {
      return { password: null, sshPassword: null, error: String(error) }
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
    const { config, password, sshPassword } = params

    try {
      let effectiveHost = config.host
      let effectivePort = config.port

      // Set up SSH tunnel if enabled
      if (config.ssh?.enabled) {
        const tunnel = await sshTunnelManager.createTunnel(config.id, {
          sshHost: config.ssh.host,
          sshPort: config.ssh.port,
          sshUsername: config.ssh.username,
          sshPassword,
          sshPrivateKeyPath: config.ssh.privateKeyPath,
          remoteHost: config.host,
          remotePort: config.port
        })
        effectiveHost = '127.0.0.1'
        effectivePort = tunnel.localPort
      }

      // Create and connect adapter
      const adapter = pluginRegistry.createInstance(config.adapter, config.id)
      await adapter.connect(
        { ...config, host: effectiveHost, port: effectivePort },
        password
      )

      return { success: true }
    } catch (error) {
      await sshTunnelManager.closeTunnel(config.id)
      pluginRegistry.removeInstance(config.id)
      return { success: false, error: String(error) }
    }
  })

  // Disconnect from database
  ipcMain.handle('connection:disconnect', async (_event, connectionId: string) => {
    try {
      await sshTunnelManager.closeTunnel(connectionId)
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
