'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { generateSeedData } from '@/lib/cost-tracking/test-utils/seed'
import {
  addUsageRecords,
  getDailyCostSummary,
  getModelCostBreakdown,
  getTotalCost,
  getRecordCount,
  clearAllData,
  exportAsJSON,
  getUsageByDateRange,
} from '@/lib/cost-tracking/store'
import { db } from '@/lib/cost-tracking/db'
import { parseClaudeCodeJSONL } from '@/lib/cost-tracking/importers/claude-code'
import DateRangePicker from '@/components/cost-tracking/DateRangePicker'
import CostOverview from '@/components/cost-tracking/CostOverview'
import CostTimeline from '@/components/cost-tracking/CostTimeline'
import ModelBreakdown from '@/components/cost-tracking/ModelBreakdown'
import RequestLog from '@/components/cost-tracking/RequestLog'
import InsightsPanel from '@/components/cost-tracking/InsightsPanel'
import EmptyState from '@/components/cost-tracking/EmptyState'
import ImportStaging from '@/components/cost-tracking/ImportStaging'
import { detectAllAnomalies } from '@/lib/cost-tracking/analytics/anomalies'
import { forecastCosts } from '@/lib/cost-tracking/analytics/forecast'
import { UsageRecord } from '@/lib/cost-tracking/types'

// Import db to ensure IndexedDB is initialized before store functions are called.
// Dexie opens the database connection on module load; without this import the
// store layer would fail because the database hasn't been initialised yet.
void db

interface TimelinePoint {
  date: string
  cost: number
  anthropic_cost: number
  openai_cost: number
  deepseek_cost: number
}

interface TaskRow {
  task_id: string
  count: number
  total_cost: number
  avg_cost: number
  primary_model: string
}

function defaultDateRange(): [Date, Date] {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  return [start, end]
}

