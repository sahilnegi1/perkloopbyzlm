# Perk Loop — Design System v2.0 "Execution-grade"

> Sources: MengTo `build-awwwards-quality-sites` + 14 sub-skills, garden-skills style-recipes
> (stripe-press, clean-minimal-beige, mailchimp-freddie), scroll-craft (full engine), refero.design
> (Wise + Ramp full specs), elayadesign, tastemaker anti-slop. This file is LAW. Every UI change traces here.
> v2.0 exists because v1.0 was correct in tokens but never executed in components — the UI read as a plain
> white/black wireframe. v2.0 adds: surface-role ratios, layered warm shadows, texture system, signature
> hero choreography, failure-safe motion, and the cheap-tells QA gate.

## 0. The five dials (garden-skills) — where we sit
visual-variance **7** · motion-intensity **6** · information-density **5** · asset-dependence **6** · brand-fidelity **9**
(In v1 we effectively shipped visual-variance 2. That was the failure.)

## 1. Brand
- **Name:** Perk Loop · Voice: warm, trustworthy, premium, friendly. Sentence case. No "Elevate/Seamless/Unleash".
  No fake stats or testimonials — a counter is a truth claim; only real numbers, organic (47.2 not 50).
- **Headline:** "Your trust matters. Your loyalty matters. And you matter."
- Taglines: "Your Loyalty Deserves More." / "Shop Local. Earn Rewards. Come Back." / "Every Visit Counts."

## 2. Color — surface-role law (Wise spec, verbatim roles)
Forest carries surface area (nav, hero, dark bands, headings, footer). **Lime = functional punctuation:
ONE lime element per visible viewport section, never stacked.** Lime never renders as text on light
backgrounds (contrast) — fill or text-on-dark only. Marigold = warmth/points/stamps. Body text = warm
charcoal `#454745`-family (`#5C5F55` on cream), never pure gray or #000.

| Surface ladder | Token | Use |
|---|---|---|
| L0 | `#FAF7F2` cream | Page canvas |
| L1 | `#FFFFFF` white | Cards on cream |
| L2 | `#F1EEE9` linen / `#E9F2DE` lime-soft | Tinted bands, chips, insets |
| L3 | `#9FE870` lime | Active fill, CTA fill, progress — max one per viewport |
| L4 | `#163300` forest (→ `#0F4D28`, `#0B2400`) | Inverted bands, dark cards, sidebar, footer |

Section rhythm on landing: cream → linen tint → **forest full-bleed band (exactly one per page)** → cream → footer-dark.
Hairlines are warm: light bands `rgba(22,51,0,0.08)`, dark bands `rgba(250,247,242,0.12)`. Cold grays banned.

Light extras: `--lime:#9FE870 --lime-soft:#E9F2DE --marigold:#F59E0B --marigold-soft:#FDF0D9
--sienna:#B4540A --forest:#163300 --forest-soft:#E4EAD9 --ink:#1A1D16`
Dark mode: canvas `#131A10`, card `#1B2415`, border `#2A3526`, ink `#EDEFE8`, primary flips to lime.

## 3. Typography
- Display **Bricolage Grotesque** — H1 `clamp(2.75rem, 5vw+1rem, 5rem)`, weight **800**, LH 1.02–1.05,
  tracking −0.03em; H2 `clamp(2rem, 3vw+0.5rem, 3.25rem)` weight 700; big numerals Bricolage 700 tabular.
- Body **Manrope** 16–17px, LH 1.6, tracking normal, color `#454745` on white / `#5C5F55` on cream.
- 4–6× ratio between H1 and body on the hero. Headings `text-wrap: balance`; body `text-wrap: pretty`.
- Mono-flavor micro labels (Geist Mono / font-mono): 11px, uppercase, tracking 0.14em, opacity ~0.55 —
  eyebrows, metadata, section indices. Use in *some* sections, never all.
- Marker-highlight: one keyword per section max — `background:linear-gradient(transparent 58%, rgba(159,232,112,0.55) 58%, rgba(159,232,112,0.55) 92%, transparent 92%)`.
  On dark bands: marigold at 0.25 alpha, or lime underline offset-8.
- Gradient text allowed ONLY on dark hero heading, cream→dim cream only.
- `::selection` lime/forest. Tabular numerals everywhere numbers align.

## 4. Shape, depth, elevation
- Pills 9999px (buttons/tags/nav segments); cards 12px inputs / 16px inner / 20–24px feature / 28px hero cards.
  Nested radius: inner = outer − padding.
- **Layered warm shadows (replace flat Tailwind shadows):** tinted with ink `#163300`, never pure black.
  - sm (chips, inputs): `0 2px 3px -1px rgba(22,51,0,.10), 0 1px 0 rgba(22,51,0,.02), 0 0 0 1px rgba(22,51,0,.08)`
  - md (cards): `0 0 0 1px rgba(22,51,0,.06), 0 1px 1px -.5px rgba(22,51,0,.06), 0 3px 3px -1.5px rgba(22,51,0,.06), 0 6px 6px -3px rgba(22,51,0,.06), 0 12px 12px -6px rgba(22,51,0,.06), 0 24px 24px -12px rgba(22,51,0,.06)`
  - lg (hero device, feature callouts): 6-step `0 2.8px 2.2px … 0 100px 80px rgba(22,51,0,.12)`
  - One strength per state; hover upgrades md→lg + translateY(−2px) 200ms.
- Gradient border (hero shell / key cards only, 2-3 per page max):
  `border:1px solid transparent; background: linear-gradient(rgba(10,26,0,.82),rgba(10,26,0,.82)) padding-box,
  linear-gradient(135deg, rgba(250,247,242,.34), rgba(159,232,112,.36) 45%, rgba(250,247,242,.08)) border-box`.
