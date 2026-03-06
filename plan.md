# Plan: Session-Based Auth for Admin API Routes

## Problem

The admin API routes (`/api/admin/anthropic/usage`, `/api/admin/openai/usage`) expose organization-wide billing data with zero authentication. Anyone with the URL can query your Anthropic/OpenAI spend data. Driftwatch currently has no auth system at all.

## Proposed Solution: NextAuth.js with GitHub OAuth

**Why this approach:**
- Users sign in with GitHub — no passwords to manage, no email verification flows
- Natural fit since Driftwatch is a developer tool and users already have GitHub accounts
- NextAuth.js is the standard auth library for Next.js apps (now called Auth.js)
- Supports role-based access: only approved users can see admin billing data
- Session cookies are httpOnly and secure by default — no tokens for users to manage

## Implementation Steps

### 1. Install dependencies
```
npm install next-auth@5
```

### 2. Create auth configuration — `src/lib/auth.ts`
- Configure GitHub OAuth provider
- Define session callback to include user role
- Use JWT strategy (no database needed — keeps it simple)
- Allowed users list via env var `ALLOWED_EMAILS` (comma-separated)

### 3. Create auth API route — `src/app/api/auth/[...nextauth]/route.ts`
- Standard NextAuth catch-all route
- Handles OAuth callback, sign-in, sign-out

### 4. Create middleware — `src/middleware.ts`
- Protect all `/api/admin/*` routes — return 401 if no valid session
- Protect `/settings` page — redirect to sign-in if unauthenticated
- Leave `/cost-tracking` accessible (it uses local IndexedDB data, no sensitive server data)
- Leave `/api/feedback` and `/api/waitlist` unprotected (public-facing)

### 5. Add sign-in UI
- Add a small auth button to the nav bar (in layout or nav component)
- Shows "Sign in" or user avatar + "Sign out"
- No full login page needed — GitHub OAuth redirects handle it

### 6. Update admin route callers
- `reconciliation.ts` — `checkAdminAvailability()` and `reconcileWithAdmin()` already call the admin routes via `fetch()`. These run client-side, so the browser cookie is sent automatically. No code changes needed here.
- `InsightsPanel` and `ReconciliationBadge` — same, no changes needed.

### 7. Environment variables required
```env
# GitHub OAuth (create at github.com/settings/applications/new)
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...

# NextAuth
AUTH_SECRET=...          # Generate with: npx auth secret

# Access control
ALLOWED_EMAILS=dan@example.com,bub@example.com
```

## Files Changed/Created

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | modify | Add next-auth dependency |
| `src/lib/auth.ts` | create | Auth config, providers, callbacks |
| `src/app/api/auth/[...nextauth]/route.ts` | create | OAuth API route |
| `src/middleware.ts` | create | Protect admin routes + settings |
| `src/components/AuthButton.tsx` | create | Sign in/out UI for nav |
| `src/app/layout.tsx` | modify | Wrap app in SessionProvider, add AuthButton to nav |

## What This Does NOT Change

- Cost tracking page remains accessible without auth (data is in local IndexedDB)
- Import/export functionality unchanged
- All existing components unchanged
- Feedback and waitlist APIs remain public
- No database required — JWT sessions only

## Security Properties

- Admin routes return 401 without a valid session cookie
- GitHub OAuth means no password storage
- `ALLOWED_EMAILS` restricts access to approved team members
- Session cookies are httpOnly, secure, SameSite=lax (CSRF protection)
- Admin API keys (`ANTHROPIC_ADMIN_KEY`, `OPENAI_ADMIN_KEY`) remain server-side only

## Estimated Scope

6 files touched, ~120 lines of new code. No changes to existing business logic.
