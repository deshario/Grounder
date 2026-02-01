import { ipcMain } from 'electron'
import { pluginRegistry } from '../plugins/registry'

export function registerDatabaseHandlers() {
  // Get databases
  ipcMain.handle('database:get-databases', async (_event, connectionId: string) => {
    try {
      const adapter = pluginRegistry.getInstance(connectionId)
      if (!adapter) {
        return { success: false, error: 'Connection not found' }
      }
      const databases = await adapter.getDatabases()
      return { success: true, data: databases }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get schemas
  ipcMain.handle('database:get-schemas', async (_event, connectionId: string, database?: string) => {
    try {
      const adapter = pluginRegistry.getInstance(connectionId)
      if (!adapter) {
        return { success: false, error: 'Connection not found' }
      }
      const schemas = await adapter.getSchemas(database)
      return { success: true, data: schemas }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get tables
  ipcMain.handle('database:get-tables', async (_event, connectionId: string, schema?: string) => {
    try {
      const adapter = pluginRegistry.getInstance(connectionId)
      if (!adapter) {
        return { success: false, error: 'Connection not found' }
      }
      const tables = await adapter.getTables(schema)
      return { success: true, data: tables }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get columns
  ipcMain.handle('database:get-columns', async (_event, connectionId: string, table: string, schema?: string) => {
    try {
      const adapter = pluginRegistry.getInstance(connectionId)
      if (!adapter) {
        return { success: false, error: 'Connection not found' }
      }
      const columns = await adapter.getColumns(table, schema)
      return { success: true, data: columns }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Get table data
  ipcMain.handle(
    'database:get-table-data',
    async (
      _event,
      connectionId: string,
      table: string,
      schema: string | undefined,
      options: { limit: number; offset: number; orderBy?: string; orderDirection?: 'asc' | 'desc' }
    ) => {
      try {
        const adapter = pluginRegistry.getInstance(connectionId)
        if (!adapter) {
          return { success: false, error: 'Connection not found' }
        }
        const data = await adapter.getTableData(table, schema, options)
        return { success: true, data }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // Execute query
  ipcMain.handle(
    'database:query',
    async (_event, connectionId: string, sql: string, params?: unknown[]) => {
      try {
        const adapter = pluginRegistry.getInstance(connectionId)
        if (!adapter) {
          return { success: false, error: 'Connection not found' }
        }
        const result = await adapter.query(sql, params)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // Get primary key
  ipcMain.handle(
    'database:get-primary-key',
    async (_event, connectionId: string, table: string, schema?: string) => {
      try {
        const adapter = pluginRegistry.getInstance(connectionId)
        if (!adapter) {
          return { success: false, error: 'Connection not found' }
        }
        const primaryKey = await adapter.getPrimaryKey(table, schema)
        return { success: true, data: primaryKey }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // Update row
  ipcMain.handle(
    'database:update-row',
    async (
      _event,
      connectionId: string,
      table: string,
      schema: string | undefined,
      pk: Record<string, unknown>,
      data: Record<string, unknown>
    ) => {
      try {
        const adapter = pluginRegistry.getInstance(connectionId)
        if (!adapter) {
          return { success: false, error: 'Connection not found' }
        }
        await adapter.updateRow(table, schema, pk, data)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // Insert row
  ipcMain.handle(
    'database:insert-row',
    async (
      _event,
      connectionId: string,
      table: string,
      schema: string | undefined,
      data: Record<string, unknown>
    ) => {
      try {
        const adapter = pluginRegistry.getInstance(connectionId)
        if (!adapter) {
          return { success: false, error: 'Connection not found' }
        }
        await adapter.insertRow(table, schema, data)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // Delete row
  ipcMain.handle(
    'database:delete-row',
    async (
      _event,
      connectionId: string,
      table: string,
      schema: string | undefined,
      pk: Record<string, unknown>
    ) => {
      try {
        const adapter = pluginRegistry.getInstance(connectionId)
        if (!adapter) {
          return { success: false, error: 'Connection not found' }
        }
        await adapter.deleteRow(table, schema, pk)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )
}