export default function CostsView() {
  const [dateRange, setDateRange] = useState<[Date, Date]>(defaultDateRange)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [dailyCosts, setDailyCosts] = useState<Array<{ date: string; cost: number; count: number }>>([])
  const [modelBreakdown, setModelBreakdown] = useState<
    Array<{ model: string; cost: number; count: number; percentage: number }>
  >([])
  const [todayCost, setTodayCost] = useState(0)
  const [weekCost, setWeekCost] = useState(0)
  const [monthCost, setMonthCost] = useState(0)
  const [recordCount, setRecordCount] = useState(0)
  const [importToast, setImportToast] = useState<string | null>(null)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
  const [showDashboard, setShowDashboard] = useState(false) // once true, never goes back to false

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const [start, end] = dateRange
      const [recs, mb, count, daily] = await Promise.all([
        getUsageByDateRange(start, end),
        getModelCostBreakdown(dateRange),
        getRecordCount(),
        getDailyCostSummary(dateRange),
      ])
      setRecords(recs)
      setModelBreakdown(mb)
      setRecordCount(count)
      setDailyCosts(daily)
      if (count > 0) setShowDashboard(true)

      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)

      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)

      const monthStart = new Date(now)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const [today, week, month] = await Promise.all([
        getTotalCost([todayStart, todayEnd]),
        getTotalCost([weekStart, todayEnd]),
        getTotalCost([monthStart, todayEnd]),
      ])
      setTodayCost(today)
      setWeekCost(week)
      setMonthCost(month)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleLoadDemoData() {
    setLoading(true)
    try {
      const seedRecords = generateSeedData()
      await addUsageRecords(seedRecords)
      await loadData()
    } finally {
      setLoading(false)
    }
  }

  async function handleImportFiles(files: File[]) {
    setLoading(true)
    try {
      let totalImported = 0
      let totalSkipped = 0
      for (const file of files) {
        const content = await file.text()
        const name = file.name.toLowerCase()
        let parsed: (Omit<UsageRecord, 'id' | 'cost_usd'> & { cost_usd?: number })[] = []
        if (name.endsWith('.csv')) {
          const { parseCSV } = await import('@/lib/cost-tracking/importers/csv')
          parsed = parseCSV(content)
        } else if (name.endsWith('.json') && !name.includes('.jsonl')) {
          const { parseJSON } = await import('@/lib/cost-tracking/importers/json')
          parsed = parseJSON(content)
        } else {
          // JSONL or unknown extension — try all JSONL parsers
          // Try Claude Code format first, then OpenClaw session format
          const claudeParsed = parseClaudeCodeJSONL(content)
          if (claudeParsed.length > 0) {
            parsed = claudeParsed
          } else {
            const { parseOpenClawSessions } = await import('@/lib/cost-tracking/importers/openclaw')
            parsed = parseOpenClawSessions(content)
          }
        }
        if (parsed.length > 0) {
          const result = await addUsageRecords(parsed)
          totalImported += result.added
          totalSkipped += result.skipped
        }
      }
      await loadData()
      const skipMsg = totalSkipped > 0 ? ` ${totalSkipped} duplicates excluded.` : ''
      setImportToast(`Imported ${totalImported} records.${skipMsg}`)
      setTimeout(() => setImportToast(null), 5000)
    } catch (err) {
      setImportToast(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setTimeout(() => setImportToast(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportJSON() {
    const data = await exportAsJSON()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'usage-records.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleClearAll() {
    setClearModalOpen(true)
  }

  async function confirmClear() {
    setClearModalOpen(false)
    await clearAllData()
    setShowDashboard(false)
    await loadData()
  }

  // Normalize model names to match the grouped display names from store.ts
  const normalizeModel = (model: string): string => {
    if (model.startsWith('claude-opus-4-6')) return 'claude-opus-4-6'
    if (model.startsWith('claude-opus-4-5')) return 'claude-opus-4-5'
    if (model.startsWith('claude-sonnet-4-6')) return 'claude-sonnet-4-6'
    if (model.startsWith('claude-sonnet-4-5') || model === 'claude-sonnet-4-20250514') return 'claude-sonnet-4-5'
    if (model.startsWith('claude-haiku-4-5')) return 'claude-haiku-4-5'
    if (model.startsWith('claude-haiku-3-5')) return 'claude-haiku-3-5'
    return model
  }

  // Filter records by selected models
  const filteredRecords = useMemo(() => {
    if (selectedModels.size === 0) return records
    return records.filter(r => selectedModels.has(normalizeModel(r.model)))
  }, [records, selectedModels])

  // Filtered model breakdown for charts
  const filteredModelBreakdown = useMemo(() => {
    if (selectedModels.size === 0) return modelBreakdown
    return modelBreakdown.filter(m => selectedModels.has(m.model))
  }, [modelBreakdown, selectedModels])

  // Compute timeline data from records for accurate provider split
  const timelineData = useMemo<TimelinePoint[]>(() => {
    const byDate: Record<string, TimelinePoint> = {}
    for (const r of filteredRecords) {
      const date = r.timestamp.slice(0, 10)
      if (!byDate[date]) byDate[date] = { date, cost: 0, anthropic_cost: 0, openai_cost: 0, deepseek_cost: 0 }
      byDate[date].cost += r.cost_usd
      if (r.provider === 'anthropic') {
        byDate[date].anthropic_cost += r.cost_usd
      } else if (r.provider === 'deepseek') {
        byDate[date].deepseek_cost += r.cost_usd
      } else {
        byDate[date].openai_cost += r.cost_usd
      }
    }
    // Fill in any dates from dailyCosts that have no records in current range
    for (const d of dailyCosts) {
      if (!byDate[d.date]) {
        byDate[d.date] = { date: d.date, cost: d.cost, anthropic_cost: 0, openai_cost: 0, deepseek_cost: 0 }
      }
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredRecords, dailyCosts])

  // Compute task breakdown from records
  const taskBreakdown = useMemo<TaskRow[]>(() => {
    const acc: Record<string, { count: number; total_cost: number; models: string[] }> = {}
    for (const r of records) {
      if (!r.task_id) continue
      if (!acc[r.task_id]) acc[r.task_id] = { count: 0, total_cost: 0, models: [] }
      acc[r.task_id].count++
      acc[r.task_id].total_cost += r.cost_usd
      acc[r.task_id].models.push(r.model)
    }
    return Object.entries(acc).map(([task_id, { count, total_cost, models }]) => {
      const freq: Record<string, number> = {}
      for (const m of models) freq[m] = (freq[m] ?? 0) + 1
      const primary_model = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      return { task_id, count, total_cost, avg_cost: total_cost / count, primary_model }
    })
  }, [records])

  // Analytics: anomaly detection + forecasting
  const anomalies = useMemo(() => {
    if (timelineData.length === 0) return []
    return detectAllAnomalies(timelineData.map(d => ({ date: d.date, cost: d.cost })))
  }, [timelineData])

  const forecast = useMemo(() => {
    if (timelineData.length === 0) return null
    return forecastCosts(timelineData.map(d => ({ date: d.date, cost: d.cost })))
  }, [timelineData])

  const quickStats = useMemo(() => {
    if (records.length === 0) {
      return { mostExpensiveModel: '—', avgCostPerRequest: 0, busiestDay: '—', cacheHitRate: 0 }
    }
    // Most expensive model
    const modelCosts: Record<string, number> = {}
    for (const r of records) {
      modelCosts[r.model] = (modelCosts[r.model] ?? 0) + r.cost_usd
    }
    const mostExpensiveModel = Object.entries(modelCosts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    // Avg cost per request
    const totalCost = records.reduce((s, r) => s + r.cost_usd, 0)
    const avgCostPerRequest = totalCost / records.length

    // Busiest day of week
    const dayCounts: Record<string, number> = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    for (const r of records) {
      const day = dayNames[new Date(r.timestamp).getUTCDay()]
      dayCounts[day] = (dayCounts[day] ?? 0) + 1
    }
    const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    // Cache hit rate — input_tokens already includes cached tokens, don't double-count
    const totalInput = records.reduce((s, r) => s + r.input_tokens, 0)
    const totalCached = records.reduce((s, r) => s + r.cached_input_tokens, 0)
    const cacheHitRate = totalInput > 0 ? totalCached / totalInput : 0

    return { mostExpensiveModel, avgCostPerRequest, busiestDay, cacheHitRate }
  }, [records])

  return (
    <div className="min-h-full overflow-x-hidden">
      {/* Page header */}
      <div className="px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#f1f5f9]">Cost Tracking</h2>
            <p className="text-sm text-[#7a8a9b] mt-1">
              All data stored locally in your browser
              {importToast && (
                <span className="ml-3 text-[#34d399] animate-pulse">
                  {importToast}
                  <button onClick={() => setImportToast(null)} className="ml-2 text-[#7a8a9b] hover:text-[#b0bec9]">✕</button>
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <ImportStaging onImport={handleImportFiles} loading={loading} />
            {/* Export */}
            <button onClick={handleExportJSON} title="Export JSON" className="border border-[#506880] bg-[#111827] p-2 rounded-lg text-[#b0bec9] hover:text-[#f1f5f9] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
            {/* Clear */}
            <button onClick={handleClearAll} title="Clear all data" className="border border-[#506880] bg-[#111827] p-2 rounded-lg text-[#f87171]/60 hover:text-[#f87171] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* DateRangePicker + Model Filter */}
      <div className="px-4 sm:px-6 mb-6 space-y-3">
        <DateRangePicker
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          onChange={(start, end) => setDateRange([start, end])}
        />
        {/* Model filter chips */}
        {modelBreakdown.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#7a8a9b] mr-1">Models:</span>
            <button
              onClick={() => setSelectedModels(new Set())}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                selectedModels.size === 0
                  ? 'bg-[#7db8fc]/20 text-[#7db8fc] border border-[#7db8fc]/30'
                  : 'text-[#7a8a9b] border border-[#506880] hover:text-[#b0bec9]'
              }`}
            >
              All
            </button>
            {modelBreakdown.map((m) => (
              <button
                key={m.model}
                onClick={() => {
                  const next = new Set(selectedModels)
                  if (next.has(m.model)) next.delete(m.model)
                  else next.add(m.model)
                  setSelectedModels(next)
                }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedModels.has(m.model)
                    ? 'bg-[#7db8fc]/20 text-[#7db8fc] border border-[#7db8fc]/30'
                    : 'text-[#7a8a9b] border border-[#506880] hover:text-[#b0bec9]'
                }`}
              >
                {m.model}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 space-y-6 pb-12">
        {!showDashboard ? (
          <EmptyState onLoadDemo={handleLoadDemoData} demoLoading={loading} />
        ) : (
          <>
            <CostOverview
              todayCost={todayCost}
              weekCost={weekCost}
              monthCost={monthCost}
              recordCount={recordCount}
            />

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <CostTimeline data={timelineData} />
              </div>
              <div>
                <ModelBreakdown data={filteredModelBreakdown} />
              </div>
            </div>

            {/* TaskTable hidden — will return as tagged tasks feature */}

            <InsightsPanel anomalies={anomalies} forecast={forecast} quickStats={quickStats} />

            <RequestLog records={filteredRecords} />
          </>
        )}
      </div>

      {/* Clear data confirmation modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl border border-[#506880] bg-[#111827] p-6 max-w-sm mx-4 shadow-2xl">
            <p className="text-sm font-medium text-[#f1f5f9]">Clear all data?</p>
            <p className="text-xs text-[#7a8a9b] mt-2">
              This will delete all {recordCount.toLocaleString()} records from your browser. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setClearModalOpen(false)} className="px-4 py-1.5 rounded-lg text-sm text-[#b0bec9] border border-[#506880] hover:text-[#f1f5f9] transition-colors">
                Cancel
              </button>
              <button onClick={confirmClear} className="px-4 py-1.5 rounded-lg text-sm text-[#f87171] border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
