# BubBoard Directory Scanner v3 — Surgical Whitelist

## What Changed from V2

V2 fixed the UX problem (no more "upload 67K files" prompt) but still uses a **generic extension filter** — it walks the tree looking for any `.md`, `.yaml`, `.json`, `.py`, `.ts`, `.js`, `.toml`, `.cfg`, `.ini`, `.txt`, `.sh` file and then classifies them after the fact. That's casting a wide net and sorting the catch.

V3 flips the model: **we know exactly which 30-50 files we want.** Instead of "scan everything, filter later," we define a precise manifest of target paths and only touch those. The scanner becomes a checklist, not a search.

### Why this is better

| | V2 (extension filter) | V3 (surgical whitelist) |
|---|---|---|
| Strategy | Walk all dirs → filter by extension → classify | Jump to known paths → check if they exist |
| Files touched | Hundreds (every .md/.json/.yaml in tree) | 30-50 (only what the parser needs) |
| False positives | Yes — picks up random .md/.json in deep dirs | Zero — only reads predefined targets |
| Speed | Fast (skips node_modules) but still walks everything | Near-instant — checks fixed list of paths |
| Maintenance | Must tune EXCLUDED_DIRS when new junk dirs appear | Must update TARGET_MANIFEST when OpenClaw structure changes |

### The manifest

```
Config (1 file):
  openclaw.json

Workspace .md files (~7-10):
  workspace/SOUL.md, AGENTS.md, MEMORY.md, TOOLS.md,
  HEARTBEAT.md, USER.md, IDENTITY.md
  + any other .md in workspace root

Agent directories (names only):
  agents/*/  (just list subdirectory names)

Memory files (names only):
  workspace/memory/*.md

Subagent protocols (names only):
  workspace/subagents/*.md

Skills (directory names only):
  skills/*/

Cron config (1 file):
  cron/jobs.json
```

That's it. ~30-50 files out of 67,000.

---

## Architecture

```
User clicks "Select Folder"
        ↓
showDirectoryPicker() — single permission prompt
        ↓
Jump directly to known subdirectories:
  → root: check openclaw.json
  → workspace/: grab *.md in root
  → workspace/memory/: list *.md names
  → workspace/subagents/: list *.md names
  → agents/: list subdirectory names
  → skills/: list subdirectory names
  → cron/: check jobs.json
        ↓
Build manifest of found paths (~30-50)
        ↓
Transparency step: show user what was found
        ↓
Confirm → pass to parser
```

The key difference: **no recursive tree walk.** We use `getDirectoryHandle()` to jump directly to the 7 locations we care about and read only what's there. Directories that don't exist get caught and skipped silently.

---

## Full Component

