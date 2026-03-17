# Security Policy

## Overview

Bubboard (formerly Driftwatch) is designed with privacy and security as core principles:

- **Client-side first**: All analysis happens in your browser — no data is transmitted
- **Read-only scanning**: The directory scanner only reads files; it never modifies your filesystem
- **Key redaction**: API keys and secrets are automatically redacted before display
- **No tracking**: No analytics, advertising, or telemetry

## What Gets Scanned

The scanner looks at specific, known file locations in your `.openclaw` directory:
- `openclaw.json` — agent config
- `SOUL.md`, `AGENTS.md`, `MEMORY.md`, etc. — agent documentation
- `workspace/` — custom files you choose to share

The scanner does **not**:
- Recursively scan all files
- Read binary files
- Access parent directories
- Transmit data to external servers
- Modify any files on your system

## Credentials & Secrets

### Development
- Copy `.env.example` to `.env.local`
- Add your Airtable API key to `.env.local`
- `.env.local` is in `.gitignore` and will never be committed

### Production
- Credentials are stored in GitHub repository secrets
- Environment variables are loaded at build/runtime only
- Secret values never appear in code or logs

### Automatic Redaction
All sensitive keys matching these patterns are automatically redacted:
- `api_key`, `apikey`, `API_KEY`
- `*_token`, `*_secret`, `*_password`
- Compound keys like `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.

## Reporting Security Issues

If you find a security vulnerability:
1. **Do not open a public issue**
2. Email: [security contact email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if applicable)

We will:
- Acknowledge receipt within 48 hours
- Investigate and fix the issue
- Credit you in the fix commit (if desired)
- Release a patch as soon as possible

## Compliance

- **Privacy**: Everything runs in-browser; we never access your files without your consent
- **Open Source**: Code is auditable; you can self-host and verify exactly what runs
- **No License Keys**: This is free software; no telemetry or key validation

## Version History

- **v0.1.0** (Current)
  - Initial release
  - Client-side file scanning
  - Automatic redaction of sensitive values
  - Cost tracking (alpha)
