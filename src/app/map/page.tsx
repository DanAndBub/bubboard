'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseAgentTree } from '@/lib/parser';
import { pathsToTree } from '@/lib/pathsToTree';
import { analyzeAgentsMd, analyzeOpenClawConfig, analyzeHeartbeat } from '@/lib/analyzer';
import { getDemoAgentMap, getDemoFileContents } from '@/lib/demo-data';
import type { AgentMap } from '@/lib/types';
import { analyzeFile, analyzeFiles } from '@/lib/config-review/analyze-file';
import { runReview, type ReviewResult } from '@/lib/config-review/runner';
import { calculateBudget } from '@/lib/config-review/budget';
import type { BootstrapBudget, ReviewFinding } from '@/lib/config-review/types';
import { serializeSnapshot } from '@/lib/drift/snapshot-serialize';
import { downloadSnapshot } from '@/lib/drift/snapshot-export';
import { importSnapshot } from '@/lib/drift/snapshot-import';
import { computeDrift } from '@/lib/drift/diff-engine';
import { generateSessionNotes } from '@/lib/drift/session-notes';
import { downloadSessionNotes } from '@/lib/drift/session-notes-export';
import type { Snapshot, DriftReport } from '@/lib/drift/types';
import EditorPanel from '@/components/editor/EditorPanel';
import DirectoryScanner from '@/scanner/DirectoryScanner';
import TreeInput from '@/components/TreeInput';
import { calculateHealthScore } from '@/lib/scoring';
import MapShell from '@/components/map/MapShell';
import MapTopBar from '@/components/map/MapTopBar';
import MapSidebar from '@/components/map/MapSidebar';
import OverviewView from '@/components/map/views/OverviewView';
import AgentsView from '@/components/map/views/AgentsView';
import FilesView from '@/components/map/views/FilesView';
import CostsView from '@/components/map/views/CostsView';
import ReviewView from '@/components/map/views/ReviewView';
import DriftView from '@/components/map/views/DriftView';

type View = 'overview' | 'agents' | 'files' | 'costs' | 'review' | 'drift';

function MapPageContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [agentMap, setAgentMap] = useState<AgentMap | null>(() => isDemo ? getDemoAgentMap() : null);
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => isDemo ? getDemoFileContents() : {});
  const [inputCollapsed, setInputCollapsed] = useState(() => isDemo);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [analyzedFiles, setAnalyzedFiles] = useState<ReturnType<typeof analyzeFile>[]>([]);
  const [budget, setBudget] = useState<BootstrapBudget | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const [editorFile, setEditorFile] = useState<string | null>(null);
  const [editorFinding, setEditorFinding] = useState<ReviewFinding | null>(null);
  const [activeView, setActiveView] = useState<View>('overview');
  const [costRecordCount, setCostRecordCount] = useState(0);

  // Apply ?view= query param on mount
  const initialView = searchParams.get('view');
  // Load cost record count for reset dialog
  useEffect(() => {
    import('@/lib/cost-tracking/store').then(({ getRecordCount }) =>
      getRecordCount().then(setCostRecordCount)
    );
  }, []);

  useEffect(() => {
    const valid: View[] = ['overview', 'agents', 'files', 'costs', 'review', 'drift'];
    if (initialView && (valid as string[]).includes(initialView)) {
      setActiveView(initialView as View);
      // Cost tracking doesn't need scan data — skip input screen
      if (initialView === 'costs' && !agentMap) {
        setInputCollapsed(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whether webkitdirectory is unsupported in this browser
  const [browserUnsupported, setBrowserUnsupported] = useState(false);
  // Whether the text-input fallback section is expanded
  const [textFallbackOpen, setTextFallbackOpen] = useState(false);

  const snapshotInputRef = useRef<HTMLInputElement>(null);

  // Demo mode: run config review on initial demo data (state initialized in useState above)
  useEffect(() => {
    if (isDemo && fileContents && Object.keys(fileContents).length > 0) {
      const mdFiles = Object.entries(fileContents).filter(([k]) => k.toLowerCase().endsWith('.md'));
      if (mdFiles.length > 0) {
        const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
        setAnalyzedFiles(analyzed);
        setReviewResult(runReview(analyzed));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyAnalyzer(fileName: string, content: string, map: AgentMap): AgentMap {
    const name = fileName.toUpperCase();
    if (name === 'AGENTS.MD') return analyzeAgentsMd(content, map);
    if (name === 'OPENCLAW.JSON') return analyzeOpenClawConfig(content, map);
    if (name === 'HEARTBEAT.MD') return analyzeHeartbeat(content, map);
    return map;
  }

  function openFileEditor(path: string, finding?: ReviewFinding) {
    setEditorFile(path);
    setEditorFinding(finding ?? null);
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

      // Run config review on file contents (only if we actually have content)
      const mdFiles = Object.entries(allContents).filter(([k, v]) => k.toLowerCase().endsWith('.md') && v.length > 0);
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
      } else {
        // No file contents — clear any stale review data
        setAnalyzedFiles([]);
        setReviewResult(null);
        setBudget(null);
        setCurrentSnapshot(null);
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

  function handleNewMap(options: { clearCosts: boolean; clearSnapshots: boolean }) {
    setAgentMap(null);
    setFileContents({});
    setReviewResult(null);
    setCurrentSnapshot(null);
    setPreviousSnapshot(null);
    setDriftReport(null);
    setBudget(null);
    setInputCollapsed(false);
    setActiveView('overview');
    window.history.pushState({}, '', '/map');
    if (options.clearCosts) {
      import('@/lib/cost-tracking/store').then(({ clearAllData }) => clearAllData());
    }
    if (options.clearSnapshots) {
      setCurrentSnapshot(null);
      setPreviousSnapshot(null);
      setDriftReport(null);
    }
  }

  function handleEditInput() {
    setInputCollapsed(false);
    setAgentMap(null);
    setFileContents({});
    setReviewResult(null);
    setCurrentSnapshot(null);
    setPreviousSnapshot(null);
    setDriftReport(null);
    setBudget(null);
    setActiveView('overview');
  }

  // Derived values for sidebar and views (only when agentMap is set)
  const health = agentMap ? calculateHealthScore(agentMap) : null;
  const totalFileCount = agentMap
    ? agentMap.workspace.coreFiles.length +
      agentMap.workspace.customFiles.length +
      agentMap.workspace.memoryFiles.length
    : 0;
  const stats = agentMap && health
    ? {
        totalFiles: totalFileCount,
        agentCount: agentMap.agents.length,
        memoryEntries: agentMap.workspace.memoryFiles.length,
        skillCount: agentMap.skillCount,
        score: health.score,
        maxScore: health.maxScore,
      }
    : null;

  // Main content rendered inside MapShell
  const mainContent = (
    <>
      {!agentMap && activeView !== 'costs' ? (
        /* ── INPUT SECTION ─────────────────────────────────────────────── */
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

          {/* Quick-start guide */}
          <div className="space-y-4 pt-2">
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

            <div className="text-center pt-2">
              <a
                href="/map?demo=true"
                className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-[#7db8fc]/30 text-[#7db8fc] hover:bg-[#7db8fc]/10 transition-colors"
              >
                ◈ Try Demo — see an example workspace
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* ── VIEW-BASED LAYOUT ──────────────────────────────────────────── */
        <>
          {activeView === 'overview' && agentMap && stats && (
            <OverviewView
              agentMap={agentMap}
              stats={stats}
              reviewFindings={reviewResult?.findings ?? []}
              healthScore={health!.score}
              budget={budget}
              onNavigate={setActiveView}
              isDemo={isDemo}
            />
          )}
          {activeView === 'agents' && agentMap && (
            <AgentsView agents={agentMap.agents} />
          )}
          {activeView === 'files' && agentMap && (
            <FilesView
              workspace={agentMap.workspace}
              fileContents={fileContents}
              analyzedFiles={analyzedFiles}
              budget={budget}
            />
          )}
          {activeView === 'costs' && (
            <CostsView />
          )}
          {activeView === 'review' && (
            <ReviewView
              reviewResult={reviewResult}
              analyzedFiles={analyzedFiles}
              onOpenFile={openFileEditor}
            />
          )}
          {activeView === 'drift' && (
            <DriftView driftReport={driftReport} />
          )}
        </>
      )}

      {/* Editor Slide-in Panel — overlays main content area */}
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
            finding={editorFinding}
            onClose={() => { setEditorFile(null); setEditorFinding(null); }}
            onContentChange={handleContentChange}
            onRescan={handleRescan}
          />
        </>
      )}
    </>
  );

  return (
    <MapShell
      topBar={
        <MapTopBar
          isDemo={isDemo}
          onNewMap={handleNewMap}
          showNewMap={agentMap !== null}
          costRecordCount={costRecordCount}
          snapshotCount={(currentSnapshot ? 1 : 0) + (previousSnapshot ? 1 : 0)}
        />
      }
      sidebar={
        agentMap && health ? (
          <MapSidebar
            activeView={activeView}
            onViewChange={setActiveView}
            setupScore={health.score}
            maxScore={health.maxScore}
            agentCount={agentMap.agents.length}
            fileCount={totalFileCount}
            hasFindings={(reviewResult?.findings.length ?? 0) > 0}
            onDownloadSnapshot={() => {
              if (currentSnapshot) downloadSnapshot(currentSnapshot);
            }}
            onUploadSnapshot={() => snapshotInputRef.current?.click()}
            onDownloadNotes={() => {
              if (reviewResult && budget && currentSnapshot) {
                const notes = generateSessionNotes(reviewResult, budget, currentSnapshot, driftReport);
                downloadSessionNotes(notes);
              }
            }}
          />
        ) : (
          /* No sidebar content before a map is loaded */
          <div
            style={{
              background: '#080c14',
              borderRight: '1px solid #3a4e63',
              height: '100%',
            }}
          />
        )
      }
    >
      {mainContent}

      {/* Hidden file input for snapshot upload */}
      <input
        ref={snapshotInputRef}
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
            if (currentSnapshot) {
              setDriftReport(computeDrift(result.snapshot, currentSnapshot));
            }
          } else {
            alert(result.error);
          }
          e.target.value = '';
        }}
      />
    </MapShell>
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
