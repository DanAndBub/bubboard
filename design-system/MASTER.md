# Driftwatch Design System

## Identity

**Product:** Config intelligence tool for OpenClaw power users. $12/mo.
**Tone:** Anti-hype. Quiet confidence. Developer-credible. Built by someone who uses it.
**Feeling:** Like opening a well-made CLI tool — no pitch, just capability.

---

## Pattern: Minimal & Direct (Single Column)

- Single column, centered, max-width 560px
- Generous whitespace — let the page breathe
- One primary CTA, one secondary CTA — that's it
- No decorative elements, no gradients, no animated counters
- Fast-loading, no heavy assets
- Content earns its space or gets cut

### Section Order
1. Product name (wordmark, no logo icon needed)
2. Headline — one sentence, what it does
3. Subhead — one sentence, why it matters
4. Primary CTA (scan) + Secondary CTA (demo)
5. Trust signals (privacy, browser-based) — minimal, inline
6. What it catches (3 concrete capabilities, not features)
7. Skill promotion (one line)

---

## Style: Dark Mode (OLED-adjacent) + Minimal & Direct

Not cyberpunk. Not sci-fi. Just dark, quiet, and readable.

- Deep dark backgrounds, not pure black
- Minimal glow effects — only on primary CTA hover
- No animated gradients, no scanlines, no glitch effects
- No purple. No neon. No AI-startup aesthetic.
- Borders are subtle, used structurally not decoratively
- Cards only if they contain real content, not decoration

### Performance: Excellent
### Accessibility: WCAG AA minimum
### Complexity: Low

---

## Color Palette

Derived from UUPM "Developer Tool / IDE" palette, adapted for anti-hype tone.

| Token              | Hex       | Usage                                    |
|--------------------|-----------|------------------------------------------|
| `--bg`             | `#0b1017` | Page background                          |
| `--surface`        | `#111820` | Cards, panels                            |
| `--border`         | `#1e2a38` | Structural borders                       |
| `--border-hover`   | `#2d3f5a` | Interactive border on hover              |
| `--text-primary`   | `#e2e8f0` | Headlines, primary copy                  |
| `--text-secondary` | `#94a3b8` | Body text, descriptions                  |
| `--text-muted`     | `#506880` | Captions, disclaimers, trust signals     |
| `--accent`         | `#3b82f6` | Links, primary CTA background            |
| `--accent-hover`   | `#2563eb` | CTA hover state                          |
| `--accent-subtle`  | `#1e3a5f` | CTA secondary/outline hover background   |
| `--success`        | `#22c55e` | Positive indicators (not primary accent)  |

