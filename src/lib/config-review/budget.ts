import { FileAnalysis, BootstrapBudget } from './types';
import { BUDGET_RECOMMENDED } from './thresholds';

/**
 * Calculate the aggregate bootstrap budget from all workspace files.
 */
export function calculateBudget(
  files: FileAnalysis[],
  budgetLimit: number = BUDGET_RECOMMENDED,
): BootstrapBudget {
  const totalChars = files.reduce((sum, f) => sum + f.charCount, 0);

  const perFileBreakdown = files
    .map(f => ({
      path: f.path,
      charCount: f.charCount,
      percentOfBudget: budgetLimit > 0 ? (f.charCount / budgetLimit) * 100 : 0,
    }))
    .sort((a, b) => b.charCount - a.charCount);

  return {
    files,
    totalChars,
    budgetLimit,
    overBudgetBy: Math.max(0, totalChars - budgetLimit),
    perFileBreakdown,
  };
}
