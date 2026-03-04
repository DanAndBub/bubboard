// scannerUtils.ts — shared constants, classifier, and scan methods

// ============================================================
// TARGET MANIFEST
// ============================================================

export interface ScanResult {
  path: string;
  bucket: string;
}

export const FIXED_FILES = [
  { path: ['openclaw.json'], bucket: 'config' },
  { path: ['cron', 'jobs.json'], bucket: 'cron' },
];

export const WORKSPACE_MD_NAMES = [
  'SOUL.md', 'AGENTS.md', 'MEMORY.md', 'TOOLS.md',
  'HEARTBEAT.md', 'USER.md', 'IDENTITY.md',
];

export const MD_LISTING_DIRS = [
  { path: ['workspace', 'memory'], bucket: 'memory' },
  { path: ['workspace', 'subagents'], bucket: 'subagents' },
];

export const DIR_LISTING_DIRS = [
  { path: ['agents'], bucket: 'agents' },
  { path: ['skills'], bucket: 'skills' },
];

export const MANIFEST_VERSION = '3.0';

export const BUCKETS: Record<string, { label: string; icon: string }> = {
  config: { label: 'Config', icon: '⚙️' },
  workspace: { label: 'Workspace Docs', icon: '📝' },
  agents: { label: 'Agent Directories', icon: '🤖' },
  memory: { label: 'Memory Files', icon: '🧠' },
  subagents: { label: 'Subagent Protocols', icon: '🔗' },
  skills: { label: 'Skills', icon: '⚡' },
  cron: { label: 'Cron Config', icon: '⏰' },
};

export const HAS_FS_ACCESS =
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const HAS_WEBKIT_DIR =
  typeof document !== 'undefined' &&
  'webkitdirectory' in document.createElement('input');

// ============================================================
// SHARED CLASSIFIER — single source of truth
// ============================================================

export function classifyRelativePath(rel: string): ScanResult | null {
  const cleaned = rel.replace(/\/$/, '');
  const segments = cleaned.split('/').filter(Boolean);

  for (const { path, bucket } of FIXED_FILES) {
    if (cleaned === path.join('/')) return { path: cleaned, bucket };
  }

  if (segments[0] === 'workspace' && segments.length === 2 && segments[1].endsWith('.md')) {
    return { path: cleaned, bucket: 'workspace' };
  }
  if (segments[0] === 'workspace' && segments[1] === 'memory' && segments.length === 3 && segments[2].endsWith('.md')) {
    return { path: cleaned, bucket: 'memory' };
  }
  if (segments[0] === 'workspace' && segments[1] === 'subagents' && segments.length === 3 && segments[2].endsWith('.md')) {
    return { path: cleaned, bucket: 'subagents' };
  }
  if (segments[0] === 'agents' && segments.length >= 2) {
    return { path: `agents/${segments[1]}/`, bucket: 'agents' };
  }
  if (segments[0] === 'skills' && segments.length >= 2) {
    return { path: `skills/${segments[1]}/`, bucket: 'skills' };
  }
  return null;
}

// ============================================================
// HELPERS
// ============================================================

async function getNestedDir(
  rootHandle: FileSystemDirectoryHandle,
  segments: string[]
): Promise<FileSystemDirectoryHandle | null> {
  let current = rootHandle;
  for (const seg of segments) {
    try {
      current = await current.getDirectoryHandle(seg);
    } catch {
      return null;
    }
  }
  return current;
}

