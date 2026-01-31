import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../../shared/types'

const electronAPI: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
