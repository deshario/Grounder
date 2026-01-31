// Shared types between main and renderer processes

export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
}

export interface ConnectionConfig {
  id: string
  name: string
  adapter: string
  host: string
  port: number
  database: string
  username: string
  ssl?: boolean
  ssh?: {
    enabled: boolean
    host: string
    port: number
    username: string
    privateKeyPath?: string
  }
}

export interface TestConnectionResult {
  success: boolean
  error?: string
}

export interface ConnectionCredentials {
  password: string | null
  sshPassword: string | null
  error?: string
}

// IPC API type definitions
export interface ElectronAPI {
  ping: () => Promise<string>
  getAppInfo: () => Promise<AppInfo>

  // Connection management
  testConnection: (config: ConnectionConfig, password: string, sshPassword?: string) => Promise<TestConnectionResult>
  saveCredentials: (connectionId: string, password: string, sshPassword?: string) => Promise<{ success: boolean; error?: string }>
  getCredentials: (connectionId: string) => Promise<ConnectionCredentials>
  deleteCredentials: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  connect: (config: ConnectionConfig, password: string, sshPassword?: string) => Promise<{ success: boolean; error?: string }>
  disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
