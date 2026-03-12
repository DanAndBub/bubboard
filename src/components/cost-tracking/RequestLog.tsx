'use client';

import { Fragment, useState } from 'react';
import { UsageRecord } from '@/lib/cost-tracking/types';
import { calculateCost } from '@/lib/cost-tracking/calculator';

interface RequestLogProps {
  records: UsageRecord[];
}

const PAGE_SIZE = 25;

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = String(d.getDate()).padStart(2, '0');
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${month} ${day} ${time}`;
}

function exportCSV(records: UsageRecord[]) {
  const headers = [
    'id', 'timestamp', 'provider', 'model',
    'input_tokens', 'output_tokens', 'cached_input_tokens',
    'cache_creation_tokens', 'cost_usd', 'task_id', 'request_id',
  ];
  const rows = records.map(r =>
    [
      r.id, r.timestamp, r.provider, r.model,
      r.input_tokens, r.output_tokens, r.cached_input_tokens,
      r.cache_creation_tokens, r.cost_usd, r.task_id ?? '', r.request_id,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'request-log.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function RequestLog({ records }: RequestLogProps) {
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, records.length);
  const pageRecords = records.slice(start, end);

  function toggleRow(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <div className="rounded-xl border border-[#506880] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#506880]">
        <div className="flex items-center">
          <span className="text-sm font-semibold text-[#f1f5f9]">Request Log</span>
          <span className="text-xs font-mono text-[#7a8a9b] ml-2">{records.length}</span>
        </div>
        <button
          onClick={() => exportCSV(records)}
          className="text-xs text-[#7db8fc] hover:text-blue-300 px-3 py-1 rounded border border-[#7db8fc]/30 hover:bg-[#7db8fc]/10"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#0a0e17]">
            <tr>
              <th className="text-left px-4 sm:px-6 py-2 font-medium text-[#7a8a9b]">Time</th>
              <th className="text-left px-3 py-2 font-medium text-[#7a8a9b] hidden sm:table-cell">Provider</th>
              <th className="text-left px-3 py-2 font-medium text-[#7a8a9b]">Model</th>
              <th className="text-right px-3 py-2 font-medium text-[#7a8a9b] hidden md:table-cell">Input</th>
              <th className="text-right px-3 py-2 font-medium text-[#7a8a9b] hidden md:table-cell">Output</th>
              <th className="text-right px-3 py-2 font-medium text-[#7a8a9b] hidden lg:table-cell">Cache</th>
              <th className="text-right px-3 py-2 font-medium text-[#7a8a9b]">Cost</th>
              <th className="text-left px-3 py-2 pr-6 font-medium text-[#7a8a9b] hidden lg:table-cell">Task</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#506880]/50">
            {pageRecords.map(r => {
              const isExpanded = expandedId === r.id;
              const breakdown = calculateCost(r);
              const inputCost = breakdown?.input_cost ?? 0;
              const outputCost = breakdown?.output_cost ?? 0;
              const cacheReadCost = breakdown?.cache_read_cost ?? 0;
              const cacheWriteCost = breakdown?.cache_write_cost ?? 0;

              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => toggleRow(r.id)}
                    className="cursor-pointer hover:bg-[#0a0e17]/60 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-2 font-mono text-[#b0bec9] whitespace-nowrap">
                      {formatTimestamp(r.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-[#7a8a9b] uppercase hidden sm:table-cell">{r.provider}</td>
                    <td className="px-3 py-2 font-mono text-[#b0bec9] max-w-[140px] truncate">{r.model}</td>
                    <td className="px-3 py-2 font-mono text-[#b0bec9] text-right hidden md:table-cell">{r.input_tokens.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-[#b0bec9] text-right hidden md:table-cell">{r.output_tokens.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-[#7a8a9b] text-right hidden lg:table-cell">
                      {r.cached_input_tokens > 0 ? r.cached_input_tokens.toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#7db8fc] text-right">${r.cost_usd.toFixed(6)}</td>
                    <td className="px-3 py-2 pr-6 text-[#7a8a9b] hidden lg:table-cell">{r.task_id ?? '-'}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.id}-expanded`}>
                      <td colSpan={8} className="bg-[#0a0e17] px-6 py-3">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] mb-2">
                          <div className="flex justify-between">
                            <span className="text-[#7a8a9b]">Input cost</span>
                            <span className="font-mono text-[#b0bec9]">${inputCost.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7a8a9b]">Output cost</span>
                            <span className="font-mono text-[#b0bec9]">${outputCost.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7a8a9b]">Cache read cost</span>
                            <span className="font-mono text-[#b0bec9]">${cacheReadCost.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7a8a9b]">Cache write cost</span>
                            <span className="font-mono text-[#b0bec9]">${cacheWriteCost.toFixed(6)}</span>
                          </div>
                          {r.cache_creation_tokens > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[#7a8a9b]">Cache creation tokens</span>
                              <span className="font-mono text-[#b0bec9]">{r.cache_creation_tokens.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="text-[#7a8a9b] text-[10px]">
                            <span className="mr-2">Model:</span>
                            <span className="font-mono text-[#b0bec9]">{r.model}</span>
                          </div>
                          <div className="text-[#7a8a9b] text-[10px]">
                            <span className="mr-2">Request ID:</span>
                            <span className="font-mono text-[10px] text-[#7a8a9b]">{r.request_id}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[#506880]">
        <span className="text-xs text-[#7a8a9b]">
          Showing {records.length === 0 ? '0' : `${start + 1}–${end}`} of {records.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            className="px-3 py-1 rounded text-xs text-[#b0bec9] hover:text-[#f1f5f9] border border-[#506880] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 rounded text-xs text-[#b0bec9] hover:text-[#f1f5f9] border border-[#506880] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
