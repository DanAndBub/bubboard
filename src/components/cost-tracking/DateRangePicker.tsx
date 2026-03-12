'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
}

type Preset = '7d' | '30d' | '90d' | 'All' | null

const MIN_DATE = '2026-01-01'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

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

function isValidDateStr(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false
  const [y, m, d] = val.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
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
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)

  const lastStartStr = useRef(toInputValue(startDate))
  const lastEndStr = useRef(toInputValue(endDate))

  // Sync inputs when props change from outside (presets, parent state)
  useEffect(() => {
    const val = toInputValue(startDate)
    if (val !== lastStartStr.current && startRef.current) {
      startRef.current.value = val
      lastStartStr.current = val
    }
  }, [startDate])

  useEffect(() => {
    const val = toInputValue(endDate)
    if (val !== lastEndStr.current && endRef.current) {
      endRef.current.value = val
      lastEndStr.current = val
    }
  }, [endDate])

  const presets: ('7d' | '30d' | '90d' | 'All')[] = ['7d', '30d', '90d', 'All']

  function handlePreset(preset: '7d' | '30d' | '90d' | 'All') {
    setActivePreset(preset)
    const [start, end] = presetRange(preset)
    onChange(start, end)
  }

  const commitStart = useCallback(() => {
    const val = startRef.current?.value ?? ''
    if (!val || !isValidDateStr(val)) {
      if (startRef.current) startRef.current.value = lastStartStr.current
      return
    }
    const today = todayStr()
    const endVal = toInputValue(endDate)
    let clamped = val
    if (clamped < MIN_DATE) clamped = MIN_DATE
    if (clamped > endVal) clamped = endVal
    if (clamped > today) clamped = today
    if (clamped !== val && startRef.current) startRef.current.value = clamped
    lastStartStr.current = clamped
    setActivePreset(null)
    onChange(startOfDay(new Date(clamped + 'T00:00:00')), endDate)
  }, [endDate, onChange])

  const commitEnd = useCallback(() => {
    const val = endRef.current?.value ?? ''
    if (!val || !isValidDateStr(val)) {
      if (endRef.current) endRef.current.value = lastEndStr.current
      return
    }
    const today = todayStr()
    const startVal = toInputValue(startDate)
    let clamped = val
    if (clamped < MIN_DATE) clamped = MIN_DATE
    if (clamped > today) clamped = today
    if (clamped < startVal) clamped = startVal
    if (clamped !== val && endRef.current) endRef.current.value = clamped
    lastEndStr.current = clamped
    setActivePreset(null)
    onChange(startDate, endOfDay(new Date(clamped + 'T00:00:00')))
  }, [startDate, onChange])

  const baseInput =
    'bg-[#0a0e17] border border-[#506880] rounded-lg px-3 py-1 text-xs font-mono text-[#f1f5f9] [color-scheme:dark] outline-none focus:border-[#7db8fc]/50'

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      {presets.map((preset) => {
        const isActive = activePreset === preset
        return (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={
              isActive
                ? 'px-3 py-1 rounded-lg text-xs font-medium bg-[#7db8fc]/20 text-[#7db8fc] border border-[#7db8fc]/30'
                : 'px-3 py-1 rounded-lg text-xs font-medium text-[#7a8a9b] border border-[#506880] hover:text-[#b0bec9]'
            }
          >
            {preset}
          </button>
        )
      })}

      <div className="w-px h-4 bg-[#3a4e63]" />

      <input
        type="date"
        ref={startRef}
        defaultValue={toInputValue(startDate)}
        onBlur={commitStart}
        onChange={commitStart}
        onKeyDown={(e) => { if (e.key === 'Enter') { commitStart(); e.currentTarget.blur() } }}
        className={baseInput}
      />
      <input
        type="date"
        ref={endRef}
        defaultValue={toInputValue(endDate)}
        onBlur={commitEnd}
        onChange={commitEnd}
        onKeyDown={(e) => { if (e.key === 'Enter') { commitEnd(); e.currentTarget.blur() } }}
        className={baseInput}
      />
    </div>
  )
}
