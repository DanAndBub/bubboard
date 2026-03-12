'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { parseAgentTree } from '@/lib/parser';
import { pathsToTree } from '@/lib/pathsToTree';
import { analyzeAgentsMd, analyzeOpenClawConfig, analyzeHeartbeat } from '@/lib/analyzer';
import { getDemoAgentMap, getDemoFileContents } from '@/lib/demo-data';
import type { AgentMap } from '@/lib/types';
import DirectoryScanner from '@/scanner/DirectoryScanner';
import TreeInput from '@/components/TreeInput';
import AgentMapDisplay from '@/components/AgentMap';
import MapErrorBoundary from '@/components/MapErrorBoundary';

function MapPageContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [agentMap, setAgentMap] = useState<AgentMap | null>(() => {
    if (typeof window === 'undefined') return null;
    if (isDemo) return getDemoAgentMap();
    try {
      const saved = sessionStorage.getItem('driftwatch-agentmap');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    if (isDemo) return getDemoFileContents();
    try {
      const saved = sessionStorage.getItem('driftwatch-filecontents');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [inputCollapsed, setInputCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (isDemo) return true;
    return sessionStorage.getItem('driftwatch-agentmap') !== null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Persist map state to sessionStorage for navigation
  useEffect(() => {
    if (agentMap) {
      try {
        sessionStorage.setItem('driftwatch-agentmap', JSON.stringify(agentMap));
        sessionStorage.setItem('driftwatch-filecontents', JSON.stringify(fileContents));
      } catch { /* quota exceeded — ignore */ }
    } else {
      sessionStorage.removeItem('driftwatch-agentmap');
      sessionStorage.removeItem('driftwatch-filecontents');
    }
  }, [agentMap, fileContents]);

  // Whether webkitdirectory is unsupported in this browser
  const [browserUnsupported, _setBrowserUnsupported] = useState(false);
  // Whether the text-input fallback section is expanded
  const [textFallbackOpen, setTextFallbackOpen] = useState(false);

  // Demo state is initialized directly in useState calls above — no useEffect needed

  function applyAnalyzer(fileName: string, content: string, map: AgentMap): AgentMap {
    const name = fileName.toUpperCase();
    if (name === 'AGENTS.MD') return analyzeAgentsMd(content, map);
    if (name === 'OPENCLAW.JSON') return analyzeOpenClawConfig(content, map);
    if (name === 'HEARTBEAT.MD') return analyzeHeartbeat(content, map);
    return map;
  }

  function buildMapFromTree(tree: string, extraContents: Record<string, string> = {}) {
    setIsLoading(true);
    setParseError(null);
    const allContents = { ...fileContents, ...extraContents };
    setTimeout(() => {
      try {
        const parsed = parseAgentTree(tree);
        let enriched = parsed;
        for (const [fileName, content] of Object.entries(allContents)) {
          enriched = applyAnalyzer(fileName, content, enriched);
        }
        setAgentMap(enriched);
        setInputCollapsed(true);
        setParseError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error parsing tree';
        console.error('Tree parsing failed:', error);
        setParseError(message);
        setAgentMap(null);
      } finally {
        setIsLoading(false);
      }
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
  // Commenting out due to unused vars
  // const handleUnsupported = () => {
  //   setBrowserUnsupported(true);
  //   setTextFallbackOpen(true);
  // };

  // Called by TreeInput (text fallback)
  const handleTreeSubmit = (tree: string) => {
    buildMapFromTree(tree);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      {/* Page-specific bar */}
      {(isDemo || agentMap) && (
        <div className="sticky top-14 z-10 border-b border-[#1e293b] bg-[#0a0e17]/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 h-10 flex items-center gap-3">
            {isDemo && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                Demo: Bub&apos;s workspace
              </span>
            )}
            {agentMap && (
              <div className="ml-auto">
                <button
                  onClick={() => {
                    setAgentMap(null);
                    setFileContents({});
                    setInputCollapsed(false);
                    window.history.pushState({}, '', '/map');
                  }}
                  className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors border border-[#1e293b] rounded-lg px-3 py-1.5 hover:border-[#2d3f5a]"
                >
                  New map
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">

        {/* ── INPUT SECTION ────────────────────────────────────────────────── */}
        {!inputCollapsed ? (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">Map Your Agent</h1>
              <p className="text-sm text-[#94a3b8]">
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
            <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
              <button
                type="button"
                onClick={() => setTextFallbackOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0d1520] transition-colors"
              >
                <span className="text-xs text-[#94a3b8]">
                  Using SSH or headless server? Paste output instead
                </span>
                <svg
                  className={`w-4 h-4 text-[#475569] transition-transform ${textFallbackOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {textFallbackOpen && (
                <div className="border-t border-[#1e293b]">
                  <TreeInput onSubmit={handleTreeSubmit} isLoading={isLoading} />
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Collapsed input */
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setInputCollapsed(false); setAgentMap(null); setFileContents({}); }}
              className="flex items-center gap-2 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors border border-[#1e293b] rounded-lg px-3 py-2 hover:border-[#2d3f5a] hover:bg-[#111827]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Edit input
            </button>
          </div>
        )}

        {/* ── MAP OUTPUT ───────────────────────────────────────────────────── */}
        {parseError && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4v2m0 0v2M7.08 6.47a7 7 0 1110.84 10.06M9 9h.01M15 15h.01"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-red-300">Error parsing your workspace</h3>
              </div>
              <p className="text-xs text-red-200">{parseError}</p>
              <p className="text-xs text-red-200/70">
                Try pasting a simpler tree structure or check that the format is correct (e.g., consistent indentation).
              </p>
              <button
                onClick={() => setParseError(null)}
                className="mt-3 px-3 py-1.5 text-xs bg-red-700/30 hover:bg-red-700/50 border border-red-700/50 rounded transition-colors text-red-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        {agentMap && (
          <MapErrorBoundary>
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 status-dot-ok" />
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    {isDemo ? "Bub's Agent Architecture" : 'Your Agent Architecture'}
                  </span>
                </div>
                <span className="text-xs text-[#475569]">
                  {agentMap.agents.length} agent{agentMap.agents.length !== 1 ? 's' : ''} detected
                </span>
                <div className="ml-auto text-xs text-[#475569] font-mono">
                  Generated in &lt;500ms
                </div>
              </div>

              <AgentMapDisplay map={agentMap} fileContents={fileContents} />
            </div>
          </MapErrorBoundary>
        )}

        {/* Quick-start guide — shown when no map has been generated yet */}
        {!agentMap && (
          <div className="max-w-2xl mx-auto space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-[#94a3b8] tracking-wide uppercase">
              How to scan your workspace
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#475569]">01</span>
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Choose your <span className="text-[#e2e8f0] font-mono">~/.openclaw</span> directory using the folder picker above (Chrome/Edge) or paste the <span className="font-mono">ls</span> output (Firefox/Safari).
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#475569]">02</span>
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Review detected files. Toggle on <span className="text-[#e2e8f0]">Read File Contents</span> to auto-populate agent roles, config, and relationships.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#475569]">03</span>
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Hit <span className="text-[#e2e8f0]">Build Map</span> to generate your interactive architecture dashboard.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#475569] border-l-2 border-blue-500/30 pl-3">
              Tip: For the richest map, toggle on file content reading. Your files never leave your browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#475569] text-sm">Loading...</div>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
