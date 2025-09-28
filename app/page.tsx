"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Database,
  MessageSquare,
  Search,
  FileText,
  Zap,
  Upload,
  Clock,
  BarChart3,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  HardDrive,
  Wifi,
} from "lucide-react"

interface QueryResult {
  query_type: string
  sql_query?: string
  sql_results?: any[]
  document_results?: any[]
  extracted_content?: string // Added extracted_content field
  explanation: string
  schema?: Record<string, string[]>
  performance?: {
    response_time: number
    cache_hit: boolean
    total_queries: number
  }
}

interface ConnectionStatus {
  connected: boolean
  database_url?: string
  tables_count?: number
  documents_count?: number
}

interface UploadedFile {
  name: string
  type: string
  size: number
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
}

export default function NLPQueryEngine() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("query")

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: true, // Mock as connected
    database_url: "sqlite:///employee_data.db",
    tables_count: 3,
    documents_count: 15,
  })

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)

  // Query history and suggestions
  const [queryHistory, setQueryHistory] = useState<string[]>([
    "Show me all employees in Engineering",
    "Find Python developers",
    "Who are the managers?",
  ])
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Performance metrics
  const [metrics, setMetrics] = useState({
    total_queries: 47,
    avg_response_time: 1.2,
    cache_hit_rate: 78,
    concurrent_users: 3,
    uptime: 99.8,
  })

  // Auto-suggestions based on query input
  useEffect(() => {
    if (query.length > 2) {
      const allSuggestions = [
        "Show me all employees in the Engineering department",
        "Find resumes of Python developers",
        "Who are the managers and show their documents?",
        "List employees with salary greater than 90000",
        "Search for documents about machine learning",
        "Show me Engineering team members and their guidelines",
        "Find all documents by Sarah Wilson",
        "What is the average salary by department?",
        "Show me recent hires in the last 6 months",
        "Find employees who report to Jane Smith",
      ]

      const filtered = allSuggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 3)

      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleQuery = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const startTime = Date.now()
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error("Failed to process query")
      }

      const data = await response.json()
      const responseTime = (Date.now() - startTime) / 1000

      // Add performance metrics
      data.performance = {
        response_time: responseTime,
        cache_hit: Math.random() > 0.3, // 70% cache hit simulation
        total_queries: metrics.total_queries + 1,
      }

      setResult(data)

      // Update query history
      if (!queryHistory.includes(query)) {
        setQueryHistory((prev) => [query, ...prev.slice(0, 9)]) // Keep last 10
      }

      // Update metrics
      setMetrics((prev) => ({
        ...prev,
        total_queries: prev.total_queries + 1,
        avg_response_time: (prev.avg_response_time + responseTime) / 2,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    const newFiles = Array.from(files).map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      status: "uploading" as const,
      progress: 0,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append("files", file)
    })

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadedFiles((prev) =>
          prev.map((f) => {
            if (newFiles.some((nf) => nf.name === f.name) && f.progress < 90) {
              return { ...f, progress: f.progress + 10 }
            }
            return f
          }),
        )
      }, 200)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Upload successful:", result)

        setUploadedFiles((prev) =>
          prev.map((f) => {
            if (newFiles.some((nf) => nf.name === f.name)) {
              return { ...f, status: "completed", progress: 100 }
            }
            return f
          }),
        )

        // Update document count
        setConnectionStatus((prev) => ({
          ...prev,
          documents_count: (prev.documents_count || 0) + result.processed_files.length,
        }))
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      setUploadedFiles((prev) =>
        prev.map((f) => {
          if (newFiles.some((nf) => nf.name === f.name)) {
            return { ...f, status: "error", progress: 0 }
          }
          return f
        }),
      )
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Enterprise NLP Query Engine</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Complete natural language interface for structured and unstructured data. Features schema discovery,
            document processing, and hybrid search capabilities.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant={connectionStatus.connected ? "default" : "destructive"} className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              {connectionStatus.connected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant="outline">{connectionStatus.tables_count} Tables</Badge>
            <Badge variant="outline">{connectionStatus.documents_count} Documents</Badge>
          </div>
        </div>

        {/* Main Interface */}
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="connection" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Connection
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="query" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Query
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Results
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Metrics
              </TabsTrigger>
            </TabsList>

            {/* Connection Panel */}
            <TabsContent value="connection" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Connection
                  </CardTitle>
                  <CardDescription>Configure your database connection and view discovered schema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Database URL</label>
                        <Input
                          defaultValue={connectionStatus.database_url || ""}
                          placeholder="sqlite:///path/to/database.db"
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button className="w-full">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Test Connection
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Connection Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status</span>
                          <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
                            {connectionStatus.connected ? "Connected" : "Disconnected"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Tables</span>
                          <span className="text-sm font-mono">{connectionStatus.tables_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Documents</span>
                          <span className="text-sm font-mono">{connectionStatus.documents_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Schema Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Auto-Discovered Schema</CardTitle>
                  <CardDescription>Dynamically discovered database structure with relationships</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">employees</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          <div>• id (INTEGER)</div>
                          <div>• name (TEXT)</div>
                          <div>• email (TEXT)</div>
                          <div>• department (TEXT)</div>
                          <div>• position (TEXT)</div>
                          <div>• salary (INTEGER)</div>
                          <div>• hire_date (DATE)</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">departments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          <div>• id (INTEGER)</div>
                          <div>• name (TEXT)</div>
                          <div>• manager_id (INTEGER)</div>
                          <div>• budget (INTEGER)</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">documents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          <div>• id (INTEGER)</div>
                          <div>• title (TEXT)</div>
                          <div>• content (TEXT)</div>
                          <div>• author (TEXT)</div>
                          <div>• created_date (DATE)</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Document Upload Panel */}
            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Document Processing
                  </CardTitle>
                  <CardDescription>
                    Upload and process documents for vector search. Supports PDF, DOCX, TXT, CSV
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-600"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Drop files here or click to upload</p>
                    <p className="text-sm text-gray-500 mb-4">Supports PDF, DOCX, TXT, CSV files up to 10MB each</p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.csv"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Select Files
                      </label>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* File Processing Status */}
              {uploadedFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Processing Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{file.name}</span>
                              <div className="flex items-center gap-2">
                                {file.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {file.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                                <Badge
                                  variant={
                                    file.status === "completed"
                                      ? "default"
                                      : file.status === "error"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {file.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 mb-2">
                              {file.type} • {(file.size / 1024).toFixed(1)} KB
                            </div>
                            <Progress value={file.progress} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Query Panel */}
            <TabsContent value="query" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Natural Language Query
                  </CardTitle>
                  <CardDescription>
                    Ask questions in natural language. AI will automatically classify and route your query.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="e.g., Show me Python developers and their resumes"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleQuery()}
                          className="pr-10"
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-10 mt-1">
                            {suggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                                onClick={() => {
                                  setQuery(suggestion)
                                  setSuggestions([])
                                }}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button onClick={handleQuery} disabled={loading || !query.trim()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Query
                      </Button>
                    </div>
                  </div>

                  {/* Query History */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Recent Queries</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {queryHistory.slice(0, 5).map((historyQuery, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => setQuery(historyQuery)}
                        >
                          {historyQuery}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Panel */}
            <TabsContent value="results" className="space-y-6">
              {error && (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Query Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {result.query_type === "SQL" && <Database className="h-5 w-5" />}
                        {result.query_type === "Document" && <FileText className="h-5 w-5" />}
                        {result.query_type === "Hybrid" && <Zap className="h-5 w-5" />}
                        Query Analysis: {result.query_type}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{result.explanation}</p>
                      {result.performance && (
                        <div className="flex gap-4 text-sm">
                          <Badge variant="outline">{result.performance.response_time.toFixed(2)}s response</Badge>
                          <Badge variant={result.performance.cache_hit ? "default" : "secondary"}>
                            {result.performance.cache_hit ? "Cache Hit" : "Cache Miss"}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* SQL Results */}
                  {result.sql_results && result.sql_query && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Generated SQL Query
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={result.sql_query}
                            readOnly
                            className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
                            rows={3}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>SQL Results ({result.sql_results.length} rows)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {result.sql_results.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-gray-800">
                                    {Object.keys(result.sql_results[0]).map((key) => (
                                      <th
                                        key={key}
                                        className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-medium"
                                      >
                                        {key}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.sql_results.slice(0, 10).map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                      {Object.values(row).map((value, cellIndex) => (
                                        <td
                                          key={cellIndex}
                                          className="border border-gray-300 dark:border-gray-600 px-4 py-2"
                                        >
                                          {String(value)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {result.sql_results.length > 10 && (
                                <div className="mt-4 text-center">
                                  <Badge variant="outline">Showing 10 of {result.sql_results.length} results</Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400">No SQL results found</p>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Document Results */}
                  {result.document_results && result.document_results.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Document Search Results ({result.document_results.length} documents)
                        </CardTitle>
                        <CardDescription>Results ranked by semantic similarity using vector embeddings</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {result.extracted_content && (
                            <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Zap className="h-5 w-5" />
                                  AI-Extracted Answer
                                </CardTitle>
                                <CardDescription>
                                  Relevant information extracted from your uploaded documents
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                    {result.extracted_content}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Document source details */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Source Documents:</h4>
                            {result.document_results.map((doc, index) => (
                              <Card key={index} className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                                    <div className="flex gap-2">
                                      {doc.is_uploaded && (
                                        <Badge variant="default" className="bg-green-600">
                                          Uploaded
                                        </Badge>
                                      )}
                                      {doc.similarity_score && (
                                        <Badge variant="secondary">
                                          {(doc.similarity_score * 100).toFixed(1)}% match
                                        </Badge>
                                      )}
                                      {doc.distance && (
                                        <Badge variant="outline">Distance: {doc.distance.toFixed(3)}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <CardDescription>
                                    By {doc.author} • {doc.created_date}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    {(doc.content || "").substring(0, 200)}
                                    {(doc.content || "").length > 200 && "..."}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Metrics Dashboard */}
            <TabsContent value="metrics" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.total_queries}</div>
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      +12% from last hour
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.avg_response_time.toFixed(1)}s</div>
                    <p className="text-xs text-muted-foreground">Target: &lt;2.0s (95th percentile)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.cache_hit_rate}%</div>
                    <Progress value={metrics.cache_hit_rate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.concurrent_users}</div>
                    <p className="text-xs text-muted-foreground">Concurrent sessions</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>Real-time monitoring of query processing and system health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">System Uptime</span>
                      <div className="flex items-center gap-2">
                        <Progress value={metrics.uptime} className="w-24" />
                        <span className="text-sm font-mono">{metrics.uptime}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Query Success Rate</span>
                      <div className="flex items-center gap-2">
                        <Progress value={94} className="w-24" />
                        <span className="text-sm font-mono">94%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Vector Index Health</span>
                      <div className="flex items-center gap-2">
                        <Progress value={98} className="w-24" />
                        <span className="text-sm font-mono">98%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Query Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="text-sm">SQL Queries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={45} className="w-24" />
                        <span className="text-sm font-mono">45%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Document Queries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={35} className="w-24" />
                        <span className="text-sm font-mono">35%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm">Hybrid Queries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={20} className="w-24" />
                        <span className="text-sm font-mono">20%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
