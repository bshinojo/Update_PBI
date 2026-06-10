# RFDD Design System
**Romano, Fiocca & Díaz Delfino — Desarrollo de Negocios**

A design system for a boutique Argentine business-development and corporate-finance consultancy. RFDD advises mid-market and family-owned companies on M&A, valuations, strategic consulting, and management dashboards (Power BI–based).

---

## Sources used

- **Logo** — `uploads/logo.png` (provided by user). Deep-navy serif wordmark "Romano, Fiocca & Díaz Delfino" with a light-blue circular wave emblem, tagline "DESARROLLO DE NEGOCIOS" in spaced small caps.
- **Website** — https://rfdd.com.ar/ (fetched as text). Pages explored: home, services index, FAQs, footer, client list, navigation IA.
- **No codebase, no Figma** were provided — visual decisions below are inferred from the live site copy structure, the brand mark, and the consultancy-finance product context. The site itself is built on a generic WordPress theme with stock visuals, so this system **interprets** the brand identity rather than directly cloning the WP template's chrome.

---

## Index

```
README.md                  ← this file
SKILL.md                   ← agent skill manifest (Claude Code-compatible)
colors_and_type.css        ← all CSS vars: colors, type, spacing, radii, shadows, motion

assets/
  logo.png                 ← horizontal lockup, color
  emblem.svg               ← circular wave mark (recreated, vector)
  logo-stacked.svg         ← stacked lockup (recreated)
  logo-mono-dark.svg       ← single-color reverse logo
  pattern-waves.svg        ← brand wave pattern for backgrounds
  client-*.svg             ← placeholder client wordmarks (real client logos
                              are stock raster on rfdd.com.ar — replace if possible)

preview/                   ← Design System tab cards (~700×N)
  colors-primary.html
  colors-sky.html
  colors-neutral.html
  colors-semantic.html
  type-display.html
  type-headings.html
  type-body.html
  type-eyebrow.html
  spacing.html
  radii-shadows.html
  buttons.html
  forms.html
  cards.html
  badges-kpi.html
  logos.html
  iconography.html

ui_kits/
  website/                 ← marketing-site recreation
    README.md
    index.html
    SiteHeader.jsx
    Hero.jsx
    Differentiators.jsx
    ServicesGrid.jsx
    ClientsWall.jsx
    FAQ.jsx
    SiteFooter.jsx
    Buttons.jsx
  dashboard/               ← Power BI–style management dashboard
    README.md
    index.html
    DashHeader.jsx
    KpiTile.jsx
    BarChart.jsx
    LineChart.jsx
    Donut.jsx
    DataTable.jsx
    FilterBar.jsx
```

---

## CONTENT FUNDAMENTALS

**Language.** Spanish (Argentine). All copy is in `vos`/`tú` second-person — close, advisory, direct. The voice is that of a senior partner sitting across the table, not a marketer.

**Voice & tone.**
- **Trusted advisor, not vendor.** Copy promises *accompaniment* through a process, not a product purchase. Verbs lean: *te asesoramos, te ayudamos, te acompañamos, diseñamos, calculamos, construimos, controlá, planificá, monitorea, tomá*.
- **Specific over aspirational.** Concrete deliverables ("Calculamos el valor de tu compañía y te mostramos la sensibilidad de este a cambios en las principales variables…") instead of vague promises.
- **Restrained, professional, no hype.** No emoji. No exclamation marks. No buzzwords like "revolucionario", "disruptivo".
- **Reassurance through detail.** When stakes are high (M&A), copy doubles down on responsibility: "cuidando tus datos con la más alta responsabilidad".

**Casing.**
- Page H1s and section titles use **Title Case** with Spanish conventions (only the first word and proper nouns capitalized, e.g. *"¿Qué podemos hacer por tu empresa?"*, *"Nuestros Clientes"*).
- Service names are **Capitalized** as proper nouns: *Fusiones y Adquisiciones, Tableros de Gestión, Consultoría Estratégica*.
- Eyebrows above hero slides occasionally use ALL-CAPS with letter-spacing (*FUSIONES Y ADQUISICIONES*, *VALUACIONES*) — used sparingly, only as section markers.
- Tagline uses **TRACKED SMALL CAPS** ("DESARROLLO DE NEGOCIOS") as part of the lockup.

**Pronouns & person.** Argentine *vos* throughout (`Contáctanos`, `Conocé`, `Controlá`, `Planificá`, `tomá decisiones`). When addressing the company collectively, *nosotros* is implied through verb conjugation — almost never "we" stated explicitly.

