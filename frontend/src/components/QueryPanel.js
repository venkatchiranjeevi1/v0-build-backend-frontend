"use client"

import { useState, useEffect } from "react"
import { Search, Clock, Zap, History } from "lucide-react"
import axios from "axios"

const QueryPanel = ({ connectionId, onResults }) => {
  const [query, setQuery] = useState("")
  const [isQuerying, setIsQuerying] = useState(false)
  const [queryHistory, setQueryHistory] = useState([])
  const [suggestions] = useState([
    "How many employees do we have?",
    "Average salary by department",
    "List employees hired this year",
    "Top 5 highest paid employees",
    "Employees with Python skills",
    "Show me performance reviews",
    "Which departments have the most staff?",
  ])

  useEffect(() => {
    fetchQueryHistory()
  }, [])

  const fetchQueryHistory = async () => {
    try {
      const response = await axios.get("/api/query/history?limit=5")
      setQueryHistory(response.data.queries || [])
    } catch (error) {
      console.error("Failed to fetch query history:", error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsQuerying(true)

    try {
      const response = await axios.post("/api/query", {
        query: query.trim(),
        connection_id: connectionId,
        limit: 100,
      })

      onResults(response.data)
      fetchQueryHistory() // Refresh history
    } catch (error) {
      console.error("Query failed:", error)
      onResults({
        success: false,
        error: error.response?.data?.detail || "Query failed",
      })
    } finally {
      setIsQuerying(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold">Natural Language Query</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Ask a question about your data</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., How many employees work in Engineering?"
            rows={3}
            className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isQuerying || !connectionId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isQuerying ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Submit Query
            </>
          )}
        </button>
      </form>

      {!connectionId && (
        <div className="mt-4 p-3 bg-warning/10 text-warning border border-warning/20 rounded-md">
          <p className="text-sm">Please connect to a database first to enable querying.</p>
        </div>
      )}

      <div className="mt-6">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quick Suggestions
        </h4>
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-3 py-2 bg-muted hover:bg-accent rounded-md text-sm transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {queryHistory.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Queries
          </h4>
          <div className="space-y-2">
            {queryHistory.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(item.query)}
                className="w-full text-left p-3 bg-muted hover:bg-accent rounded-md transition-colors"
              >
                <div className="text-sm truncate">{item.query}</div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.response_time?.toFixed(2)}s
                  </span>
                  {item.cache_hit && <span className="text-success">Cached</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default QueryPanel
