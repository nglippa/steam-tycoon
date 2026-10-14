# Terra presentation audit: UI/HUD and rendering (static, read-only)

Worktree: `/Users/nicholaslippa/city-tycoon/.claude/worktrees/presentation` (branch `presentation`, HEAD `70f73c4`). Three.js `^0.180.0`.
Method: source reading only. No server or browser was run. All pixel sizes below are **estimates from CSS**; a separate runtime agent measures the real DOM boxes. Line numbers are for HEAD.

Files that matter:
- `index.html`: one line. `<canvas id="world">` and `<div id="app">`. No inline styles.
- `src/ui/style.css` (347 lines): **all** UI CSS. There are no other stylesheets and no `<style>` tags.
- `src/ui/interface.ts` (195 lines): HUD, toast, prompt, marker, pause and ledger markup and logic. The markup is a template string at lines 32–48, and the ledger is built in `render()` at 124–158.
- `src/ui/dialogue.ts` (35 lines): dialogue card, choices, skip pill and title card.
- `src/player/touch.ts` (64 lines): joystick and thumb buttons.
- `src/main.ts`: renderer, pixel-ratio budget, quality tiers and the frame loop.
- `src/world/ink-renderer.ts` (113 lines): the **entire post chain** (one full-screen pass).
- `src/world/tone.ts`: painted cel terminator. `src/world/atmosphere.ts`: fog, lights and shadows. `src/world/weather-art.ts`: sky. `src/world/assets.ts`: materials, line-class flags and textures.

---

# PART A: UI / HUD

## A.1 Token system (`style.css:12-29`)

