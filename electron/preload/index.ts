import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, ConnectionConfig } from '../../shared/types'

const electronAPI: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Connection management
  testConnection: (config: ConnectionConfig, password: string, sshPassword?: string) =>
    ipcRenderer.invoke('connection:test', { config, password, sshPassword }),
  saveCredentials: (connectionId: string, password: string, sshPassword?: string) =>
    ipcRenderer.invoke('connection:save-credentials', connectionId, password, sshPassword),
  getCredentials: (connectionId: string) =>
    ipcRenderer.invoke('connection:get-credentials', connectionId),
  deleteCredentials: (connectionId: string) =>
    ipcRenderer.invoke('connection:delete-credentials', connectionId),
  connect: (config: ConnectionConfig, password: string, sshPassword?: string) =>
    ipcRenderer.invoke('connection:connect', { config, password, sshPassword }),
  disconnect: (connectionId: string) =>
    ipcRenderer.invoke('connection:disconnect', connectionId)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
