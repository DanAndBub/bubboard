import { ReviewRule, ReviewFinding, FileAnalysis } from '../types';

/**
 * Heuristics for detecting agent-authored edits in config files.
 * Can't prove authorship — these are patterns commonly left by LLM writes.
 */

// Patterns suggesting LLM-generated content
const AGENT_SIGNATURES = [
  /\(Added \d{2}-\d{2}/i,           // "(Added 02-23 — from audit)"
  /\(Updated \d{2}-\d{2}/i,         // "(Updated 02-24)"
  /\(Consolidated \d{2}-\d{2}/i,
  /# Last updated: \d{4}-\d{2}-\d{2}/,
  /<!-- auto-generated/i,
  /<!-- added by agent/i,
];

const MARKUP_ARTIFACTS = [
  /```[\s\S]{0,20}```/,              // Empty or near-empty code blocks
  /\[TODO\]/i,                       // TODO markers left behind
  /\[PLACEHOLDER\]/i,
  /\[INSERT .+\]/i,                  // "[INSERT X HERE]" patterns
];

export const agentEditRules: ReviewRule[] = [
  {
    id: 'AGENT_SIGNATURE',
    name: 'Agent edit signatures detected',
    description: 'Patterns suggesting this file was edited by an agent',
    targetFiles: '*',
    severity: 'info',
    category: 'agent-edit',
    check(files) {
      const findings: ReviewFinding[] = [];
      for (const f of files) {
        const matches = AGENT_SIGNATURES.filter(p => p.test(f.content));
        if (matches.length > 0) {
          findings.push({
            ruleId: 'AGENT_SIGNATURE',
            severity: 'info',
            category: 'agent-edit',
            file: f.path,
            message: `${f.path} contains ${matches.length} pattern${matches.length > 1 ? 's' : ''} suggesting agent edits (date-stamped additions, auto-generated markers). These aren't necessarily wrong — but verify the agent hasn't drifted from your intent.`,
            recommendation: 'Review date-stamped entries. Agents sometimes append rules that contradict earlier ones, or add sections that bloat the file over time.',
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'AGENT_DUPLICATE_PARAGRAPH',
    name: 'Repeated paragraphs within file',
    description: 'Same content appears multiple times in one file — common agent write artifact',
    targetFiles: '*',
    severity: 'warning',
    category: 'agent-edit',
    check(files) {
      const findings: ReviewFinding[] = [];
      for (const f of files) {
        const blocks = f.content.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length >= 40);
        const seen = new Map<string, number>();
        for (const block of blocks) {
          const key = block.toLowerCase();
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
        const dupes = [...seen.entries()].filter(([, count]) => count > 1);
        if (dupes.length > 0) {
          const preview = dupes[0][0].slice(0, 60) + '…';
          findings.push({
            ruleId: 'AGENT_DUPLICATE_PARAGRAPH',
            severity: 'warning',
            category: 'agent-edit',
            file: f.path,
            message: `${f.path} has ${dupes.length} paragraph${dupes.length > 1 ? 's' : ''} repeated within the same file. Example: "${preview}"`,
            recommendation: 'Duplicate paragraphs waste tokens and usually indicate an agent appended content without checking what already exists. Remove duplicates.',
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'AGENT_MARKUP_ARTIFACTS',
    name: 'Incomplete markup artifacts',
    description: 'Placeholder text or empty code blocks suggesting unfinished edits',
    targetFiles: '*',
    severity: 'info',
    category: 'agent-edit',
    check(files) {
      const findings: ReviewFinding[] = [];
      for (const f of files) {
        const matches = MARKUP_ARTIFACTS.filter(p => p.test(f.content));
        if (matches.length > 0) {
          findings.push({
            ruleId: 'AGENT_MARKUP_ARTIFACTS',
            severity: 'info',
            category: 'agent-edit',
            file: f.path,
            message: `${f.path} contains placeholder or artifact markup (TODOs, empty code blocks, INSERT markers). These are usually left behind by incomplete agent edits.`,
            recommendation: 'Clean up placeholder text. It wastes tokens and may confuse the agent.',
          });
        }
      }
      return findings;
    },
  },
];