### What's NOT in the palette
- No purple (#8b5cf6 or similar) — too "AI startup"
- No amber/orange as primary accent — reserved for warnings only
- No gradients on any element
- No glow/shadow on text

---

## Typography

**Pairing:** JetBrains Mono (headings, labels, code) + IBM Plex Sans (body)
**Source:** UUPM "Developer Mono" pairing — code-native, precise, functional.

| Element         | Font            | Weight | Size    | Line-height | Tracking     |
|-----------------|-----------------|--------|---------|-------------|--------------|
| Product name    | JetBrains Mono  | 500    | 15px    | 1           | 0            |
| Headline (h1)   | IBM Plex Sans   | 600    | 28px    | 1.3         | -0.01em      |
| Subhead          | IBM Plex Sans   | 400    | 16px    | 1.6         | 0            |
| Body             | IBM Plex Sans   | 400    | 14px    | 1.6         | 0            |
| Button text      | JetBrains Mono  | 500    | 13px    | 1           | 0.02em       |
| Caption/muted    | IBM Plex Sans   | 400    | 12px    | 1.5         | 0            |
| Trust signals    | IBM Plex Sans   | 400    | 12px    | 1.5         | 0            |

### Typography Rules
- No ALL-CAPS text anywhere (the current "BOOTSTRAP FILE INSPECTOR" is wrong)
- No uppercase tracking-widest labels
- Sentence case everywhere
- Monospace only for: product name, button labels, inline code references
- Body text is always sans-serif for readability
- Max line length: 65 characters for body copy

---

## Spacing

Based on a 4px grid. Generous but not wasteful.

| Token    | Value | Usage                          |
|----------|-------|--------------------------------|
| `--sp-1` | 4px   | Inline gaps                    |
| `--sp-2` | 8px   | Tight element spacing          |
| `--sp-3` | 12px  | Button padding, small gaps     |
| `--sp-4` | 16px  | Section internal padding       |
| `--sp-6` | 24px  | Between content blocks         |
| `--sp-8` | 32px  | Between sections               |
| `--sp-12`| 48px  | Major section breaks           |
| `--sp-16`| 64px  | Page top/bottom padding        |

---

## Components

### Primary CTA Button
- Background: `--accent` (#3b82f6)
- Text: white, JetBrains Mono 500, 13px
- Padding: 12px 24px
- Border-radius: 8px
- Hover: background darkens to `--accent-hover`, no glow, no scale
- Transition: background-color 150ms ease
- cursor: pointer

### Secondary CTA Button
- Background: transparent
- Border: 1px solid `--border`
- Text: `--text-secondary`, JetBrains Mono 500, 13px
- Padding: 12px 24px
- Border-radius: 8px
- Hover: border-color `--border-hover`, text `--text-primary`
- Transition: border-color 150ms ease, color 150ms ease
- cursor: pointer

### Trust Signal Row
- Inline text, separated by middots (·)
- Font: IBM Plex Sans 400, 12px
- Color: `--text-muted`
- No borders, no dividers, no icons
- Centered

### Capability Item
- No cards, no icons
- Short bold label (JetBrains Mono, 13px, `--text-primary`)
- One-line description (IBM Plex Sans, 14px, `--text-secondary`)
- Stacked vertically with `--sp-4` gap between items

---

## Anti-Patterns (DO NOT USE)

| Anti-Pattern                    | Why                                                    |
|---------------------------------|--------------------------------------------------------|
| Animated counters               | SaaS vanity metrics — contradicts anti-hype tone       |
| Community stats section         | "127 scans" is not social proof, it's a small number   |
| ALL-CAPS labels                 | Feels like a pitch deck, not a tool                    |
| Purple/violet accents           | Reads as "AI startup", not developer tool              |
| Gradient borders/backgrounds    | Decorative, not functional                             |
| Glow effects on text            | Sci-fi aesthetic, wrong tone                           |
| "See what X can't see" phrasing | Slightly antagonistic, mysterious — just say what it does |
| Emojis as icons                 | Use SVG or nothing                                     |
| Tracking-widest uppercase       | Startup-y category label pattern                       |
| Animated scan lines             | Cyberpunk aesthetic, wrong tone                        |
| Multiple font sizes for stats   | Visual noise, draws attention to weak numbers          |
| Truncation percentage display   | Meaningless at low volume, embarrassing at zero        |

---

## Responsive Breakpoints

| Breakpoint | Width  | Behavior                              |
|------------|--------|---------------------------------------|
| Mobile     | < 640px | Stack CTAs, reduce padding            |
| Desktop    | 640px+  | Side-by-side CTAs, centered layout    |

The homepage is simple enough that it shouldn't need complex responsive logic.
A single `max-width: 560px` centered container handles most of it.

---

## Pre-Delivery Checklist

- [ ] No emojis as icons
- [ ] No ALL-CAPS text
- [ ] No animated counters or stat displays
- [ ] No purple/violet anywhere
- [ ] No gradient borders or backgrounds
- [ ] cursor-pointer on all interactive elements
- [ ] Hover states smooth (150ms)
- [ ] Focus states visible for keyboard navigation
- [ ] Text contrast meets WCAG AA (4.5:1 for normal text)
- [ ] Responsive at 375px and 1440px
- [ ] Page weight under 500KB
- [ ] Body text max 65 characters per line
