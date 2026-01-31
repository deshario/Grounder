import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, ConnectionConfig, PaginationOptions } from '../../shared/types'

const electronAPI: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Connection management
  testConnection: (config: ConnectionConfig, password: string) =>
    ipcRenderer.invoke('connection:test', { config, password }),
  saveCredentials: (connectionId: string, password: string) =>
    ipcRenderer.invoke('connection:save-credentials', connectionId, password),
  getCredentials: (connectionId: string) =>
    ipcRenderer.invoke('connection:get-credentials', connectionId),
  deleteCredentials: (connectionId: string) =>
    ipcRenderer.invoke('connection:delete-credentials', connectionId),
  connect: (config: ConnectionConfig, password: string) =>
    ipcRenderer.invoke('connection:connect', { config, password }),
  disconnect: (connectionId: string) =>
    ipcRenderer.invoke('connection:disconnect', connectionId),

  // Database operations
  getDatabases: (connectionId: string) =>
    ipcRenderer.invoke('database:get-databases', connectionId),
  getSchemas: (connectionId: string, database?: string) =>
    ipcRenderer.invoke('database:get-schemas', connectionId, database),
  getTables: (connectionId: string, schema?: string) =>
    ipcRenderer.invoke('database:get-tables', connectionId, schema),
  getColumns: (connectionId: string, table: string, schema?: string) =>
    ipcRenderer.invoke('database:get-columns', connectionId, table, schema),
  getTableData: (connectionId: string, table: string, schema: string | undefined, options: PaginationOptions) =>
    ipcRenderer.invoke('database:get-table-data', connectionId, table, schema, options),
  query: (connectionId: string, sql: string, params?: unknown[]) =>
    ipcRenderer.invoke('database:query', connectionId, sql, params),
  getPrimaryKey: (connectionId: string, table: string, schema?: string) =>
    ipcRenderer.invoke('database:get-primary-key', connectionId, table, schema),
  updateRow: (connectionId: string, table: string, schema: string | undefined, pk: Record<string, unknown>, data: Record<string, unknown>) =>
    ipcRenderer.invoke('database:update-row', connectionId, table, schema, pk, data),

  // Persistent storage
  getStoredConnections: () => ipcRenderer.invoke('store:get-connections'),
  saveStoredConnections: (connections: unknown[]) => ipcRenderer.invoke('store:save-connections', connections)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
