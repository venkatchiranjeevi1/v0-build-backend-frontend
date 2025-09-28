"use client"

import { useState } from "react"
import { Database, CheckCircle, XCircle, Loader2 } from "lucide-react"
import axios from "axios"

const DatabaseConnector = ({ onConnectionSuccess }) => {
  const [connectionString, setConnectionString] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [schema, setSchema] = useState(null)

  const handleConnect = async () => {
    if (!connectionString.trim()) return

    setIsConnecting(true)
    setConnectionStatus(null)

    try {
      const response = await axios.post("/api/connect-database", {
        connection_string: connectionString,
      })

      if (response.data.success) {
        setConnectionStatus("success")
        setSchema(response.data.schema)
        onConnectionSuccess(response.data.connection_id, response.data.schema)
      } else {
        setConnectionStatus("error")
      }
    } catch (error) {
      setConnectionStatus("error")
      console.error("Connection failed:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const presetConnections = [
    {
      name: "PostgreSQL Local",
      value: "postgresql://user:password@localhost:5432/employee_db",
    },
    {
      name: "MySQL Local",
      value: "mysql://user:password@localhost:3306/employee_db",
    },
    {
      name: "SQLite Demo",
      value: "sqlite:///demo_employee.db",
    },
  ]

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold">Database Connection</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Connection String</label>
          <input
            type="text"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="postgresql://user:password@host:port/database"
            className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quick Connect</label>
          <div className="grid grid-cols-1 gap-2">
            {presetConnections.map((preset, index) => (
              <button
                key={index}
                onClick={() => setConnectionString(preset.value)}
                className="text-left px-3 py-2 bg-muted hover:bg-accent rounded-md text-sm transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={!connectionString.trim() || isConnecting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {isConnecting ? "Connecting..." : "Connect & Analyze"}
        </button>

        {connectionStatus && (
          <div
            className={`flex items-center gap-2 p-3 rounded-md ${
              connectionStatus === "success"
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {connectionStatus === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="text-sm">
              {connectionStatus === "success"
                ? "Database connected successfully!"
                : "Connection failed. Please check your connection string."}
            </span>
          </div>
        )}

        {schema && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <h4 className="font-medium mb-2">Schema Discovered</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Tables: {Object.keys(schema.tables || {}).length}</div>
              <div>Relationships: {(schema.relationships || []).length}</div>
              <div>Total Rows: {schema.statistics?.total_rows || 0}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DatabaseConnector
