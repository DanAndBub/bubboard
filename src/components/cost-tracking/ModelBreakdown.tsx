'use client';

import { useState } from 'react';

interface ModelBreakdownProps {
  data: Array<{ model: string; cost: number; count: number; percentage: number }>;
}

const MODEL_COLORS: Record<string, { main: string; glow: string }> = {
  'claude-opus':    { main: '#3b82f6', glow: 'rgba(59,130,246,0.35)' },
  'claude-sonnet':  { main: '#8b5cf6', glow: 'rgba(139,92,246,0.35)' },
  'claude-haiku':   { main: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
  'deepseek-chat':  { main: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  'deepseek-reasoner': { main: '#34d399', glow: 'rgba(52,211,153,0.35)' },
  'deepseek':       { main: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  'gpt-4.1':        { main: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  'gpt-4o':         { main: '#ef4444', glow: 'rgba(239,68,68,0.35)' },
  'o3':             { main: '#ec4899', glow: 'rgba(236,72,153,0.35)' },
  'o1':             { main: '#f97316', glow: 'rgba(249,115,22,0.35)' },
};

function getModelColor(model: string): { main: string; glow: string } {
  const key = Object.keys(MODEL_COLORS).find(k => model.includes(k));
  return key ? MODEL_COLORS[key] : { main: '#6b7280', glow: 'rgba(107,114,128,0.35)' };
}

export default function ModelBreakdown({ data }: ModelBreakdownProps) {
  const filtered = data.filter(d => d.cost >= 0.01);
  const total = filtered.reduce((sum, d) => sum + d.cost, 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredEntry = hovered !== null ? filtered[hovered] : null;

  // SVG donut parameters
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 120;
  const innerR = 82;
  const gapDeg = 2; // gap between segments in degrees

  // Build arc segments
  type Segment = { startAngle: number; endAngle: number; color: { main: string; glow: string }; index: number };
  const segments: Segment[] = [];
  let currentAngle = -90; // start at top

  filtered.forEach((entry, i) => {
    const sliceDeg = total > 0 ? (entry.cost / total) * 360 : 0;
    if (sliceDeg < 0.5) return; // skip tiny slices
    const gap = filtered.length > 1 ? gapDeg : 0;
    segments.push({
      startAngle: currentAngle + gap / 2,
      endAngle: currentAngle + sliceDeg - gap / 2,
      color: getModelColor(entry.model),
      index: i,
    });
    currentAngle += sliceDeg;
  });

  function polarToCartesian(angle: number, r: number): { x: number; y: number } {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startAngle: number, endAngle: number, outerRadius: number, innerRadius: number): string {
    const sweep = endAngle - startAngle;
    const largeArc = sweep > 180 ? 1 : 0;
    const outerStart = polarToCartesian(startAngle, outerRadius);
    const outerEnd = polarToCartesian(endAngle, outerRadius);
    const innerStart = polarToCartesian(endAngle, innerRadius);
    const innerEnd = polarToCartesian(startAngle, innerRadius);
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
      'Z',
    ].join(' ');
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-[#1e293b] bg-[#111827] p-6">
      <p className="mb-4 text-sm font-semibold text-[#e2e8f0]">Cost by Model</p>
      <div className="flex flex-1 flex-col items-center gap-6 lg:flex-row">
        {/* Donut */}
        <div className="relative flex-1 flex items-center justify-center min-h-[300px]">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
            <defs>
              {segments.map((seg) => (
                <filter key={`glow-${seg.index}`} id={`glow-${seg.index}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood floodColor={seg.color.glow} result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
              {/* Inner shadow for depth */}
              <radialGradient id="inner-shadow" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
              </radialGradient>
            </defs>

            {/* Background track */}
            <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="#1e293b" strokeWidth={outerR - innerR} opacity={0.4} />

            {/* Segments */}
            {segments.map((seg) => {
              const isHovered = hovered === seg.index;
              const isDimmed = hovered !== null && !isHovered;
              const scale = isHovered ? 1.04 : 1;
              return (
                <path
                  key={seg.index}
                  d={arcPath(seg.startAngle, seg.endAngle, outerR, innerR)}
                  fill={seg.color.main}
                  opacity={isDimmed ? 0.25 : 1}
                  filter={isHovered ? `url(#glow-${seg.index})` : undefined}
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: `${cx}px ${cy}px`,
                    transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHovered(seg.index)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}

            {/* Inner circle overlay for depth effect */}
            <circle cx={cx} cy={cy} r={innerR} fill="#111827" />
            <circle cx={cx} cy={cy} r={innerR - 1} fill="none" stroke="#1e293b" strokeWidth={0.5} opacity={0.5} />
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {hoveredEntry ? (
              <>
                <span className="max-w-[130px] truncate text-xs text-[#94a3b8] font-medium">{hoveredEntry.model}</span>
                <span className="font-mono text-2xl font-bold text-white mt-0.5">
                  ${hoveredEntry.cost.toFixed(2)}
                </span>
                <span className="text-xs text-[#475569] mt-0.5">{hoveredEntry.percentage.toFixed(1)}% of total</span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider text-[#475569] font-medium">Total Spend</span>
                <span className="font-mono text-2xl font-bold text-white mt-0.5">
                  ${total.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#475569] mt-0.5">{filtered.length} models</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="w-full shrink-0 lg:w-52">
          {filtered.map((entry, index) => {
            const color = getModelColor(entry.model);
            const isActive = hovered === index;
            return (
              <div
                key={index}
                className={`flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer transition-all ${
                  isActive ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                }`}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: color.main,
                    boxShadow: isActive ? `0 0 8px ${color.glow}, 0 0 0 2px #111827, 0 0 0 3.5px ${color.main}` : `0 0 0 2px #111827, 0 0 0 3.5px ${color.main}40`,
                    transition: 'box-shadow 0.2s ease',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className={`block truncate text-xs ${isActive ? 'text-[#e2e8f0]' : 'text-[#94a3b8]'} transition-colors`}>
                    {entry.model}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className={`block font-mono text-xs ${isActive ? 'text-white' : 'text-[#e2e8f0]'} transition-colors`}>
                    ${entry.cost.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-[#475569]">{entry.percentage.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
