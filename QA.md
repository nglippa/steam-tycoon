# City Tycoon verification — 2026-09-06

The previous implementation was recovered from the earlier task's work directory into `~/city-tycoon`. The active development server runs this repository at http://127.0.0.1:5174/.

## Automated verification

`npm run typecheck`, `npm test`, and `npm run build` pass. Eleven economy tests cover purchase rejection, passive and collected income, automation, offline caps, save migration and recovery, milestones, district/research gates, reset, background catch-up, invalid time/spend values, and duplicate save bonuses.

The Vite build reports the expected size warning for the bundled Three.js engine (about 513 kB before gzip). No external runtime assets are used.

## Browser verification

Performed in the Codex embedded browser using the separate `?dev=1` save namespace. Development inspection hooks were used to position the player and set progression/time for visual checks.

- New/continue screen, drag-to-look fallback and contextual E interaction work.
- Opened the physical salvage ledger using E, collected earnings, bought the sorting repair, observed scaffolding and disabled construction button, then verified visual level 1 after completion.
- Appointed a foreman through the ledger. Full automatic contribution displayed and persisted through reload.
- Exercised the actual movement controller: two seconds walking covered 8.77 m; sprinting covered 14.03 m. Jump rose and returned to grounded state. Six seconds up the ramp reached eye height 8.15 m. Side entry stopped at the ramp boundary; a building wall stopped forward movement.
- Visually inspected spawn, main street, salvage, detailed citizens, market, clock square at night in rain, and the elevated alley at advanced progression.
- Tested intermediate and maximum property/infrastructure visual configurations through developer hooks.
- Corrected pedestrians intersecting market stalls, overlapping upgraded windows, and stale inspection viewpoints. Canal Ward charter decorations now reuse existing buildings rather than intersecting them, and ward buildings block movement.
- Renderer diagnostics showed roughly 38–49 FPS in sampled embedded-browser scenes after character batching. This is an observation, not a hardware-wide performance guarantee.

## Scope and limits

The captured mouse path was verified in Chrome during the prior pass; this pass verified the embedded browser's drag fallback. The first district is the detailed playable area. Expansion wards are compact extensions. Characters are original procedural models with illustrated faces and cel shading; a complete anime art production pass remains future work. See ART_DIRECTION.md. NPC behavior remains ambient route choreography. There is synthesized sound rather than a recorded music track.

## World + art direction pass — final validation

This pass preserved the existing economy, save format, controls and UI architecture.

### Rendered tour

Inspected the entry gate and arrival street; salvage frontage; municipal boiler yard; foundry furnace and worker; housing notice scene; market; clock square; canal; elevated alley view; and the layered skyline. Inspected property configurations 0, 2 and 5, daytime overcast, rain and nighttime rain. Developer view hooks now also include `foundry`, `boilerYard`, `housing` and `gate`.

Corrected defects found during inspection: duplicate gate lettering, exposed bridge braces, floating skyline finials caused by absolute sphere scaling, blank rear elevations, overlapping housing upgrade windows, duplicate furnace geometry, and market stalls blocking ledger approaches.

### Gameplay checks

- All six ledgers were correctly raycast from unblocked standing positions in both starting and maximum configurations (12 checks).
- Exercised the actual player controller along the main street and both side lanes. Main street: z=77 to z=0.73; foundry and housing lanes: z=60 to z=-20.77, without unintended obstruction.
- Ramp ascent still reaches y=8.15. Side entry still stops at x=-31.68. Market stalls and canal correctly block movement.
- Opened the physical salvage ledger with E, commissioned a repair, observed the construction lock, and verified construction completion, visual level 1 and the matching presentation state. Collected local earnings afterward.
- Web Audio context is running with the original boiler source and three additional localized ambience layers. These are synthesized textures, not recorded speech.
- No browser console warnings or errors were reported in the final inspection.

### Performance

Measured in the Codex embedded browser at a 1280×720 viewport, full quality (1.5× pixel density), after an 800 ms warmup followed by a 2.4-second frame sample. Values are observations on this machine, not a universal guarantee.

| Scene | FPS | Draw calls | Triangles |
| --- | ---: | ---: | ---: |
| Starting gate, rain | 57 | 558 | 430,214 |
| Mid-stage market, overcast | 56 | 249 | 305,890 |
| Maximum property levels, main street | 50 | 432 | 484,129 |
| Maximum property levels, rainy night market | 55 | 224 | 349,632 |

The expensive initial art iteration measured 32–37 FPS. Citizen batching, a reduced dynamic-light budget, periodic shadow refresh and idle rendering throttling recovered performance. No geometry or shader errors were observed after the optimization.

