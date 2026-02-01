// Type-safe IPC client for renderer process
import type { ElectronAPI } from '@shared/types'

export const ipc: ElectronAPI = window.electronAPI
