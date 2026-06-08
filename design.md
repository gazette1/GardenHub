# GardenCam — design.md

A portable design system for **GardenCam**, a live NYC traffic-cam watch-party viewer dressed as an **ABC NBA Finals broadcast**. This file is the recipe; `index.html` / `style.css` are the dish. Cite it when generating: "using the score-bug anatomy from design.md §Components".

> **Homage, not clone.** Evoke the feeling of an ABC Finals telecast — the golden lower-thirds, the condensed type, the dark glossy chyron — *without* reproducing the ABC roundel, the NBA logo, or any trademarked asset. No real network logos ship.

---

## Identity

GardenCam looks like the moment right before tip-off: house lights down, the broadcast graphics package glowing over a dark arena. It is a **premium sports-broadcast chyron** wrapped around gritty, low-fps street cameras. The tension between the polished golden lower-third and the grainy, occasionally-dead traffic feed *is* the brand — a fancy frame around an honest, buggy window onto the actual street outside the party. Confident, kinetic, dark, and a little bit live-TV-imperfect. Never sterile, never SaaS.

---

## Typography

**Display / broadcast type** — condensed, heavy, slightly italicized energy. Used for the title bar, "NBA FINALS · GAME 3" framing, venue pills, score numerals.
```
font-family: "Saira Condensed", "Oswald", "Arial Narrow", system-ui, sans-serif;
```

**UI / label type** — clean grotesque for camera labels, notes, credit.
```
font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
```

**Mono / scoreboard numerals** — the score bug digits read like a stadium clock.
```
font-family: "Saira Condensed", ui-monospace, "SF Mono", "Consolas", monospace;
font-variant-numeric: tabular-nums;
```

Google Fonts link (the one allowed external resource):
```
https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap
```

**Type scale (px):** 11 · 12 · 13 · 14 · 16 · 20 · 26 · 34 · 44 · 56
- Score numerals: `clamp(34px, 6vw, 56px)`, weight 800
- Wordmark "GardenCam": 26px, weight 800, tracking `0.02em`
- "NBA FINALS · GAME 3" kicker: 12px, weight 700, tracking `0.28em`, uppercase
- Venue pills: 14px, weight 700, tracking `0.04em`, uppercase
- Camera labels: 13px, weight 600
- Notes / credit: 11–12px, weight 500

**Smoothing & tracking:** `-webkit-font-smoothing: antialiased`. Condensed display always uppercase with positive tracking; body never tracked.

---

## Color

Dark broadcast surface + a single **golden** signature accent (the ABC-Finals homage). Team colors are quarantined to the score-bug end tabs only.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0a0a0b` | app background |
| `--surface-1` | `#141417` | header bar, tiles base |
| `--surface-2` | `#1c1c21` | pills (inactive), cards |
| `--surface-3` | `#26262d` | hover, borders-raised |
| `--line` | `#33333b` | hairline borders |
| `--text` | `#f7f7f8` | primary text |
| `--text-dim` | `#a0a0aa` | labels, notes |
| `--text-mute` | `#6b6b76` | credit, disabled |
| `--gold` | `#f5c518` | **signature accent** — active pill, focus, kicker |
| `--gold-deep` | `#caa20f` | gold pressed / gradient end |
| `--live` | `#ff2d2d` | LIVE dot, error accents |
| `--nyk` | `#f58426` | **team tab only** — Knicks orange |
| `--sas` | `#c4ced4` | **team tab only** — Spurs silver |

Gold is used **sparingly** — one golden element per region. It marks "live/active/now", never decoration. The chyron pill body is dark glass, not gold.

---

## Spacing

Base unit **4px**. Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.
- Tile gap: 12px (grid)
- Header padding: 16px (mobile) → 24px (desktop)
- Score-bug internal padding: 10px 14px
- Pill padding: 10px 16px (≥44px tap height guaranteed via `min-height: 44px`)

Radius scale: `4` (tabs) · `8` (tiles, pills) · `10` (score bug) · `999` (LIVE dot). Tiles are *gently* rounded, not pill-soft — broadcast hardware reads slightly squared.

---

## Motion

Easing curves:
```
--ease-out:   cubic-bezier(0.22, 1, 0.36, 1);   /* UI settle */
--ease-broadcast: cubic-bezier(0.16, 1, 0.3, 1); /* chyron slide-in */
```
Durations: 120ms (taps/hover) · 220ms (pill + featured swap) · 600ms (chyron entrance).

Named transitions:
- **chyron-in** — score bug slides up + fades from `translateY(8px)` over 600ms `--ease-broadcast` on load.
- **featured-swap** — new featured image cross-fades opacity 0→1 over 220ms; *no layout move* (fixed aspect box).
- **pill-activate** — gold fill + faint lift, 220ms `--ease-out`.
- **live-pulse** — LIVE dot opacity 1→0.35→1 over 1.6s `ease-in-out` infinite (gentle, not strobing).

