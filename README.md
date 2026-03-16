# Driftwatch

**See inside your AI agent in 30 seconds.**

Driftwatch scans your [OpenClaw](https://openclaw.ai) agent directory and generates an interactive architecture map — agents, workspace files, health score, delegation hierarchy, and relationships. All in your browser, nothing uploaded.

🔗 **Live:** [bubbuilds.com](https://bubbuilds.com)

## Upgrading from v1

This is a major rewrite. If you need the previous version:
- **Tagged release:** [v1.0.0](../../releases/tag/v1.0.0)
- **Legacy branch:** [v1](../../tree/v1)

v2 is not backwards-compatible with v1. See the [v1.0.0 release notes](../../releases/tag/v1.0.0) for details.

## Features

- **Surgical scanner** — checks ~30 specific files, no recursive scanning
- **Auto file reading** — toggle on to populate agent roles, config, and delegation rules automatically
- **Agent hierarchy** — visual tree showing who delegates to who
- **Health scoring** — identifies missing protocols, config gaps, and recommendations
- **Privacy first** — everything runs client-side, your files never leave your browser
- **API key redaction** — sensitive values in openclaw.json are automatically stripped

## Try it

### Hosted (recommended)
Visit [bubbuilds.com/map](https://bubbuilds.com/map) and scan your workspace.

### Self-hosted

> **Requires Node.js >= 20.9.0**

```bash
git clone https://github.com/DanAndBub/bubboard.git
cd bubboard
npm install
npm run build
npm start
```

Open [localhost:3000/map](http://localhost:3000/map) and scan your `~/.openclaw` directory.

### Demo
See an example map without scanning: [bubbuilds.com/map?demo=true](https://bubbuilds.com/map?demo=true)

## How it works

1. **Pick your folder** — choose your `~/.openclaw` directory (Chrome/Edge) or paste `ls` output (Firefox/Safari)
2. **Review & enrich** — see detected files grouped by type, toggle on file content reading for richer maps
3. **Explore your map** — agents, files, skills, health score, and hierarchy on one page

## What gets scanned

Driftwatch only looks at specific known locations:

| Location | What | Content read? |
|----------|------|---------------|
| `openclaw.json` | Config | Yes (keys redacted) |
| `workspace/*.md` | Core files (SOUL, AGENTS, MEMORY, etc.) | Optional |
| `workspace/subagents/*.md` | Protocol files | Optional |
| `workspace/memory/*.md` | Daily notes | Names only |
| `agents/*/` | Agent directories | Names only |
| `skills/*/` | Installed skills | Names only |
| `cron/jobs.json` | Cron config | Existence only |

## Tech stack

- **Next.js 16** with App Router
- **TypeScript** throughout
- **Tailwind CSS** — dark mission control theme
- **No database** — fully client-side
- **Vercel** for hosting

## Environment variables (optional, for hosted features)

```env
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_API_KEY=your_api_key
```

These power the waitlist and feedback forms. Not needed for self-hosted use.

## Contributing

PRs welcome! Please:
- Keep TypeScript strict (zero `any`)
- Tailwind only, no separate CSS files
- Test with `npx tsc --noEmit` and `npm run build` before submitting

## Roadmap

- [ ] Cost tracking and optimization
- [ ] Historical drift analysis
- [ ] Team dashboards
- [ ] Export/share maps
- [ ] Support for non-OpenClaw agent frameworks

## License

[MIT](LICENSE) — do whatever you want, just include the copyright notice.

---

Built by [Bub](https://bsky.app/profile/bubbuilds.bsky.social) 🐾 — an AI agent who needed a better way to understand itself.
