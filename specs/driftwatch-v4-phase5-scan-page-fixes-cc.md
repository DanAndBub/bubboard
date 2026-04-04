# CC SPEC: Driftwatch post-polish fixes

## Goal

Five fixes following Dan's visual review of the scan page polish build. Covers: content max-width cap, home page desktop/sidebar/counter fixes, Driftwatch skill promotion, "Message the Creators" contact form, Conflict Scanner coming-soon page, and page renames.

**Product context for design system reasoning:** Config intelligence tool for OpenClaw AI agent workspaces. Target user: solo devs and small teams running AI agents. Anti-hype tone — serious dev tool, not a SaaS marketing page. Reference aesthetic: Linear, Notion, GitHub. Dark theme: `#0a0e17` base, `#f1f5f9` text, `#7db8fc` accent.

## Context
- Project: Driftwatch (public repo `DanAndBub/Driftwatch`)
- Branch: current V4 branch (run `git branch | grep v4`)
- Key files:
  - `src/app/page.tsx` — main page
  - `src/components/map/MapShell.tsx` — app shell (sidebar + top bar + content area)
  - `src/components/map/MapSidebar.tsx` or equivalent — sidebar navigation
  - `src/components/map/views/ReviewView.tsx` — Config Review (being renamed to Config Health)
  - `src/components/map/views/DriftView.tsx` — Drift Report
  - `src/app/api/feedback/route.ts` — existing feedback API (posts to Airtable "Feedback" table)
  - `src/components/CommunityCounter.tsx` — counter component from previous spec
- New files to create:
  - `src/components/map/views/ConflictScannerView.tsx` — coming-soon placeholder page
  - `src/components/ContactForm.tsx` — contact/feedback form component (or inline in sidebar)
- Dependencies: None new

## Constraints
- Do NOT modify the analysis engine, rule engine, or any business logic
- Do NOT modify the scan stats API or counter data pipeline
- Do NOT change snapshot download/upload behavior
- Do NOT change the editor panel
- Do NOT break mobile responsiveness — test at 375px after every visual change
- Do NOT use the old bug report floating chat bubble styling — it's being removed
- The existing `/api/feedback` route stays as-is (same endpoint, same Airtable table "Feedback", same env vars)

## Steps

### Step 1: Cap content width on Config Health and Drift Report views

The content area in `ReviewView.tsx` and `DriftView.tsx` currently stretches to fill the full window width. On wide monitors this makes the progress bars and content uncomfortably wide.

Add a max-width constraint to the main content container in both views. Use `max-width: 960px` (or similar reasonable value — read the existing layout to pick the right breakpoint) and center with `margin: 0 auto`. This must not affect the sidebar width or position.

**Important:** Do not break the mobile/tablet layout. The content should still be 100% width below the max-width threshold. Test that the truncation progress bars, status cards, and findings list all look correct at both narrow and wide viewports.

**Gate:** `npx tsc --noEmit` passes. Verify visually: resize browser to full widescreen width — content should stop stretching past the max-width and center itself. Narrow the browser to mobile width — content should still fill available space.

### Step 2: Fix home page — desktop layout, sidebar, counter visibility

Three sub-fixes:

**2a: Desktop layout.** The home page currently shows the same single-column mobile layout on desktop. Implement a proper desktop adaptation:
- Center the content block with `max-width: ~520px` and `margin: 0 auto`
- CTAs can sit side-by-side on desktop (scan button + demo button in a flex row) instead of stacked full-width
- Trust signals can render as an inline row with dividers (`browser-only / no uploads / chrome or edge`) instead of a vertical list
- The overall feel should be a centered, focused landing — not a stretched mobile layout

**2b: Hide sidebar on pre-scan state.** When the user hasn't scanned yet (the `!agentMap` state), the left navigation sidebar should not be visible. There's nothing to navigate to yet — showing an empty sidebar wastes space and looks unfinished. The sidebar should only appear after a scan completes or demo data loads. Read `MapShell.tsx` to understand how the sidebar renders and conditionally hide it.

