/**
 * Shared helpers for the conflict detection engine.
 * Pure functions — no side effects, no imports from rule modules.
 */

/**
 * Case-insensitive keyword matching.
 * Returns the subset of keywords found in the content string.
 */
export function findMatches(content: string, keywords: string[]): string[] {
  const lower = content.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase()));
}

/**
 * Jaccard similarity coefficient between two word sets.
 * Returns a value in [0, 1] where 1 = identical, 0 = disjoint.
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Parse markdown content into a Map of { sectionName -> sectionContent }.
 * Lines before the first heading go under key '__preamble__'.
 * The heading line itself is NOT included in the section content.
 */
export function parseSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split('\n');
  let currentHeading = '__preamble__';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = /^#{1,6}\s+(.+)/.exec(line);
    if (headingMatch) {
      sections.set(currentHeading, currentLines.join('\n'));
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  sections.set(currentHeading, currentLines.join('\n'));
  return sections;
}
