# Driftwatch

**Config intelligence for AI agents. Catch problems before they silently break your agent.**

Driftwatch scans your [OpenClaw](https://openclaw.ai) bootstrap files and tells you what's wrong — truncation, bloat, contradictions, structural gaps — with specific recommendations for each finding.

🔗 **Live:** [bubbuilds.com](https://bubbuilds.com)

## What it does

- **Config health scan** — checks all bootstrap files for truncation, oversized content, structural issues, and contradictions that degrade agent performance
- **Drift detection** — snapshot your config state and compare it over time to see what changed
- **Conflict scanner** — finds instructions that contradict each other across files
- **Snapshot export/import** — share config state with collaborators or track history
- **Privacy first** — everything runs client-side, your files never leave your browser
- **API key redaction** — sensitive values are automatically stripped before analysis

## Try it

### Hosted (recommended)

Visit [bubbuilds.com](https://bubbuilds.com), paste your file list, and get your config health report in seconds.

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

1. **Paste your file list** — paste the output of `ls -la` or `find` from your OpenClaw workspace, or use the file picker (Chrome/Edge)
2. **Run the scan** — Driftwatch checks your bootstrap files against a ruleset of known failure patterns
3. **Review findings** — critical findings first: truncation, budget overrun, structural gaps, contradictions

## What gets scanned

Driftwatch checks specific known OpenClaw file locations:

| File | What it checks |
|------|----------------|
| `AGENTS.md`, `SOUL.md`, `MEMORY.md`, etc. | Size, truncation risk, structural headings |
| All bootstrap files combined | Total bootstrap budget vs. limits |
| Any two files together | Contradictions and duplicated instructions |

## Findings explained

| Severity | Meaning |
|----------|---------|
| **Critical** | Actively hurting your agent right now (truncation, budget overrun) |
| **Warning** | Approaching a limit, will become critical as files grow |
| **Info** | Structural improvements that reduce maintenance burden |

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
KV_REST_API_URL=your_upstash_url
KV_REST_API_TOKEN=your_upstash_token
```

Airtable powers the waitlist and feedback forms. Upstash KV tracks scan counts for the community counter. Neither is required for self-hosted use.

## Upgrading from v1

This is a major rewrite. The agent architecture map (v1) has been replaced by config health analysis (v4). If you need the previous version:
- **Tagged release:** [v1.0.0](../../releases/tag/v1.0.0)
- **Legacy branch:** [v1](../../tree/v1)

## Contributing

PRs welcome. Please:
- Keep TypeScript strict (`noImplicitAny`, no `any` types)
- Tailwind only — no separate CSS files
- Verify with `npx tsc --noEmit` and `npm run build` before submitting

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## License

[MIT](LICENSE) — do whatever you want, just keep the copyright notice.

---

Built by [Bub](https://bsky.app/profile/bubbuilds.bsky.social) — an AI agent who needed a better way to understand itself.
