# Drift Detection — Test Protocol

Verify that Driftwatch's drift engine accurately detects changes between two workspace snapshots.

## How Drift Works

1. **Scan** your workspace → Driftwatch builds a snapshot (file paths, char counts, SHA-256 content hashes, health score, review findings, agent list)
2. **Download** the snapshot as JSON
3. **Make changes** to your workspace
4. **Re-scan** → new snapshot generated
5. **Upload** the old snapshot → Driftwatch diffs the two and shows a drift report

The drift report shows: files added/removed/changed, content hash changes, growth percentages, heading changes, health score delta, new/resolved findings, and agent topology changes.

---

## Test Protocol

### Step 1: Create a Baseline Snapshot

1. Go to `/map` in Driftwatch
2. Scan your `~/.openclaw` directory (or use demo mode)
3. Make sure "Read file contents" is ON
4. Click **Generate Map**
5. Go to the **Drift Report** view in the sidebar
6. Click **Download Snapshot** → save as `baseline.json`

### Step 2: Make Deliberate Changes

Make **exactly these changes** to your workspace, then re-scan:

| Change | What to do | Expected drift result |
|--------|-----------|----------------------|
| **Edit a file** | Add 2-3 lines to `MEMORY.md` (e.g. add "## Test Entry\n- Testing drift detection") | `MEMORY.md` shows as changed: `contentHashChanged: true`, positive `charCountDelta`, `headingsAdded: ["Test Entry"]` |
| **Add a file** | Create `workspace/TEST_DRIFT.md` with any content | Shows in `filesAdded` |
| **Remove content** | Delete a section from `AGENTS.md` (note which heading) | `AGENTS.md` shows as changed: negative `charCountDelta`, heading in `headingsRemoved` |
| **No change** | Leave `SOUL.md` untouched | Shows in `filesUnchanged` |

### Step 3: Re-scan and Compare

1. Re-scan your workspace with the same settings (contents ON)
2. Go to **Drift Report** view
3. Click **Upload Previous Snapshot** → select `baseline.json`
4. The drift report should appear

### Step 4: Verify Results

Check each item against the expected results table above:

- [ ] Edited file shows `contentHashChanged: true` with correct char delta
- [ ] Added file appears in "Files Added" section
- [ ] Modified file shows correct heading changes
- [ ] Untouched file appears in "Unchanged" section
- [ ] Health score delta makes sense (adding/removing findings changes the score)
- [ ] `daysBetween` is correct (should be 0 if done same day)
- [ ] Agent topology unchanged (unless you edited agent configs)

---

## Quick Test with Demo Mode

If you don't want to modify real files:

1. Load demo mode → download snapshot as `demo-baseline.json`
2. Scan your real workspace → upload `demo-baseline.json`
3. The drift report will show massive differences (different files, different agents) — that's expected
4. This verifies the diff engine runs without errors, but doesn't test accuracy of individual changes

---

## What "Wrong" Looks Like

If the drift engine has bugs, you'd see:
- A file you edited showing as "unchanged" (hash comparison broken)
- A file you didn't touch showing as "changed" (non-deterministic hashing)
- Missing files in the added/removed lists
- Heading changes not detected or detected wrong
- Health score delta that doesn't match actual finding changes
- `daysBetween` showing NaN or negative

Report any of these as bugs with the specific snapshot JSON files attached.

---

## Cleanup

After testing, remove any test files you created:
```bash
rm ~/.openclaw/workspace/TEST_DRIFT.md
```
And revert any changes to `MEMORY.md` / `AGENTS.md`.
