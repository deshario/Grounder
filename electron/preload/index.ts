import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for IPC methods - will be expanded in Phase 2
  ping: () => ipcRenderer.invoke('ping')
})

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>
    }
  }
}
