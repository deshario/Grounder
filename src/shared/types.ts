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
}

export interface TestConnectionResult {
  success: boolean
  error?: string
}

export interface ConnectionCredentials {
  password: string | null
  error?: string
}

// Database types
export interface DatabaseInfo {
  name: string
}

export interface SchemaInfo {
  name: string
}

export interface TableInfo {
  name: string
  schema: string
  rowCount?: number
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  affectedRows?: number
  executionTime: number
}

export interface TableData {
  columns: ColumnInfo[]
  rows: Record<string, unknown>[]
  totalCount: number
}

export interface PaginationOptions {
  limit: number
  offset: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

// Generic API result
export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

// IPC API type definitions
export interface ElectronAPI {
  ping: () => Promise<string>
  getAppInfo: () => Promise<AppInfo>

  // Connection management
  testConnection: (config: ConnectionConfig, password: string) => Promise<TestConnectionResult>
  saveCredentials: (connectionId: string, password: string) => Promise<{ success: boolean; error?: string }>
  getCredentials: (connectionId: string) => Promise<ConnectionCredentials>
  deleteCredentials: (connectionId: string) => Promise<{ success: boolean; error?: string }>
  connect: (config: ConnectionConfig, password: string) => Promise<{ success: boolean; error?: string }>
  disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>

  // Database operations
  getDatabases: (connectionId: string) => Promise<ApiResult<DatabaseInfo[]>>
  getSchemas: (connectionId: string, database?: string) => Promise<ApiResult<SchemaInfo[]>>
  getTables: (connectionId: string, schema?: string) => Promise<ApiResult<TableInfo[]>>
  getColumns: (connectionId: string, table: string, schema?: string) => Promise<ApiResult<ColumnInfo[]>>
  getTableData: (connectionId: string, table: string, schema: string | undefined, options: PaginationOptions) => Promise<ApiResult<TableData>>
  query: (connectionId: string, sql: string, params?: unknown[]) => Promise<ApiResult<QueryResult>>
  getPrimaryKey: (connectionId: string, table: string, schema?: string) => Promise<ApiResult<string[]>>
  updateRow: (connectionId: string, table: string, schema: string | undefined, pk: Record<string, unknown>, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  insertRow: (connectionId: string, table: string, schema: string | undefined, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  deleteRow: (connectionId: string, table: string, schema: string | undefined, pk: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>

  // Persistent storage
  getStoredConnections: () => Promise<ConnectionConfig[]>
  saveStoredConnections: (connections: ConnectionConfig[]) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
