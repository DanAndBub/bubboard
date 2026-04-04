# Driftwatch

**Config intelligence for OpenClaw agents** 

Driftwatch scans your [OpenClaw](https://openclaw.ai) bootstrap files and surfaces the problems that silently degrade agent performance — truncation, bloat, contradictions, structural gaps. The headline feature: a truncation zone visualization that shows you what your agent can't see when files exceed the bootstrap limit.

Everything runs client-side. Your files never leave your browser.

🔗 **Live:** [bubbuilds.com](https://bubbuilds.com)

## What it does

- **Config health scan** — checks all bootstrap files against known failure patterns: truncation risk, budget overrun, structural issues, and cross-file contradictions.
- **Drift detection** — snapshot your config state, scan again later, compare. See what changed in character counts and heading structure between scans.
- **Conflict scanner** — finds instructions that contradict each other across bootstrap files.
- **Snapshot export/import** — share config state with collaborators or keep a local history.
- **Privacy first** — everything runs client-side, your files never leave your browser
- **Truncation zone visualization** — when a file exceeds the 20,000-character bootstrap limit, Driftwatch shows you exactly which content survives the 70/20/10 split and which content your agent silently loses.

## Get started

### Hosted (recommended)

Visit [bubbuilds.com](https://bubbuilds.com), use the file picker (Chrome/Edge). Get your config health report in seconds.

Demo mode — see the tool with example data, no files needed: bubbuilds.com?demo=true

Also available as a CLI skill — run `scan my config` directly in your OpenClaw workspace:
[Get the Driftwatch skill →](https://clawhub.ai/danandbub/driftwatch-oc)

### Self-hosted

> **Requires Node.js >= 20.9.0**

```bash
git clone https://github.com/DanAndBub/Driftwatch.git
cd Driftwatch
npm install
npm run build
npm start
```

Open [localhost:3000](http://localhost:3000).

### Demo

See the tool with example data (no scanning required): [bubbuilds.com?demo=true](https://bubbuilds.com?demo=true)

## How it works

1. **Select your OpenClaw Workspace Folder** — Use the file picker (Chrome/Edge)
2. **Driftwatch runs the ruleset** — Checks each bootstrap file (AGENTS.md, SOUL.md, MEMORY.md, IDENTITY.md, TOOLS.md, USER.md, HEARTBEAT.md, BOOTSTRAP.md) for size, truncation risk, and structural integrity, then checks all files combined against the 150,000 bootstrap budget.
3. **Review findings** — See which files are truncated, in danger of truncation, bloated, or healthy.

## Tech stack

- **Next.js 16** with App Router
- **TypeScript** throughout
- **Tailwind CSS** — dark mission control theme
- **No database** — fully client-side analysis
- **Vercel** for hosting

## Environment variables (optional)

```env
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_API_KEY=your_api_key
```
Airtable collecte the the message the creator form submissions. Neither is required for self-hosted use.

## Upgrading from v1

This is a major rewrite. The agent architecture map (v1) has been replaced by config health analysis (v4). If you need the previous version:
- **Tagged release:** [v1.0.0](../../releases/tag/v1.0.0)
- **Legacy branch:** [v1](../../tree/v1)

## Contributing

PRs welcome. TypeScript strict mode (noImplicitAny, no any types), Tailwind only (no separate CSS files). Verify with npx tsc --noEmit and npm run build before submitting. See CONTRIBUTING.md for the full guide.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## License

[MIT](LICENSE) — do whatever you want, just keep the copyright notice.

---

Built by [Dan](https://www.tiktok.com/@danjmonk) & Bub
