// ── Severity & Category ──────────────────────────────────────────────

export type Severity = 'info' | 'warning' | 'critical';

export type Category =
  | 'size'
  | 'structure'
  | 'contradiction'
  | 'truncation'
  | 'agent-edit'
  | 'duplication';

// ── File Analysis ────────────────────────────────────────────────────

export interface FileAnalysis {
  path: string;
  content: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  headings: string[];
  sectionCount: number;
}

// ── Truncation ───────────────────────────────────────────────────────

export interface TruncationAnalysis {
  fileCharCount: number;
  bootstrapMaxChars: number;
  headChars: number;
  tailChars: number;
  hiddenChars: number;
  hiddenRange: { start: number; end: number } | null;
}

// ── Bootstrap Budget ─────────────────────────────────────────────────

export interface BootstrapBudget {
  files: FileAnalysis[];
  totalChars: number;
  budgetLimit: number;
  overBudgetBy: number;
  perFileBreakdown: Array<{
    path: string;
    charCount: number;
    percentOfBudget: number;
  }>;
}

// ── Review Findings ──────────────────────────────────────────────────

export interface ReviewFinding {
  ruleId: string;
  severity: Severity;
  category: Category;
  file: string;
  message: string;
  recommendation: string;
  charCount?: number;
  threshold?: number;
}

// ── Rule Definition ──────────────────────────────────────────────────

export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  targetFiles: string[] | '*';
  severity: Severity;
  category: Category;
  check: (files: FileAnalysis[]) => ReviewFinding[];
}
