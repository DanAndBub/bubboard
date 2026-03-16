import type { Snapshot } from './types';

/**
 * Download a snapshot as a JSON file.
 */
export function downloadSnapshot(snapshot: Snapshot): void {
  const dateStr = snapshot.timestamp.slice(0, 10);
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `driftwatch-snapshot-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
