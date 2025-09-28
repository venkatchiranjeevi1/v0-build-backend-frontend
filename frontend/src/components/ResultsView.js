"use client"
import { Table, FileText, Database, Clock, Zap, Download, Search } from "lucide-react"

const ResultsView = ({ results }) => {
  if (!results) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Submit a query to see results here</p>
        </div>
      </div>
    )
  }

  if (!results.success) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center text-destructive">
          <p className="font-medium">Query Failed</p>
          <p className="text-sm mt-1">{results.error}</p>
        </div>
      </div>
    )
  }

  const exportResults = () => {
    const dataStr = JSON.stringify(results.results, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "query-results.json"
    link.click()
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {results.query_type === "sql" ? (
              <Database className="w-5 h-5 text-primary" />
            ) : results.query_type === "document" ? (
              <FileText className="w-5 h-5 text-primary" />
            ) : (
              <Table className="w-5 h-5 text-primary" />
            )}
            <div>
              <h3 className="font-semibold">Query Results</h3>
              <p className="text-sm text-muted-foreground">
                {results.query_type} • {results.total_results} results
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {results.response_time?.toFixed(2)}s
            </div>
            {results.cache_hit && (
              <div className="flex items-center gap-1 text-sm text-success">
                <Zap className="w-4 h-4" />
                Cached
              </div>
            )}
            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-3 py-1 bg-muted hover:bg-accent rounded-md text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {results.sql_query && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Generated SQL:</p>
            <code className="text-sm font-mono">{results.sql_query}</code>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-6">
        {results.query_type === "sql" || results.query_type === "hybrid" ? (
          <SQLResults results={results.results} />
        ) : (
          <DocumentResults results={results.results} />
        )}
      </div>
    </div>
  )
}

const SQLResults = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No results found</p>
      </div>
    )
  }

  const columns = Object.keys(results[0])

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th key={column} className="text-left py-3 px-4 font-medium text-sm">
                {column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, index) => (
            <tr key={index} className="border-b border-border hover:bg-muted/50">
              {columns.map((column) => (
                <td key={column} className="py-3 px-4 text-sm">
                  {row[column] !== null ? String(row[column]) : "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DocumentResults = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No documents found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((doc, index) => (
        <div key={index} className="border border-border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium">{doc.filename}</h4>
              <p className="text-sm text-muted-foreground">Similarity: {(doc.similarity * 100).toFixed(1)}%</p>
            </div>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="text-sm bg-muted p-3 rounded-md">
            <p className="line-clamp-3">{doc.content}</p>
          </div>

          {doc.metadata && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(doc.metadata).map(([key, value]) => (
                <span key={key} className="px-2 py-1 bg-accent text-xs rounded">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default ResultsView
