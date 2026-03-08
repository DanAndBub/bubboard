'use client';

import { useState } from 'react';

interface TaskRow {
  task_id: string;
  count: number;
  total_cost: number;
  avg_cost: number;
  primary_model: string;
}

interface TaskTableProps {
  data: TaskRow[];
}

type SortColumn = 'task_id' | 'count' | 'total_cost' | 'avg_cost' | 'primary_model';
type SortDirection = 'asc' | 'desc';

function getModelColor(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('opus')) return '#a78bfa';
  if (m.includes('sonnet')) return '#60a5fa';
  if (m.includes('haiku')) return '#34d399';
  return '#94a3b8';
}

export default function TaskTable({ data }: TaskTableProps) {
  const [sortCol, setSortCol] = useState<SortColumn>('total_cost');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  function handleSort(col: SortColumn) {
    if (col === sortCol) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    let av: string | number = a[sortCol];
    let bv: string | number = b[sortCol];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const displayed = sorted.slice(0, 10);
  const overflow = data.length - displayed.length;

  const arrow = (col: SortColumn) => {
    if (sortCol !== col) return null;
    return (
      <span className="ml-1 inline-block">
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const cols: { key: SortColumn; label: string; align: string }[] = [
    { key: 'task_id', label: 'Task', align: 'text-left' },
    { key: 'count', label: 'Requests', align: 'text-right' },
    { key: 'total_cost', label: 'Total Cost', align: 'text-right' },
    { key: 'avg_cost', label: 'Avg Cost', align: 'text-right' },
    { key: 'primary_model', label: 'Primary Model', align: 'text-left' },
  ];

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
        <span className="text-sm font-semibold text-[#e2e8f0]">Top Tasks by Cost</span>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center">
          <svg
            className="mx-auto mb-3 w-5 h-5 text-[#475569]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
            />
          </svg>
          <p className="text-sm text-[#475569]">
            Tag your API calls with <code className="font-mono">task_id</code> to see per-task costs
          </p>
        </div>
      ) : (
        <>
          <table className="w-full">
            <thead className="bg-[#0a0e17]">
              <tr>
                {cols.map(({ key, label, align }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase tracking-wider cursor-pointer hover:text-[#94a3b8] ${align}`}
                  >
                    {label}
                    {arrow(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {displayed.map(row => {
                const color = getModelColor(row.primary_model);
                return (
                  <tr key={row.task_id} className="hover:bg-[#0a0e17]/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-[#e2e8f0]">{row.task_id}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[#94a3b8] text-right">{row.count}</td>
                    <td className="px-4 py-3 font-mono text-sm text-blue-400 text-right">
                      ${row.total_cost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-[#475569] text-right">
                      ${row.avg_cost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          color,
                          backgroundColor: `${color}1a`,
                        }}
                      >
                        {row.primary_model}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {overflow > 0 && (
            <div className="px-4 py-2 text-xs text-[#475569]">
              and {overflow} more task{overflow !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}