- Dark Section Card (Wise): forest `#163300`, rounded-[28px], generous padding, **lime headline + white body**,
  with an inset white rounded-[12px] module inside for actions.

## 5. Texture & ornament system
- **Grain overlay** (always on): fixed, `opacity .05 light / .08 dark band`, mix-blend overlay,
  feTurbulence SVG data-URI. Pointer-events none.
- Dotted grid: dark band `radial-gradient(rgba(250,247,242,.06) 1px, transparent 1px) 24px`,
  cream `rgba(22,51,0,.06)`; masked to fade at edges.
- **Perforated stamp card** (the signature Perk Loop object): radial-gradient mask punches semicircle holes
  on left/right edges (or ticket top); inner dashed frame `1.5px dashed rgba(22,51,0,.25)`; stamp slots are
  inset-shadow circles that fill lime when earned.
- Corner brackets: 4×4px L-shapes (`border-l-2 border-t-2 border-lime`) on hero-shell corners.
- Rotating circular badge: SVG textPath, 11px uppercase tracking 0.2em, 16s linear spin, reduced-motion static.
- Number-led markers `01/02/03` mono, consistent placement. Max 2–3 ornament types per section.

## 6. Hero choreography (the page's ONE signature spectacle)
Dark forest full-bleed (or max-w shell) hero. Layered background stack — never one flat gradient:
```
radial-gradient(ellipse 55% 45% at 78% 90%, rgba(159,232,112,.14), transparent 70%),
radial-gradient(circle at 50% 0%, rgba(245,158,11,.06), transparent 34rem),
linear-gradient(180deg, #0F4D28 0%, #163300 52%, #081E00 100%)
```
+ dotted grid layer + grain + one radial lime bloom behind the device (≈40% shell width).
Entrance (all `cubic-bezier(0.16,1,0.3,1)`, nav/CTA usable before animation completes):
0ms badge → 150ms H1 word-by-word (0.8s, stagger 0.07s) → 600ms subhead → 750ms CTAs → 800ms device
(y24, scale .97) → 1000ms floating chips (stagger 100ms, blur 4px→0).
Floating proof-chips: `rgba(10,26,0,.58)` bg, lime border 18%, backdrop-blur 14px, 6px glow dot.
Parallax 2–3 planes, adjacent rates differ 10–30%, transform-only, **no transition on parallax nodes**,
copy always 1x. Bottom edge: marquee ticker w/ edge-fade mask, or progressive fade into next band — never a hard cut.

## 7. Motion constants
- Flow reveal: rise 14px + fade, 620ms `cubic-bezier(0.22,1,0.36,1)`, stagger 60ms, **once**.
- Press scale(0.96) 150ms; hover lifts 200ms named-property; exits 150ms −12px; `initial={false}` discipline.
- Counters: ease-out 1.2–1.8s, fire at half visibility once, tabular-nums, reduced-motion writes final value.
- Marquee: duplicated track, `translateX(-50%)`, 28–36s linear, edge mask, pause on hover, reduced-motion → static wrap.
- One clip-path wipe per page max. One pinned act per page max. Never `transition-all`.
- **Failure-safety (law):** content server-renders visible; hidden state applied only under `html.js`
  (inline script adds class); observers gated on `'IntersectionObserver' in window`; reveal failure = visible.
  Reduced-motion = fewer/gentler (opacity-only), never zero. One animation channel per element.
  Every animated state leaves a static cue. Focus must never land inside faded content.

## 8. App patterns
- **Customer wallet:** balance card = Dark Section Card (forest, rounded-[28px], lime headline, inset white
  action module). Stamp cards = perforated cream cards with punched slot circles. Category tiles = L2 tints.
  Bottom nav = pill segments, active = forest fill. Empty states composed, one lime action.
- **Merchant dashboard (Ramp spec):** forest sidebar `#10240F`; content on cream; white cards + hairline
  borders (borders replace shadows); single font weight, hierarchy via size+tracking; 10px uppercase
  micro-labels +0.05em; KPI band = dark forest ticker strip, lime accent ONLY on money-moving numbers;
  radius 10/12/16, no pills except filter chips; charts semantic colors, data-ink ratio.

## 9. Cheap-tells QA gate (every screen must pass)
1 flat single-gradient dark hero → layered stack + grain + off-axis glow
2 white-on-white cards, cold gray borders → cream canvas, warm hairlines, one dark inset card
3 flat `shadow-md` everywhere → 3-tier layered warm shadows
4 centered headline + blob + two same CTAs → asymmetric hero, real product visual, fill+text-link pair
5 same eyebrow+H2+paragraph stack 3×; zigzag rows → vary header ledgers, break with dark band/stat strip
6 emoji icons → lucide only 7 `transition-all` → named properties 8 fake stats → real/labeled only
9 Inter-as-display → Bricolage actually applied 800 10 radius drift → role grammar 11 gradient rainbow
text → cream-fade on dark only 12 spinners/alerts → skeletons/inline 13 hard cuts, no texture → grain +
hairlines 14 motion without narrative → delete

## 10. States (no dead ends) & layout laws
Skeletons shaped like real layout; composed empty states; inline errors; loading buttons; focus-visible
lime ring offset-2; `overscroll-behavior: contain` in sheets. Mobile-first; sticky footer `mt-auto`;
prose 65ch; app max-w-7xl; sections `py-16 md:py-24`; hero min-height `clamp(560px,72vh,820px)`.