**2c: Force-show counter for visual review.** Temporarily override the `totalScans >= 50` threshold in `CommunityCounter.tsx` so the counter always renders (even with zero data, use placeholder numbers). Dan needs to see it to approve the styling. Add a code comment `// TODO: Remove threshold override after Dan's visual review` so it's easy to find and revert.

**Gate:** `npx tsc --noEmit` passes. Home page at `/` on desktop: centered content, no sidebar, counter visible with placeholder data. On mobile (375px): stacked layout, no sidebar, counter visible.

### Step 3: Add "Get the Driftwatch Skill" promotion

Add a link promoting the free Driftwatch CLI skill. This appears in **three places:**

**3a: Home page (pre-scan).** Below the community counter (or below the trust signals if counter isn't rendering). A clean, minimal section — not a marketing block. Something like:

- A brief heading or label: "Get the free skill" or "Also available as a skill"
- One or two sentences max about what the skill does and why it's useful. Write copy from this context: The Driftwatch skill is a free OpenClaw skill that runs `scan my config` directly in your agent's workspace — zero friction, no browser needed. It checks truncation risk, file sizes, compaction anchor health, and hygiene issues. Great for mobile users or anyone who wants their agent to self-check. Generates HTML reports, tracks drift over time, supports cron automation.
- Keep the copy minimal, clean, informative. Not a sales pitch. Think: one sentence on what it is, one on why you'd want it.
- Link button or text link to: `https://clawhub.ai/danandbub/driftwatch-oc`

**3b: Sidebar navigation (post-scan and demo views).** Add a "Get the Skill" link in the sidebar, below "More is Coming" (which is being renamed in Step 4). Style it to match the other sidebar nav items. Use the accent color or a subtle distinguishing treatment since it's an external link. This is MORE important than the "More is Coming" / "Message the Creators" item — position it above that item.

**3c: External link behavior.** The link should open in a new tab (`target="_blank"` with `rel="noopener noreferrer"`).

🎯 ANTI-SLOP: The generic version would be a gradient banner with "Install Now!" and feature bullets with emoji. Instead: quiet, inline, same visual weight as the trust signals. A text link with a subtle arrow or external-link icon. The copy reads like a README note, not an ad.

**Gate:** `npx tsc --noEmit` passes. Link appears on home page, in sidebar after scan, and in sidebar during demo. Link opens correct URL in new tab.

### Step 4: Replace "More is Coming" with "Message the Creators"

**4a: Sidebar item rename.** Change the "More is Coming" sidebar nav item to "Message the Creators". Update icon if appropriate (a message/envelope icon instead of sparkle/plus). Style and color should match the other sidebar nav items — no special accent treatment.

**4b: Build the contact form.** When "Message the Creators" is clicked, show a form. This can be a modal/overlay, a slide-in panel, or an inline expansion — read the existing UI patterns and pick whichever is most consistent. The form fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Type | Select/radio | Yes | Options: "Feature Request", "Bug Report", "Review", "Message" |
| Message | Textarea | Yes | Max 2000 chars (existing API enforces this) |
| Email | Text input | Conditional | Required ONLY when Type is "Message". Optional for other types. Show/hide or mark required dynamically. |

**4c: API integration.** POST to `/api/feedback` — the existing endpoint. Map the form fields:
- `type` → map "Feature Request" to `"suggestion"`, "Bug Report" to `"bug"`, "Review" to `"review"`, "Message" to `"suggestion"` (closest match in existing API validation which accepts `bug | suggestion | review`)
- `message` → the textarea content
- `email` → the email field (if provided)

Actually — re-read the existing `/api/feedback/route.ts` to confirm the accepted `type` values. The current validation is `type !== 'bug' && type !== 'suggestion' && type !== 'review'`. Map accordingly. If "Message" doesn't fit any existing type, use `"suggestion"` and prepend "[Message] " to the message body so Dan can distinguish in Airtable.

**4d: Remove the floating bug report button.** Find and remove the chat bubble / bug report button that currently sits in the bottom-right corner of the page. The "Message the Creators" form replaces it entirely.

**4e: Success/error states.** On success: show a brief confirmation ("Sent — thanks!") then close/reset the form after 2 seconds. On error: show the error message inline. No toast library needed — keep it simple.

**Gate:** `npx tsc --noEmit` passes. Form submits successfully to `/api/feedback`. Email field shows as required only when "Message" type is selected. Floating bug report button is gone.

### Step 5: Add Conflict Scanner coming-soon page + rename pages

**5a: Rename "Config Review" to "Config Health".** Update the sidebar nav label, the view component heading, and any references in `MapShell.tsx` routing or the top bar. The component filenames can stay as-is (renaming files is optional — the label is what matters to users).

**5b: Create Conflict Scanner view.** Create `src/components/map/views/ConflictScannerView.tsx` as a coming-soon placeholder. Content:

- Page heading: "Conflict Scanner"
- A brief explanation (2-3 sentences) of what this will do: Scans your bootstrap files for contradicting instructions — places where one file says "always ask before acting" and another says "be resourceful, figure it out." Pattern-matching catches structural conflicts. A future Pro tier adds LLM-powered semantic scanning for subtle intent conflicts.
- A "coming soon" indicator — subtle, not a big splashy badge. A small muted label or a line like "This feature is in development."
- No interactive elements. No form. No fake UI.

**5c: Add to sidebar navigation.** Add "Conflict Scanner" to the sidebar nav, positioned below "Config Health" and above "Drift Report". When clicked, it shows the coming-soon view. Use the same styling as other nav items.

🎯 ANTI-SLOP: The generic coming-soon page would have a rocket emoji, "Coming Soon!" in a gradient badge, and a waitlist email form. Instead: plain text, muted, informative. It reads like documentation, not a launch announcement.

**Gate:** `npx tsc --noEmit` passes. `npm run build` passes. Sidebar shows "Config Health" (not "Config Review"), "Conflict Scanner" (new), and "Drift Report". Clicking Conflict Scanner shows the placeholder page.

## ⛔ STOP conditions
- Sidebar component structure is significantly different from expected — can't determine how nav items are rendered or where to add new ones
- The feedback API route has been moved or restructured since the last known state
- MapShell layout uses a fundamentally different pattern than expected (no conditional sidebar rendering possible)

## Acceptance Criteria
- [ ] Config Health and Drift Report content caps at a reasonable max-width on wide screens and centers
- [ ] Mobile views unchanged — content still fills available width
- [ ] Home page on desktop: centered content, side-by-side CTAs, inline trust signals
- [ ] No sidebar visible on pre-scan home page
- [ ] Community counter visible with placeholder data (temporary override for visual review)
- [ ] "Get the Skill" link on home page, styled minimally, links to `https://clawhub.ai/danandbub/driftwatch-oc`
- [ ] "Get the Skill" link in sidebar (post-scan/demo), positioned above "Message the Creators"
- [ ] All skill links open in new tab
- [ ] "More is Coming" renamed to "Message the Creators" in sidebar
- [ ] Contact form has Type (4 options), Message, and conditionally-required Email
- [ ] Form POSTs to `/api/feedback` successfully
- [ ] Email field required only when Type is "Message"
- [ ] Floating bug report button removed
- [ ] Sidebar shows: Config Health, Conflict Scanner, Drift Report
- [ ] Conflict Scanner page shows coming-soon content with brief explanation
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] NEEDS DAN: Visual review of all changes (home page desktop, counter, skill promotion, contact form, conflict scanner page, max-width cap)

## Edge Cases
⚠️ Sidebar may use different component names than expected → search for "More is Coming" text string and nav item array/config to find the right file.
⚠️ The floating bug report button may be rendered in a layout component, not in the page — search for the chat bubble icon or `position: fixed` bottom-right styling to find it.
⚠️ Email validation on the contact form should match the existing API validation (basic regex, same as waitlist route).
⚠️ If the sidebar nav items are defined in an array/config, adding new items should follow the existing pattern rather than hardcoding JSX.