async function fileExists(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<boolean> {
  try {
    await dirHandle.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
}

async function readFileContent(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<string | null> {
  try {
    const fh = await dirHandle.getFileHandle(filename);
    const file = await fh.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

const SENSITIVE_KEYS_RE = /^(key|token|secret|password|apiKey|api_key)$/i;

export function redactSensitiveValues(jsonString: string): string {
  try {
    const obj = JSON.parse(jsonString) as unknown;
    const redact = (value: unknown): unknown => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) return value.map(redact);
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          result[k] = SENSITIVE_KEYS_RE.test(k) ? '[REDACTED]' : redact(v);
        }
        return result;
      }
      return value;
    };
    return JSON.stringify(redact(obj), null, 2);
  } catch {
    return jsonString;
  }
}

// ============================================================
// SCAN METHOD 1: File System Access API (Chrome/Edge)
// ============================================================

export interface ScanWithFSAccessResult {
  results: ScanResult[];
  fileContents: Record<string, string>;
}

export async function scanWithFSAccess(
  onProgress?: (checked: number, found: number) => void
): Promise<ScanWithFSAccessResult | null> {
  let rootHandle: FileSystemDirectoryHandle;
  try {
    rootHandle = await (window as unknown as { showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: 'read' });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return null;
    throw err;
  }

  const found: ScanResult[] = [];
  const fileContents: Record<string, string> = {};
  let checked = 0;
  const tick = () => {
    checked++;
    if (onProgress) onProgress(checked, found.length);
  };

  // 1. Fixed files — read openclaw.json content (with redaction)
  for (const { path, bucket } of FIXED_FILES) {
    const dirSegments = path.slice(0, -1);
    const filename = path[path.length - 1];
    const dir = dirSegments.length > 0
      ? await getNestedDir(rootHandle, dirSegments)
      : rootHandle;
    if (dir) {
      const relPath = path.join('/');
      if (relPath === 'openclaw.json') {
        const content = await readFileContent(dir, filename);
        if (content !== null) {
          found.push({ path: relPath, bucket });
          fileContents[relPath] = redactSensitiveValues(content);
        }
      } else if (await fileExists(dir, filename)) {
        found.push({ path: relPath, bucket });
      }
    }
    tick();
  }

  // 2. Known workspace .md files — read contents
  const workspaceDir = await getNestedDir(rootHandle, ['workspace']);
  if (workspaceDir) {
    for (const name of WORKSPACE_MD_NAMES) {
      const content = await readFileContent(workspaceDir, name);
      if (content !== null) {
        found.push({ path: `workspace/${name}`, bucket: 'workspace' });
        fileContents[`workspace/${name}`] = content;
      }
      tick();
    }
    // Extra .md files in workspace root (not in known list) — read contents too
    for await (const entry of workspaceDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md') && !WORKSPACE_MD_NAMES.includes(entry.name)) {
        found.push({ path: `workspace/${entry.name}`, bucket: 'workspace' });
        const content = await readFileContent(workspaceDir, entry.name);
        if (content !== null) {
          fileContents[`workspace/${entry.name}`] = content;
        }
      }
    }
    tick();
  }

  // 3. Dirs where we list *.md names (memory, subagents) — paths only, no content read
  for (const { path: dirPath, bucket } of MD_LISTING_DIRS) {
    const dir = await getNestedDir(rootHandle, dirPath);
    if (dir) {
      for await (const entry of dir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          found.push({ path: `${dirPath.join('/')}/${entry.name}`, bucket });
        }
      }
    }
    tick();
  }

  // 4. Dirs where we list subdirectory names
  for (const { path: dirPath, bucket } of DIR_LISTING_DIRS) {
    const dir = await getNestedDir(rootHandle, dirPath);
    if (dir) {
      for await (const entry of dir.values()) {
        if (entry.kind === 'directory') {
          found.push({ path: `${dirPath.join('/')}/${entry.name}/`, bucket });
        }
      }
    }
    tick();
  }

  return { results: found, fileContents };
}

// ============================================================
// SCAN METHOD 2: webkitdirectory fallback
// ============================================================

export function scanWithWebkitDir(fileList: FileList): ScanResult[] {
  const found: ScanResult[] = [];
  const paths = Array.from(fileList).map(f => f.webkitRelativePath);
  const rootPrefix = paths[0]?.split('/')[0];
  if (!rootPrefix) return found;

  const normalize = (p: string) =>
    p.startsWith(rootPrefix + '/') ? p.slice(rootPrefix.length + 1) : p;

  const seen = new Set<string>();
  for (const rawPath of paths) {
    const rel = normalize(rawPath);
    const result = classifyRelativePath(rel);
    if (result && !seen.has(result.path)) {
      found.push(result);
      seen.add(result.path);
    }
  }
  return found;
}

// ============================================================
// SCAN METHOD 3: Text paste
// ============================================================

export function parseTextInput(text: string): ScanResult[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const found: ScanResult[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const sectionMatch = rawLine.match(/^===\s*(.+?)\s*===$/);
    if (sectionMatch) continue;

    // Strip tree chars
    const cleaned = rawLine.replace(/^[\s│├└─┬┤┼┘┐┌]+/g, '').trim();
    if (!cleaned || cleaned.startsWith('#') || cleaned.startsWith('$')) continue;

    // Split on whitespace — ls outputs multiple items per line
    const tokens = cleaned.split(/\s+/);

    for (let token of tokens) {
      if (!token) continue;

      // Normalize absolute paths
      if (token.startsWith('/')) {
        const idx = token.indexOf('.openclaw/');
        if (idx !== -1) token = token.slice(idx + '.openclaw/'.length);
        else continue;
      }
      if (token.startsWith('./')) token = token.slice(2);

      const segments = token.split('/').filter(Boolean);
      const rel = segments.join('/');
      // Preserve trailing slash for directories
      const relWithSlash = token.endsWith('/') ? rel + '/' : rel;
      const result = classifyRelativePath(relWithSlash);
      if (result && !seen.has(result.path)) {
        found.push(result);
        seen.add(result.path);
      }
    }
  }
  return found;
}

// ============================================================
// GROUP BY BUCKET
// ============================================================

export interface BucketGroup {
  label: string;
  icon: string;
  items: ScanResult[];
}

export function groupByBucket(items: ScanResult[]): Record<string, BucketGroup> {
  const groups: Record<string, BucketGroup> = {};
  for (const [key, def] of Object.entries(BUCKETS)) {
    const matched = items.filter(f => f.bucket === key);
    if (matched.length > 0) {
      groups[key] = { ...def, items: matched };
    }
  }
  return groups;
}
