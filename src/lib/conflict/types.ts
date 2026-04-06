import type { Severity, FileAnalysis } from '@/lib/config-review/types';

export type ConflictCategory =
  | 'structural'
  | 'cross-file'
  | 'within-file'
  | 'duplicate';

export interface ConflictFinding {
  ruleId: string;
  severity: Severity;
  category: ConflictCategory;
  files: string[];             // array, NOT string — diverges from ReviewFinding.file
  message: string;
  conflictingPhrases?: string[];
  recommendation: string;
}

export interface ConflictRule {
  id: string;
  name: string;
  description: string;
  category: ConflictCategory;
  severity: Severity;
  check: (files: FileAnalysis[]) => ConflictFinding[];
}

export interface ConflictResult {
  findings: ConflictFinding[];
  structuralCount: number;
  crossFileCount: number;
  withinFileCount: number;
  duplicateCount: number;
  totalCount: number;
  filesAnalyzed: number;
  rulesExecuted: number;
}

// Re-export for convenience
export type { Severity, FileAnalysis } from '@/lib/config-review/types';
