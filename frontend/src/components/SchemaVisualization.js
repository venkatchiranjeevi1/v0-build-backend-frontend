"use client"

import { useState, useEffect } from "react"
import { Network, Table, Key, Link, BarChart3 } from "lucide-react"
import axios from "axios"

const SchemaVisualization = ({ schema, connectionId }) => {
  const [currentSchema, setCurrentSchema] = useState(schema)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (connectionId && !schema) {
      fetchSchema()
    }
  }, [connectionId, schema])

  const fetchSchema = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`/api/schema?connection_id=${connectionId}`)
      if (response.data.success) {
        setCurrentSchema(response.data.schema)
      }
    } catch (error) {
      console.error("Failed to fetch schema:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading schema...</p>
        </div>
      </div>
    )
  }

  if (!currentSchema) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center text-muted-foreground">
          <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No schema data available</p>
          <p className="text-sm mt-1">Connect to a database to view schema</p>
        </div>
      </div>
    )
  }

  const tables = currentSchema.tables || {}
  const relationships = currentSchema.relationships || []
  const statistics = currentSchema.statistics || {}

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Tables</span>
          </div>
          <p className="text-2xl font-bold mt-2">{statistics.total_tables || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Columns</span>
          </div>
          <p className="text-2xl font-bold mt-2">{statistics.total_columns || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Relations</span>
          </div>
          <p className="text-2xl font-bold mt-2">{relationships.length}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Total Rows</span>
          </div>
          <p className="text-2xl font-bold mt-2">{statistics.total_rows || 0}</p>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(tables).map(([tableName, tableInfo]) => (
          <TableCard
            key={tableName}
            tableName={tableName}
            tableInfo={tableInfo}
            purpose={currentSchema.inferred_purpose?.[tableName]}
          />
        ))}
      </div>

      {/* Relationships */}
      {relationships.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Link className="w-5 h-5" />
            Table Relationships
          </h3>
          <div className="space-y-3">
            {relationships.map((rel, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm bg-background px-2 py-1 rounded">{rel.from_table}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-sm bg-background px-2 py-1 rounded">{rel.to_table}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {rel.type === "foreign_key" ? "Foreign Key" : "Inferred"}
                  {rel.confidence && ` (${Math.round(rel.confidence * 100)}%)`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const TableCard = ({ tableName, tableInfo, purpose }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const columns = tableInfo.columns || []
  const sampleData = tableInfo.sample_data || []
  const rowCount = tableInfo.row_count || 0

  return (
    <div className="bg-card border border-border rounded-lg">
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Table className="w-4 h-4" />
              {tableName}
            </h4>
            <p className="text-sm text-muted-foreground">
              {purpose && `${purpose} • `}
              {columns.length} columns • {rowCount} rows
            </p>
          </div>
          <div className="text-muted-foreground">{isExpanded ? "−" : "+"}</div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Columns */}
          <div>
            <h5 className="font-medium mb-2">Columns</h5>
            <div className="space-y-1">
              {columns.map((col, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{col.name}</span>
                    {col.primary_key && <Key className="w-3 h-3 text-warning" title="Primary Key" />}
                  </div>
                  <div className="text-muted-foreground">
                    {col.type}
                    {!col.nullable && <span className="text-destructive ml-1">*</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Data */}
          {sampleData.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Sample Data</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {columns.slice(0, 4).map((col) => (
                        <th key={col.name} className="text-left py-1 px-2 font-medium">
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.slice(0, 3).map((row, index) => (
                      <tr key={index} className="border-b border-border">
                        {columns.slice(0, 4).map((col) => (
                          <td key={col.name} className="py-1 px-2 truncate max-w-24">
                            {row[col.name] !== null ? String(row[col.name]) : "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SchemaVisualization