### Checks

Final commands: `npm run typecheck`, `npm test` (all 11 existing tests), and `npm run build`. The Three.js vendor chunk retains Vite's size advisory. The server remains at http://127.0.0.1:5174/.


## Messenger-inspired finishing pass — 2026-09-07

Continued the interrupted pass in `/Users/nicholaslippa/Projects/steam-tycoon`. The local preview remains at http://127.0.0.1:5174/. Existing uncommitted art work was preserved.

- Inspected Messenger's graphic character and environment treatment, Terra's city overview, and the street-level citizen view. Increased face-detail size, adjusted boot contact, and added shared flat contact shadows.
- Added opaque paper behind introductory copy so rooftops do not compromise readability.
- Verified title and entry-button bounds at 1280×720, 390×844, 320×568 and 844×390 in the embedded browser. The Chrome viewport override did not change the measured viewport, so it was not used as responsive evidence.
- At 390×844, opened the ledger with its visible button, verified panel bounds and scrolling, navigated from Close ledger to Properties with Tab, opened Settings, toggled reduced motion, and switched both quality modes. The reduced-motion body class was active and the panel's computed animation was `none`.
- At 844×390, verified entry, pause bounds, Settings access and Escape back to pause. The title uses a two-column arrangement in short landscape view.
- A shared preference helper now checks both device and game settings for opening motion, entry transition, walking head bob, crowd cadence and lamp flicker. Device preference integration was checked in code; the OS setting was not changed during browser verification.
- Full and performance rendering produced no reported warning/error logs in the inspected embedded browser; the Chrome citizen inspection also reported none.
- `npm test`: all 11 economy tests pass. `npm run build`: TypeScript and Vite pass. The existing Three.js vendor-chunk size advisory remains. `git diff --check` passes.

This pass verifies responsive presentation, not touch locomotion: exploration still uses the existing keyboard/mouse controls. No economy or save-schema changes, remote assets, publishing or deployment were introduced.

## Messenger-level refinement — 2026-09-07

Implemented in `/Users/nicholaslippa/Projects/steam-tycoon`; the requested `~/city-tycoon` path is absent. Existing work was preserved. No new gameplay systems or save-schema changes were introduced.

### Rendered review and corrections

Inspected actual frames of the starting gate/street, close citizen, market, clock, boiler yard, foundry, walkable overlook, rainy night, and maximum city. Revisited Messenger's rendered character scene for the final comparison. Comparison concerned restraint, silhouette, contrast and spatial layering; no source assets were copied.

Final iterations corrected high eye placement, block-shaped market counters, duplicated tavern awnings, and solid Exchange arcade panels obscuring its sign. The Exchange now has an open gallery. The city uses a narrower apparent road, quieter curbs/rails, fewer cross-street structures, lower distant masses, and specific business upgrades. NPC figures use tapered continuous surfaces and small staged groups. Boiler steam fades in periodic releases through a single shared particle pass.

### Gameplay and checks

The explicit `?dev=1&review=1` mode uses memory-only storage so review purchases and staged progression do not modify either the normal or QA save. Its DOM diagnostics are emitted after actual frames render, and optional traversal checks exercise `Player.update` and the actual target raycast.

- At levels 0 and 5, all six property ledgers were raycast successfully from unblocked standing positions.
- Real-controller checks passed along the main street, both pedestrian lanes, the foundry lane, the housing lane, the ramp ascent and a building-wall collision.
- In the embedded browser, opened the physical salvage ledger with E, commissioned the 25-Crown repair, observed the disabled construction button, verified the next commission became enabled after completion, and collected local earnings.
- TypeScript check passes. All 11 economy tests pass. Production build passes, with the existing Three.js chunk-size advisory (543.19 kB minified, 137.65 kB gzip).
- No warning/error browser logs in the inspected final scenes. Responsive UI and reduced-motion checks from the preceding finishing pass remain applicable; this pass changes world presentation rather than controls or layout.

### Performance

Codex embedded browser, 1280×720, full quality, 1.5× render density, 1.2-second warmup and approximately five seconds / 360–361 measured frames per scene. These samples sit at the browser's observed ~72 FPS ceiling, so they establish that these views meet the requested 50–57 FPS target on this machine, not a hardware-independent improvement ratio.