```jsx
// DirectoryScanner.jsx — v3 surgical whitelist

import { useState, useCallback, useRef } from "react";

// ============================================================
// TARGET MANIFEST
// These are the ONLY paths we care about. Everything else is
// invisible to the scanner.
// ============================================================

// Fixed files we check for existence at exact paths
const FIXED_FILES = [
  { path: ["openclaw.json"], bucket: "config" },
  { path: ["cron", "jobs.json"], bucket: "cron" },
];

// Known workspace .md files (check each, skip if missing)
const WORKSPACE_MD_NAMES = [
  "SOUL.md", "AGENTS.md", "MEMORY.md", "TOOLS.md",
  "HEARTBEAT.md", "USER.md", "IDENTITY.md",
];

// Directories where we list *.md files (names only)
const MD_LISTING_DIRS = [
  { path: ["workspace", "memory"], bucket: "memory" },
  { path: ["workspace", "subagents"], bucket: "subagents" },
];

// Directories where we list subdirectory names only
const DIR_LISTING_DIRS = [
  { path: ["agents"], bucket: "agents" },
  { path: ["skills"], bucket: "skills" },
];

// Bump this when the manifest structure changes so the
// downstream parser can handle version differences.
const MANIFEST_VERSION = "3.0";

// ============================================================
// SHARED CLASSIFIER
// Given a relative path, returns { path, bucket } or null.
// Used by both webkitdirectory and text-paste scan methods
// so matching logic lives in exactly one place.
// ============================================================

function classifyRelativePath(rel) {
  const cleaned = rel.replace(/\/$/, "");
  const segments = cleaned.split("/").filter(Boolean);

  // Fixed files (exact match)
  for (const { path, bucket } of FIXED_FILES) {
    if (cleaned === path.join("/")) return { path: cleaned, bucket };
  }

  // Workspace .md files (root of workspace/)
  if (segments[0] === "workspace" && segments.length === 2
      && segments[1].endsWith(".md")) {
    return { path: cleaned, bucket: "workspace" };
  }

  // Memory .md files (workspace/memory/*.md)
  if (segments[0] === "workspace" && segments[1] === "memory"
      && segments.length === 3 && segments[2].endsWith(".md")) {
    return { path: cleaned, bucket: "memory" };
  }

  // Subagent .md files (workspace/subagents/*.md)
  if (segments[0] === "workspace" && segments[1] === "subagents"
      && segments.length === 3 && segments[2].endsWith(".md")) {
    return { path: cleaned, bucket: "subagents" };
  }

  // Agent directories (agents/X/)
  if (segments[0] === "agents" && segments.length >= 2) {
    return { path: `agents/${segments[1]}/`, bucket: "agents" };
  }

  // Skill directories (skills/X/)
  if (segments[0] === "skills" && segments.length >= 2) {
    return { path: `skills/${segments[1]}/`, bucket: "skills" };
  }

  return null;
}

// ============================================================
// BUCKET DEFINITIONS
// ============================================================

const BUCKETS = {
  config:    { label: "Config",             icon: "⚙️" },
  workspace: { label: "Workspace Docs",     icon: "📝" },
  agents:    { label: "Agent Directories",  icon: "🤖" },
  memory:    { label: "Memory Files",       icon: "🧠" },
  subagents: { label: "Subagent Protocols", icon: "🔗" },
  skills:    { label: "Skills",             icon: "⚡" },
  cron:      { label: "Cron Config",        icon: "⏰" },
};

// ============================================================
// FEATURE DETECTION
// ============================================================

const HAS_FS_ACCESS = typeof window !== "undefined"
  && "showDirectoryPicker" in window;

const HAS_WEBKIT_DIR = typeof document !== "undefined"
  && "webkitdirectory" in document.createElement("input");

// ============================================================
// HELPER: Safely navigate to a subdirectory handle
// Returns null if any segment doesn't exist
// ============================================================

async function getNestedDir(rootHandle, segments) {
  let current = rootHandle;
  for (const seg of segments) {
    try {
      current = await current.getDirectoryHandle(seg);
    } catch {
      return null; // directory doesn't exist — that's fine
    }
  }
  return current;
}

async function fileExists(dirHandle, filename) {
  try {
    await dirHandle.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// SCAN METHOD 1: File System Access API (Chrome/Edge)
// Jumps directly to known paths. No tree walk.
// ============================================================

async function scanWithFSAccess(onProgress) {
  let rootHandle;
  try {
    rootHandle = await window.showDirectoryPicker({ mode: "read" });
  } catch (err) {
    if (err.name === "AbortError") return null;
    throw err;
  }

  const found = []; // { path: string, bucket: string }
  let checked = 0;

  const tick = () => {
    checked++;
    if (onProgress) onProgress(checked, found.length);
  };

  // --- 1. Fixed files at exact paths ---
  for (const { path, bucket } of FIXED_FILES) {
    const dirSegments = path.slice(0, -1);
    const filename = path[path.length - 1];
    const dir = dirSegments.length > 0
      ? await getNestedDir(rootHandle, dirSegments)
      : rootHandle;
    if (dir && await fileExists(dir, filename)) {
      found.push({ path: path.join("/"), bucket });
    }
    tick();
  }

  // --- 2. Known workspace .md files ---
  const workspaceDir = await getNestedDir(rootHandle, ["workspace"]);
  if (workspaceDir) {
    // Check known names
    for (const name of WORKSPACE_MD_NAMES) {
      if (await fileExists(workspaceDir, name)) {
        found.push({ path: `workspace/${name}`, bucket: "workspace" });
      }
      tick();
    }

    // Also pick up any OTHER .md files in workspace root
    // (custom docs the user may have added)
    for await (const entry of workspaceDir.values()) {
      if (entry.kind === "file"
          && entry.name.endsWith(".md")
          && !WORKSPACE_MD_NAMES.includes(entry.name)) {
        found.push({ path: `workspace/${entry.name}`, bucket: "workspace" });
      }
    }
    tick();
  }

  // --- 3. Directories where we list *.md file names ---
  for (const { path: dirPath, bucket } of MD_LISTING_DIRS) {
    const dir = await getNestedDir(rootHandle, dirPath);
    if (dir) {
      for await (const entry of dir.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".md")) {
          found.push({
            path: `${dirPath.join("/")}/${entry.name}`,
            bucket,
          });
        }
      }
    }
    tick();
  }

  // --- 4. Directories where we list subdirectory names ---
  for (const { path: dirPath, bucket } of DIR_LISTING_DIRS) {
    const dir = await getNestedDir(rootHandle, dirPath);
    if (dir) {
      for await (const entry of dir.values()) {
        if (entry.kind === "directory") {
          found.push({
            path: `${dirPath.join("/")}/${entry.name}/`,
            bucket,
          });
        }
      }
    }
    tick();
  }

  return found;
}

// ============================================================
// SCAN METHOD 2: webkitdirectory fallback (Firefox/Safari)
// Browser enumerates everything, but we filter to our manifest.
// ============================================================

function scanWithWebkitDir(fileList) {
  const found = [];
  const paths = Array.from(fileList).map(f => f.webkitRelativePath);

  // Root folder name is the first segment — strip it for matching
  const rootPrefix = paths[0]?.split("/")[0];
  if (!rootPrefix) return found;

  const normalize = (p) => p.startsWith(rootPrefix + "/")
    ? p.slice(rootPrefix.length + 1)
    : p;

  const seen = new Set();

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
// Accepts flat paths or tree output. Matches against manifest.
// ============================================================

function parseTextInput(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const found = [];
  const seen = new Set();

  // Track === Section === headers as bucket hints
  let currentBucketHint = null;

  for (let line of lines) {
    // Detect and consume === Section === headers
    const sectionMatch = line.match(/^===\s*(.+?)\s*===$/);
    if (sectionMatch) {
      const label = sectionMatch[1].toLowerCase();
      // Map section labels to bucket keys
      if (label.includes("config")) currentBucketHint = "config";
      else if (label.includes("workspace")) currentBucketHint = "workspace";
      else if (label.includes("memory")) currentBucketHint = "memory";
      else if (label.includes("subagent")) currentBucketHint = "subagents";
      else if (label.includes("agent")) currentBucketHint = "agents";
      else if (label.includes("skill")) currentBucketHint = "skills";
      else if (label.includes("cron")) currentBucketHint = "cron";
      else currentBucketHint = null;
      continue;
    }

    // Strip tree chars
    line = line.replace(/^[\s│├└─┬┤┼┘┐┌]+/g, "").trim();
    if (!line || line.startsWith("#") || line.startsWith("$")) continue;

    // Normalize absolute paths
    if (line.startsWith("/")) {
      const idx = line.indexOf(".openclaw/");
      if (idx !== -1) line = line.slice(idx + ".openclaw/".length);
      else continue;
    }
    // Strip leading ./
    if (line.startsWith("./")) line = line.slice(2);

    const segments = line.split("/").filter(Boolean);
    const rel = segments.join("/");

    const result = classifyRelativePath(rel);
    if (result && !seen.has(result.path)) {
      // Use section header hint as override if classifier returned "other"
      // or if the path is ambiguous
      if (currentBucketHint && !result.bucket) {
        result.bucket = currentBucketHint;
      }
      found.push(result);
      seen.add(result.path);
    }
  }

  return found;
}

// ============================================================
// COMPONENT
// ============================================================

export default function DirectoryScanner({ onConfirm }) {
  const [state, setState] = useState("idle");
  const [scanResult, setScanResult] = useState(null);
  const [excluded, setExcluded] = useState(new Set());
  const [progress, setProgress] = useState({ checked: 0, found: 0 });
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // --- Primary: File System Access API ---
  const handleFSAccessPick = useCallback(async () => {
    setState("scanning");
    setError(null);
    try {
      const found = await scanWithFSAccess((checked, foundCount) => {
        setProgress({ checked, found: foundCount });
      });
      if (found === null) { setState("idle"); return; }
      if (found.length === 0) {
        setError(
          "No OpenClaw structure detected. Make sure you selected "
          + "your agent's root directory (usually ~/.openclaw)."
        );
        setState("idle");
        return;
      }
      setScanResult(found);
      setExcluded(new Set());
      setState("review");
    } catch (err) {
      console.error("Scan failed:", err);
      setError("Scan failed: " + err.message);
      setState("idle");
    }
  }, []);

  // --- Fallback: webkitdirectory ---
  const handleWebkitDirChange = useCallback((e) => {
    setState("scanning");
    setError(null);
    setTimeout(() => {
      try {
        const found = scanWithWebkitDir(e.target.files);
        if (found.length === 0) {
          setError("No OpenClaw structure detected.");
          setState("idle");
          return;
        }
        setScanResult(found);
        setExcluded(new Set());
        setState("review");
      } catch (err) {
        setError("Scan failed: " + err.message);
        setState("idle");
      }
    }, 50);
  }, []);

  // --- Paste ---
  const handlePasteSubmit = useCallback(() => {
    const found = parseTextInput(pasteText);
    if (found.length === 0) {
      setError(
        "Couldn't find any OpenClaw paths in the pasted text. "
        + "Make sure you ran the command from your .openclaw directory."
      );
      return;
    }
    setError(null);
    setScanResult(found);
    setExcluded(new Set());
    setState("review");
  }, [pasteText]);

  // --- Review controls ---
  const togglePath = (path) => {
    setExcluded(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const toggleBucket = (bucketKey) => {
    const bucketPaths = scanResult
      .filter(f => f.bucket === bucketKey)
      .map(f => f.path);
    setExcluded(prev => {
      const next = new Set(prev);
      const allOff = bucketPaths.every(p => next.has(p));
      for (const p of bucketPaths) {
        allOff ? next.delete(p) : next.add(p);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const finalPaths = scanResult
      .filter(f => !excluded.has(f.path))
      .map(f => f.path);
    onConfirm(finalPaths, { manifestVersion: MANIFEST_VERSION });
  };

  const handleReset = () => {
    setState("idle");
    setScanResult(null);
    setExcluded(new Set());
    setProgress({ checked: 0, found: 0 });
    setPasteText("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Group results by bucket for display ---
  const groupByBucket = (items) => {
    const groups = {};
    for (const [key, def] of Object.entries(BUCKETS)) {
      const paths = items.filter(f => f.bucket === key);
      if (paths.length > 0) {
        groups[key] = { ...def, items: paths };
      }
    }
    return groups;
  };

  // ========================================
  // RENDER: Scanning
  // ========================================
  if (state === "scanning") {
    return (
      <div className="scanner-status">
        <div className="scanner-spinner" />
        <p>
          Checking targets... {progress.checked} checked,
          {" "}{progress.found} found
        </p>
      </div>
    );
  }

  // ========================================
  // RENDER: Review
  // ========================================
  if (state === "review" && scanResult) {
    const groups = groupByBucket(scanResult);
    const activeCount = scanResult.filter(f => !excluded.has(f.path)).length;

    return (
      <div className="scanner-review">
        <div className="scanner-review-header">
          <h3>Here's what we found</h3>
          <p>
            {activeCount} item{activeCount !== 1 ? "s" : ""} selected
            {" · "}uncheck anything you want to exclude
          </p>
        </div>

        <div className="scanner-buckets">
          {Object.entries(groups).map(([key, group]) => {
            const activeInGroup = group.items.filter(
              f => !excluded.has(f.path)
            ).length;

            return (
              <div key={key} className="scanner-bucket">
                <div
                  className="scanner-bucket-header"
                  onClick={() => toggleBucket(key)}
                >
                  <span>{group.icon}</span>
                  <span className="scanner-bucket-label">{group.label}</span>
                  <span className="scanner-bucket-count">
                    {activeInGroup}/{group.items.length}
                  </span>
                </div>
                <ul className="scanner-file-list">
                  {group.items.map(f => {
                    const isActive = !excluded.has(f.path);
                    return (
                      <li
                        key={f.path}
                        className={`scanner-file ${isActive ? "" : "excluded"}`}
                        onClick={() => togglePath(f.path)}
                      >
                        <span className="scanner-checkbox">
                          {isActive ? "☑" : "☐"}
                        </span>
                        <span className="scanner-filepath">
                          {f.path}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="scanner-actions">
          <button className="scanner-btn secondary" onClick={handleReset}>
            Start Over
          </button>
          <button
            className="scanner-btn primary"
            onClick={handleConfirm}
            disabled={activeCount === 0}
          >
            Build Map ({activeCount} item{activeCount !== 1 ? "s" : ""})
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: Paste
  // ========================================
  if (state === "paste") {
    return (
      <div className="scanner-paste">
        <h3>Paste your directory listing</h3>
        <p className="scanner-muted">
          Run this in your <code>~/.openclaw</code> directory, then paste:
        </p>
        <pre className="scanner-command">
{`# Quick targeted listing — only what BubBoard needs
echo "=== Config ===" && ls openclaw.json 2>/dev/null
echo "=== Workspace ===" && ls workspace/*.md 2>/dev/null
echo "=== Memory ===" && [ -d workspace/memory ] && ls workspace/memory/*.md 2>/dev/null
echo "=== Subagents ===" && [ -d workspace/subagents ] && ls workspace/subagents/*.md 2>/dev/null
echo "=== Agents ===" && [ -d agents ] && ls -d agents/*/ 2>/dev/null
echo "=== Skills ===" && [ -d skills ] && ls -d skills/*/ 2>/dev/null
echo "=== Cron ===" && ls cron/jobs.json 2>/dev/null`}
        </pre>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste output here..."
          rows={10}
          className="scanner-textarea"
          spellCheck={false}
        />
        {error && <p className="scanner-error">{error}</p>}
        <div className="scanner-actions">
          <button className="scanner-btn secondary" onClick={handleReset}>
            Back
          </button>
          <button
            className="scanner-btn primary"
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
          >
            Parse & Continue
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: Idle (picker)
  // ========================================
  return (
    <div className="scanner-picker">
      <div className="scanner-icon">📂</div>
      <h3>Select your OpenClaw agent folder</h3>
      <p className="scanner-privacy">
        <strong>Nothing is uploaded.</strong> We check ~30 specific files
        by name to build your map. No file contents leave your browser.
      </p>

      {error && <p className="scanner-error">{error}</p>}

      <div className="scanner-options">
        {HAS_FS_ACCESS && (
          <button className="scanner-btn primary" onClick={handleFSAccessPick}>
            Choose Folder
          </button>
        )}

        {/* Firefox/Safari: paste is primary, folder picker is demoted
            because webkitdirectory triggers a scary "upload 67K files" prompt */}
        {!HAS_FS_ACCESS && HAS_WEBKIT_DIR && (
          <button
            className="scanner-btn primary"
            onClick={() => setState("paste")}
          >
            Paste Directory Listing
          </button>
        )}

        {!HAS_FS_ACCESS && !HAS_WEBKIT_DIR && (
          <button
            className="scanner-btn primary"
            onClick={() => setState("paste")}
          >
            Paste Directory Listing
          </button>
        )}

        <span className="scanner-divider">or</span>

        {HAS_FS_ACCESS && (
          <button
            className="scanner-btn secondary"
            onClick={() => setState("paste")}
          >
            Paste directory listing
          </button>
        )}

        {!HAS_FS_ACCESS && HAS_WEBKIT_DIR && (
          <>
            <label className="scanner-btn secondary">
              Use folder picker instead
              <input
                ref={fileInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleWebkitDirChange}
                style={{ display: "none" }}
              />
            </label>
            <p className="scanner-webkit-warning">
              Note: your browser will show a large file count — this is normal.
              No files are uploaded; we only read names.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## CSS (same structure as V2 — no changes needed)

The V2 CSS works as-is with V3. The class names and DOM structure are identical. Use the same `scanner.css` from V2.

---

## Integration

```jsx
import DirectoryScanner from "./DirectoryScanner";

function BubBoard() {
  const [treeData, setTreeData] = useState(null);

  const handleConfirm = (paths, meta) => {
    // paths = ["openclaw.json", "workspace/SOUL.md", "agents/main/", ...]
    // meta  = { manifestVersion: "3.0" }
    const parsed = parseDirectoryStructure(paths, meta);
    setTreeData(parsed);
  };

  return !treeData
    ? <DirectoryScanner onConfirm={handleConfirm} />
    : <ArchitectureMap data={treeData} />;
}
```

---

## Key Differences for Bub

### What to tell Bub when handing off this spec:

> **Scanner V3 is a whitelist, not a filter.**
>
> V2 walked the entire directory tree and filtered by file extension.
> V3 jumps directly to the 7 known locations and checks for specific
> files. No recursive walk. No EXCLUDED_DIRS list to maintain.
>
> The trade-off: if OpenClaw adds a new top-level directory that
> matters (like a hypothetical `plugins/` folder), you need to add
> it to the manifest constants at the top of the file. But that's a
> 2-line change vs. the old approach of hoping a generic filter
> catches everything while also hoping it doesn't catch too much.

### Paste command changed

V2's paste command was a big `find` with exclusion flags. V3's paste command is a targeted series of `ls` commands that only list what the parser needs. Much simpler output, much easier to paste.

### Output format changed

V2 returned flat path strings: `["my-agent/workspace/SOUL.md", ...]`

V3's internal format carries bucket metadata: `[{ path: "workspace/SOUL.md", bucket: "workspace" }, ...]`

But `onConfirm` still emits flat path strings for backward compatibility with the existing parser, plus a metadata object containing the manifest version: `onConfirm(paths, { manifestVersion: "3.0" })`.

---

## Checklist for Bub

- [ ] Replace `DirectoryScanner.jsx` with v3 above
- [ ] CSS is unchanged from v2 — keep existing `scanner.css`
- [ ] Verify `classifyRelativePath` is the single source of truth — matching logic should NOT be duplicated elsewhere
- [ ] Test Chrome: `showDirectoryPicker()` → should check ~15 handles, find ~30 files, finish instantly
- [ ] Test Firefox: paste should be the primary option; folder picker is available as a secondary "use folder picker instead" link with the scary-prompt warning below it
- [ ] Test Safari: same as Firefox — paste primary, folder picker secondary
- [ ] Test paste: new targeted `ls` command produces clean output the parser handles
- [ ] Test paste with `=== Section ===` headers: verify they're consumed as bucket hints and not treated as paths
- [ ] Test paste without headers (raw `find` or `tree` output): verify classifier still works standalone
- [ ] Test wrong folder: selecting home directory → "No OpenClaw structure detected"
- [ ] Verify `onConfirm` output matches what existing parser expects: `(paths, { manifestVersion: "3.0" })`
- [ ] If OpenClaw structure changes: update `FIXED_FILES`, `WORKSPACE_MD_NAMES`, `MD_LISTING_DIRS`, or `DIR_LISTING_DIRS` at top of file, bump `MANIFEST_VERSION`, and add any new rules to `classifyRelativePath`
