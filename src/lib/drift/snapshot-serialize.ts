import type { Snapshot, SnapshotFile, SnapshotAgent } from './types';
import { SNAPSHOT_SCHEMA_VERSION } from './types';
import type { FileAnalysis } from '@/lib/config-review/types';
import type { ReviewResult } from '@/lib/config-review/runner';
import type { BootstrapBudget } from '@/lib/config-review/types';
import type { AgentMap } from '@/lib/types';
import { contentHash } from './content-hash';

// Simple API key redaction before hashing
function redactContent(text: string): string {
  return text
    .replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_ANTHROPIC_KEY]')
    .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/ANTHROPIC_API_KEY\s*=\s*\S+/g, 'ANTHROPIC_API_KEY=[REDACTED]')
    .replace(/OPENAI_API_KEY\s*=\s*\S+/g, 'OPENAI_API_KEY=[REDACTED]');
}

export async function serializeSnapshot(
  files: FileAnalysis[],
  review: ReviewResult,
  budget: BootstrapBudget,
  agentMap: AgentMap | null,
): Promise<Snapshot> {
  // Build file entries with content hashes
  const snapshotFiles: SnapshotFile[] = await Promise.all(
    files.map(async (f) => ({
      path: f.path,
      charCount: f.charCount,
      wordCount: f.wordCount,
      lineCount: f.lineCount,
      headingCount: f.headings.length,
      headings: f.headings,
      contentHash: await contentHash(redactContent(f.content)),
    })),
  );

  // Extract agents from map
  const agents: SnapshotAgent[] = agentMap
    ? agentMap.agents.map(a => ({
        id: a.id,
        model: a.model,
      }))
    : [];

  // Build architecture summary
  const agentCount = agents.length;
  const fileCount = files.length;
  const summary = `${agentCount} agent${agentCount !== 1 ? 's' : ''}, ${fileCount} workspace files, ${budget.totalChars.toLocaleString()} chars total bootstrap`;

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    driftwatchVersion: '3.0.0',
    workspaceSummary: {
      totalFiles: fileCount,
      totalChars: budget.totalChars,
      bootstrapBudgetUsed: budget.totalChars,
      bootstrapBudgetLimit: budget.budgetLimit,
    },
    files: snapshotFiles,
    healthScore: review.healthScore,
    reviewFindings: review.findings,
    agents,
    architectureSummary: summary,
  };
}