`prefers-reduced-motion: reduce` → kill live-pulse and chyron-in, keep instant state.

---

## Effects (signature ingredients — used, not piled on)

1. **Golden lower-third bar** — the title kicker sits on a thin gold rule with a soft `box-shadow: 0 0 24px -8px var(--gold)` glow, like a lit broadcast strip. One per page.
2. **Glass chyron** — score bug = `rgba(10,10,11,0.72)` + `backdrop-filter: blur(8px)` + 1px top highlight `inset 0 1px 0 rgba(255,255,255,0.08)`. Team-color **end tabs**: solid 6px-wide vertical bars (NYK left, SAS right) bookending the pill.
3. **Scanline veneer (subtle)** — featured tile gets a near-invisible repeating-linear-gradient scanline overlay (`opacity: 0.04`) to read as "broadcast monitor", never as a gimmick.
4. **Live grain on reconnect** — RECONNECTING placeholder uses an animated noise/static feel via a stepped gradient, evoking a dead TV channel.
5. **Featured glow border** — active/featured tile + active venue pill carry a 1px gold border with `0 0 0 1px var(--gold), 0 8px 30px -12px rgba(245,197,24,0.4)`.

Pick these *because* they sell "live broadcast." No glassmorphism on every card; only the chyron is glass.

---

## Components

**Venue pill**
- Inactive: `--surface-2` bg, `--line` border, `--text-dim` text.
- Active: `--gold` → `--gold-deep` vertical gradient, `#1a1400` text (dark on gold), gold glow.
- `min-height: 44px`, uppercase condensed 14px/700. Row scrolls horizontally on mobile (`overflow-x: auto`, no wrap), no scrollbar chrome.

**Camera tile** (featured + thumbnail share anatomy)
- Fixed aspect box `aspect-ratio: 16/9`, `object-fit: cover`, `overflow: hidden`, radius 8. Image swap causes **zero layout shift**.
- Bottom label strip: gradient scrim `linear-gradient(transparent, rgba(0,0,0,0.75))`, 13px/600 intersection name, lower-left.
- Thumbnail: hover lifts 2px + border → `--surface-3`. Featured: gold glow border.

**Featured tile extras**
- **LIVE dot** top-left: 8px red dot + "LIVE" 11px/800 tracking `0.1em`, on a dark pill. **Honest:** rendered only when the featured cam's last frame loaded; while reconnecting it swaps to a dim grey "RECONNECTING" state (no red, no pulse).
- **Score bug** lower-left (the chyron, see Effects §2).

**Score bug anatomy** (left → right): `[NYK tab][ NYK 00 ][ SAS 00 ][SAS tab]`
- Abbrev + score are `contenteditable` spans. Focus ring = 2px gold inset, bg lifts to `--surface-3`.
- Scores: tabular condensed numerals, `inputmode="numeric"`, clamp 0–199, commit on Enter **and** blur, Escape reverts.
- Abbrevs: ≤4 chars, auto-uppercased.
- Edit affordance: a faint dotted underline on editable fields at rest so users know to tap.

**Header**
- Row 1: gold kicker "NBA FINALS · GAME 3" + "GardenCam" wordmark + dim note "2s refresh • feeds can be buggy".
- Row 2: venue pill row.
- Row 3 (or footer): credit "Cameras: NYC DOT" linking `https://webcams.nyctmc.org/map`, `--text-mute` 11px.

---

## Voice

Terse, broadcast-confident, a little wry about the jank.
- ✅ "feeds can be buggy", "RECONNECTING…", "LIVE", "GAME 3"
- ❌ marketing fluff ("Experience the game like never before"), emoji in UI chrome, apologetic error copy ("Oops! Something went wrong").
- Errors state the fact: a dead cam says **RECONNECTING…**, not an apology.

---

## Anti-patterns (what GardenCam is NOT)

- ❌ Purple/indigo gradients, the default-AI accent. Our accent is broadcast gold.
- ❌ Glassmorphism on every surface — glass is reserved for the **one** chyron.
- ❌ Centered hero + three pastel feature columns. This is a live grid, not a landing page.
- ❌ Rounded-everything pill-soft cards. Tiles are squared-broadcast (radius 8 max).
- ❌ Lucide/pastel-circle icon sets. Minimal iconography; type and the LIVE dot carry it.
- ❌ Layout shift on image reload. Fixed aspect boxes, always.
- ❌ A glowing "LIVE" badge over a dead feed. Honesty over decoration.
- ❌ Spinners/skeletons blocking first paint. Curated tiles render instantly; enrichment is silent.
- ❌ Real ABC / NBA / team logos. Homage via type, color, and layout only.