**Emoji & symbols.** **Never.** No emoji anywhere. The closest the site comes to a flourish is the em-dash bullet ("― Más Información") used as a CTA marker.

**Numbers & figures.** When numerical (e.g. "+30 años de experiencia"), they use a leading `+` with no space.

**Vibe.** *Despacho de socios* — partner's office. Quiet confidence. Wood, paper, and a fountain pen, not neon and gradients. Think: a regional Lazard or Rothschild for family-owned mid-market businesses.

**Sample copy patterns to imitate:**
- Hero: short eyebrow + serif promise + one sentence of plain-language follow-through. (*"Te asesoramos para comprar o vender una Compañía / Te ayudamos a atravesar el proceso de compraventa de una compañía, cuidando tus datos con la más alta responsabilidad."*)
- Differentiator chips: 3–6 words, sentence case (*"Servicio altamente personalizado"*, *"Manejo responsable de la información"*, *"Especialistas en empresas familiares"*).
- FAQs: question begins with `¿`, answers are 2–4 prose paragraphs that read like a partner's letter, not bullet lists.

---

## VISUAL FOUNDATIONS

**Mood.** Conservative, classical, paper-leaning. The brand sits between *editorial* (a serif-driven think-tank report) and *institutional* (a private bank). Avoid anything that looks tech-startup: no purple gradients, no glassmorphism, no rounded-corner color blobs.

**Color.**
- **Primary** is a deep navy `#0E2543` (the wordmark). It is the brand's anchor: text, header backgrounds, primary CTAs, footer.
- **Secondary** is a soft sky/wave blue `#8FB8D6` and its tints (`#C5DAE7`, `#EDF3F8`). Used for the wave emblem, decorative panels, dashboard fills.
- **Accent** is a muted antique gold `#C9A24E` — used **sparingly** for editorial flourishes, key numbers, and dashboard highlights. Never for primary CTAs.
- **Paper** background `#F7F6F2` — a warm off-white that reads as "letterhead", not pure white. Pages default to this.
- **Semantic** colors (`pos #2E7D5B`, `neg #B23C3C`, `warn #C98A1F`) are desaturated and editorial, never bright candy red/green.

**Type.**
- Three families. **EB Garamond** for display (the Garamond tradition the wordmark evokes; it replaced the original Cormorant Garamond pick — lower stroke contrast and much better legibility at UI sizes, and it matches what the product front-end ships). **Source Serif 4** for body in long-form contexts (FAQs, equipo bios, informes). **Inter** for UI, labels, navigation, dashboards.
- Headings are *display serif*. Subheads can be *serif semibold* or *sans semibold* depending on context (editorial vs. UI).
- Tracked small-caps ("DESARROLLO DE NEGOCIOS", "FUSIONES Y ADQUISICIONES") are reserved for section eyebrows and the tagline. ~0.22em–0.32em letter-spacing.

**Spacing.** 4-pt grid. Generous margins; this is editorial, not dense. Section padding `--space-9` (96px) on desktop. Cards have `--space-5` (24px) interior padding.

**Backgrounds.** Mostly flat `--rfdd-paper` or pure white. The hero may layer a faint full-bleed photo (corporate boardroom, paperwork, abstract waves) at low opacity (~25–35%) under a navy gradient overlay for legibility. **No** repeating textures, **no** rainbow gradients. The signature decorative element is the **wave** from the emblem — used as a thin SVG band-divider above section titles, very small.

**Animation.** Minimal and slow. Transitions ~240ms with `cubic-bezier(.2, .6, .2, 1)`. Fades and gentle 4–8px translates on entry, never bounces. No parallax. Hover states are 140ms.

**Hover states.**
- Links: navy → gold (`--rfdd-gold-600`), no underline change.
- Primary buttons: navy → navy-800 (slightly lighter), faint shadow lift.
- Cards: shadow goes from `--shadow-1` to `--shadow-3`, no scale.
- Icons: 80% → 100% opacity.

**Press states.** Buttons darken to `--rfdd-navy-900` and translate `1px` down (no scale-shrink). Active links get a 2px navy underline.

**Borders.** Hairline `1px solid var(--border-1)` on neutral surfaces. Editorial dividers are a 1px navy rule, often paired with a 32px short rule + label (`― Más Información`).

