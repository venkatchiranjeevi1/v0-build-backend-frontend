"use client"

import { useState } from "react"
import DatabaseConnector from "./components/DatabaseConnector"
import DocumentUploader from "./components/DocumentUploader"
import QueryPanel from "./components/QueryPanel"
import ResultsView from "./components/ResultsView"
import MetricsDashboard from "./components/MetricsDashboard"
import SchemaVisualization from "./components/SchemaVisualization"
import { Database, Search, BarChart3, Network } from "lucide-react"

function App() {
  const [activeTab, setActiveTab] = useState("connect")
  const [connectionId, setConnectionId] = useState(null)
  const [schema, setSchema] = useState(null)
  const [queryResults, setQueryResults] = useState(null)
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    cacheHitRate: 0,
    avgResponseTime: 0,
    activeConnections: 0,
  })

  const tabs = [
    { id: "connect", label: "Connect Data", icon: Database },
    { id: "query", label: "Query Data", icon: Search },
    { id: "schema", label: "Schema View", icon: Network },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
  ]

  const handleConnectionSuccess = (connId, schemaData) => {
    setConnectionId(connId)
    setSchema(schemaData)
    setActiveTab("query")
  }

  const handleQueryResults = (results) => {
    setQueryResults(results)
    // Update metrics
    setMetrics((prev) => ({
      ...prev,
      totalQueries: prev.totalQueries + 1,
      avgResponseTime: results.response_time || 0,
    }))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold">
                NQ
              </div>
              <h1 className="text-xl font-semibold">NLP Query Engine</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">{connectionId ? "Connected" : "Not Connected"}</div>
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "connect" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Connect Your Data</h2>
              <p className="text-muted-foreground">
                Connect to your database and upload documents to get started with natural language queries.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DatabaseConnector onConnectionSuccess={handleConnectionSuccess} />
              <DocumentUploader connectionId={connectionId} />
            </div>
          </div>
        )}

        {activeTab === "query" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Query Your Data</h2>
              <p className="text-muted-foreground">
                Ask questions in natural language about your employee data and documents.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <QueryPanel connectionId={connectionId} onResults={handleQueryResults} />
              </div>
              <div className="lg:col-span-2">
                <ResultsView results={queryResults} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "schema" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Database Schema</h2>
              <p className="text-muted-foreground">Visualize your database structure and relationships.</p>
            </div>

            <SchemaVisualization schema={schema} connectionId={connectionId} />
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Performance Metrics</h2>
              <p className="text-muted-foreground">Monitor query performance, cache efficiency, and system health.</p>
            </div>

            <MetricsDashboard metrics={metrics} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
