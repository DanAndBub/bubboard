'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import DateRangePicker from '@/components/cost-tracking/DateRangePicker'
import CostOverview from '@/components/cost-tracking/CostOverview'
import CostTimeline from '@/components/cost-tracking/CostTimeline'
import ModelBreakdown from '@/components/cost-tracking/ModelBreakdown'
import TaskTable from '@/components/cost-tracking/TaskTable'
import RequestLog from '@/components/cost-tracking/RequestLog'
import ImportPanel from '@/components/cost-tracking/ImportPanel'
import ReconciliationBadge from '@/components/cost-tracking/ReconciliationBadge'
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

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [start, end] = dateRange
      const rangeMs = end.getTime() - start.getTime()
      const rangeDays = Math.ceil(rangeMs / (1000 * 60 * 60 * 24)) + 1

      const [recs, mb, count, daily] = await Promise.all([
        getUsageByDateRange(start, end),
        getModelCostBreakdown(dateRange),
        getRecordCount(),
        getDailyCostSummary(rangeDays),
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

  // Compute timeline data from records for accurate provider split
  const timelineData = useMemo<TimelinePoint[]>(() => {
    const byDate: Record<string, TimelinePoint> = {}
    for (const r of records) {
      const date = r.timestamp.slice(0, 10)
      if (!byDate[date]) byDate[date] = { date, cost: 0, anthropic_cost: 0, openai_cost: 0 }
      byDate[date].cost += r.cost_usd
      if (r.provider === 'anthropic') {
        byDate[date].anthropic_cost += r.cost_usd
      } else {
        byDate[date].openai_cost += r.cost_usd
      }
    }
    // Fill in any dates from dailyCosts that have no records in current range
    for (const d of dailyCosts) {
      if (!byDate[d.date]) {
        byDate[d.date] = { date: d.date, cost: d.cost, anthropic_cost: 0, openai_cost: 0 }
      }
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [records, dailyCosts])

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
            <div className="flex gap-3 items-center">
              <button
                onClick={handleLoadDemoData}
                disabled={loading}
                className="border border-[#1e293b] bg-[#111827] px-4 py-2 rounded-lg text-sm text-[#94a3b8] hover:text-[#e2e8f0] disabled:opacity-50 transition-colors"
              >
                Load Demo Data
              </button>
              <button
                onClick={handleExportJSON}
                className="border border-[#1e293b] bg-[#111827] px-4 py-2 rounded-lg text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={handleClearAll}
                className="border border-[#1e293b] bg-[#111827] px-4 py-2 rounded-lg text-sm text-red-400/60 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
              <ReconciliationBadge status="no_admin_data" />
            </div>
          </div>
        </div>

        {/* DateRangePicker */}
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <DateRangePicker
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onChange={(start, end) => setDateRange([start, end])}
          />
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 space-y-6 pb-12">
          <CostOverview
            todayCost={todayCost}
            weekCost={weekCost}
            monthCost={monthCost}
            projectedMonthly={projectedMonthly}
            recordCount={recordCount}
          />

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CostTimeline data={timelineData} />
            </div>
            <div className="lg:col-span-1">
              <ModelBreakdown data={modelBreakdown} />
            </div>
          </div>

          <TaskTable data={taskBreakdown} />

          <RequestLog records={records} />

          <ImportPanel onImportComplete={(count) => {
            loadData()
            setImportToast(`Imported ${count} record${count === 1 ? '' : 's'}`)
            setTimeout(() => setImportToast(null), 4000)
          }} />
        </div>
      </div>
    </main>
  )
}
