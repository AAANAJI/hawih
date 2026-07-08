# HAWIH Print — Image Generation Style Guide

All published imagery for the HAWIH print store is **AI-generated**. Scraped
competitor photos (weej.sa and others) are **internal composition reference only** —
never traced, never published. This guide defines the single visual language every
generated asset must follow so the catalog reads as one branded studio.

---

## 1. Palette

One accent, warm-paper grounds, near-black shadows. Do not introduce any other hue.

| Role | Token | Hex / value | Use |
|------|-------|-------------|-----|
| Accent (sole) | `--hawih-blue` | `#1F1FFE` | Cobalt — the only saturated color. Abstract artwork on printed samples, accent props, subtle rim. |
| Accent hover | `--hawih-blue-hover` | `#1414D6` | Deeper cobalt for gradient depth. |
| Accent soft | `--hawih-blue-soft` | `rgba(31,31,254,.12)` | Faint cobalt glow / tint. |
| Background | `--hawih-paper` | `#F4F1EB` | Primary seamless paper backdrop. |
| Background 2 | `--hawih-paper-2` | `#E9E4D7` | Secondary / gradient floor, contact surface. |
| Shadow / ink | `--hawih-ink` | `#0B0B10` | Contact shadows, deepest values. |
| Ink 2 | `--hawih-ink-2` | `#14141C` | Soft shadow cores. |

**Rule of thumb:** paper fills the frame, cobalt appears only as the printed design or
a single accent, ink lives in the shadows. No competing colors, no rainbow product shots.

---

## 2. Style

- **Medium:** studio product photography, or a soft photoreal 3D render that reads as
  studio photography. Clean, premium, editorial.
- **Angle:** hero shots at a **35–45° three-quarter angle**; square/tile shots may be
  top-down (90°) when the product is flat (stickers, letterhead, wrapping).
- **Light:** soft **top-left key light**, large diffuse source, gentle falloff. No hard
  specular hotspots.
- **Shadow:** a soft **contact shadow** grounding the product on a **paper seamless**
  (`#F4F1EB` sweeping to `#E9E4D7`). Shadow tinted toward `#0B0B10`, never pure black.
- **Printed artwork:** any design printed on the sample is **abstract cobalt geometry**
  (`#1F1FFE`) — lines, arcs, concentric rings, minimal marks. Never a real logo, never a
  competitor mark.
- **Mockup text:** if any legible text appears on a sample, set it in **IBM Plex Sans
  Arabic** (Arabic) — keep it minimal and non-committal (no real names, no phone numbers).
- **Mood:** calm, high-end, lots of negative space, warm neutral.

---

## 3. Negatives (exclude from every prompt)

`no watermarks, no competitor brands or logos, no real phone numbers or QR codes,
no people or hands, no busy or cluttered background, no rainbow / multi-color palette,
no harsh reflections, no text-heavy surfaces, no stock-photo look, no drop-shadow
clip-art, no low-resolution artifacts`

---

## 4. Asset Spec

All outputs **webp, ≤ 350 KB**, metadata stripped. Generate at the master size, then the
`optimize-images.mjs` pipeline emits the `-sm` variant.

| Asset | Master size | `-sm` variant | Aspect | Notes |
|-------|-------------|---------------|--------|-------|
| Product hero | 1600 × 1200 | 800 × 600 | 4:3 | 35–45° three-quarter, contact shadow. |
| Product square | 1200 × 1200 | 600 × 600 | 1:1 | tight crop, top-down for flats. |
| Category tile | 1200 × 900 | 600 × 450 | 4:3 | one representative product, more negative space. |
| Home hero | 2400 × 1200 | 1200 × 600 | 2:1 | wide banner, cobalt geometry motif, room for headline. |
| OG / social | 1200 × 630 | — | 1.91:1 | safe centered composition, brand-forward. |

---

## 5. Prompt Templates

Per-asset filled prompts live in `prompts/`:

- `prompts/products.md` — one prompt per demo product (9).
- `prompts/categories.md` — one prompt per category (8).
- `prompts/heroes.md` — home hero + OG.

Prompts are **tool-agnostic** (Firefly, Freepik, Midjourney, etc.). Each references its
weej source image **only as a composition reference** — mimic layout/framing, never copy
the artwork, product identity, or branding. Append the shared **negatives** block (§3) to
every generation. Keep the palette locked to §1.
