import type { Snapshot, DriftReport, FileChange } from './types';
import type { ReviewFinding } from '@/lib/config-review/types';

/**
 * Two-point diff between a previous snapshot and current scan state.
 * Returns a DriftReport summarizing all changes.
 */
export function computeDrift(previous: Snapshot, current: Snapshot): DriftReport {
  const prevFileMap = new Map(previous.files.map(f => [f.path, f]));
  const currFileMap = new Map(current.files.map(f => [f.path, f]));

  // Files added/removed
  const filesAdded: string[] = [];
  const filesRemoved: string[] = [];
  const filesChanged: FileChange[] = [];
  const filesUnchanged: string[] = [];

  // Check current files against previous
  for (const [path, curr] of currFileMap) {
    const prev = prevFileMap.get(path);
    if (!prev) {
      filesAdded.push(path);
      continue;
    }

    if (curr.contentHash === prev.contentHash) {
      filesUnchanged.push(path);
      continue;
    }

    const charCountDelta = curr.charCount - prev.charCount;
    const percentGrowth = prev.charCount > 0
      ? ((curr.charCount - prev.charCount) / prev.charCount) * 100
      : curr.charCount > 0 ? 100 : 0;

    const prevHeadings = new Set(prev.headings);
    const currHeadings = new Set(curr.headings);
    const headingsAdded = [...currHeadings].filter(h => !prevHeadings.has(h));
    const headingsRemoved = [...prevHeadings].filter(h => !currHeadings.has(h));

    filesChanged.push({
      path,
      charCountDelta,
      percentGrowth,
      headingsAdded,
      headingsRemoved,
      contentHashChanged: true,
    });
  }

  // Check for removed files
  for (const path of prevFileMap.keys()) {
    if (!currFileMap.has(path)) {
      filesRemoved.push(path);
    }
  }

  // Significant growth thresholds
  const significantGrowth = filesChanged.filter(f => f.percentGrowth > 30);
  const possibleAgentBloat = filesChanged.filter(f => f.percentGrowth > 50);

  // Health score delta
  const healthScoreDelta = current.healthScore - previous.healthScore;

  // Finding diffs — compare by ruleId + file
  const findingKey = (f: ReviewFinding) => `${f.ruleId}::${f.file}`;
  const prevFindingKeys = new Set(previous.reviewFindings.map(findingKey));
  const currFindingKeys = new Set(current.reviewFindings.map(findingKey));

  const newFindings = current.reviewFindings.filter(f => !prevFindingKeys.has(findingKey(f)));
  const resolvedFindings = previous.reviewFindings.filter(f => !currFindingKeys.has(findingKey(f)));
  const persistentFindings = current.reviewFindings.filter(f => prevFindingKeys.has(findingKey(f)));

  // Agent topology changes
  const prevAgentIds = new Set(previous.agents.map(a => a.id));
  const currAgentIds = new Set(current.agents.map(a => a.id));
  const agentTopologyChanges = {
    added: [...currAgentIds].filter(id => !prevAgentIds.has(id)),
    removed: [...prevAgentIds].filter(id => !currAgentIds.has(id)),
  };

  // Budget delta
  const budgetDelta = current.workspaceSummary.totalChars - previous.workspaceSummary.totalChars;

  // Days between
  const prevDate = new Date(previous.timestamp);
  const currDate = new Date(current.timestamp);
  const daysBetween = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    previousTimestamp: previous.timestamp,
    currentTimestamp: current.timestamp,
    daysBetween,
    filesAdded,
    filesRemoved,
    filesChanged,
    filesUnchanged,
    significantGrowth,
    possibleAgentBloat,
    healthScoreDelta,
    newFindings,
    resolvedFindings,
    persistentFindings,
    agentTopologyChanges,
    budgetDelta,
  };
}
