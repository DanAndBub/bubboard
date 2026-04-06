import { findMatches, parseSections } from '../helpers';
import type { ConflictRule, ConflictFinding, FileAnalysis } from '../types';

// ── High-confidence self-contradiction pairs ──────────────────────────

const SELF_CONFLICT_PAIRS = [
  {
    sideA: ['always ask', 'always escalate'],
    sideB: ['never ask', 'figure it out', 'resolve independently'],
  },
  {
    sideA: ['always verbose', 'always explain'],
    sideB: ['never verbose', 'concise', "don't explain"],
  },
  {
    sideA: ['always delegate'],
    sideB: ["don't delegate", 'handle directly'],
  },
];

// ── Within-file self-conflict detection ───────────────────────────────

function checkWithinFileSelfConflict(files: FileAnalysis[]): ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  for (const file of files) {
    const sections = parseSections(file.content);
    const sectionEntries = [...sections.entries()];

    for (const pair of SELF_CONFLICT_PAIRS) {
      // Find all sections with side A matches
      const sideASections = sectionEntries.filter(
        ([, content]) => findMatches(content, pair.sideA).length > 0,
      );
      // Find all sections with side B matches
      const sideBSections = sectionEntries.filter(
        ([, content]) => findMatches(content, pair.sideB).length > 0,
      );

      if (sideASections.length === 0 || sideBSections.length === 0) continue;

      // Only fire if the matches come from DIFFERENT sections within the same file
      const sideASectionNames = new Set(sideASections.map(([name]) => name));
      const sideBSectionNames = new Set(sideBSections.map(([name]) => name));
      const hasDifferentSections = [...sideASectionNames].some(n => !sideBSectionNames.has(n));
      if (!hasDifferentSections) continue;

      const aKeyword = findMatches(sideASections[0][1], pair.sideA)[0];
      const bKeyword = findMatches(sideBSections[0][1], pair.sideB)[0];

      findings.push({
        ruleId: 'WITHIN_SELF_CONFLICT',
        severity: 'info',
        category: 'within-file',
        files: [file.path],
        message: `Self-contradiction in "${file.path}": "${aKeyword}" in section "${sideASections[0][0]}" conflicts with "${bKeyword}" in section "${sideBSections[0][0]}"`,
        conflictingPhrases: [aKeyword, bKeyword],
        recommendation: `This file contains contradicting instructions in different sections. Review and reconcile — an agent reading the full file will encounter both directives.`,
      });
    }
  }

  return findings;
}

// ── Export ────────────────────────────────────────────────────────────

export const withinFileRules: ConflictRule[] = [
  {
    id: 'WITHIN_SELF_CONFLICT',
    name: 'Within-file self-contradiction',
    description: 'Same file contains contradicting instructions in different sections',
    category: 'within-file',
    severity: 'info',
    check: checkWithinFileSelfConflict,
  },
];
