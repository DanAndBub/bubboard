import { FileAnalysis } from './types';

/**
 * Analyze a raw file content string into a FileAnalysis object.
 * Pure function — no side effects.
 */
export function analyzeFile(path: string, content: string): FileAnalysis {
  const lines = content.split('\n');
  const headings = lines
    .filter(line => /^#{1,6}\s/.test(line))
    .map(line => line.replace(/^#+\s*/, '').trim());

  return {
    path,
    content,
    charCount: content.length,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    lineCount: lines.length,
    headings,
    sectionCount: headings.length,
  };
}

/**
 * Analyze multiple files from a Record<path, content>.
 */
export function analyzeFiles(files: Record<string, string>): FileAnalysis[] {
  return Object.entries(files).map(([path, content]) => analyzeFile(path, content));
}
