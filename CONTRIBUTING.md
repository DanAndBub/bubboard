# Contributing to Driftwatch

Thank you for contributing! This guide ensures consistent, high-quality contributions across the project. It applies to all contributors—human and AI.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Standards](#development-standards)
- [Git & Version Control](#git--version-control)
- [Commit Conventions](#commit-conventions)
- [Security](#security)
- [Code Quality](#code-quality)
- [Merge Conflicts](#merge-conflicts)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.9.0
- **Git** >= 2.30.0
- **TypeScript** knowledge (project uses TS strict mode)

### Setup

```bash
# Clone the repo
git clone https://github.com/DanAndBub/Driftwatch.git
cd Driftwatch

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your credentials (Airtable API key)
# Edit .env.local and add AIRTABLE_BASE_ID and AIRTABLE_API_KEY

# Run development server
npm run dev

# Run tests
npm test

# Check for linting errors
npm run lint
```

### Project Structure

```
src/
├── app/                    # Next.js app router pages & API routes
├── components/
│   ├── map/views/          # Config Health, Drift, Conflict Scanner views
│   ├── drift/              # Drift report components
│   ├── editor/             # Markdown editor/viewer
│   └── guidance/           # Context headers, demo banner
├── lib/
│   ├── config-review/      # Core ruleset (size, truncation, structure, contradiction rules)
│   ├── drift/              # Snapshot serialization, diff engine, export/import
│   ├── analyzer.ts         # OpenClaw config parsing
│   ├── redact.ts           # Automatic secret redaction
│   ├── parser.ts           # Tree/ls output parsing
│   ├── demo-data.ts        # Demo mode data
│   └── types.ts            # Shared TypeScript types
└── scanner/                # File system scanning component
```

---

## Development Standards

### TypeScript

**Always enable strict mode:**
```typescript
// ✅ DO: Type everything explicitly
function calculateBudget(files: FileAnalysis[]): BootstrapBudget {
  const totalChars = files.reduce((sum, f) => sum + f.charCount, 0);
  return { totalChars, budgetLimit: 150_000, overBudgetBy: 0 };
}

// ❌ DON'T: Use `any`
function calculateBudget(files: any): any {
  return files;
}
```

**Use const assertions for readonly data:**
```typescript
// ✅ DO
const BUCKET_LABELS = {
  config: 'Config',
  workspace: 'Workspace',
} as const;

// ❌ DON'T
const BUCKET_LABELS = {
  config: 'Config',
  workspace: 'Workspace',
};
```

### React Components

**Use TypeScript for props:**
```typescript
// ✅ DO
interface FindingCardProps {
  finding: ReviewFinding;
  onDismiss?: (id: string) => void;
}

export function FindingCard({ finding, onDismiss }: FindingCardProps) {
  // ...
}

// ❌ DON'T
export function FindingCard({ finding, onDismiss }) {
  // ...
}
```

**Mark client components explicitly:**
```typescript
// ✅ DO (in src/components/map/views/ConfigHealthView.tsx)
'use client';

import { useState } from 'react';

export function ConfigHealthView() {
  // ...
}

// ❌ DON'T (forget 'use client' when using hooks)
export function ConfigHealthView() {
  // ...
}
```

### Error Handling

**Always handle potential errors:**
```typescript
// ✅ DO
export function parseConfig(jsonString: string): ConfigInfo | null {
  try {
    const config = JSON.parse(jsonString);
    return validateConfig(config);
  } catch (error) {
    console.error('Failed to parse config:', error);
    return null;
  }
}

// ❌ DON'T
export function parseConfig(jsonString: string): ConfigInfo {
  const config = JSON.parse(jsonString);
  return validateConfig(config);
}
```

### Manual Testing

Before pushing, manually test:
1. **Happy path**: Does the feature work as intended?
2. **Edge cases**: Empty inputs, large files, missing data?
3. **Browser compatibility**: Chrome, Firefox, Safari, Edge?
4. **Mobile**: Responsive design on mobile/tablet?
5. **Performance**: Large agent directories, slow networks?

---

## Git & Version Control

### Branch Naming

Use prefixes to categorize work:

```
feat/               Feature or enhancement
fix/                Bug fix
docs/               Documentation updates
chore/              Maintenance, dependencies, build setup
refactor/           Code restructuring (no behavior change)
perf/               Performance improvements
security/           Security improvements
test/               Test updates
ci/                 CI/CD pipeline changes

# Examples:
git checkout -b feat/cost-analytics
git checkout -b fix/redact-stripe-keys
git checkout -b docs/security-policy
git checkout -b chore/update-eslint-config
```

### Before Starting Work

```bash
# Always start from master
git checkout master
git pull origin master

# Create a new branch
git checkout -b feat/your-feature-name

# Verify you're on the right branch
git branch -v
```

### Local Commits (Before Pushing)

Keep commits **atomic** and **logical**:
- One feature = one conceptual change
- Don't mix refactoring with feature work
- Don't mix unrelated bug fixes

```bash
# ✅ Good workflow
git add src/lib/newFeature.ts
git commit -m "feat: add new scoring algorithm"

git add src/lib/__tests__/newFeature.test.ts
git commit -m "test: add tests for scoring algorithm"

# ❌ Avoid
git add .
git commit -m "random stuff"
```

### Pushing & Syncing

```bash
# Before pushing, sync with master
git fetch origin
git rebase origin/master

# Handle any conflicts (see Merge Conflicts section)

# Push your branch
git push origin feat/your-feature-name

# If you rebased locally, use force-with-lease (safer than --force)
git push --force-with-lease origin feat/your-feature-name
```

**NEVER** use `git push --force` (use `--force-with-lease` instead)

---

## Commit Conventions

We use **Conventional Commits** for clear, semantic commit messages.

### Format

```
<type>(<scope>): <description>

<body>

<footer>
```

### Type

Must be one of:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code formatting (no logic change)
- **refactor**: Code restructuring (no behavior/feature change)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build, dependencies, tooling
- **ci**: CI/CD configuration
- **security**: Security fixes or improvements

### Scope

Optional but recommended. Indicates what part of the code changed:
```
feat(scanner): add recursive file search
fix(redact): handle compound API keys
docs(security): add vulnerability reporting
chore(deps): upgrade typescript to 5.9.3
```

### Description

- Concise summary (50 chars or less)
- Imperative mood: "add" not "added" or "adds"
- No period at the end

### Body

Optional but recommended for non-trivial changes:
```
feat(config-review): add contradiction detection across bootstrap files

Scan pairs of bootstrap files for conflicting instructions — model
assignments, delegation rules, behavioral directives. Surface as
findings with file + section references.

- Add contradiction-rules.ts with cross-file diffing
- Integrate with runner.ts review pipeline
- Add unit tests for known conflict patterns
```

### Footer

Reference issues/PRs:
```
fix(analyzer): handle missing AGENTS.md

Fixes #42
```

### Examples

```bash
# Simple feature
git commit -m "feat(scanner): add file type filtering"

# Bug fix with issue reference
git commit -m "fix(redact): handle nested secret objects

Fixes #15"

# Complex feature with body
git commit -m "feat(config-review): add contradiction detection

Cross-reference bootstrap files for conflicting instructions.
Surfaces conflicts as findings with file and section references.

- Add contradiction-rules.ts
- Integrate with runner.ts
- Add unit tests for known conflict patterns

Closes #31"

# Chore
git commit -m "chore(deps): update eslint-config-next to v16.1.6"

# Security update
git commit -m "security(env): add pre-commit hook for secret detection"
```

### Why Conventional Commits?

- ✅ Auto-generates semantic versioning (major.minor.patch)
- ✅ Enables automated changelog generation
- ✅ Makes git history scannable and searchable
- ✅ Communicates intent clearly in PR reviews

---

## Security

### Handling Secrets

**NEVER commit sensitive data.** The pre-commit hook will block it, but:

1. **Environment variables** → `.env.local` (gitignored)
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your real credentials
   ```

2. **API keys in code** → Use environment variables
   ```typescript
   // ✅ DO
   const apiKey = process.env.AIRTABLE_API_KEY;
   
   // ❌ DON'T
   const apiKey = "airtable_key_12345";
   ```

3. **Shared credentials** → GitHub Secrets (for CI/CD)
   - Production secrets stored in GitHub Actions secrets
   - Never in code or .env files

4. **Accidental commit?** If you accidentally commit a secret:
   ```bash
   # DO NOT just remove it and recommit
   # Use git-filter-repo to purge from history
   git filter-repo --invert-paths --path .env
   
   # OR contact maintainers to purge from GitHub
   ```

### Automatic Redaction

Sensitive values are automatically redacted before display:
```typescript
// See src/lib/redact.ts
const redacted = redactSensitiveValues(jsonString);
```

Redacts keys matching:
- `api_key`, `apikey`, `API_KEY`
- `*_token`, `*_secret`, `*_password`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.

### Security Checklist

Before submitting a PR:
- [ ] No hardcoded API keys, tokens, or passwords
- [ ] No credentials in example files (use `.example` suffix)
- [ ] Environment-sensitive code uses `process.env.*`
- [ ] Input validation on API routes
- [ ] Error messages don't leak sensitive info
- [ ] File operations stay within intended directory

---

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

**Fix all lint errors before pushing.**

### Testing

```bash
# Run all tests
npm test

# Run single test file
npm test -- src/lib/__tests__/analyzer.test.ts

# Watch mode (for TDD)
npm test -- --watch
```

**Minimum coverage expectations:**
- Core logic: >80% coverage
- Utilities: >70% coverage
- UI components: snapshot tests OK

### Type Checking

```bash
# Run TypeScript compiler
npx tsc --noEmit

# This is also run during linting and tests
```

**Fix all type errors before pushing.**

### Building

```bash
# Production build
npm run build

# Verify no build errors
echo $?  # Should be 0
```

**Always build locally before pushing.**

---

## Merge Conflicts

### Prevention

1. **Keep branches short-lived** (< 3 days when possible)
2. **Keep commits small and focused**
3. **Rebase frequently** against master
4. **Communicate** large changes in issues

### Resolving Conflicts

When you encounter conflicts:

```bash
# 1. See which files have conflicts
git status

# 2. Open conflicted files and look for markers
#    <<<<<<< HEAD
#    your changes
#    =======
#    their changes
#    >>>>>>> branch-name

# 3. Decide which version to keep, or combine
# 4. Remove conflict markers

# 5. Stage the resolved files
git add resolved-file.ts

# 6. Continue rebase or merge
git rebase --continue
# OR
git merge --continue

# 7. Verify everything still works
npm test
npm run lint
```

### Example Conflict Resolution

```typescript
// Conflicted file
<<<<<<< HEAD
function getHealthScore(findings: ReviewFinding[]): number {
  return 100 - findings.length * 10;
}
=======
function getHealthScore(findings: ReviewFinding[]): number {
  const criticals = findings.filter(f => f.severity === 'critical').length;
  return Math.max(0, 100 - criticals * 15);
}
>>>>>>> feature/weighted-scoring

// ✅ Resolved (keep the weighted version — it's more accurate)
function getHealthScore(findings: ReviewFinding[]): number {
  const criticals = findings.filter(f => f.severity === 'critical').length;
  return Math.max(0, 100 - criticals * 15);
}
```

### Merge Conflict Checklist

After resolving:
- [ ] All conflict markers removed
- [ ] Code compiles (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Tested the specific conflicting area manually

---

## Pull Request Process

### Before Creating a PR

```bash
# 1. Ensure you're up to date
git fetch origin
git rebase origin/master

# 2. Run tests
npm test

# 3. Run linting
npm run lint

# 4. Build for production
npm run build

# 5. Verify no errors
# All commands above should exit with code 0
```

### Creating the PR

1. **Push your branch**
   ```bash
   git push origin feat/your-feature-name
   ```

2. **Open PR on GitHub**
   - Use the link provided in the push output
   - Or go to: https://github.com/DanAndBub/Driftwatch/compare/master...feat/your-feature-name

3. **Fill out the PR template**
   ```markdown
   ## Description
   Brief summary of what this PR does.
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   
   ## Checklist
   - [ ] Tests pass
   - [ ] Linting passes
   - [ ] Build succeeds
   - [ ] No secrets committed
   - [ ] Documentation updated (if needed)
   
   ## Related Issues
   Closes #123
   ```

### PR Title Convention

PR titles should also follow Conventional Commits:
```
feat: add cost forecasting with exponential regression
fix: redact nested API keys in JSON objects
docs: update security policy with vulnerability reporting
```

### Review Process

- Expect feedback from maintainers
- Address review comments with new commits
- Don't force-push already-reviewed code (do interactive rebase after addressing all comments)
- Squash commits if maintainer requests it

### After Merge

- Your branch will be automatically deleted on GitHub
- Delete your local branch:
  ```bash
  git checkout master
  git branch -D feat/your-feature-name
  ```

---

## AI Agent Guidelines

If you're an AI agent (OpenClaw, Claude, etc.) contributing to this project:

### Communication

- Explain your changes clearly in commit messages
- Reference related issues or discussions
- Ask questions in PRs if anything is unclear
- Propose approaches before implementing major changes

### Code Style

- Follow TypeScript strict mode (no `any`)
- Use explicit types for all function parameters and returns
- Prefer const assertions for readonly data
- Use 2-space indentation (EditorConfig enforces this)

### Testing

- Add tests for all new logic
- Aim for >80% coverage on core features
- Test edge cases and error conditions

### Git Workflow

- Create feature branches for each task
- Make atomic, logical commits
- Use Conventional Commits format
- Sync with master before submitting PR

### Security

- Never hardcode credentials
- Use environment variables for secrets
- Check for hardcoded API keys before committing
- Run the pre-commit hook verification

### When in Doubt

- Check existing code patterns in the codebase
- Look at similar implementations
- Ask in an issue or PR comment
- Favor explicit over implicit
- Favor readability over cleverness

---

## Questions or Issues?

- **Bug report**: Open an issue with reproduction steps
- **Feature request**: Open an issue with use case and context
- **Security issue**: See [SECURITY.md](./SECURITY.md)
- **Contributing question**: Feel free to ask in an issue

Thank you for making Driftwatch better!
