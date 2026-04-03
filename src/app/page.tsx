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
import { generateSessionNotes } from '@/lib/drift/session-notes';
import { downloadSessionNotes } from '@/lib/drift/session-notes-export';
import type { Snapshot, DriftReport } from '@/lib/drift/types';
import EditorPanel from '@/components/editor/EditorPanel';
import CommunityCounter from '@/components/CommunityCounter';
import DirectoryScanner from '@/scanner/DirectoryScanner';
import MapShell from '@/components/map/MapShell';
import MapTopBar from '@/components/map/MapTopBar';
import MapSidebar from '@/components/map/MapSidebar';
import ReviewView from '@/components/map/views/ReviewView';
import DriftView from '@/components/map/views/DriftView';

const BOOTSTRAP_NAMES = new Set(BOOTSTRAP_FILE_ORDER.map(f => f.toUpperCase()));

function isBootstrapFile(filename: string): boolean {
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  return BOOTSTRAP_NAMES.has(base);
}

type View = 'review' | 'drift';

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
    const valid: View[] = ['review', 'drift'];
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
        <div className="w-full max-w-[520px] mx-auto px-4 py-10 flex flex-col gap-6">

          {/* Category label */}
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#7db8fc] text-center">
            bootstrap file inspector
          </p>

          {/* Headline + sub-copy */}
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-[#f1f5f9]">
              See what your agent can&apos;t see.
            </h2>
            <p className="text-sm text-[#b0bec9] leading-relaxed">
              Scan your OpenClaw workspace. Check file sizes, find truncation zones, see exactly what&apos;s being cut.
            </p>
          </div>

          {/* Primary CTA — scan button */}
          <DirectoryScanner onConfirm={handleDirectoryConfirm} />

          {/* Secondary CTA — demo */}
          <button
            onClick={loadDemoData}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#30363d] bg-transparent px-4 py-2.5 text-sm font-mono text-[#7a8a9b] hover:text-[#b0bec9] hover:border-[#506880] transition-colors"
          >
            try demo data
          </button>

          {/* Trust signals */}
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center sm:gap-0 sm:divide-x sm:divide-[#30363d]">
            {['runs entirely in your browser', 'nothing uploaded, nothing stored', 'chrome or edge required for folder access'].map(line => (
              <span key={line} className="text-[11px] text-[#506880] sm:px-3">
                {line}
              </span>
            ))}
          </div>

          {/* Community counter */}
          <div className="border-t border-[#1e2a38] pt-5">
            <CommunityCounter />
          </div>
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
            onDownloadNotes={() => {
              if (reviewResult && budget && currentSnapshot) {
                const notes = generateSessionNotes(reviewResult, budget, currentSnapshot, driftReport);
                downloadSessionNotes(notes);
              }
            }}
          />
        ) : (
          /* No sidebar content before a scan is loaded */
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

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#7a8a9b] text-sm">Loading...</div>
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  );
}
