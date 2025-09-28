"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Activity, Clock, Zap, Database, TrendingUp } from "lucide-react"
import axios from "axios"

const MetricsDashboard = ({ metrics }) => {
  const [performanceData, setPerformanceData] = useState([])
  const [cacheStats, setCacheStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const [historyResponse] = await Promise.all([axios.get("/api/query/history?limit=20")])

      if (historyResponse.data) {
        const queries = historyResponse.data.queries || []

        // Process performance data
        const perfData = queries.map((query, index) => ({
          query: index + 1,
          responseTime: query.response_time || 0,
          cacheHit: query.cache_hit ? 1 : 0,
        }))

        setPerformanceData(perfData)
        setCacheStats(historyResponse.data.cache_stats)
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    )
  }

  const cacheHitRate = cacheStats?.cache_hit_rate || 0
  const avgResponseTime =
    performanceData.length > 0
      ? performanceData.reduce((sum, item) => sum + item.responseTime, 0) / performanceData.length
      : 0

  const cacheData = [
    { name: "Cache Hits", value: Math.round(cacheHitRate * 100), color: "#10b981" },
    { name: "Cache Misses", value: Math.round((1 - cacheHitRate) * 100), color: "#6b7280" },
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          title="Total Queries"
          value={cacheStats?.total_queries || 0}
          trend="+12%"
          trendUp={true}
        />

        <MetricCard
          icon={Clock}
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(2)}s`}
          trend="-5%"
          trendUp={false}
        />

        <MetricCard
          icon={Zap}
          title="Cache Hit Rate"
          value={`${Math.round(cacheHitRate * 100)}%`}
          trend="+8%"
          trendUp={true}
        />

        <MetricCard icon={Database} title="Active Connections" value="1" trend="0%" trendUp={null} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Query Response Times
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="query" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cache Performance */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Cache Performance
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cacheData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {cacheData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {cacheData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Query Types Distribution */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          Query Types Distribution
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { type: "SQL", count: 15, color: "#3b82f6" },
                { type: "Document", count: 8, color: "#10b981" },
                { type: "Hybrid", count: 5, color: "#f59e0b" },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HealthIndicator label="Database Connection" status="healthy" value="Connected" />
          <HealthIndicator label="Document Processing" status="healthy" value="Operational" />
          <HealthIndicator label="Query Engine" status="healthy" value="Running" />
        </div>
      </div>
    </div>
  )
}

const MetricCard = ({ icon: Icon, title, value, trend, trendUp }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs ${
              trendUp === true ? "text-success" : trendUp === false ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {trendUp !== null && <TrendingUp className={`w-3 h-3 ${trendUp === false ? "rotate-180" : ""}`} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  )
}

const HealthIndicator = ({ label, status, value }) => {
  const statusColors = {
    healthy: "text-success",
    warning: "text-warning",
    error: "text-destructive",
  }

  const statusDots = {
    healthy: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-sm ${statusColors[status]}`}>{value}</p>
      </div>
      <div className={`w-3 h-3 rounded-full ${statusDots[status]} animate-pulse`} />
    </div>
  )
}

export default MetricsDashboard
