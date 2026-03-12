'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { parseAgentTree } from '@/lib/parser';
import { pathsToTree } from '@/lib/pathsToTree';
import { analyzeAgentsMd, analyzeOpenClawConfig, analyzeHeartbeat } from '@/lib/analyzer';
import { getDemoAgentMap } from '@/lib/demo-data';
import type { AgentMap } from '@/lib/types';
import { analyzeFile, analyzeFiles } from '@/lib/config-review/analyze-file';
import { runReview, type ReviewResult } from '@/lib/config-review/runner';
import ReviewPanel from '@/components/config-review/ReviewPanel';
import { calculateBudget } from '@/lib/config-review/budget';
import type { BootstrapBudget } from '@/lib/config-review/types';
import { serializeSnapshot } from '@/lib/drift/snapshot-serialize';
import { downloadSnapshot } from '@/lib/drift/snapshot-export';
import { importSnapshot } from '@/lib/drift/snapshot-import';
import { computeDrift } from '@/lib/drift/diff-engine';
import { generateSessionNotes } from '@/lib/drift/session-notes';
import { downloadSessionNotes } from '@/lib/drift/session-notes-export';
import type { Snapshot, DriftReport } from '@/lib/drift/types';
import DriftReportPanel from '@/components/drift/DriftReport';
import EditorPanel from '@/components/editor/EditorPanel';
import DirectoryScanner from '@/scanner/DirectoryScanner';
import TreeInput from '@/components/TreeInput';
import AgentMapDisplay from '@/components/AgentMap';

function MapPageContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [agentMap, setAgentMap] = useState<AgentMap | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [analyzedFiles, setAnalyzedFiles] = useState<ReturnType<typeof analyzeFile>[]>([]);
  const [budget, setBudget] = useState<BootstrapBudget | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const [editorFile, setEditorFile] = useState<string | null>(null);

  // Whether webkitdirectory is unsupported in this browser
  const [browserUnsupported, setBrowserUnsupported] = useState(false);
  // Whether the text-input fallback section is expanded
  const [textFallbackOpen, setTextFallbackOpen] = useState(false);

  // Auto-load demo
  useEffect(() => {
    if (isDemo) {
      const demoMap = getDemoAgentMap();
      const demoContents: Record<string, string> = {
        'AGENTS.md': `# Bub's Operating Manual

## Delegation Rules
- Use sonnet for complex engineering tasks and code review
- Use coder for routine development and implementation
- Use analyst for data analysis, research, and reporting
- Delegate to local for local system tasks and file operations

## Skills
Skills: github, gog, weather, tmux, coding-agent, deploy, monitor

## Communication
Primary channel: Telegram
`,
        'openclaw.json': JSON.stringify({
          models: {
            providers: {
              anthropic: { models: [
                { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
                { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
              ]},
              deepseek: { models: [
                { id: 'deepseek-chat', name: 'DeepSeek Chat' },
              ]},
            },
          },
          agents: {
            defaults: { model: { primary: 'anthropic/claude-sonnet-4-6' } },
            list: [
              { id: 'main', model: { primary: 'anthropic/claude-opus-4-6' } },
              { id: 'sonnet', model: { primary: 'anthropic/claude-sonnet-4-6' } },
              { id: 'coder', model: { primary: 'deepseek/deepseek-chat' } },
              { id: 'analyst', model: { primary: 'deepseek/deepseek-chat' } },
              { id: 'local', model: { primary: 'deepseek/deepseek-chat' } },
            ],
          },
          heartbeat: { model: 'deepseek-chat', every: '15m' },
          channels: { telegram: { enabled: true } },
        }, null, 2),
        'HEARTBEAT.md': '# Heartbeat Tasks\n\nCheck email, calendar, weather during quiet periods.\nIf nothing needs attention: HEARTBEAT_OK\nProactive checks rotate 2-4x daily.\nLate night (23:00-08:00): stay quiet unless urgent.',
        'SOUL.md': '# SOUL.md — Bub\n\nDirect and efficient. Say what needs saying. No filler.\nGenuinely helpful, not performatively helpful.\nOpinionated when it matters.\nConcise by default, thorough when it counts.\nResourceful before asking — read the file, check the context, search memory.',
      };
      setFileContents(demoContents);
      setAgentMap(demoMap);
      setInputCollapsed(true);

      // Run config review on demo data
      const mdFiles = Object.entries(demoContents).filter(([k]) => k.toLowerCase().endsWith('.md'));
      if (mdFiles.length > 0) {
        const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
        setAnalyzedFiles(analyzed);
        setReviewResult(runReview(analyzed));
      }
    }
  }, [isDemo]);

  function applyAnalyzer(fileName: string, content: string, map: AgentMap): AgentMap {
    const name = fileName.toUpperCase();
    if (name === 'AGENTS.MD') return analyzeAgentsMd(content, map);
    if (name === 'OPENCLAW.JSON') return analyzeOpenClawConfig(content, map);
    if (name === 'HEARTBEAT.MD') return analyzeHeartbeat(content, map);
    return map;
  }

  function openFileEditor(path: string) {
    setEditorFile(path);
  }

  function handleContentChange(path: string, newContent: string) {
    setFileContents(prev => ({ ...prev, [path]: newContent }));
  }

  function handleRescan() {
    setEditorFile(null);
    // Re-run review with updated file contents
    const allContents = fileContents;
    const mdFiles = Object.entries(allContents).filter(([k]) => k.toLowerCase().endsWith('.md'));
    if (mdFiles.length > 0) {
      const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
      setAnalyzedFiles(analyzed);
      const review = runReview(analyzed);
      setReviewResult(review);
      const fileBudget = calculateBudget(analyzed);
      setBudget(fileBudget);
      if (agentMap) {
        serializeSnapshot(analyzed, review, fileBudget, agentMap).then(snap => {
          setCurrentSnapshot(snap);
          if (previousSnapshot) setDriftReport(computeDrift(previousSnapshot, snap));
        });
      }
    }
  }

  function buildMapFromTree(tree: string, extraContents: Record<string, string> = {}) {
    setIsLoading(true);
    const allContents = { ...fileContents, ...extraContents };
    setTimeout(() => {
      const parsed = parseAgentTree(tree);
      let enriched = parsed;
      for (const [fileName, content] of Object.entries(allContents)) {
        enriched = applyAnalyzer(fileName, content, enriched);
      }
      setAgentMap(enriched);
      setInputCollapsed(true);

      // Run config review on file contents
      const mdFiles = Object.entries(allContents).filter(([k]) => k.toLowerCase().endsWith('.md'));
      if (mdFiles.length > 0) {
        const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
        setAnalyzedFiles(analyzed);
        const review = runReview(analyzed);
        setReviewResult(review);
        const fileBudget = calculateBudget(analyzed);
        setBudget(fileBudget);

        // Build snapshot + drift (async for content hashing)
        serializeSnapshot(analyzed, review, fileBudget, enriched).then(snap => {
          setCurrentSnapshot(snap);
          // If previous snapshot loaded, compute drift
          setPreviousSnapshot(prev => {
            if (prev) setDriftReport(computeDrift(prev, snap));
            return prev;
          });
        });
      }

      setIsLoading(false);
    }, 150);
  }

  // Called by DirectoryScanner when user confirms file selection
  const handleDirectoryConfirm = (
    paths: string[],
    meta?: { manifestVersion: string; fileContents: Record<string, string> }
  ) => {
    setFileContents({});
    // Normalize keys from relative paths (workspace/AGENTS.md) to basenames (AGENTS.md)
    // so the existing applyAnalyzer matching logic works unchanged.
    const normalizedContents: Record<string, string> = {};
    if (meta?.fileContents) {
      for (const [relPath, content] of Object.entries(meta.fileContents)) {
        const basename = relPath.split('/').pop() ?? relPath;
        normalizedContents[basename] = content;
      }
    }
    setFileContents(normalizedContents);
    const tree = pathsToTree(paths);
    buildMapFromTree(tree, normalizedContents);
  };

  // Called by DirectoryScanner when webkitdirectory is not supported
  const handleUnsupported = () => {
    setBrowserUnsupported(true);
    setTextFallbackOpen(true);
  };

  // Called by TreeInput (text fallback)
  const handleTreeSubmit = (tree: string) => {
    buildMapFromTree(tree);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="sticky top-0 z-20 border-b border-[#506880] bg-[#0a0e17]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded border border-[#7db8fc]/30 bg-[#7db8fc]/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-bold text-[#f1f5f9] text-sm">Driftwatch</span>
          </Link>

          <div className="text-[#506880]">/</div>
          <span className="text-sm text-[#b0bec9]">Agent Map</span>

          {isDemo && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-[#7db8fc]/30 bg-[#7db8fc]/10 text-[#7db8fc]">
              Demo: Bub&apos;s workspace
            </span>
          )}

          {agentMap && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setAgentMap(null);
                  setFileContents({});
                  setReviewResult(null);
                  setCurrentSnapshot(null);
                  setPreviousSnapshot(null);
                  setDriftReport(null);
                  setBudget(null);
                  setInputCollapsed(false);
                  window.history.pushState({}, '', '/map');
                }}
                className="text-xs text-[#7a8a9b] hover:text-[#b0bec9] transition-colors border border-[#506880] rounded-lg px-3 py-1.5 hover:border-[#2d3f5a]"
              >
                New map
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">

        {/* ── INPUT SECTION ────────────────────────────────────────────────── */}
        {!inputCollapsed ? (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#f1f5f9] mb-2">Map Your Agent</h1>
              <p className="text-sm text-[#b0bec9]">
                Select your OpenClaw directory to generate an interactive architecture map
              </p>
            </div>

            {/* Primary: folder picker (hidden when browser is unsupported) */}
            {!browserUnsupported && (
              <DirectoryScanner
                onConfirm={handleDirectoryConfirm}
              />
            )}

            {/* Secondary: text input fallback (collapsible) */}
            <div className="rounded-xl border border-[#506880] bg-[#111827] overflow-hidden">
              <button
                type="button"
                onClick={() => setTextFallbackOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0d1520] transition-colors"
              >
                <span className="text-xs text-[#b0bec9]">
                  Using SSH or headless server? Paste output instead
                </span>
                <svg
                  className={`w-4 h-4 text-[#7a8a9b] transition-transform ${textFallbackOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {textFallbackOpen && (
                <div className="border-t border-[#506880]">
                  <TreeInput onSubmit={handleTreeSubmit} isLoading={isLoading} />
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Collapsed input */
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setInputCollapsed(false); setAgentMap(null); setFileContents({}); setReviewResult(null); setCurrentSnapshot(null); setPreviousSnapshot(null); setDriftReport(null); setBudget(null); }}
              className="flex items-center gap-2 text-xs text-[#7a8a9b] hover:text-[#b0bec9] transition-colors border border-[#506880] rounded-lg px-3 py-2 hover:border-[#2d3f5a] hover:bg-[#111827]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Edit input
            </button>
          </div>
        )}

        {/* ── MAP OUTPUT ───────────────────────────────────────────────────── */}
        {agentMap && (
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#506880]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34d399] status-dot-ok" />
                <span className="text-sm font-medium text-[#f1f5f9]">
                  {isDemo ? "Bub's Agent Architecture" : 'Your Agent Architecture'}
                </span>
              </div>
              <span className="text-xs text-[#7a8a9b]">
                {agentMap.agents.length} agent{agentMap.agents.length !== 1 ? 's' : ''} detected
              </span>
              <div className="ml-auto text-xs text-[#7a8a9b] font-mono">
                Generated in &lt;500ms
              </div>
            </div>

            <AgentMapDisplay map={agentMap} fileContents={fileContents} />

            {/* Config Review */}
            {reviewResult && (
              <div className="mt-6">
                <ReviewPanel result={reviewResult} files={analyzedFiles} onOpenFile={openFileEditor} />
              </div>
            )}

            {/* Drift Report */}
            {driftReport && (
              <div className="mt-6">
                <DriftReportPanel report={driftReport} />
              </div>
            )}

            {/* Snapshot & Notes Controls */}
            {currentSnapshot && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => downloadSnapshot(currentSnapshot)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#506880] text-[#b0bec9] hover:text-[#f1f5f9] hover:border-[#7db8fc]/30 hover:bg-[#7db8fc]/5 transition-all"
                >
                  📥 Download Snapshot
                </button>
                <label className="text-xs px-3 py-1.5 rounded-lg border border-[#506880] text-[#b0bec9] hover:text-[#f1f5f9] hover:border-[#7db8fc]/30 hover:bg-[#7db8fc]/5 transition-all cursor-pointer">
                  📤 Upload Previous Snapshot
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      const result = importSnapshot(text);
                      if (result.ok) {
                        setPreviousSnapshot(result.snapshot);
                        setDriftReport(computeDrift(result.snapshot, currentSnapshot));
                      } else {
                        alert(result.error);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                {reviewResult && budget && (
                  <button
                    onClick={() => {
                      const notes = generateSessionNotes(reviewResult, budget, currentSnapshot, driftReport);
                      downloadSessionNotes(notes);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#506880] text-[#b0bec9] hover:text-[#f1f5f9] hover:border-[#7db8fc]/30 hover:bg-[#7db8fc]/5 transition-all"
                  >
                    📝 Download Session Notes
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick-start guide — shown when no map has been generated yet */}
        {!agentMap && (
          <div className="max-w-2xl mx-auto space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-[#b0bec9] tracking-wide uppercase">
              How to scan your workspace
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="bg-[#111827] border border-[#506880] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#7a8a9b]">01</span>
                  <svg className="w-4 h-4 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                </div>
                <p className="text-xs text-[#b0bec9] leading-relaxed">
                  Choose your <span className="text-[#f1f5f9] font-mono">~/.openclaw</span> directory using the folder picker above (Chrome/Edge) or paste the <span className="font-mono">ls</span> output (Firefox/Safari).
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#111827] border border-[#506880] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#7a8a9b]">02</span>
                  <svg className="w-4 h-4 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <p className="text-xs text-[#b0bec9] leading-relaxed">
                  Review detected files. Toggle on <span className="text-[#f1f5f9]">Read File Contents</span> to auto-populate agent roles, config, and relationships.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#111827] border border-[#506880] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#7a8a9b]">03</span>
                  <svg className="w-4 h-4 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <p className="text-xs text-[#b0bec9] leading-relaxed">
                  Hit <span className="text-[#f1f5f9]">Build Map</span> to generate your interactive architecture dashboard.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#7a8a9b] border-l-2 border-[#7db8fc]/30 pl-3">
              Tip: For the richest map, toggle on file content reading. Your files never leave your browser.
            </p>
          </div>
        )}
      </div>

      {/* Editor Slide-in Panel */}
      {editorFile && fileContents[editorFile] !== undefined && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setEditorFile(null)}
          />
          <EditorPanel
            path={editorFile}
            content={fileContents[editorFile]}
            onClose={() => setEditorFile(null)}
            onContentChange={handleContentChange}
            onRescan={handleRescan}
          />
        </>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#7a8a9b] text-sm">Loading...</div>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
