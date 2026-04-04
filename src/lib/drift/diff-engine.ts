import type { Snapshot, DriftReport, FileChange } from './types';

/**
 * Two-point diff between a previous snapshot and current scan state.
 * Returns a DriftReport summarizing character-level changes.
 */
export function computeDrift(previous: Snapshot, current: Snapshot): DriftReport {
  const prevFileMap = new Map(previous.files.map(f => [f.path, f]));
  const currFileMap = new Map(current.files.map(f => [f.path, f]));

  const filesChanged: FileChange[] = [];

  // Only include files present in both snapshots where content changed
  for (const [path, curr] of currFileMap) {
    const prev = prevFileMap.get(path);
    if (!prev) continue; // added — skip
    if (curr.contentHash === prev.contentHash) continue; // unchanged — skip

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

  // Days between
  const prevDate = new Date(previous.timestamp);
  const currDate = new Date(current.timestamp);
  const daysBetween = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    previousTimestamp: previous.timestamp,
    currentTimestamp: current.timestamp,
    daysBetween,
    filesChanged,
    totalCharsDelta: current.workspaceSummary.totalChars - previous.workspaceSummary.totalChars,
  };
}
