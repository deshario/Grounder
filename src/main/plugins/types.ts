// Database adapter plugin interface

export interface ConnectionConfig {
  id: string
  name: string
  adapter: string
  host: string
  port: number
  database: string
  username: string
  // Password stored in keychain, not here
}

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

export interface IndexInfo {
  name: string
  columns: string[]
  unique: boolean
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  affectedRows?: number
  executionTime: number
}

export interface PaginationOptions {
  limit: number
  offset: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface TableData {
  columns: ColumnInfo[]
  rows: Record<string, unknown>[]
  totalCount: number
}

export type PrimaryKeyValue = Record<string, unknown>

export interface DatabaseAdapter {
  readonly id: string
  readonly name: string
  readonly icon: string

  // Connection lifecycle
  connect(config: ConnectionConfig, password: string): Promise<void>
  disconnect(): Promise<void>
  testConnection(config: ConnectionConfig, password: string): Promise<boolean>
  isConnected(): boolean

  // Schema introspection
  getDatabases(): Promise<DatabaseInfo[]>
  getSchemas(database?: string): Promise<SchemaInfo[]>
  getTables(schema?: string): Promise<TableInfo[]>
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>
  getIndexes(table: string, schema?: string): Promise<IndexInfo[]>
  getPrimaryKey(table: string, schema?: string): Promise<string[]>

  // Query execution
  query(sql: string, params?: unknown[]): Promise<QueryResult>
  getTableData(table: string, schema: string | undefined, options: PaginationOptions): Promise<TableData>

  // CRUD operations
  insertRow(table: string, schema: string | undefined, data: Record<string, unknown>): Promise<void>
  updateRow(table: string, schema: string | undefined, pk: PrimaryKeyValue, data: Record<string, unknown>): Promise<void>
  deleteRow(table: string, schema: string | undefined, pk: PrimaryKeyValue): Promise<void>
}

// Factory function type for creating adapters
export type AdapterFactory = () => DatabaseAdapter
