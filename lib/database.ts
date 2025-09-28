import { Pool } from "pg"
import mysql from "mysql2/promise"
import Database from "better-sqlite3"

export interface DatabaseConfig {
  type: "postgresql" | "mysql" | "sqlite"
  url: string
}

export class DatabaseConnection {
  private config: DatabaseConfig
  private pgPool?: Pool
  private mysqlConnection?: mysql.Connection
  private sqliteDb?: Database.Database

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async connect() {
    console.log("[v0] Connecting to database:", this.config.type)

    switch (this.config.type) {
      case "postgresql":
        this.pgPool = new Pool({ connectionString: this.config.url })
        await this.pgPool.query("SELECT 1") // Test connection
        break

      case "mysql":
        this.mysqlConnection = await mysql.createConnection(this.config.url)
        await this.mysqlConnection.execute("SELECT 1") // Test connection
        break

      case "sqlite":
        this.sqliteDb = new Database(this.config.url.replace("sqlite://", ""))
        this.sqliteDb.exec("SELECT 1") // Test connection
        break

      default:
        throw new Error(`Unsupported database type: ${this.config.type}`)
    }

    console.log("[v0] Database connected successfully")
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    console.log("[v0] Executing SQL:", sql)

    switch (this.config.type) {
      case "postgresql":
        if (!this.pgPool) throw new Error("PostgreSQL not connected")
        const pgResult = await this.pgPool.query(sql, params)
        return pgResult.rows

      case "mysql":
        if (!this.mysqlConnection) throw new Error("MySQL not connected")
        const [mysqlRows] = await this.mysqlConnection.execute(sql, params)
        return Array.isArray(mysqlRows) ? mysqlRows : []

      case "sqlite":
        if (!this.sqliteDb) throw new Error("SQLite not connected")
        const stmt = this.sqliteDb.prepare(sql)
        return stmt.all(params)

      default:
        throw new Error(`Unsupported database type: ${this.config.type}`)
    }
  }

  async discoverSchema(): Promise<Record<string, string[]>> {
    console.log("[v0] Discovering database schema")

    switch (this.config.type) {
      case "postgresql":
        const pgTables = await this.query(`
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
          ORDER BY table_name, ordinal_position
        `)
        return this.groupSchemaResults(pgTables)

      case "mysql":
        const mysqlTables = await this.query(`
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE()
          ORDER BY table_name, ordinal_position
        `)
        return this.groupSchemaResults(mysqlTables)

      case "sqlite":
        const sqliteTables = await this.query(`
          SELECT name FROM sqlite_master WHERE type='table'
        `)
        const schema: Record<string, string[]> = {}

        for (const table of sqliteTables) {
          const columns = await this.query(`PRAGMA table_info(${table.name})`)
          schema[table.name] = columns.map((col: any) => col.name)
        }

        return schema

      default:
        throw new Error(`Unsupported database type: ${this.config.type}`)
    }
  }

  private groupSchemaResults(results: any[]): Record<string, string[]> {
    const schema: Record<string, string[]> = {}

    for (const row of results) {
      const tableName = row.table_name
      const columnName = row.column_name

      if (!schema[tableName]) {
        schema[tableName] = []
      }
      schema[tableName].push(columnName)
    }

    return schema
  }

  async disconnect() {
    console.log("[v0] Disconnecting from database")

    switch (this.config.type) {
      case "postgresql":
        await this.pgPool?.end()
        break

      case "mysql":
        await this.mysqlConnection?.end()
        break

      case "sqlite":
        this.sqliteDb?.close()
        break
    }
  }
}

// Parse database URL to determine type and create config
export function parseDatabaseUrl(url: string): DatabaseConfig {
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return { type: "postgresql", url }
  }

  if (url.startsWith("mysql://")) {
    return { type: "mysql", url }
  }

  if (url.startsWith("sqlite://") || url.endsWith(".db") || url.endsWith(".sqlite")) {
    return { type: "sqlite", url }
  }

  throw new Error(`Unsupported database URL format: ${url}`)
}

// Global database connection instance
let dbConnection: DatabaseConnection | null = null

export async function getDatabase(): Promise<DatabaseConnection> {
  if (!dbConnection) {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required")
    }

    const config = parseDatabaseUrl(databaseUrl)
    dbConnection = new DatabaseConnection(config)
    await dbConnection.connect()
  }

  return dbConnection
}
