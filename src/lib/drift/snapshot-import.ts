import type { Snapshot } from './types';
import { SNAPSHOT_SCHEMA_VERSION } from './types';

export type ImportResult = {
  ok: true;
  snapshot: Snapshot;
} | {
  ok: false;
  error: string;
}

/**
 * Parse and validate an uploaded snapshot JSON file.
 */
export function importSnapshot(jsonString: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'Invalid JSON file.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'File does not contain a valid snapshot object.' };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.schemaVersion !== 'number') {
    return { ok: false, error: 'Missing schemaVersion — this doesn\'t appear to be a Driftwatch snapshot.' };
  }

  if (obj.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Snapshot version ${obj.schemaVersion} is not compatible with current version ${SNAPSHOT_SCHEMA_VERSION}. Re-scan your workspace to create a new baseline.`,
    };
  }

  if (!obj.timestamp || !obj.files || !Array.isArray(obj.files)) {
    return { ok: false, error: 'Snapshot is missing required fields (timestamp, files).' };
  }

  return { ok: true, snapshot: obj as unknown as Snapshot };
}
