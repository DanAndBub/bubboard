'use client';

import { useState } from 'react';
import type { AgentMap as AgentMapType, FileCardData } from '@/lib/types';
import { calculateHealthScore } from '@/lib/scoring';
import StatsBar from './StatsBar';
import AgentCard from './AgentCard';
import FileCard from './FileCard';
import HealthCheck from './HealthCheck';
import RelationshipPanel from './RelationshipPanel';
import FileViewer from './FileViewer';

interface AgentMapProps {
  map: AgentMapType;
  fileContents?: Record<string, string>;
}

const RECOMMENDED_FILES = [
  'SOUL.md',
  'AGENTS.md',
  'MEMORY.md',
  'TOOLS.md',
  'HEARTBEAT.md',
  'USER.md',
  'IDENTITY.md',
];

export default function AgentMap({ map, fileContents = {} }: AgentMapProps) {
  const [selectedFile, setSelectedFile] = useState<{ name: string; content?: string } | null>(null);

  // Enrich map with file contents — if user uploaded a file, mark it as present
  const enrichedCoreFiles = [...map.workspace.coreFiles];
  const contentFileNames = Object.keys(fileContents);
  for (const fileName of contentFileNames) {
    const upper = fileName.toUpperCase();
    if (!enrichedCoreFiles.some(f => f.toUpperCase() === upper)) {
      enrichedCoreFiles.push(fileName);
    }
  }
  const enrichedMissing = map.workspace.missingRecommended.filter(
    f => !contentFileNames.some(cf => cf.toUpperCase() === f.toUpperCase())
  );
  const enrichedMap = {
    ...map,
    workspace: {
      ...map.workspace,
      coreFiles: enrichedCoreFiles,
      missingRecommended: enrichedMissing,
    },
  };

  const health = calculateHealthScore(enrichedMap);

  // Build stats
  const totalFiles =
    enrichedMap.workspace.coreFiles.length +
    enrichedMap.workspace.customFiles.length +
    enrichedMap.workspace.memoryFiles.length +
    enrichedMap.workspace.subagentProtocols.length;

  const stats = {
    totalFiles,
    agentCount: enrichedMap.agents.length,
    memoryEntries: enrichedMap.workspace.memoryFiles.length,
    skillCount: enrichedMap.skillCount,
    score: health.score,
    maxScore: health.maxScore,
  };

  // Build file cards for workspace section
  const allWorkspaceFiles = [...new Set([
    ...enrichedMap.workspace.coreFiles,
    ...enrichedMap.workspace.customFiles,
    ...RECOMMENDED_FILES,
  ])];

  const categorize = (name: string): FileCardData['category'] => {
    const upper = name.toUpperCase();
    if (['SOUL.MD', 'IDENTITY.MD', 'USER.MD'].includes(upper)) return 'core';
    if (['AGENTS.MD', 'HEARTBEAT.MD', 'TOOLS.MD', 'MEMORY.MD'].includes(upper)) return 'operations';
    return 'custom';
  };

  const allFoundFiles = [...enrichedMap.workspace.coreFiles, ...enrichedMap.workspace.customFiles];
  const workspaceFileCards: FileCardData[] = allWorkspaceFiles.map(name => ({
    name,
    category: categorize(name),
    present: allFoundFiles.some(f => f.toUpperCase() === name.toUpperCase()) ||
             Object.keys(fileContents).some(f => f.toUpperCase() === name.toUpperCase()),
    content: fileContents[name] || fileContents[name.toUpperCase()] || fileContents[name.toLowerCase()],
  }));

  const coreCards = workspaceFileCards.filter(f => f.category === 'core');
  const opsCards = workspaceFileCards.filter(f => f.category === 'operations');
  const customCards = workspaceFileCards.filter(f => f.category === 'custom');

  // Memory date range
  const memoryDates = enrichedMap.workspace.memoryFiles
    .map(f => f.replace('.md', ''))
    .sort();
  const memoryRange =
    memoryDates.length > 1
      ? `${memoryDates[0]} → ${memoryDates[memoryDates.length - 1]}`
      : memoryDates[0] || null;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: Agent Fleet + Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Agent Fleet */}
          <div>
            <SectionHeader
              title="Agent Fleet"
              count={enrichedMap.agents.length}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            {enrichedMap.agents.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {enrichedMap.agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : (
              <EmptyState text="No agents found in agents/ directory" />
            )}
          </div>

          {/* Section 2: Workspace Files */}
          <div>
            <SectionHeader
              title="Workspace Files"
              count={totalFiles}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              }
            />

            <div className="space-y-4">
              {/* Core Identity */}
              {coreCards.length > 0 && (
                <FileGroup label="Core Identity" color="#3b82f6">
                  {coreCards.map(f => (
                    <FileCard
                      key={f.name}
                      file={f}
                      onClick={() => setSelectedFile({ name: f.name, content: f.content })}
                    />
                  ))}
                </FileGroup>
              )}

              {/* Operations */}
              {opsCards.length > 0 && (
                <FileGroup label="Operations" color="#8b5cf6">
                  {opsCards.map(f => (
                    <FileCard
                      key={f.name}
                      file={f}
                      onClick={() => setSelectedFile({ name: f.name, content: f.content })}
                    />
                  ))}
                </FileGroup>
              )}

              {/* Custom files */}
              {customCards.filter(f => f.present).length > 0 && (
                <FileGroup label="Custom" color="#6b7280">
                  {customCards.filter(f => f.present).map(f => (
                    <FileCard
                      key={f.name}
                      file={f}
                      onClick={() => setSelectedFile({ name: f.name, content: f.content })}
                    />
                  ))}
                </FileGroup>
              )}

              {/* Memory */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs text-[#475569] uppercase tracking-widest font-medium">Memory</span>
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border card-hover cursor-default"
                  style={{
                    borderColor: enrichedMap.workspace.memoryFiles.length > 0 ? 'rgba(16, 185, 129, 0.3)' : '#1e293b',
                    backgroundColor: enrichedMap.workspace.memoryFiles.length > 0 ? 'rgba(16, 185, 129, 0.05)' : '#111827',
                  }}
                >
                  {enrichedMap.workspace.memoryFiles.length > 0 ? (
                    <>
                      <span className="text-green-400 text-sm">✓</span>
                      <div>
                        <div className="text-xs font-medium text-[#e2e8f0]">
                          {enrichedMap.workspace.memoryFiles.length} memory file{enrichedMap.workspace.memoryFiles.length !== 1 ? 's' : ''}
                        </div>
                        {memoryRange && (
                          <div className="text-xs font-mono text-[#475569] mt-0.5">{memoryRange}</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-400 text-sm">⚠</span>
                      <span className="text-xs text-[#475569]">No memory files found</span>
                    </>
                  )}
                </div>
              </div>

              {/* Subagent protocols */}
              {enrichedMap.workspace.subagentProtocols.length > 0 && (
                <FileGroup label="Protocols" color="#f59e0b">
                  {enrichedMap.workspace.subagentProtocols.slice(0, 8).map(p => (
                    <FileCard
                      key={p}
                      file={{ name: p, category: 'protocols', present: true }}
                      onClick={() => setSelectedFile({ name: p, content: fileContents[`workspace/subagents/${p}`] || fileContents[p] })}
                    />
                  ))}
                  {enrichedMap.workspace.subagentProtocols.length > 8 && (
                    <div className="col-span-full text-xs text-[#475569] px-3 py-2">
                      +{enrichedMap.workspace.subagentProtocols.length - 8} more protocol files
                    </div>
                  )}
                </FileGroup>
              )}

              {/* Project directories */}
              {enrichedMap.workspace.projectDirs.length > 0 && (
                <FileGroup label="Project Directories" color="#6b7280">
                  {enrichedMap.workspace.projectDirs.map(dir => (
                    <div
                      key={dir}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1e293b] bg-[#111827]"
                    >
                      <svg className="w-3.5 h-3.5 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="font-mono text-xs text-[#94a3b8]">{dir}</span>
                    </div>
                  ))}
                </FileGroup>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Health + Relationships */}
        <div className="space-y-6">
          {/* Section 3: Health Check */}
          <HealthCheck report={health} />

          {/* Section 4: Relationships */}
          <RelationshipPanel map={map} />
        </div>
      </div>

      {/* File viewer panel */}
      {selectedFile && (
        <FileViewer
          fileName={selectedFile.name}
          content={selectedFile.content}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  icon,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg border border-[#1e293b] bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <h2 className="font-semibold text-[#e2e8f0] text-sm">{title}</h2>
      <span className="ml-auto font-mono text-xs text-[#475569] px-2 py-0.5 rounded border border-[#1e293b] bg-[#0d1520]">
        {count}
      </span>
    </div>
  );
}

function FileGroup({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-[#475569] uppercase tracking-widest font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-sm text-[#475569] border border-dashed border-[#1e293b] rounded-xl">
      {text}
    </div>
  );
}
