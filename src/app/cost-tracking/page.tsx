'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
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
import { parseOpenClawSessions } from '@/lib/cost-tracking/importers/openclaw'
import { lookupPricing } from '@/lib/cost-tracking/pricing'
import DateRangePicker from '@/components/cost-tracking/DateRangePicker'
import CostOverview from '@/components/cost-tracking/CostOverview'
import CostTimeline from '@/components/cost-tracking/CostTimeline'
import ModelBreakdown from '@/components/cost-tracking/ModelBreakdown'
// import TaskTable from '@/components/cost-tracking/TaskTable' // hidden for now
import RequestLog from '@/components/cost-tracking/RequestLog'
// import ImportPanel from '@/components/cost-tracking/ImportPanel' // moved to Import dropdown
// import ReconciliationBadge from '@/components/cost-tracking/ReconciliationBadge' // moved to settings
import InsightsPanel from '@/components/cost-tracking/InsightsPanel'
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

export default function CostTrackingPage() {
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
  const [projectedMonthly, setProjectedMonthly] = useState(0)
  const [recordCount, setRecordCount] = useState(0)
  const [importToast, setImportToast] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
  const importRef = useRef<HTMLDivElement>(null)

  // Close import dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportOpen(false)
      }
    }
    if (importOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [importOpen])

  const loadData = useCallback(async () => {
    setLoading(true)
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

      const dayOfMonth = now.getDate()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      setProjectedMonthly(dayOfMonth > 0 ? (month / dayOfMonth) * daysInMonth : 0)
    } finally {
      setLoading(false)
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

  async function handleLoadAdminAPI() {
    setLoading(true)
    try {
      const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET
      const res = await fetch('/api/admin/anthropic/history?start=2026-02-01&end=2026-03-07', {
        headers: { 'Authorization': `Bearer ${secret}` },
      })
      const data = await res.json()
      if (data.error) {
        setImportToast(`Admin API error: ${data.error}`)
        return
      }

      const records: Array<Omit<typeof import('@/lib/cost-tracking/types').UsageRecord, never>> = []

      // Pricing per million tokens (matching Anthropic's published rates)
      const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
        'claude-opus-4-6': { input: 5, output: 25, cacheRead: 0.50, cacheWrite: 6.25 },
        'claude-opus-4-5-20251101': { input: 5, output: 25, cacheRead: 0.50, cacheWrite: 6.25 },
        'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
        'claude-sonnet-4-5-20250929': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
        'claude-sonnet-4-20250514': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
        'claude-haiku-4-5-20251001': { input: 0.80, output: 4, cacheRead: 0.08, cacheWrite: 1.00 },
      }

      for (const day of data.days) {
        for (const r of day.results) {
          const model = r.model as string
          const pricing = PRICING[model] || { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 }

          const uncachedInput = (r.uncached_input_tokens as number) || 0
          const cacheRead = (r.cache_read_input_tokens as number) || 0
          const cacheWrite5m = (r.cache_creation?.ephemeral_5m_input_tokens as number) || 0
          const cacheWrite1h = (r.cache_creation?.ephemeral_1h_input_tokens as number) || 0
          const cacheWriteTotal = cacheWrite5m + cacheWrite1h
          const outputTokens = (r.output_tokens as number) || 0

          const cost_usd =
            (uncachedInput / 1_000_000) * pricing.input +
            (outputTokens / 1_000_000) * pricing.output +
            (cacheRead / 1_000_000) * pricing.cacheRead +
            (cacheWriteTotal / 1_000_000) * pricing.cacheWrite

          records.push({
            timestamp: day.date + 'T12:00:00.000Z',
            provider: 'anthropic' as const,
            model,
            input_tokens: uncachedInput + cacheRead,
            output_tokens: outputTokens,
            cached_input_tokens: cacheRead,
            cache_creation_tokens: cacheWriteTotal,
            is_batch: false,
            request_id: `admin-${day.date}-${model}`,
            cost_usd,
          })
        }
      }

      await addUsageRecords(records)
      await loadData()
      setImportToast(`Imported ${records.length} daily records from Anthropic Admin API (${data.total_days} days)`)
    } catch (err) {
      setImportToast(`Admin API failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadLocalLogs() {
    setLoading(true)
    try {
      const res = await fetch('/api/import-local')
      const data = await res.json()
      if (data.error) {
        setImportToast(`Error: ${data.error}`)
        return
      }
      // Parse Claude Code logs (calculate cost from tokens)
      const claudeParsed = parseClaudeCodeJSONL(data.claude.content)
      const claudeRecords = claudeParsed
        .filter(r => r.model)
        .map(r => {
          const pricing = lookupPricing(r.model)
          if (!pricing) return { ...r, cost_usd: 0 }
          const uncachedInput = Math.max(0, r.input_tokens - r.cached_input_tokens)
          const cost_usd =
            (uncachedInput / 1_000_000) * pricing.input_per_mtok +
            (r.output_tokens / 1_000_000) * pricing.output_per_mtok +
            (r.cached_input_tokens / 1_000_000) * pricing.cache_read_per_mtok +
            (r.cache_creation_tokens / 1_000_000) * pricing.cache_write_per_mtok
          return { ...r, cost_usd }
        })

      // Parse OpenClaw sessions (cost already calculated)
      const oclawRecords = parseOpenClawSessions(data.openclaw.content)

      const allRecords = [...claudeRecords, ...oclawRecords]
      await addUsageRecords(allRecords)
      await loadData()
      setImportToast(`Imported ${claudeRecords.length} Claude Code + ${oclawRecords.length} OpenClaw records (${data.claude.fileCount + data.openclaw.fileCount} files)`)
    } catch (err) {
      setImportToast(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
    if (!window.confirm('Clear all usage data? This cannot be undone.')) return
    await clearAllData()
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
    <main className="min-h-screen bg-[#0a0e17]">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-[#1e293b]/80 bg-[#0a0e17]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <span className="font-bold text-[#e2e8f0]">Driftwatch</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors">
              Home
            </Link>
            <Link href="/map" className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors">
              Map
            </Link>
            <Link
              href="/map"
              className="px-4 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 transition-all font-medium text-sm"
            >
              Scan Yours →
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        {/* Page header */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#e2e8f0]">Cost Tracking</h1>
              <p className="text-sm text-[#475569] mt-1">
                All data stored locally in your browser
                {importToast && (
                  <span className="ml-3 text-green-400 animate-pulse">{importToast}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {/* Import dropdown */}
              <div className="relative" ref={importRef}>
                <button
                  onClick={() => setImportOpen(!importOpen)}
                  disabled={loading}
                  className="border border-blue-500/30 bg-blue-500/10 px-4 py-2 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <span>Import</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {importOpen && (
                  <div className="absolute right-0 mt-1 w-56 rounded-lg border border-[#1e293b] bg-[#111827] shadow-xl z-50">
                    <button onClick={() => { handleLoadAdminAPI(); setImportOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-[#e2e8f0] hover:bg-[#1e293b]/50 rounded-t-lg">
                      🔑 Anthropic Admin API
                    </button>
                    <button onClick={() => { setImportOpen(false); /* TODO: OpenAI Admin */ setImportToast('OpenAI Admin API coming soon'); setTimeout(() => setImportToast(null), 3000); }} className="w-full text-left px-4 py-2.5 text-sm text-[#e2e8f0] hover:bg-[#1e293b]/50">
                      🔑 OpenAI Admin API
                    </button>
                    <div className="border-t border-[#1e293b]" />
                    <button onClick={() => { handleLoadLocalLogs(); setImportOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-[#e2e8f0] hover:bg-[#1e293b]/50">
                      📂 Local Agent Logs
                    </button>
                    <div className="border-t border-[#1e293b]" />
                    <button onClick={() => { document.getElementById('file-upload-input')?.click(); setImportOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-[#e2e8f0] hover:bg-[#1e293b]/50">
                      📄 Upload Files (CSV, JSON, JSONL)
                    </button>
                    <div className="border-t border-[#1e293b]" />
                    <button onClick={() => { handleLoadDemoData(); setImportOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-[#475569] hover:bg-[#1e293b]/50 rounded-b-lg">
                      Demo Data
                    </button>
                  </div>
                )}
              </div>
              {/* Export */}
              <button onClick={handleExportJSON} title="Export JSON" className="border border-[#1e293b] bg-[#111827] p-2 rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
              {/* Clear */}
              <button onClick={handleClearAll} title="Clear all data" className="border border-[#1e293b] bg-[#111827] p-2 rounded-lg text-red-400/60 hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              {/* Settings */}
              <Link href="/settings" title="Settings" className="border border-[#1e293b] bg-[#111827] p-2 rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </Link>
            </div>
          </div>
        </div>

        {/* DateRangePicker + Model Filter */}
        <div className="max-w-7xl mx-auto px-6 mb-6 space-y-3">
          <DateRangePicker
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onChange={(start, end) => setDateRange([start, end])}
          />
          {/* Model filter chips */}
          {modelBreakdown.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#475569] mr-1">Models:</span>
              <button
                onClick={() => setSelectedModels(new Set())}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedModels.size === 0
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-[#475569] border border-[#1e293b] hover:text-[#94a3b8]'
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
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-[#475569] border border-[#1e293b] hover:text-[#94a3b8]'
                  }`}
                >
                  {m.model}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 space-y-6 pb-12">
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

          {/* Hidden file input for Upload Files option in Import dropdown */}
          <input
            id="file-upload-input"
            type="file"
            multiple
            accept=".csv,.json,.jsonl"
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files
              if (!files?.length) return
              setLoading(true)
              try {
                let totalImported = 0
                for (const file of Array.from(files)) {
                  const content = await file.text()
                  const name = file.name.toLowerCase()
                  let parsed: Omit<UsageRecord, 'id' | 'cost_usd'>[] = []
                  if (name.endsWith('.jsonl')) {
                    parsed = parseClaudeCodeJSONL(content)
                  } else if (name.endsWith('.json')) {
                    const { parseJSON } = await import('@/lib/cost-tracking/importers/json')
                    parsed = parseJSON(content)
                  } else if (name.endsWith('.csv')) {
                    const { parseCSV } = await import('@/lib/cost-tracking/importers/csv')
                    parsed = parseCSV(content)
                  }
                  if (parsed.length > 0) {
                    await addUsageRecords(parsed)
                    totalImported += parsed.length
                  }
                }
                await loadData()
                setImportToast(`Imported ${totalImported} records from ${files.length} file${files.length === 1 ? '' : 's'}`)
                setTimeout(() => setImportToast(null), 4000)
              } catch (err) {
                setImportToast(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                setTimeout(() => setImportToast(null), 4000)
              } finally {
                setLoading(false)
                e.target.value = ''
              }
            }}
          />
        </div>
      </div>
    </main>
  )
}
