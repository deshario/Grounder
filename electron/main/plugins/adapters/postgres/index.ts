import { Pool } from 'pg'
import type {
  DatabaseAdapter,
  ConnectionConfig,
  DatabaseInfo,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  QueryResult,
  PaginationOptions,
  TableData,
  PrimaryKeyValue
} from '../../types'

export class PostgresAdapter implements DatabaseAdapter {
  readonly id = 'postgres'
  readonly name = 'PostgreSQL'
  readonly icon = 'database'

  private pool: Pool | null = null

  async connect(config: ConnectionConfig, password: string): Promise<void> {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })

    // Test the connection
    const client = await this.pool.connect()
    client.release()
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  async testConnection(config: ConnectionConfig, password: string): Promise<boolean> {
    const testPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 1,
      connectionTimeoutMillis: 5000
    })

    try {
      const client = await testPool.connect()
      client.release()
      await testPool.end()
      return true
    } catch {
      await testPool.end()
      return false
    }
  }

  isConnected(): boolean {
    return this.pool !== null
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new Error('Not connected to database')
    }
    return this.pool
  }

  async getDatabases(): Promise<DatabaseInfo[]> {
    const result = await this.getPool().query(
      `SELECT datname as name FROM pg_database
       WHERE datistemplate = false
       ORDER BY datname`
    )
    return result.rows
  }

  async getSchemas(_database?: string): Promise<SchemaInfo[]> {
    const result = await this.getPool().query(
      `SELECT schema_name as name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name`
    )
    return result.rows
  }

  async getTables(schema = 'public'): Promise<TableInfo[]> {
    const result = await this.getPool().query(
      `SELECT
        t.table_name as name,
        t.table_schema as schema,
        (SELECT reltuples::bigint FROM pg_class WHERE oid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass) as "rowCount"
       FROM information_schema.tables t
       WHERE t.table_schema = $1
         AND t.table_type = 'BASE TABLE'
       ORDER BY t.table_name`,
      [schema]
    )
    return result.rows.map(row => ({
      ...row,
      rowCount: row.rowCount ? Number(row.rowCount) : undefined
    }))
  }

  async getColumns(table: string, schema = 'public'): Promise<ColumnInfo[]> {
    const result = await this.getPool().query(
      `SELECT
        c.column_name as name,
        c.data_type as type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as "defaultValue",
        COALESCE(
          (SELECT true FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_schema = c.table_schema
             AND tc.table_name = c.table_name
             AND tc.constraint_type = 'PRIMARY KEY'
             AND kcu.column_name = c.column_name
           LIMIT 1),
          false
        ) as "isPrimaryKey"
       FROM information_schema.columns c
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schema, table]
    )
    return result.rows
  }

  async getIndexes(table: string, schema = 'public'): Promise<IndexInfo[]> {
    const result = await this.getPool().query(
      `SELECT
        i.relname as name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
        ix.indisunique as unique
       FROM pg_class t
       JOIN pg_index ix ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = $1 AND t.relname = $2
       GROUP BY i.relname, ix.indisunique`,
      [schema, table]
    )
    return result.rows
  }

  async getPrimaryKey(table: string, schema = 'public'): Promise<string[]> {
    const result = await this.getPool().query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_schema = $1
         AND tc.table_name = $2
         AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position`,
      [schema, table]
    )
    return result.rows.map(row => row.column_name)
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const start = performance.now()
    const result = await this.getPool().query(sql, params)
    const executionTime = performance.now() - start

    return {
      columns: result.fields.map(f => f.name),
      rows: result.rows,
      rowCount: result.rows.length,
      affectedRows: result.rowCount ?? undefined,
      executionTime
    }
  }

  async getTableData(table: string, schema = 'public', options: PaginationOptions): Promise<TableData> {
    const columns = await this.getColumns(table, schema)

    // Get total count
    const countResult = await this.getPool().query(
      `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`
    )
    const totalCount = Number(countResult.rows[0].count)

    // Build query with pagination
    let sql = `SELECT * FROM ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`

    if (options.orderBy) {
      sql += ` ORDER BY ${this.escapeIdentifier(options.orderBy)} ${options.orderDirection === 'desc' ? 'DESC' : 'ASC'}`
    }

    sql += ` LIMIT $1 OFFSET $2`

    const result = await this.getPool().query(sql, [options.limit, options.offset])

    return {
      columns,
      rows: result.rows,
      totalCount
    }
  }

  async insertRow(table: string, schema = 'public', data: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(data)
    const values = Object.values(data)
    const placeholders = columns.map((_, i) => `$${i + 1}`)

    await this.getPool().query(
      `INSERT INTO ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}
       (${columns.map(c => this.escapeIdentifier(c)).join(', ')})
       VALUES (${placeholders.join(', ')})`,
      values
    )
  }

  async updateRow(table: string, schema = 'public', pk: PrimaryKeyValue, data: Record<string, unknown>): Promise<void> {
    const setClauses = Object.keys(data).map((col, i) =>
      `${this.escapeIdentifier(col)} = $${i + 1}`
    )
    const whereConditions = Object.keys(pk).map((col, i) =>
      `${this.escapeIdentifier(col)} = $${Object.keys(data).length + i + 1}`
    )

    await this.getPool().query(
      `UPDATE ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}
       SET ${setClauses.join(', ')}
       WHERE ${whereConditions.join(' AND ')}`,
      [...Object.values(data), ...Object.values(pk)]
    )
  }

  async deleteRow(table: string, schema = 'public', pk: PrimaryKeyValue): Promise<void> {
    const whereConditions = Object.keys(pk).map((col, i) =>
      `${this.escapeIdentifier(col)} = $${i + 1}`
    )

    await this.getPool().query(
      `DELETE FROM ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}
       WHERE ${whereConditions.join(' AND ')}`,
      Object.values(pk)
    )
  }

  private escapeIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`
  }
}

export function createPostgresAdapter(): PostgresAdapter {
  return new PostgresAdapter()
}
