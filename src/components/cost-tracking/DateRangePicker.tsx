'use client'

import { useState } from 'react'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
}

type Preset = '7d' | '30d' | '90d' | 'All' | null

function toInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function presetRange(preset: '7d' | '30d' | '90d' | 'All'): [Date, Date] {
  const end = endOfDay(new Date())
  if (preset === 'All') {
    const start = new Date(0)
    return [start, end]
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const start = startOfDay(new Date())
  start.setDate(start.getDate() - (days - 1))
  return [start, end]
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<Preset>(null)

  const presets: ('7d' | '30d' | '90d' | 'All')[] = ['7d', '30d', '90d', 'All']

  function handlePreset(preset: '7d' | '30d' | '90d' | 'All') {
    setActivePreset(preset)
    const [start, end] = presetRange(preset)
    onChange(start, end)
  }

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) return
    setActivePreset(null)
    onChange(startOfDay(new Date(val + 'T00:00:00')), endDate)
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) return
    setActivePreset(null)
    onChange(startDate, endOfDay(new Date(val + 'T00:00:00')))
  }

  const baseInput =
    'bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-1 text-xs font-mono text-[#e2e8f0] [color-scheme:dark] outline-none focus:border-blue-500/50'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {presets.map((preset) => {
        const isActive = activePreset === preset
        return (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={
              isActive
                ? 'px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'px-3 py-1 rounded-lg text-xs font-medium text-[#475569] border border-[#1e293b] hover:text-[#94a3b8]'
            }
          >
            {preset}
          </button>
        )
      })}

      <div className="w-px h-4 bg-[#1e293b]" />

      <input
        type="date"
        value={toInputValue(startDate)}
        onChange={handleStartChange}
        className={baseInput}
      />
      <input
        type="date"
        value={toInputValue(endDate)}
        onChange={handleEndChange}
        className={baseInput}
      />
    </div>
  )
}
