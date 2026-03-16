/**
 * Download session notes as a markdown file.
 */
export function downloadSessionNotes(markdown: string): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `driftwatch-notes-${dateStr}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
