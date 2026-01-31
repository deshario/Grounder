// Shared types between main and renderer processes

export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
}

// IPC API type definitions
export interface ElectronAPI {
  ping: () => Promise<string>
  getAppInfo: () => Promise<AppInfo>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
