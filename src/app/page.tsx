'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseAgentTree } from '@/lib/parser';
import { pathsToTree } from '@/lib/pathsToTree';
import { analyzeAgentsMd, analyzeOpenClawConfig, analyzeHeartbeat } from '@/lib/analyzer';
import { getDemoAgentMap, getDemoFileContents } from '@/lib/demo-data';
import { DEMO_DRIFT_REPORT, DEMO_SNAPSHOT, DEMO_BUDGET } from '@/lib/phase3-demo-data';
import type { AgentMap } from '@/lib/types';
import { analyzeFile, analyzeFiles } from '@/lib/config-review/analyze-file';
import { runReview, type ReviewResult } from '@/lib/config-review/runner';
import { calculateBudget } from '@/lib/config-review/budget';
import { BOOTSTRAP_FILE_ORDER } from '@/lib/config-review/thresholds';
import type { BootstrapBudget, ReviewFinding } from '@/lib/config-review/types';
import { serializeSnapshot } from '@/lib/drift/snapshot-serialize';
import { downloadSnapshot } from '@/lib/drift/snapshot-export';
import { importSnapshot } from '@/lib/drift/snapshot-import';
import { computeDrift } from '@/lib/drift/diff-engine';
import type { Snapshot, DriftReport } from '@/lib/drift/types';
import EditorPanel from '@/components/editor/EditorPanel';
import DirectoryScanner from '@/scanner/DirectoryScanner';
import MapShell from '@/components/map/MapShell';
import MapTopBar from '@/components/map/MapTopBar';
import MapSidebar from '@/components/map/MapSidebar';
import ReviewView from '@/components/map/views/ReviewView';
import DriftView from '@/components/map/views/DriftView';
import ConflictScannerView from '@/components/map/views/ConflictScannerView';

const BOOTSTRAP_NAMES = new Set(BOOTSTRAP_FILE_ORDER.map(f => f.toUpperCase()));

function isBootstrapFile(filename: string): boolean {
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  return BOOTSTRAP_NAMES.has(base);
}

type View = 'review' | 'drift' | 'conflict';

function ScanPageContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [agentMap, setAgentMap] = useState<AgentMap | null>(() => isDemo ? getDemoAgentMap() : null);
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => isDemo ? getDemoFileContents() : {});
  const [_inputCollapsed, setInputCollapsed] = useState(() => isDemo);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [analyzedFiles, setAnalyzedFiles] = useState<ReturnType<typeof analyzeFile>[]>([]);
  const [budget, setBudget] = useState<BootstrapBudget | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const [editorFile, setEditorFile] = useState<string | null>(null);
  const [editorFinding, setEditorFinding] = useState<ReviewFinding | null>(null);
  const [activeView, setActiveView] = useState<View>('review');

  // Apply ?view= query param on mount
  const initialView = searchParams.get('view');
  useEffect(() => {
    const valid: View[] = ['review', 'drift', 'conflict'];
    if (initialView && (valid as string[]).includes(initialView)) {
      setActiveView(initialView as View);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const snapshotInputRef = useRef<HTMLInputElement>(null);
  const scanStatsFiredRef = useRef(false);

  // Demo mode: run config review on initial demo data (state initialized in useState above)
  useEffect(() => {
    if (isDemo && fileContents && Object.keys(fileContents).length > 0) {
      const mdFiles = Object.entries(fileContents).filter(([k]) => k.toLowerCase().endsWith('.md') && isBootstrapFile(k));
      if (mdFiles.length > 0) {
        const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
        setAnalyzedFiles(analyzed);
        setReviewResult(runReview(analyzed));
      }
      // Load pre-built Phase 3 demo data for full experience
      setCurrentSnapshot(DEMO_SNAPSHOT);
      setDriftReport(DEMO_DRIFT_REPORT);
      setBudget(DEMO_BUDGET);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 function loadDemoData() {
    const demoMap = getDemoAgentMap();
    const demoContents = getDemoFileContents();
    setAgentMap(demoMap);
    setFileContents(demoContents);
    setInputCollapsed(true);
    setActiveView('review');
    window.history.pushState({}, '', '/?demo=true');

    const mdFiles = Object.entries(demoContents).filter(([k]) => k.toLowerCase().endsWith('.md') && isBootstrapFile(k));
    if (mdFiles.length > 0) {
      const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
      setAnalyzedFiles(analyzed);
      setReviewResult(runReview(analyzed));
    }
    setCurrentSnapshot(DEMO_SNAPSHOT);
    setDriftReport(DEMO_DRIFT_REPORT);
    setBudget(DEMO_BUDGET);
  }

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
    const mdFiles = Object.entries(allContents).filter(([k]) => k.toLowerCase().endsWith('.md') && isBootstrapFile(k));
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
    scanStatsFiredRef.current = false;
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
      const mdFiles = Object.entries(allContents).filter(([k, v]) => k.toLowerCase().endsWith('.md') && v.length > 0 && isBootstrapFile(k));
      if (mdFiles.length > 0) {
        const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
        setAnalyzedFiles(analyzed);
        const review = runReview(analyzed);
        setReviewResult(review);
        const fileBudget = calculateBudget(analyzed);
        setBudget(fileBudget);

        // Fire-and-forget scan stats (real scans only, once per scan)
        if (!scanStatsFiredRef.current) {
          scanStatsFiredRef.current = true;
          const truncatedFileCount = new Set(
            review.findings.filter(f => f.category === 'truncation').map(f => f.file)
          ).size;
          fetch('/api/scan-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filesScanned: analyzed.length,
              totalChars: fileBudget.totalChars,
              truncatedFiles: truncatedFileCount,
            }),
          }).catch(() => {});
        }

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

  function handleNewMap(options: { clearSnapshots: boolean }) {
    setAgentMap(null);
    setFileContents({});
    setReviewResult(null);
    setCurrentSnapshot(null);
    setPreviousSnapshot(null);
    setDriftReport(null);
    setBudget(null);
    setInputCollapsed(false);
    setActiveView('review');
    window.history.pushState({}, '', '/');
    if (options.clearSnapshots) {
      setCurrentSnapshot(null);
      setPreviousSnapshot(null);
      setDriftReport(null);
    }
  }

  // Main content rendered inside MapShell
  const mainContent = (
    <>
      {!agentMap ? (
        /* ── INPUT SECTION ─────────────────────────────────────────────── */
        <div className="w-full max-w-[520px] mx-auto px-4 py-16 flex flex-col gap-8">

          {/* Headline + sub-copy */}
          <div className="text-center flex flex-col gap-3">
            <h1 className="text-[28px] font-semibold text-[#e2e8f0] leading-[1.3] tracking-[-0.01em]">
              Find what&apos;s being silently cut from your agent config.
            </h1>
            <p className="text-[16px] text-[#94a3b8] leading-relaxed max-w-[440px] mx-auto">
              Scan your OpenClaw workspace. Check file sizes against context window limits, find truncation zones, see exactly where content is being dropped.
            </p>
          </div>

          {/* CTAs — stacked: scanner on top, demo below */}
          <div className="flex flex-col gap-3">
            <DirectoryScanner onConfirm={handleDirectoryConfirm} />
            <button
              onClick={loadDemoData}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#1e2a38] bg-transparent px-6 py-3 text-[13px] font-mono font-medium text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#2d3f5a] transition-colors cursor-pointer"
            >
              Try demo data
            </button>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <span className="text-[12px] text-[#506880]">Runs in your browser</span>
            <span className="text-[10px] text-[#1e2a38]">&middot;</span>
            <span className="text-[12px] text-[#506880]">Nothing uploaded</span>
            <span className="text-[10px] text-[#1e2a38]">&middot;</span>
            <span className="text-[12px] text-[#506880]">Chrome or Edge required</span>
          </div>

          {/* Capabilities */}
          <div className="flex flex-col gap-5 pt-2 border-t border-[#1e2a38]">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-mono font-medium text-[#e2e8f0]">Truncation detection</span>
              <span className="text-[14px] text-[#94a3b8] leading-snug">See which bootstrap files exceed context window limits and where content gets cut.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-mono font-medium text-[#e2e8f0]">Config health review</span>
              <span className="text-[14px] text-[#94a3b8] leading-snug">Check for contradictions, structural issues, and agent-edit artifacts across your config files.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-mono font-medium text-[#e2e8f0]">Drift tracking</span>
              <span className="text-[14px] text-[#94a3b8] leading-snug">Snapshot your config state, compare across sessions, catch unintended changes.</span>
            </div>
          </div>

          {/* Skill promotion */}
          <p className="text-[13px] text-[#506880] text-center leading-relaxed pt-2 border-t border-[#1e2a38]">
            Also available as a CLI skill.{' '}
            <a
              href="https://clawhub.ai/danandbub/driftwatch-oc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3b82f6] hover:text-[#e2e8f0] transition-colors"
            >
              The Driftwatch skill
            </a>{' '}
            runs{' '}
            <code className="font-mono text-[12px] text-[#94a3b8] bg-[#111820] px-1.5 py-0.5 rounded">scan my config</code>{' '}
            directly in your workspace.
          </p>
        </div>
      ) : (
        /* ── VIEW-BASED LAYOUT ──────────────────────────────────────────── */
        <>
          {activeView === 'review' && (
            <ReviewView
              analyzedFiles={analyzedFiles}
              budget={budget}
            />
          )}
          {activeView === 'conflict' && (
            <ConflictScannerView />
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
      isDemo={isDemo}
      topBar={
        <MapTopBar
          isDemo={isDemo}
          onNewMap={handleNewMap}
          showNewMap={agentMap !== null}
          snapshotCount={(currentSnapshot ? 1 : 0) + (previousSnapshot ? 1 : 0)}
        />
      }
      onScanYours={() => {
        handleNewMap({ clearSnapshots: false });
        window.history.pushState({}, '', '/');
      }}
      sidebar={
        agentMap ? (
          <MapSidebar
            activeView={activeView}
            onViewChange={setActiveView}

            hasFindings={(reviewResult?.findings.length ?? 0) > 0}
            onDownloadSnapshot={() => {
              if (currentSnapshot) downloadSnapshot(currentSnapshot);
            }}
            onUploadSnapshot={() => snapshotInputRef.current?.click()}
          />
        ) : null
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

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#506880] text-sm">Loading...</div>
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  );
}
