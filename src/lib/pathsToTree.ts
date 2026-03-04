/**
 * Converts a flat array of file paths (e.g. from File.webkitRelativePath)
 * into a tree-style string compatible with parseAgentTree().
 *
 * Input:  ["myOpenClaw/workspace/SOUL.md", "myOpenClaw/agents/main/AGENTS.md", ...]
 * Output: tree string with ├──/└── formatting
 */

type TreeNode = {
  children: Map<string, TreeNode>;
  isDir: boolean;
};

/**
 * Build an in-memory tree from a list of stripped paths.
 * Paths ending with / are marked as directories even if they have no children.
 */
function buildTree(strippedPaths: string[]): TreeNode {
  const root: TreeNode = { children: new Map(), isDir: true };

  for (const path of strippedPaths) {
    const endsWithSlash = path.endsWith('/');
    const parts = path.split('/').filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        current.children.set(part, { children: new Map(), isDir: false });
      }
      const child = current.children.get(part)!;
      // Mark as directory if it's not the last segment, or if path ends with /
      if (i < parts.length - 1 || endsWithSlash) {
        child.isDir = true;
      }
      current = child;
    }
  }

  return root;
}

/**
 * Serialize a tree node into tree-style lines.
 * Directories (nodes with children) come before files; both sorted alphabetically.
 */
function serialize(node: TreeNode, prefix: string, lines: string[]): void {
  const entries = [...node.children.entries()].sort(([nameA, nodeA], [nameB, nodeB]) => {
    const aDirLike = nodeA.isDir || nodeA.children.size > 0;
    const bDirLike = nodeB.isDir || nodeB.children.size > 0;
    if (aDirLike !== bDirLike) return aDirLike ? -1 : 1;
    return nameA.localeCompare(nameB);
  });

  entries.forEach(([name, child], idx) => {
    const isLast = idx === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const isDir = child.isDir || child.children.size > 0;
    const suffix = isDir ? '/' : '';
    lines.push(`${prefix}${connector}${name}${suffix}`);

    if (isDir) {
      serialize(child, prefix + (isLast ? '    ' : '│   '), lines);
    }
  });
}

/**
 * Convert a flat array of file paths (with a common root prefix, as returned
 * by File.webkitRelativePath) into a tree-formatted string suitable for
 * parseAgentTree().
 *
 * @param paths - Array of webkitRelativePath strings, e.g. ["myFolder/agents/main/AGENTS.md"]
 * @returns Tree-formatted string
 */
export function pathsToTree(paths: string[]): string {
  if (paths.length === 0) return '';

  // Check if paths have a common root prefix (webkitdirectory style)
  // or are already relative (V3 scanner style like "workspace/SOUL.md")
  const firstSegments = paths.map(p => p.split('/')[0]);
  const allSameRoot = firstSegments.every(s => s === firstSegments[0]);
  const looksLikeWebkitPaths = allSameRoot && !['workspace', 'agents', 'skills', 'cron', 'openclaw.json'].includes(firstSegments[0]);

  let stripped: string[];
  let rootName: string;

  if (looksLikeWebkitPaths) {
    // webkitdirectory style — strip the root segment
    rootName = firstSegments[0];
    stripped = paths.map(p => p.split('/').slice(1).join('/')).filter(p => p.length > 0);
  } else {
    // V3 scanner style — paths are already relative to .openclaw
    rootName = '~/.openclaw';
    // Keep trailing slashes — they indicate directories
    stripped = paths.filter(p => p.length > 0);
  }

  if (stripped.length === 0) {
    return `${rootName}/\n`;
  }

  const root = buildTree(stripped);
  const lines: string[] = [`${rootName}/`];
  serialize(root, '', lines);

  return lines.join('\n');
}