| Group | Tokens |
|---|---|
| Colour | `--paper` (#f2e4c9), `--parchment`, `--ink` (#22283c), `--ink-soft` #46524f, `--rule` #22283c40 (ink at 25%), `--burgundy`, `--teal` #1f6670, `--good`, `--brass` #efc66e, `--gold`, `--hover`, `--focus`, plus five `--band-*` colours. `--paper`, `--parchment`, `--ink`, `--burgundy` and `--brass` fall back from `--terra-*`, which `main.ts:15` sets from `palette.ts`. |
| Spacing | `--sp-1..6` = 4 / 8 / 12 / 16 / 24 / 32 px |
| Type | `--ui-fs-label` 10, `-small` 11, `-body` 13, `-lead` 15, `-head` 22, `-num` 26 px; `--serif` Georgia. Base font is `"Avenir Next", Avenir, "Segoe UI", sans-serif` on `:root`. |
| Edges | `--edge` 2px solid ink; `--hair` 1px solid rule; `--shadow` `2px 3px 0 ink` (a hard offset, no blur); `--shadow-lg` `5px 6px 0 #22283c59` |
| Layout | `--gutter` 34px; `--panel-w` 440px; `--hud-h` 76px (default, overwritten at runtime with the measured `#hud` height, `interface.ts:164`); safe-area `--sat/--sar/--sab/--sal` |

Global properties: **no `backdrop-filter`, no blur and no border radius** anywhere in the paper UI. Every paper surface is fully opaque except `.controls` (paper at 90%). The radius exceptions are `kbd` (2px), the crosshair (50%), the touch buttons (circles, 8px for pause) and the `#skip` pill (999px).

Token drift:
- The dialogue (`style.css:330-347`) uses `var(--terra-*)` directly and hard-coded values: 9px type, `#526c64`, 12/18/10 padding, a `3px 4px` shadow, 640px width and 96px bottom.
- 9px text appears in `.dlg-card .overline`, `.dlg-card small` and `.touch-ledger`. This breaks the stylesheet's own rule "Nothing is set below 10px".
- The touch controls (`:310-321`) use a separate dark-glass language: `#10181acc` fill, gold `#d2b27a` border, circles.
- `#debug` and `#save-status` use one-off values.

## A.2 Media queries (all in `style.css`)

| Query | Effect on the HUD |
|---|---|
| `:50` `prefers-reduced-motion` and `.reduced-motion` (`:49`) | All animation and transition removed |
| `:148` `max-width:900px` | Hides the Interact and Sprint hints in `.controls` |
| `:162` `max-width:900px` | `--gutter` 22px; ribbon `clamp(260px,38vw,340px)` |
| `:163` `901–1100px` | Hides `.id-over` ("CITY TYCOON · TERRA") |
| `:164-170` `max-width:700px` (phone portrait) | `--hud-h` 128px. HUD becomes a 2-row grid (id and treasury, then the ribbon). Crest, overlines and the TREASURY label are hidden. Plates 44px min. Treasury number 20px. |
| `:172-178` `max-height:520px and (pointer:coarse)` (phone landscape) | `--hud-h` 64px. One row (`id rib tre`). Ribbon ≤300px; tape 22px; clock 15px. |
| `:181-194` `body.touch` (class, not a media query) | No key hints and no crosshair. Objective moves to the top, under the HUD (`top: 16 + --hud-h + 8`). Prompt at bottom-left. Objective hidden while a toast shows (`.toasting`). |
| `:190` `≤700` or coarse landscape | Ribbon, ticket and marker hidden while a panel or pause is open |
| `:194` `≤700` | Toast moves to the very top while a panel or pause is open |
| `:291-298` `≤700` | Ledger and pause become a bottom sheet (≤85dvh) |
| `:300-306` `max-height:520px and min-width:701px` | Side panel trimmed |
| `:307` `701–900` | `--panel-w` min(440, 100vw−32) |
| `:347` `≤700` or `max-height:520` | Dialogue moves to the top (`top: max(64px, sat+56px)`); line text 15px |
| `:73-86` | Title-poster variants only |

**At 1280×720 and 1920×1080 on desktop, no HUD media query applies.** Every HUD size there is the base CSS, so the HUD is the same pixel size at both resolutions and covers a smaller share of the screen at 1080p.

## A.3 Component inventory

Visibility: P = persistent in play, C = contextual, M = modal. Nothing in `#hud` or `#hud-bottom` shows before `body.started` (`:91`), and everything is hidden during `body.scene`, the opening (`:327`).

| # | Component | Markup | CSS | Vis. | Carries | Static box values |
|---|---|---|---|---|---|---|
| 1 | **Top bar container** `#hud` | `interface.ts:33-41` | `style.css:90` | P | Grid of the three plates | `top:max(16px,sat)`; left/right `max(34px,…)`; grid `1fr auto 1fr`; `gap:16px`; `align-items:start`; z 2 |
| 1a | Identity plate `.identity` | `:34` | `:92-96` | P | Crest SVG; "CITY TYCOON · TERRA" (brand); **ward name** `#ward-name` | `min-height:56px`; padding 8/12; 1px ink border; no shadow; gap 12; crest 24×31; overline 10px/800/.16em; name 15px/1.2 Georgia 700, .04em. **Est. 56 × ~215px** |
| 1b | **Compass ribbon** `.ribbon` | `:35-39` | `:104-121` | P | Heading tape (N/NE… every 45°, 2px/°); **target pin** `#rb-pin`; **clock** `#clock`; **weather + time of day** `#weather`; curfew or heat `#curfew`; **ward band + occupation %** `#ward.tag` | width `clamp(280px,34vw,440px)` = **435px at 1280, 440px at 1920**; 2px ink border; `2px 3px 0` shadow; padding-bottom 4. Tape 26px (1px hair under), labels 10px, cardinals 14px Georgia. Clock line padding 4/12/0, clock **22px/1 Georgia**. Meta padding 4/12/0, 10px/700/.14em, gap 4/8; tag padding 1/8, band fill. **Est. height ≈ 80px (+3px shadow)**. Meta wraps to a second line (+~16px) if it exceeds ~410px, or sooner on narrow ribbons. |
| 1c | Treasury `.treasury` | `:40` | `:92,95,97-101` | P | "TREASURY"; ♜ coin; **crowns** 26px Georgia tabular; **income** "+x Crowns / sec" 11px | min-height 56; padding 8/12; 1px border; gap 2. **Est. ~77px tall** (10px label + 26px number + 11px income): taller than the identity plate. Width ~125px and grows with the number. |
| 2 | **Objective ticket** `.objective` in `#hud-bottom` | `:45` | `:135-141` | P (desktop bottom-left; on touch, top-left under the HUD) | Overline "A CITY WORTH SAVING"; **objective sentence** (or the carried consignment's line); **STEP n / 6**; 6 pips; **stage "00 / THE LOWWORKS"** | Container `bottom:max(34px,sab+16)`, left/right 34. Ticket **340px** wide; padding 12/16/8; 2px border; `2px 3px` shadow; overline 10px; sentence **15px/1.35 Georgia 700** (≈36 characters per line at 304px, so the default "Report to work at Rook & Son Salvage." is likely 2 lines); steps 10px with a dashed 1px top rule; pips 3px tall. **Est. ~118px for 2 lines, ~138px for 3** |
| 3 | Key hints `.controls` | `:45` | `:143-148` | C (fades out after `player.moved > 40`, `interface.ts:187`; `body.hint-off` sets opacity 0) | W A S D Walk · E Interact · ⇧ Sprint · TAB Ledger (a button) | padding 4/12; 1px hair border; paper at 90%; 11px/800; gap 16; kbd 24×24 (`:45`) with a `0 2px 0` shadow; `.ledger-control` min-height 32. **Est. ~42px tall**, bottom-right. 1.6s opacity transition. |
| 4 | **Interaction prompt** `#interaction` | `:42`; content written in `interface.ts:189` | `:151-153` | C (when a target is under the crosshair and the pointer is locked) | `[E]` key; **label** (target.label); **HINT** small caps (target.hint, or "OPEN PROPERTY LEDGER", "EXAMINE DISCOVERY", "INTERACT") | `left:50%; top:58%`; `max-width:100vw-32`; padding 8/16/8/8; 2px border; `2px 3px` shadow; gap 12; label 15px/1.25 Avenir 700; hint 10px/.14em; kbd 32×32 brass. **Est. ~55px tall**, at y≈418–472 (720p) or 626–681 (1080p). Touch: bottom-left, no kbd. |
| 5 | **Toast** `#toast` (single slot, not a stack) | `:44`; `toast()` at `interface.ts:68-69` | `:156-159` | C (4.5–10s; ward change 5.2s) | Optional overline (`.t-over`, 10px burgundy, e.g. "Cinder Row · Occupation 80%") and one message | `top: max(16,sat) + --hud-h + 12` ≈ **108px**; centred; `max-width:min(520px,100vw−32)`; padding 8/16/12; 2px border with a **6px teal left border**; `2px 3px` shadow; 13px/1.5, weight 600; .25s fade and slide. **Est. 59px (1 line plus overline) to ~80px (2 lines)**, so it spans y≈108–190. Shifts left when the ledger is open (`:159`). z 4. Only one toast at a time; a new one replaces the old. |
| 6 | **Dialogue line** `#dialogue` (who/text) | `dialogue.ts:7-13,20` | `:330-339` | C (opening scene; also `dialogue.flash()` in play, used by `rookYard`, `finchRun` and `wardCall` `onLine`, `main.ts:43`) | **who** (overline 9px burgundy caps); **text** 17px/1.4 Georgia 600; "E · CLICK TO CONTINUE" 9px | `position:fixed; bottom:96px`; centred; `width:min(640px,100vw−32)`; card padding 12/18/10; 2px border; `3px 4px 0` shadow; choices gap 6, buttons 15px with 10/14 padding and min-height 44. **Est. card ~84px for 1 line, ~108px for 2**, so it occupies y≈540–624 at 720p. z 9. **Possible overlap:** at 1280 wide the card spans x≈320–960 and y≈516–624, while the objective ticket spans x 34–374 and y≈568–686. A `flash()` line in play can therefore overlap the ticket's right edge by about 54px. At 1920 they don't overlap. The runtime agent should confirm. |
| 7 | **Ribbon pin** `#rb-pin` and **world marker** `#marker` | `:36`, `:43`; `hudFrame()` `interface.ts:167-186` | `:110-114`, `:125-132` | C (while a target is tracked) | Bearing on the tape; diamond in the world with **distance "N m"**; a chevron when the target is off screen | Pin 12×12 brass diamond (burgundy arrow at the tape ends). Marker diamond 18×18 brass with a 2px ink border and a `1px 1px` shadow; distance 11px/800 with a 3px ink stroke; scale .7–1.15 by distance; opacity .55–1; safe box `top = hud.bottom+14 (+toast) + 18`, `bottom = h−128` (touch 150), `left 36`, `right w−36` (touch 104). |
| 8 | Crosshair `#crosshair` | `:42` | `:53-54` | P while locked (`.playing`) | Aim point | 5×5px #f7f1d4 dot, 1px ink ring, opacity .8. Hidden on touch. |
| 9 | **Pause card** `#pause` | `:47` | `:197,208-209,286-288`; phone `:291-294` | M (pointer released, no panel open) | "THE CITY KEEPS TURNING", "Take a breath.", a line of copy, Return, Open city ledger, Settings | `left:8vw`; vertically centred; `width:min(380px,100vw−32)`; padding 24; 2px border; `--shadow-lg`; h2 28px/1.15 Georgia; p 13px/1.55; `.primary` min-height 44 with 15/20 padding (rotated −1° on the title, 0 here); `.plain` rows 48px. **Est. ~300px tall.** z 3. |
| 10 | **Ledger panel** `#panel` (tabs: Properties, Infrastructure, Districts, Research, Home, Statistics, Settings) | `:48`; `render()` `interface.ts:124-158` (Settings `:153-154`) | `:197-283` | M | Everything economic, plus a Statistics tab that repeats the ward, occupation and treasury, and Settings | `top/right/bottom:16px`; **width 440px**; 2px border; `--shadow-lg`; header row 44px button + 4px padding (≈52px) on parchment; scroll body padding 16/24/24; footer padding 12/16 with 10px text ("♜ N CROWNS AVAILABLE · ESC TO CLOSE"); h2 28px, h3 17px; tabs a 12-column grid, 44px min, 11px; rows 12px padding with hair rules; `.purchase` min 48px brass with shadow. Phone: a bottom sheet with a 44×4 grab handle. z 3. |
| 10a | Settings (inside the ledger) | `interface.ts:153-154` | `:268-283` | M | Return, Save, Save & exit, New game (danger); sliders (master, ambience, sfx, sensitivity); reduced motion; **render quality: "Full atmosphere" (`high`) or "Performance" (`low`)** | Sliders: grid 1fr/48%, 48px rows, 44px inputs. Quality: two 44px buttons. |
| 11 | Touch controls `#touch` | `touch.ts:16-20` | `:310-321` | P on touch in play | Joystick (120px base, 48px knob, appears on touch); USE 74px (opacity .35 until ready); JUMP 64; LEDGER 56 (9px type); pause 44 (top-left) | Dark glass with a gold border; z 5 |
| 12 | Skip pill `#skip`, title card `#title-card`, black cut `#cut` | `dialogue.ts:12-13` | `:324-346` | Opening scene only | SKIP X; "TERRA / A CITY WORTH SAVING" | Title `clamp(56px,11vw,120px)` 900, .18em tracking, text-shadow `0 2px 14px #000a` |
| 13 | Title poster `.welcome` | `:46` | `:56-86` | Before start | Not HUD | — |
| 14 | `#debug` (F3), `#save-status` | `:48` | `:51-52` | Debug and status | FPS, position, tier; save message | debug `top:95px; left:38px`, 11px mono, `#0008`. This overlaps the bottom of the HUD (HUD bottom ≈ 96px). |

## A.4 Persistent vertical footprint (CSS estimate, desktop, no media queries active)

| Band | 1280×720 | 1920×1080 |
|---|---|---|
| Top: 16px offset + `#hud` (ribbon ≈80 + shadow 3) | **~99px (13.8%)**, full width (identity left, ribbon centre, treasury right) | **~99px (9.2%)** |
| Bottom-left ticket: 34px offset + ~118px (2-line objective) + 3px shadow | **~155px (21.5%)**, 340px wide | **~155px (14.4%)** |
| Bottom-right hints (until the player has walked 40m) | ~42 + 34 = ~76px | same |
| Total rows carrying persistent chrome | ~254px of 720 (**~35% of the height**) | ~254px of 1080 (**~24%**) |
| Persistent plate area: identity 215×56 + ribbon 435×80 + treasury ~125×77 + ticket 340×118 | ≈ 99k px² ≈ **10.8% of the screen** | ≈ 100k px² ≈ **4.8%** |
| Contextual layer: toast y≈108–190 (centre, ≤520 wide); prompt at 58%; dialogue bottom 96px | Toast plus HUD put chrome in the top **~26%** while a toast shows | ~18% |

The HUD does not scale with the viewport. At 1080p it is the same 99px and 155px bands. Small type (10px labels, 11px income, 9px dialogue meta) gets relatively smaller on large monitors, and no rule scales it up for big screens (there is no `min-width:1600` rule).

## A.5 Duplicated information

| Information | Where it appears at once |
|---|---|
| "The Lowworks" | Identity ward name `#ward-name` (district at the player's position) **and** the ticket's stage `#stage` "00 / THE LOWWORKS" (prosperity stage name). In the starting ward these are the same words with different meanings. |
| Ward identity and occupation | `#ward-name` (identity) + `#ward` tag "HEAVY 80%" (ribbon) + the toast overline "Name · Occupation N%" on every ward change + the ledger Statistics "WARD STATUS" |
| Time of day | `#clock` "17:16" **and** `#weather` "DRIZZLE · **DUSK**" |
| Progress | "STEP 1 / 6" text **and** the 6 pips (same value); the stage number again in `#stage` |
| Crowns | Treasury plate + ledger footer `#panel-crowns` + Statistics "Treasury" (only the plate is persistent) |
| Brand | "CITY TYCOON · TERRA" overline on the identity plate during play (decoration, not information); the crest repeats in the ledger header |
| Target direction | Ribbon pin + world diamond and distance + edge chevron (redundant by design) |
| Ledger shortcut | "TAB Ledger" in the hints and the touch LEDGER button (exclusive by device, fine) |

## A.6 Observations for the presentation pass (UI)
- The ribbon is the tallest persistent element (≈80px) and carries five data points: heading, clock, weather and time word, curfew, and ward band. The identity plate repeats the ward, and the treasury plate is about 21px taller than the identity plate, so the top row is ragged (56, 80, 77).
- The ticket at bottom-left is the largest persistent box (340×~118), and its 15px Georgia sentence usually wraps to 2 lines.
- The toast hangs under the ribbon at about y=108. It is a single slot with no queue, so rapid events overwrite each other (`toast()` replaces children).
- The dialogue card's style is close to the paper cards but not tokenised (9px text, different shadow).
- `#debug` at top 95px collides with the HUD's lower edge.

---

# PART B: RENDERING

## B.1 Renderer and quality tiers (`src/main.ts`)

| Setting | Value | Where |
|---|---|---|
| Context | `new T.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' })`. The canvas is not antialiased; AA happens in the ink target. | `main.ts:22` |
| Size | `renderer.setSize(innerWidth, innerHeight)`, so the canvas CSS size is the window and the drawing buffer is CSS × pixelRatio | `:23`, `:74` |
| Pixel ratio | `pixelRatio() = max(.6, min(devicePixelRatio, touch ? (high?1.25:1) : (high?1.5:1), sqrt(budget*strain/(innerWidth*innerHeight))))` with budget **4.4 MP (high) or 2.4 MP (low)** | `:47` |
| Dynamic resolution ("strain") | If frames run slower than 50fps (`raw > 1/50`) for an accumulated >2s, then `strain *= .8` while `strain > .4`, so the **floor is .328**. **Strain never recovers**; it only resets in `quality()`, which runs on a settings change or a reset. Disabled in `?review`. | `:46`, `:81` |
| Tone mapping | `NoToneMapping` (`toneMappingExposure 1.2` is unused) | `:23` |
| Output | `outputColorSpace = SRGBColorSpace` (applies only to the final quad) | `:23` |
| Shadows | `PCFSoftShadowMap`; `autoUpdate=false`; refresh every 0.75s or on a construction change (`:87`); **disabled on low** (`:48`) | `:23`, `:48`, `:87` |
| Shadow camera | Sun `DirectionalLight`; map **2048²**; ortho L/R ±65, T 85, B −60, far 190; `normalBias .04`, `bias −.0003`; target fixed at the origin (never follows the player) | `atmosphere.ts:36` |
| Camera | `PerspectiveCamera(68°, aspect, near .08, far 500)`, never changed | `main.ts:25` |
| Quality `high` (default; "Full atmosphere") | MSAA ×4 on the ink target, pixel-ratio cap 1.5 (touch 1.25), 4.4 MP budget, shadows on, rain 3000 vertices | `main.ts:48`, `ink-renderer.ts:93-98` |
| Quality `low` ("Performance"; forced on a fresh touch game, `main.ts:51`) | **No MSAA**, cap 1.0, 2.4 MP budget, **no shadows**, rain 1100. The ink pass is unchanged. | same |
| Review mode | `?dev&review&dpr=N`: `setPixelRatio(clamp(dpr,1,2))`, default 1.5, with no strain. This is why QA screenshots and FPS runs may not show what players see. | `main.ts:142`, `:81` |

Expected pixel ratio (estimated with `devicePixelRatio=2`, a Retina MacBook):

| Window | high, no strain | high, strain floor | low | low, strain floor |
|---|---|---|---|---|
| 1280×720 | **1.50** (1.33× CSS upscale) | 1.25 | 1.00 (2× upscale) | **0.92** |
| 1920×1080 | **1.457** (1.37× upscale) | **0.83 (2.4× upscale)** | 1.00 | **0.62 (3.2× upscale)** |

## B.2 Materials and cel shading

- **One lighting language for all world materials:** `painted()` in `tone.ts:23-36`. It is an `onBeforeCompile` that injects a chunk before `#include <opaque_fragment>`:
  - `inkValue` is the luminance of `(directDiffuse + indirectDiffuse) / albedo`.
  - Hard terminator: `inkLit = smoothstep(amb*1.22, amb*1.34, inkValue)`. That is effectively **2 bands (lit and shade)** plus a lamp-pool band `smoothstep(amb*3.2, amb*7.5)*.34` of `toneRim`.
  - Mild form term `inkForm`. Output is `diffuse * mix(toneShade, toneLit, inkLit) + emissive`.
  - Uniforms: `tone.ambient` (`= hemi.intensity*.93/π`, `atmosphere.ts:61`), `tone.lit`, `tone.shade`, `tone.rim`, set per weather and hour in `atmosphere.ts:58-61`.
- `illustrated(m)` (`assets.ts:227-231`) sets metalness 0 and roughness 1, then applies `painted`. It is applied to every entry in `mats` (`:232`).
- Characters: `MeshToonMaterial` with a **3-step ramp** `DataTexture([128,202,255])`, nearest filtered (`citizens.ts:8-10`), wrapped in `painted()` and `thinLine()` (`citizens.ts:37,40,197`).
- **Line-class flag in the render-target alpha:**
  - `thinLine` writes `gl_FragColor.a = 0.5` after `opaque_fragment` (`assets.ts:121-123`): people and props, about 38% line weight.
  - `printed` writes `a = 0.0` (`assets.ts:131-134`): no interior ink on lettering.
  - Default is `a = 1`: world, heavy line.
- Textures: procedural canvas "inked surfaces", 512² per 2m tile, with `anisotropy 8`, sRGB and default mipmaps (`assets.ts:11-59`). Signs and stencils use anisotropy 16 with trilinear filtering (`sign-atlas.ts:18`, `art-kit.ts:194`). The foliage map has default anisotropy 1 (`assets.ts:62-67`). Mipmapping is sane, so **texture filtering is not a primary blur cause**.

## B.3 The post chain: one custom pass (`src/world/ink-renderer.ts`)

There is no `EffectComposer`, no FXAA or SMAA, no bloom, no LUT, no grain or paper texture, and no half-resolution target.

1. **Scene pass:** `renderer.render(scene, camera)` into `target = WebGLRenderTarget(drawingBufferSize, { depthTexture: DepthTexture, samples: 4 })` (`:6`, `:108-109`). With `samples=4` (high), three renders into MSAA renderbuffers and then resolves colour and depth into textures. Under default settings:
   - The **target is RGBA8 and stores linear colour**: three renders to a render target in linear sRGB, and the type is UnsignedByte.
   - Fog (`FogExp2`) and the painted terminator are applied **in the material shaders**, so they are already in this image.
   - The depth texture is a `DepthTexture`, nearest-filtered by default. MSAA depth resolve gives a single non-antialiased sample per pixel.
2. **Full-screen ink and grade quad** to the canvas (`:111`). This is a `ShaderMaterial` (`:10-87`). In order:
   - `:34` line class from alpha (`text` if a < .25).
   - `:35` `centerDist` = linearised view distance (`distanceAt`, `:22-25`, perspective depth linearised with `near/far` uniforms set each frame, `:106-107`).
   - `:37` **weight** = `mix(3.0, 1.2, smoothstep(6., 80., centerDist)) * (.8 + .45*vnoise(px*.045))`, measured in **drawing-buffer pixels** (`texel = 1/bufferSize`, `:104`).
   - `:39-40` **wobble:** `wob = (vnoise(px*.02) - .5)*1.6` px, added to the sample UV. `px = gl_FragCoord`, so the noise field is locked to the screen.
   - `:43-48` thin class: a 4-tap min of alpha at ±weight. A thin line uses `o *= .38`.
   - `:49-54` **9-tap depth kernel** (centre, 4 axial at ±o, 4 diagonal at ±.7o) and `nearest` = min of the 9.
   - `:57-59` **edge metric** `e = max over 4 axes of |1/zL + 1/zR − 2/zC| × zC`. This is the second difference of inverse depth, normalised by distance, so it is effectively a *relative* depth discontinuity. Planes give zero, including grazing ground.
   - `:60` **silhouette** = `smoothstep(.07, .18, e)`.
   - `:61` **crease** = `smoothstep(.02, .05, e)`. Commit `5f6a069` raised this from `.012/.035`.
   - `:63-65` luma edges across ±o. `:69` **colorEdge** = `smoothstep(.16,.3, gl/max(lc,.18)) * solid * (1−smoothstep(14,42,nearest)) * (1−smoothstep(.0012,.0025,slope))`. Colour lines are gone beyond 42m.
   - `:71` **fade** = `1 − smoothstep(40., 140., nearest)*.75`. It **floors at 0.25 to infinity**, so silhouettes against the sky or skyline still draw at 25% at 450m.
   - `:72` `ink = max(silhouette, crease*.85*(1−text), colorEdge*.6*(1−text)) * fade`.
   - `:74-75` **composite:** `inkColor = mix(vec3(.06,.05,.05), color*.25, .2)` (near-black, slightly colour-aware); `color = mix(color, inkColor, ink*.95)`. This is a lerp toward near-black (like darken or multiply), applied **after fog**.
   - `:78-83` **grade:**
     - desaturate to `mix(.5,.72,recovery)` of chroma;
     - split tone `(.88,.93,1.06)` shadows to warm lights;
     - highlight roll-off `c/(1+c*mix(.3,.18,recovery))`;
     - lifted floor `max(c,(.022,.026,.042)) + (.008,.011,.022)*(1−L)`;
     - **vignette** `1 − |uv−.5|²*mix(.95,.7,recovery)` (corners about −47%).
   - `:85` `#include <colorspace_fragment>`: linear to sRGB.
3. No pass after this. The canvas is then **stretched by the browser** from the drawing-buffer size to the CSS size (bilinear) whenever `pixelRatio < devicePixelRatio`.

Uniforms exposed by the material: `picture`, `depth`, `texel`, `near`, `far`, `recovery` (`setRecovery(stage)`, `:92`). **Every threshold, distance and weight is a GLSL literal.** Nothing is exposed for tuning, and `inkRenderer` is not in the `__TERRA__` dev API (`main.ts:108`).

## B.4 Fog, sky and atmosphere

- `scene.fog = new T.FogExp2(sky colour, density)`, `atmosphere.ts:35`. Each frame, `:69-70` sets the colour to the sky horizon and the density to:

  | Weather | Density |
  |---|---|
  | fog | `.013 + (1−daylight)*.007` |
  | rain | `.0105` |
  | clear and overcast | `.0078` |

  Then `+ smog*.0022` (stage 0 smog = 1, or .75 when clear). The cycle is overcast, rain, fog, overcast, clear, rain, every 110s (`:53`).
- `scene.background` = the sky colour (clear alpha 1). The sky dome is a `ShaderMaterial` sphere of radius 420, **pinned to the far plane, with `depthWrite:false`** (`weather-art.ts:14-39`), so its depth reads as `far` = 500 in the ink pass.
- Sea plane at y −240 (writes depth). The skirt and cloud banks are transparent with `depthWrite:false`.
- Skyline backdrop: flat `MeshBasicMaterial` with `fog:false`, tinted toward the horizon by `tintSkyline` (`architecture.ts:287-293`). These are opaque, so they write depth and **get ink silhouettes**.
- Aerial perspective is FogExp2 only, plus the skyline tint and the sea's horizon mix (`weather-art.ts:63`).
- Shafts are additive with eye-distance fading (`presentation.ts:337-341`). Smoke and steam are `Points`, and rain is `LineSegments`. All are `depthWrite:false`. There are 33 `depthWrite:false` materials in `src/`.
- Fog vs ink. Fog factor `1−exp(−(ρd)²)` against the ink strength (`fade*.95`) at distance d:

  | d (m) | 20 | 40 | 60 | 80 | 100 | 140 | 200 | 300 |
  |---|---|---|---|---|---|---|---|---|
  | **ink strength** | .95 | .95 | .88 | .70 | .49 | .24 | .24 | .24 |
  | fog, clear/overcast day ρ=.0078 | .02 | .09 | .20 | .32 | .46 | .70 | .91 | 1.0 |
  | fog, stage-0 smog ρ=.010 | .04 | .15 | .30 | .47 | .63 | .86 | .98 | 1.0 |
  | fog, rain + smog ρ=.0127 | .06 | .23 | .44 | .64 | .80 | .96 | 1.0 | 1.0 |
  | fog, fog day + smog ρ=.0152 | .09 | .31 | .56 | .77 | .90 | .99 | 1.0 | 1.0 |
  | fog, fog night + smog ρ=.0222 | .18 | .55 | .83 | .96 | .99 | 1.0 | 1.0 | 1.0 |

  For example, in fog at 80m the geometry is 77–96% fog colour while the ink still lerps 70% toward near-black. **The ink does not know the fog exists.**

## B.5 Shadows (stylisation)
Shadows feed `directDiffuse`, so the painted terminator (`tone.ts:15`) **thresholds the PCF-soft penumbra into a hard edge**.
- One 2048² map covers 130×145m around the origin: about 6.3–7cm per texel.
- One buffer pixel covers about 4.3cm at 50m and 8.6cm at 100m (1080p, ratio 1.457), or about 6.2 and 12.5cm (720p, 1.5). So beyond roughly 70–100m the shadow map is minified without filtering, and the thresholded result can sparkle.
- Outside the fixed frustum (|x| > 65 or z outside −60 to 85 in light space), there are no shadows at all. The map is refreshed every 0.75s, so shadow edges step when the sun moves.
- Low quality has no shadows.

## B.6 Doc and code drift (ART_DIRECTION.md)
- `:5` promises "stable, subtle paper grain". **No grain or paper texture exists in the post.** The only screen-space noise is the wobble and weight `vnoise`.
- `:60` says lines fade "only past ~55–240 m". `:108` says "persist to about 320 m". The code fades **40–140m to a 25% floor that never reaches zero** (`ink-renderer.ts:71`).
- `:32` says high caps density at 1.5×. True, but it omits the 4.4 MP budget and the one-way strain ratchet.

---

## B.7 Diagnosis: likely causes of distant blur, noise and heavy ink (ranked)

| Rank | Hypothesis | Evidence | Control knobs (how to toggle at runtime) | Confidence |
|---|---|---|---|---|
| **1** | **Under-resolution and browser upscale (whole image, most visible on fine distant detail).** The canvas is drawn at a pixel ratio below `devicePixelRatio`, and on Retina it is *always* below. The one-way `strain` ratchet can cut it to 0.83 (high, 1080p) or 0.62 (low, 1080p) and **never recovers**. The ink kernel is in buffer pixels, so lines get thicker and softer in screen pixels as the ratio drops. A 1.2px far line at ratio 0.83 becomes about 2.9 device pixels on a 2× display, bilinear-smeared. | `main.ts:46-47`, `:81`; `ink-renderer.ts:37,104` | Read `__TERRA__.renderer.getPixelRatio()` and compare it with `devicePixelRatio`; compare `canvas.width` with `canvas.clientWidth*devicePixelRatio`. Toggle with `__TERRA__.renderer.setPixelRatio(devicePixelRatio)`, which sticks until the next resize or quality change. Strain re-engages only if FPS stays under 50 for 2s. Compare `?dev&review&dpr=2` with normal play. Log the ratio over a 30s play session to catch the ratchet. | **High** for "blur" |
| **2** | **Fog-unaware ink.** The ink lerps toward near-black *after* FogExp2 has already washed far geometry to the sky colour. The fade floors at 25% forever. In rain, fog and stage-0 smog, ink at 60–140m is 25–88% strength on geometry that is 44–99% fogged, which reads as dark scribbles in the haze. The ink also ignores `depthWrite:false` haze, smoke, cloud wisps and banks, so it draws *through* them. | `ink-renderer.ts:71-75`; `atmosphere.ts:69-70`; table in B.4 | Line 71: replace `float fade = 1. - smoothstep(40., 140., nearest) * .75;` with `float fade = (1. - smoothstep(40., 140., nearest) * .75) * exp(-pow(.0127 * nearest, 2.));` to test with a rain-density literal. Force weather with `?weather=fog` or `__TERRA__.atmosphere.override='fog'`. The quickest A/B is `float fade = 0.;`, which turns all ink off. | **High** for "heavy ink far" in rain, fog and smog |
| **3** | **Relative-depth creases and silhouettes fire on every small occlusion at any distance.** `e` is a relative depth jump, so a 10% depth step gives full crease ink (e≈.09) whether it is 1m at 10m or 15m at 150m. Every chimney, cornice, window relief, railing, sign board and roof overlap at range becomes a 1.2px line, while one pixel spans 9–26cm at 100–300m. The ink density per screen area grows with distance. There is no silhouette vs internal-edge separation and no minimum feature size. | `ink-renderer.ts:57-61,72` | Line 61: replace `float crease = smoothstep(.02, .05, e);` with `float crease = smoothstep(.02, .05, e) * (1. - smoothstep(30., 90., nearest));`. For silhouettes, line 60: replace `smoothstep(.07, .18, e)` with `smoothstep(.07, .18, e) * mix(1., step(.4, e), smoothstep(60., 140., nearest))`, which keeps only strong (outer) silhouettes far away. | **Medium-high** |
| **4** | **Screen-locked wobble plus nearest-sampled depth at sub-pixel offsets lead to dashed, crawling far lines (noise in motion).** The far kernel offset is about 1.2px × (.8–1.25), with ±0.8px of UV wobble, and the depth texture is NearestFilter. Taps round to 0 or 1 pixel differently along a line, so far creases break into dots. The noise field is fixed to the screen, so lines "swim" through it as the camera moves, which looks like a shower door. The weight modulation is a ±22% thickness flicker. | `ink-renderer.ts:27-29,37,39-40,49-53` | Line 39: replace `* 1.6;` with `* 1.6 * (1. - smoothstep(15., 60., centerDist));`. Line 37: replace `(.8 + .45 * vnoise(px * .045))` with `mix(.8 + .45 * vnoise(px * .045), 1., smoothstep(15., 60., centerDist))`. Judge it in motion (yaw-pan video), not in stills. | **Medium** |
| **5** | **No AA on the ink.** On high, MSAA resolves colour, but depth resolves to one sample and the ink composite is drawn after the resolve with no FXAA or SMAA, so lines are pixel-stepped and alias on far thin structures. On low there is **no MSAA at all** (`samples=0`), so far geometry and lines shimmer. | `ink-renderer.ts:6,93-98`; `main.ts:22` | Toggle quality with `__TERRA__.economy.state.settings.quality='low'; __TERRA__.ui.onQuality()` (and back to `'high'`). Compare far railings and roofs. | **Medium** |
| **6** | **Grade crushes far contrast.** Desaturation to 50% at stage 0, highlight roll-off, a lifted blue-black floor and a heavy vignette, on top of fog, flatten the midground into murk. The only remaining far contrast is the ink, which amplifies rank 2. | `ink-renderer.ts:78-83` | Line 79: replace `mix(.5, .72, recovery)` with `1.` (no desaturation). Line 83: replace `mix(.95, .7, recovery)` with `0.` (no vignette). `__TERRA__.stage(5)` gives recovery 1. | **Medium-low** (perceptual) |
| **7** | **8-bit linear render target leads to banding in fog gradients and night darks.** `target` is UnsignedByte storing linear values, and they are converted to sRGB only at the end. This posterises dark and fog gradients, which reads as blotchy noise. | `ink-renderer.ts:6,85` | Needs a code change: `new T.WebGLRenderTarget(1,1,{ type: T.HalfFloatType, depthTexture, samples })`. Check night and fog views for bands. | **Low-medium** |
| **8** | **Shadow aliasing and limits.** The thresholded PCF edge (see B.5) is undersampled past ~80m and cuts off at the fixed frustum edge. | `atmosphere.ts:36`; `tone.ts:15`; `main.ts:87` | Set `__TERRA__.renderer.shadowMap.enabled=false` and check whether far sparkle disappears. Materials recompile, so expect a hitch. | **Low** |
| **9** | **Line-class corruption by transparent and additive blends.** Steam, smoke, shafts and rain raise destination alpha: a character's .5 alpha can become >.65 (heavy world line), and printed text's 0 can become ≥.25 (gets interior ink). | `assets.ts:121-134`; blends in `atmosphere.ts:38-41`, `presentation.ts:337` | Visual check: characters behind steam or shafts get heavy lines. | **Low** (local) |
| — | Not a cause | Texture mipmaps and anisotropy are fine. There is no screen-space grain. There is no half-res pass. Camera near/far (.08/500) with 24-bit depth gives a relative precision of about 2e-4 at 300m, well under the crease threshold of .02. | — | — |

**Accessing the ink material at runtime.** It isn't exposed, but `InkRenderer` calls `this.renderer.render(this.scene, …)`, and `render` is an instance property, so it can be wrapped:
```js
const R = __TERRA__.renderer, orig = R.render.bind(R);
R.render = (s, c) => { const m = s.children[0]?.material; if (m?.uniforms?.recovery) window.__ink = m; return orig(s, c); };
// then edit any literal:
__ink.fragmentShader = __ink.fragmentShader.replace('smoothstep(40., 140., nearest) * .75', 'smoothstep(25., 90., nearest) * .9'); __ink.needsUpdate = true;
```
`scene.fog.density` is rewritten every frame by `Atmosphere.update`. Use `?weather=` or `atmosphere.override` instead of poking the density.

---

## B.8 Conservative distance-aware ink plan (with exact insertion points)

Goal: **near (<25–30m) is unchanged**, mid (30–90m) is slightly reduced, far (>90–160m) keeps outer silhouettes only, and all ink fades with the actual fog. Everything stays in `ink-renderer.ts` plus two lines in `main.ts`. No new passes.

1. **New uniforms.** At `ink-renderer.ts:14`, add `fogColor: { value: new T.Color() }, fogDensity: { value: 0 }, pxScale: { value: 1 }`. At `:21`, add `uniform vec3 fogColor; uniform float fogDensity, pxScale;`.
2. **Feed them each frame.** In `render()`, after `:107`:
   `const f = scene.fog as T.FogExp2 | null; this.material.uniforms.fogDensity.value = f?.density ?? 0; if (f) this.material.uniforms.fogColor.value.copy(f.color);`
   `this.material.uniforms.pxScale.value = this.renderer.getPixelRatio() / 1.5;`
   This keeps line width constant in CSS pixels relative to today's tuning at 1.5×.
3. **Distance bands.** After `:35` (`centerDist`):
   `float calm = smoothstep(15., 60., centerDist);`
   This drives the wobble and weight-noise rolloff.
4. **Weight.** Replace `:37` with:
   `float weight = mix(3.0, 1.2, smoothstep(6., 80., centerDist)) * pxScale * mix(.8 + .45 * vnoise(px * .045), 1., calm);`
5. **Wobble.** At `:39`, multiply by `(1. - calm)`. Near lines keep the hand-drawn wobble; far lines become steady.
6. **Separate inner and outer edges.** After `:54` (`nearest`), add:
   `float farthest = max(max(max(c0, l), max(r, u)), max(max(d, a1), max(max(a2, a3), a4)));`
   `float outer = max(step(far * .9, farthest), smoothstep(1.3, 1.8, farthest / nearest));`
   `float tMid = smoothstep(30., 90., nearest), tFar = smoothstep(90., 160., nearest);`
7. **Thresholds.** Replace `:60-61` with:
   `float silhouette = smoothstep(.07, .18, e) * mix(1., outer, tFar);`
   `float crease = smoothstep(mix(.02, .035, tMid), mix(.05, .09, tMid), e) * (1. - tFar);`
   Far geometry keeps only the sky and large-depth-ratio silhouettes. Internal creases are gone past 160m and thinned from 30m.
8. **Fog-aware fade.** After `:71`:
   `float fogF = 1. - exp(-fogDensity * fogDensity * nearest * nearest); fade *= 1. - .9 * fogF;`
   Optionally bring the floor down too: `smoothstep(40., 140., nearest) * .8`.
9. **Fog-tinted ink.** At `:74`, append `inkColor = mix(inkColor, fogColor * .55, fogF);`. Fogged lines become a darker fog tone instead of black. (`fogColor` is linear because three stores colours in linear, which matches the target.)
10. **Resolution guard** in `main.ts`:
    - At `:81`, stop the ratchet at a higher floor: `strain > .6` gives 0.8, 0.64, then stop.
    - Add recovery: when `slow` stays at 0 for about 5s and `strain < 1`, set `strain = Math.min(1, strain / .8)` and call `renderer.setPixelRatio(pixelRatio())`.
    - Optionally expose `inkRenderer` in the dev `api` (`:108`) for tuning.
11. **Docs.** Update `ART_DIRECTION.md:60,108,5` (fade range; grain is absent) once the values are tuned.

Validation for the runtime agent:
- Use the same `?dev&view=…&weather=…&day=…` views at 1280×720 and 1920×1080, at the natural pixel ratio and at forced `devicePixelRatio`.
- Views: `overview`, `roof`, `edge`, `canal`, `foundry`, `street`, `square`, in rain, fog, clear and night.
- Measure the share of ink pixels at 0–30, 30–90 and over 90m, and check that the near band is unchanged.
- Record a yaw-pan clip for the crawl in hypothesis 4.