| Scene | FPS | p95 frame ms | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: |
| Starting street, level 0 | 71.9 | 14.8 | 495 | 305,980 |
| Market, level 0 | 71.9 | 14.7 | 209 | 186,014 |
| Crowded clock vista, level 5 | 71.9 | 14.8 | 321 | 321,499 |
| Foundry, level 0 | 71.9 | 14.8 | 349 | 269,118 |
| Rainy-night clock vista, level 5 | 71.9 | 14.8 | 324 | 321,501 |
| Upgraded overview, level 5 | 71.9 | 14.8 | 548 | 447,419 |
| Market, level 5 | 71.9 | 14.9 | 222 | 246,486 |
| Close citizen, level 0 | 71.9 | 14.7 | 195 | 205,202 |
| Boiler yard, final steam fade | 71.9 | 14.8 | 449 | 297,706 |

The final steam fade changes particle opacity, retaining particle count and draw count; boiler rendering and browser diagnostics were rechecked afterward.

### Remaining limits

Faces have four painted expressions and six hair silhouettes rather than bespoke animated facial rigs. Residential window rhythms remain repeated, and background pedestrians retain lightweight route choreography. Touch locomotion is not implemented. The retained Three.js size advisory concerns download size rather than an observed frame-rate failure.

## Anime-steampunk life and palette — 2026-09-07

Continued in `/Users/nicholaslippa/Projects/steam-tycoon` without rebuilding the game or changing the economy, population ceiling, ledger positions or collision layout.

### Rendered audit and final review

Inspected spawn, close citizens, market, housing, boiler, foundry, clock, rainy night and the upgraded overview before implementation. Final rendered checks covered the close guard/courier, conversation pair, clear-day market, rainy-night market, housing at levels 0 and 5, boiler, foundry, clock, and maximum overview. The green wash was replaced by slate streets, parchment/plaster, distinct iron/copper/brass, curated clothing and weather-specific skies. The Exchange's wall color and small trim shadows received a second refinement after screenshot review. The final merchant review removed a matching-outfit procession by alternating curated wardrobe variants and assigning more citizens to browsing stalls.

### Behavior and interaction checks

- The live DOM review diagnostics observed neutral, happy, tired, focused, annoyed and blink states in the actual running scene. Rendered faces use a shared atlas with per-instance expression selection.
- Diagnostics and rendered views confirmed partner glances, look-away periods and short player glances in the close view. Conversation partners showed alternating happy/neutral states and gestures.
- Existing citizens now populate distinct market, residential and industrial activities. Haulers carry a small crate; workers inspect the gauge, turn a valve, hammer, sweep, read and warm their hands. Walkers pause and ease their turns at route endpoints.
- No visible route actor was recorded inside a static collision footprint during the sampled maximum-prosperity scene. This is sampled clearance evidence, not exhaustive path coverage over unlimited playtime.
- All six physical ledgers raycast successfully from unblocked standing positions at levels 0 and 5. Main street, east/west pedestrian lanes, foundry/housing lanes, ramp ascent and wall-collision checks pass through the real controller.
- Opened the city ledger and Settings through actual UI controls; inspected the shared paper-and-ink colors. Earlier repair/collection coverage remains applicable; the economy and purchase handlers are unchanged.

### Performance

Embedded browser, 1280×720, 1.5× pixel density, full atmosphere, 1.2-second warmup followed by about five seconds (360–361 frames) per view. All samples remain at the observed ~72 FPS browser ceiling, meeting the requested 60+ FPS target on this machine. These measurements do not imply the same result on every device.

| Scene | FPS | p95 frame ms | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: |
| Starting street, level 0 | 71.9 | 14.8 | 501 | 301,645 |
| Market clear day, level 0 | 71.9 | 14.9 | 224 | 180,590 |
| NPC-heavy clock vista, level 5 | 71.9 | 14.9 | 319 | 313,560 |
| Foundry, level 0 | 71.9 | 15.1 | 355 | 252,705 |
| Rainy-night market, final staging | 71.9 | 15.5 | 231 | 261,967 |
| Upgraded overview, level 5 | 71.9 | 14.5 | 545 | 454,827 |

The final small staging changes retain the same population ceiling and shared batching. The rainy-night market was rechecked after the last changes.

### Final checks and remaining limits

`npm run typecheck` passes; all 11 economy tests pass; `npm run build` passes. Final production output: application 127.85 kB / 47.19 kB gzip; Three.js 543.22 kB / 137.66 kB gzip. Vite retains the existing vendor chunk-size advisory. Browser inspection reports no rendering warnings or errors.

Facial changes are discrete atlas states, and conversations/work remain short authored loops. Residential families still share simple structural geometry. The work improves visual life without introducing dialogue, a social simulation or expensive facial animation.
