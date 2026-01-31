import { ipcMain } from 'electron'
import { registerConnectionHandlers } from './connections'

export function registerIpcHandlers() {
  // Ping handler for testing IPC communication
  ipcMain.handle('ping', async () => {
    return 'pong'
  })

  // App info
  ipcMain.handle('get-app-info', async () => {
    return {
      name: 'QueryPad',
      version: '1.0.0',
      platform: process.platform
    }
  })

  // Register connection handlers
  registerConnectionHandlers()
}
