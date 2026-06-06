---
name: rfdd-design
description: Use this skill to generate well-branded interfaces and assets for RFDD (Romano, Fiocca & Díaz Delfino), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick start
- `colors_and_type.css` — single source of truth for tokens. Import it.
- `assets/logo.png` is the canonical logo. **Do not redraw or restyle it.** Use directly; for reverse on dark backgrounds use `filter: brightness(0) invert(1)`.
- Voice: Argentine Spanish, *vos*, sober, no emoji, no exclamations. See README → CONTENT FUNDAMENTALS.
- Type: Cormorant Garamond display + Source Serif 4 lead + Inter UI/numbers.
- Numbers in dashboards: **Inter 700 tabular-nums** (display serif is reserved for headlines, not for KPI values — readability).
- Color: navy `#0E2543` anchor, sky `#8FB8D6` secondary, gold `#C9A24E` accent (sparingly), paper `#F7F6F2` background.

## What's here
- `preview/` — Design System tab cards.
- `ui_kits/website/` — full marketing-site recreation.
- `ui_kits/dashboard/` — Power BI–style management dashboard.
