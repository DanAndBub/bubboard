'use client';

import { useState, useMemo } from 'react';
import MapShell from '@/components/map/MapShell';
import MapTopBar from '@/components/map/MapTopBar';
import MapSidebar from '@/components/map/MapSidebar';
import OverviewView from '@/components/map/views/OverviewView';
import AgentsView from '@/components/map/views/AgentsView';
import FilesView from '@/components/map/views/FilesView';
import CostsView from '@/components/map/views/CostsView';
import ReviewPanel from '@/components/config-review/ReviewPanel';
import { getDemoAgentMap, getDemoFileContents } from '@/lib/demo-data';
import { DEMO_REVIEW_RESULT, DEMO_BUDGET, DEMO_FILE_ANALYSES } from '@/lib/phase3-demo-data';
import { runReview } from '@/lib/config-review/runner';
import { analyzeFiles } from '@/lib/config-review/analyze-file';
import type { StatsData } from '@/lib/types';

type View = 'overview' | 'agents' | 'files' | 'costs' | 'review' | 'drift';

export default function LandingDemo() {
  const [activeView, setActiveView] = useState<View>('overview');

  const demoMap = useMemo(() => getDemoAgentMap(), []);
  const fileContents = useMemo(() => getDemoFileContents(), []);

  const stats: StatsData = useMemo(() => ({
    totalFiles: demoMap.workspace.coreFiles.length + demoMap.workspace.memoryFiles.length + demoMap.workspace.customFiles.length,
    agentCount: demoMap.agents.length,
    memoryEntries: demoMap.workspace.memoryFiles.length,
    skillCount: 0,
    score: DEMO_REVIEW_RESULT.healthScore,
    maxScore: 100,
  }), [demoMap]);

  const reviewResult = useMemo(() => {
    const mdFiles = Object.entries(fileContents).filter(([k]) => k.toLowerCase().endsWith('.md'));
    if (mdFiles.length > 0) {
      const analyzed = analyzeFiles(Object.fromEntries(mdFiles));
      return runReview(analyzed);
    }
    return { findings: DEMO_REVIEW_RESULT.findings, healthScore: DEMO_REVIEW_RESULT.healthScore, rulesExecuted: 0, filesAnalyzed: 0, criticalCount: 0, warningCount: 0, infoCount: 0 };
  }, [fileContents]);

  const analyzedFiles = useMemo(() => {
    const mdFiles = Object.entries(fileContents).filter(([k]) => k.toLowerCase().endsWith('.md'));
    return mdFiles.length > 0 ? analyzeFiles(Object.fromEntries(mdFiles)) : DEMO_FILE_ANALYSES;
  }, [fileContents]);

  const totalFileCount = demoMap.workspace.coreFiles.length + demoMap.workspace.memoryFiles.length + demoMap.workspace.customFiles.length;

  function renderView() {
    switch (activeView) {
      case 'overview':
        return (
          <OverviewView
            agentMap={demoMap}
            stats={stats}
            reviewFindings={reviewResult.findings}
            healthScore={reviewResult.healthScore}
            budget={DEMO_BUDGET}
            onNavigate={(v) => setActiveView(v)}
            isDemo
          />
        );
      case 'agents':
        return <AgentsView agents={demoMap.agents} />;
      case 'files':
        return (
          <FilesView
            workspace={demoMap.workspace}
            fileContents={fileContents}
            analyzedFiles={analyzedFiles}
            budget={DEMO_BUDGET}
            onNavigateToReview={() => setActiveView('review')}
          />
        );
      case 'costs':
        return <CostsView />;
      case 'review':
        return (
          <ReviewPanel
            result={reviewResult}
            files={analyzedFiles}
          />
        );
      case 'drift':
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-[#7a8a9b]">Upload a previous snapshot to see drift</p>
              <p className="text-xs text-[#506880] mt-2">Scan your own workspace to try drift detection</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="rounded-2xl border border-[#506880] overflow-hidden" style={{ height: 820, boxShadow: '0 0 80px rgba(59,130,246,0.08), 0 8px 40px rgba(0,0,0,0.6)' }}>
      <MapShell
        topBar={
          <MapTopBar
            isDemo
            onNewMap={() => {}}
            showNewMap
            costRecordCount={0}
            snapshotCount={0}
          />
        }
        sidebar={
          <MapSidebar
            activeView={activeView}
            onViewChange={setActiveView}
            setupScore={stats.score}
            maxScore={stats.maxScore}
            agentCount={stats.agentCount}
            fileCount={totalFileCount}
            hasFindings={reviewResult.findings.length > 0}
            onDownloadSnapshot={() => {}}
            onUploadSnapshot={() => {}}
            onDownloadNotes={() => {}}
          />
        }
      >
        {renderView()}
      </MapShell>
    </div>
  );
}