**Shadows.** Subtle, navy-tinted (not pure black). Four levels: 1 (resting card), 2 (hovered card / dropdown), 3 (modal / hero overlay), 4 (top-most). Inner shadow `--inset-1` for raised buttons.

**Protection treatments.** When type sits over imagery, prefer a navy-to-transparent **gradient overlay** at the bottom of the image (60% navy → 0%) — never a solid colored capsule. Hero text always has a 30–50% navy overlay across the entire image for legibility.

**Layout rules.**
- Header is fixed/sticky on scroll, transitions from transparent (over hero) to white at scroll-y > 80px.
- Max content width 1200px; reading column 640–720px.
- Footer is full-width navy `--rfdd-navy-900` with paper-color text.

**Transparency & blur.** Used sparingly — only for the sticky header backdrop (`backdrop-filter: blur(12px); background: rgba(247,246,242,0.85)`), and for hero overlays. Never on cards.

**Imagery.** Cool-leaning, slightly desaturated photography of business contexts (boardrooms, handshakes, charts, Buenos Aires architecture). When B&W is needed, a navy-tinted duotone is preferred over true grayscale. **No grain, no film burn, no vignette.**

**Corner radii.** Tight. Cards `--radius-md` (6px). Buttons `--radius-sm` (4px). Pills only used for tags. The brand evokes paper documents — sharp corners would feel right too, and are used on the editorial dividers / banners.

**Cards.**
- **Editorial card**: white background, 1px hairline border, `--shadow-1`, 6px radius, no decorative accents.
- **Service card**: paper background, hairline top-rule in navy, no shadow, larger interior padding.
- **KPI tile** (dashboard): white background, 4px radius, 1px border, large numeric value in display serif, label in sans caption.

**Iconography.** See ICONOGRAPHY below.

---

## ICONOGRAPHY

**Approach.** RFDD's marketing site uses very few icons — it leans on type and photography. When icons are needed, they should feel **drawn-by-an-architect**: thin strokes (1.5px), no fills, geometric, with a slight serif/editorial feel rather than rounded-cartoon.

**System.** No first-party icon font/sprite was found. The site uses generic WordPress theme icons (FontAwesome-class). For this design system we standardize on **Lucide** (CDN) — its 1.5px stroked, geometric, minimal style fits the editorial-financial brand far better than FontAwesome's mixed system.

> **Substitution flag.** The original site uses generic theme icons (FontAwesome). This system substitutes **Lucide** as the icon set. If an in-house icon set exists, please share it.

**Usage rules.**
- Stroke 1.5–1.75px; never filled.
- Sized 16, 20, 24, 32. Default 20.
- Color inherits `currentColor`; default `--rfdd-navy-900` on light, `--rfdd-paper` on dark.
- Pair icons with labels — never icon-only navigation except in clear utility positions (close X, search, pagination chevrons).
- Reserve icons for service categories, dashboard filters, and form-field affordances. Headlines never carry decorative icons.

**Emoji.** **Never.**

**Unicode glyphs as marks.** Em-dash (`—`) and figure-dash (`―`) are part of the editorial vocabulary (e.g. `― Más Información`). Right-arrow `→` is acceptable as a CTA marker. Do not use ✓ ✗ ★ etc. — use Lucide `check`, `x`, `star` instead.

**Brand emblem.** The circular wave mark is the only first-party iconographic device. Available as `assets/emblem.svg`. Use it at small sizes as a section opener / page-end mark, or as a watermark in document headers. Never as a decorative element next to body copy.

**Client logos.** The home page lists ~18 client logos (Bimbo, Prosegur, Patagonia, Amcor, Molinos, ASPRO, etc.). These are **stock raster PNGs** on the live site and are not redistributable here — `assets/client-*` are placeholder wordmarks. Replace with the official lockups from each brand when shipping.

---

## CAVEATS & ASSUMPTIONS

- **Fonts substituted.** EB Garamond / Source Serif 4 / Inter — flag if the brand has a real type stack.
- **No codebase, no Figma.** Component shapes (button/card geometry) are inferred from the brand's editorial-financial positioning, not copied from production code.
- **Dashboards.** RFDD's "Demos" pages embed live Power BI dashboards we cannot inspect. The `dashboard/` UI kit is a stylistic interpretation — colors and KPI tile shapes follow Power BI conventions filtered through the RFDD palette.
- **Icons.** Lucide substituted for unknown in-house set.
- **Client logos.** Placeholders only — real lockups not redistributable.
