'use client'

import { useState, useCallback } from 'react'
import { parseClaudeCodeJSONL } from '@/lib/cost-tracking/importers/claude-code'
import { parseCSV } from '@/lib/cost-tracking/importers/csv'
import { parseJSON } from '@/lib/cost-tracking/importers/json'
import { addUsageRecords } from '@/lib/cost-tracking/store'

interface ImportPanelProps {
  onImportComplete: (count: number) => void
}

type Format = 'jsonl' | 'csv' | 'json'

const formats: { id: Format; label: string; accept: string }[] = [
  { id: 'jsonl', label: 'Claude Code JSONL', accept: '.jsonl' },
  { id: 'csv', label: 'CSV', accept: '.csv' },
  { id: 'json', label: 'JSON', accept: '.json' },
]

type Status =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'success'; count: number }
  | { kind: 'error'; message: string }

export default function ImportPanel({ onImportComplete }: ImportPanelProps) {
  const [activeFormat, setActiveFormat] = useState<Format>('jsonl')
  const [isDragOver, setIsDragOver] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const processFile = useCallback(
    (file: File) => {
      setStatus({ kind: 'processing' })
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result
          if (typeof content !== 'string') {
            throw new Error('Failed to read file content as text.')
          }
          
          if (!content.trim()) {
            throw new Error('File is empty.')
          }
          
          let parsed: Awaited<ReturnType<typeof parseClaudeCodeJSONL>>
          try {
            if (activeFormat === 'jsonl') {
              parsed = parseClaudeCodeJSONL(content)
            } else if (activeFormat === 'csv') {
              parsed = parseCSV(content)
            } else {
              parsed = parseJSON(content)
            }
          } catch (parseErr) {
            const parseMessage = parseErr instanceof Error ? parseErr.message : 'Unknown parsing error'
            throw new Error(`Failed to parse ${activeFormat.toUpperCase()} format: ${parseMessage}`)
          }
          
          if (!parsed || parsed.length === 0) {
            throw new Error('No valid records found in file.')
          }
          
          await addUsageRecords(parsed)
          setStatus({ kind: 'success', count: parsed.length })
          onImportComplete(parsed.length)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error during import.'
          console.error('Import failed:', err)
          setStatus({ kind: 'error', message })
        }
      }
      
      reader.onerror = () => {
        const message = 'Failed to read file. Please ensure the file is accessible and try again.'
        console.error('FileReader error:', reader.error)
        setStatus({ kind: 'error', message })
      }
      
      reader.onabort = () => {
        setStatus({ kind: 'error', message: 'File reading was cancelled.' })
      }
      
      reader.readAsText(file)
    },
    [activeFormat, onImportComplete],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      e.target.value = ''
    },
    [processFile],
  )

  const currentFormat = formats.find((f) => f.id === activeFormat)!

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6">
      <p className="text-sm font-semibold text-[#e2e8f0] mb-1">Import Usage Data</p>
      <p className="text-xs text-[#475569] mb-4">
        🔒 Your data stays in this browser. Nothing is uploaded to any server.
      </p>

      {/* Format selector */}
      <div className="flex gap-2 mb-4">
        {formats.map((fmt) => {
          const isActive = activeFormat === fmt.id
          return (
            <button
              key={fmt.id}
              onClick={() => {
                setActiveFormat(fmt.id)
                setStatus({ kind: 'idle' })
              }}
              className={
                isActive
                  ? 'px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'px-3 py-1 rounded-lg text-xs font-medium text-[#475569] border border-[#1e293b] hover:text-[#94a3b8]'
              }
            >
              {fmt.label}
            </button>
          )
        })}
      </div>

      {/* Drop zone */}
      <label
        className={[
          'block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragOver
            ? 'border-blue-500/40 bg-blue-500/5'
            : 'border-[#1e293b] hover:border-blue-500/40 hover:bg-blue-500/5',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <svg
          className="mx-auto mb-2 text-[#475569]"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
        <p className="text-sm text-[#475569]">Drop a file here or click to browse</p>
        <input
          type="file"
          accept={currentFormat.accept}
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {/* Status */}
      {status.kind === 'processing' && (
        <div className="mt-4 flex items-center gap-2 text-xs text-[#94a3b8]">
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Processing…
        </div>
      )}

      {status.kind === 'success' && (
        <p className={['mt-4 text-xs', status.count > 0 ? 'text-green-400' : 'text-amber-400'].join(' ')}>
          {status.count > 0 ? `Imported ${status.count} records` : 'No valid records found'}
        </p>
      )}

      {status.kind === 'error' && (
        <p className="mt-4 text-xs text-red-400">{status.message}</p>
      )}
    </div>
  )
}
