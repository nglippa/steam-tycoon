# City Tycoon verification — 2026-09-06

The repository lives at `~/Projects/steam-tycoon` (older task prompts named `~/city-tycoon`, which does not exist). The development server runs it at http://127.0.0.1:5174/.

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

## Painted light and scale pass — 2026-09-25

Typecheck passes; all 11 economy tests pass; production build passes (existing Three.js chunk-size advisory). Real-controller checks at levels 0 and 5: six of six ledgers reachable and raycast; main street, both pedestrian lanes, foundry and housing lanes, ramp and wall collision pass; no sampled route actor inside a collider. Played: entry, walking, E on the salvage ledger, 25-Crown commission, construction completion (income rose), save and reload persistence. No console warnings or errors.

FPS in Chrome at 1280×720 and 1.5× pixel density: every representative scene sits at the display's vsync cap (71.9 FPS on a 72 Hz display, p95 14.4–14.8 ms; 165 FPS with p95 ≈6.8 ms on a 165 Hz display). Scenes: starting street, market (levels 0 and 5), level-5 crowd at the clock, foundry, boiler yard, rainy night and level-5 overview. Draw calls 219–539; triangles 0.20–0.49 M.

## Character and life pass — 2026-09-25

Typecheck passes; all 11 tests pass; build passes. Traversal and ledger checks pass at levels 0 and 5, with no route citizen sampled inside a collider. Of the staged workers, only the two bench sitters register inside a collider, and that is intentional. Gameplay: walking (8.8 m in 2 s), sprinting (14.3 m in 2 s), jump and landing, E interaction, purchase, construction, and save/reload all work; the reduced-motion setting freezes secondary motion. The automation browser refused real pointer lock, so the drag-look fallback was exercised instead. No console warnings or errors. FPS at 1280×720 and 1.5× pixel density sits at the 165 Hz display cap in every representative scene (p95 6.4–6.8 ms; 120–624 draws; 0.28–0.75 M triangles).

## Structural pass — 2026-09-26

Typecheck, all 11 tests and the build pass. Traversal and ledger checks pass at stages 0 and 5; no route citizen sits inside geometry; the only staged workers inside colliders are the intentional sitters and leaners. Gameplay checks pass: walk, sprint, jump, E interaction, purchase, construction, save/reload and reduced motion. The automation browser refuses pointer lock, so the drag-look fallback was used. No console issues. Uncapped Chrome at 1280×720 and 1.5× pixel density: 309–380 FPS (p95 3.8–4.4 ms). The elevated overview is about 0.83 M triangles and 650 draws. With vsync on, every scene sits at the display cap.

## Liberation pivot, Phase 1: Market Square slice (2026-09-29)

`npm run typecheck`, `npm test` (15 tests, 4 of them new for site progression, gating, income, save migration and clamping) and `npm run build` pass. The build's size warning is the existing Three.js vendor chunk.

### Browser verification (Playwright, `?dev=1`)

- Review traversal (`&check=1`) passes at level 0/site 0, level 3/site 3 and level 4/site 5: all six ledgers are reachable and raycast, and main street, lanes, ramp and wall collision all pass. The life monitor reports no NPC blocked by the new colliders. No console or page errors.
- Real UI path on an ordinary save, not review mode:
  - The cellar door raycasts as `market.cell`. It stays padlocked until the Copper Finch reopens. The covert panel opens, and buying a step advances `sites.market`, closes the panel and voices the change.
  - The door refuses while the patrol is watching.
  - Liberation requires Industry. The spring refuses until gardens level 1, then brings the civic-engineer scaffold. After 6 s the wake runs from the basin along the channels to the gate.
  - After a reload, the save restores `sites.market` and exactly the matching layers.
- Patrol: walking its beat it notices a Steward loitering at the cellar, investigates, confronts ("Papers, Steward…"), then returns to its beat. The first run exposed a stall 0.15 m short of the return point, which is fixed.
- Rendered review: `screenshots/review-2026-09-29-pass1/` (nine frames plus `collage.png`).

### Performance (headed Chrome, `--disable-gpu-vsync --disable-frame-rate-limit`, 1280×760 @1.5, A/B against the pre-change commit)

| View | Baseline FPS | Slice FPS | Draws | Triangles |
| --- | --- | --- | --- | --- |
| square, occupied (L0) | 324 | 306 | 275 → 311 | 545k → 590k |
| square, covert (L3) | 289 | 272 | 321 → 355 | 808k → 853k |
| square, restored (L4) | 288 | 279 | 321 → 346 | 820k → 847k |
| market (L2) | 297 | 291 | 388 → 410 | 664k → 707k |

p95 frame time stays at about 4.5 ms. Each stratum is baked to one draw per material and toggled by visibility. The flowing water and aether are two shared shader materials driven by two uniforms, and no lights were added.

## Liberation pivot, Phase 2: Cinder No. 3 and Terra's edge (2026-09-30)

`npm run typecheck`, `npm test` (18 tests: 3 new ones cover the Foundry ladder, the Finch↔Foundry network and v3 saves that predate the Foundry site) and `npm run build` pass. The build's size warning is the existing Three.js vendor chunk.

### Browser verification (Playwright, `?dev=1`)

- Review traversal (`&check=1`) passes in 8 cases: square at L1 (sites 0/0) clear, L3 (3/0) rain and L4 (5/5) clear; foundry at L1 (0/0) clear, L3 (4/3) fog and L4 (5/5) overcast; edge at L2 in rain; arrival at L2 (5/5). In every case all six ledgers are reachable and raycast, and the main street, lanes, ramp and wall collision pass. There were no console or page errors.
- Save round trip on an ordinary (non-review) save: market 2 and foundry 4 are set, saved and reloaded. Both the state and the visible layers come back the same.
- Real UI path: the shift board is cold until the Foundry reopens, then refuses until the Finch vouches. The covert steps are refused while the overseer faces the board. Liberation requires Commerce. The Armillary scaffold hugs the rear wall; the wake pulls the furnace, turns the rings and lifts the table's parts.
- Rendered review: `screenshots/review-2026-09-30-pass1/` (16 frames plus `collage.png`) and `screenshots/review-2026-09-30-pass2/` (the vista after the sister-isle silhouette fix, in clear, rain and dusk).

### Performance (headed Chrome, uncapped, 1280×760, A/B against the Phase 1 commit, mean of 2 rounds)

| View | Phase 1 FPS | Phase 2 FPS | Draws | p95 ms |
| --- | --- | --- | --- | --- |
| square, occupied (L0) | 314 | 313 | 310 → 319 | 4.2 → 4.1 |
| square, restored (L4) | 284 | 285 | 346 → 354 | 4.5 → 4.5 |
| foundry, occupied (L1) | 250 | 229 | 716 → 764 | 4.9 → 5.2 |
| foundry, restored (L3) | 224 | 211 | 733 → 768 | 5.5 → 5.8 |
| street (L2) | 251 | 236 | 677 → 686 | 5.0 → 5.1 |
| gate (L1) | 375 | 350 | 199 → 221 | 3.7 → 3.8 |
| spawn (L1) | 230 | 211 | 935 → 986 | 5.4 → 5.7 |

Per-site draw budget (visible meshes before culling): Foundry uses 39 draws occupied, 53 at covert step 3 (its peak) and 28 restored. Market uses 38 occupied and 31 restored. About 11–15 draws per site are unbaked animated parts (rings, gimbal, boards, lid, patrol lamp). The rest is baked strata at one draw per material per stratum, so a material shared by two strata that are visible together (occupation iron in `occ` and `dormant`) costs two draws. Frustum culling keeps an off-screen site cheap: the square view gained only 8 draws from the whole Foundry slice. Scaling rule of thumb: about 40 draws per district when in view. Before about six districts are live, merge co-visible strata that share materials, and fold ring and gimbal parts into fewer animated groups.

## Phase 3: the city responds, Cinder Row (2026-09-30)

Phase 2 and the character follow-up were committed first as `0cf9c57`. After that, `npm run typecheck`, `npm test` (23 tests; the 5 new ones cover cross-site gating, the carried step, the Directorate's response trigger, liberation clearing it, and persistence with pre-Row saves) and `npm run build` pass. The build's size warning is the existing Three.js vendor chunk.

### Browser verification (Playwright, `?dev=1`)

- Traversal and ledger checks (`&check=1`) ran in 10 states across the square, the Foundry, the Row and the edge, in clear, rain, fog and overcast. All 6 ledgers are reachable and raycast in every state, no NPC is blocked, and there are no console errors. `foundryLane` fails only while the inspection is active, which is intended: the Directorate's barrier closes that lane. It passes at baseline, during the courier stage and once liberated.
- The cutters' journey, driven in the live game:
  - The crate is taken at the yard. Standing in the Row as the inspector turned up-Row (gaze east), the crate was confiscated with the whistle and toast.
  - Taken again, it was delivered at the Finch cellar: `row` goes from 1 to 2, `cuttersDelivered` becomes true, and the crate shows at the Finch.
- Guard-aware citizens, sampled over 24 s: the courier was held near the post for about 4.4 s while the inspector could see him, then crossed (x 5.5 → 26.7). The chalker stopped work in 38 of 120 samples, whenever the inspector's eyes came round.
- Ordinary-save round trip: market 3 / foundry 3 / row 3 are restored after reload, the inspection post stands and the searchlight stays cut.
- Rendered review: `screenshots/review-2026-09-30-pass4/` (the Row across its states, day and night, rain and fog, the carried crate, the closed lane, the sky isle) and `collage.png`.

### Performance (headed Chrome, uncapped, 1280×760, Phase 2 commit vs working tree, mean of 2 rounds)

| View | Phase 2 FPS | Phase 3 FPS | Draws | p95 ms |
| --- | --- | --- | --- | --- |
| square, occupied | 288 | 266 | 426 → 426 | 4.4 → 4.6 |
| square, restored | 214 | 224 | 444 → 444 | 5.7 → 5.5 |
| foundry, inspection active | 225 | 208 | 785 → 811 | 5.3 → 5.75 |
| Row from the yard gate, inspection | 235 | 219 | 677 → 700 | 5.15 → 5.45 |
| Row from the yard gate, liberated | 221 | 200 | 687 → 704 | 5.45 → 6.2 |
| Row looking east (whole Row + sky isle) | 269 | 248 | 478 → 528 | 4.7 → 4.95 |
| spawn | 211 | 198 | 987 → 997 | 5.75 → 5.9 |

The square cases draw the same, and their FPS moves in both directions, so that's run-to-run noise. The Row costs 17–50 draws where it's in view. Printed signs are the least shareable part, since each has its own texture. The sky isle is a clone that shares its baked geometry and materials. Per-frame logic is one inspector, one courier and two citizens, checked with `inView()` against colliders; there are no global scans.

## Phase 4: the Ration Line, a second route (2026-09-30)

Phase 3 was committed as `9c227f9`. After that, `npm run typecheck`, `npm test` (26 tests; the 3 new ones cover the Line's gating, the warden trigger and its end, the carried key, the Armillary's new pressure dependency, and pre-Line saves) and `npm run build` pass.

- The pattern held for a second route without new systems. `CinderRow` was refactored onto the shared `Attention`, `Consignment` and `signs`, and `RationLine` is built from the same pieces.
- Behaviour, in the live game:
  - Holding the cutters, the key is refused ("Your arms are already full").
  - The key was taken when the warden turned toward the yard, then seated at the valve on the next attempt.
  - The stoker knocked in 61 of 100 samples and stopped in 39, whenever the warden could see him.
  - The Armillary stays blocked ("Requires The Ration Line: open the old main") until the main is open.
  - An ordinary save restores all four sites.
- Traversal and ledgers (`&check=1`) ran in 15 states, including the Line at 1, 2, 3 and 4. All 6 ledgers pass everywhere, no NPC is blocked, and there are no console errors. `foundryLane` fails only while Cinder Row's inspection is active, as in Phase 3.
- Performance (uncapped headed Chrome, Phase 3 vs Phase 4, mean of 2 rounds): the Line costs +12 to +19 draws where it's in view (the Row cost +17 to +50), and p95 stays at or below 6.9 ms. Existing districts are within ±2 draws. The shared sign sheet saved only a draw or two there, because most plates already shared a stratum with other geometry.
- Rendered review: `screenshots/review-2026-09-30-pass5/` and `collage.png`.

## People pass: faces, arms, hands (2026-09-30)

Typecheck, 26 tests and the build pass. The traversal and ledger sweep over 15 states is unchanged: all 6 ledgers pass everywhere, there are no console errors, and `foundryLane` fails only while Cinder Row's inspection is active.
- A hand-position probe (hand vs shoulder and head, per pose) found the resting and walking arms swinging *inward* (a hand 9 cm inside the shoulder, pressing into the hips), repair hands inside the head (0.22–0.25 m from its centre), and the hammer hand grazing it (0.31 m). After the fix: walking hands sit 1–4 cm outside the shoulders, repair hands 0.5 m from the head, hammer 0.44 m.
- Props moved from guessed forearm offsets to palm grip sockets. The lineup confirms the broom, clipboard, paper, wrench, bun, mug and basket in the fist, and a crate between the courier's palms.
- Performance: +0 to +2 draws and unchanged FPS against Phase 4, because the crowd batching absorbs the hand geometry.
- Screenshots: `screenshots/review-2026-09-30-pass6/` (before and after) and `collage.png`.

### Torso–leg junction, round two (2026-09-30)

A junction probe over all 270 characters in three districts (the distance between each leg pivot and the pelvis's own hip point, sampled for 4 s) found 78 characters over 1 cm and 28 over 3 cm:
- walking or carrying bob lifted the pelvis off the thighs (up to 4.2 cm vertically)
- pelvis twist or roll slid the side hips off them (up to 4.4 cm, mostly talkers turning to partners and carriers)

The legs now hang from the pelvis transform, so the probe reads 0 for every character in every activity. The walking bob is now the stance leg's own hip drop. Walking feet stay within −0.6 to +1.4 cm of the ground at the 5th–95th percentile, against floating up to 4.4 cm before.

## The floating city: sky canal, west edge, undercroft (2026-09-30)

Typecheck, 26 tests and the build pass. The traversal and ledger sweep over 15 states is unchanged: all 6 ledgers pass everywhere, no NPC is blocked, there are no console errors, and `foundryLane` fails only while Cinder Row's inspection is active.
- **Open views, confirmed by raycast.**
  - North along the cleft, rays at 1.5 m and 6 m run out past z −270 without a hit.
  - From the west balustrade, rays go to the horizon.
  - Downward rays through the cleft and the notch land on the cloud sea at y −240.
  - The west notch was first a 64 m parallel slot, so its own rim walls framed the view like a corridor. It now flares out (`WEST_EDGE.flare`), and `skyGap` widens with it.
- **The lift, driven through `ui.interact`.**
  - *Ride down* takes 8 s from the terrace (eye 1.93) to the gallery (eye −99.25), and `riding` clears.
  - On the gallery: `groundHeight` is −101 on the deck, `blocked` is false on the deck and true off its edges and anywhere on the street plan below.
  - *Ride up* returns to the terrace with the cage reset to the top.
  - No console errors.
- **Performance** (uncapped headed Chrome, Phase 3 commit `9c227f9` vs the working tree, which also includes Phase 4 and the people pass, mean of 2 rounds). The arrival, chasm, bridge, cleft, west edge, street and square views run 192–335 FPS with p95 at or below 6.15 ms. Draws rise by +3 to +36 per view; the three carriers, the instanced steam and the baked underside are the new cost.
- Rendered review: `screenshots/review-2026-09-30-pass7/` and `collage.png`.

## Moonlit Terra: night lighting pass (2026-09-30)

Typecheck, 26 tests and the build pass. The traversal and ledger sweep over 15 states is unchanged: all 6 ledgers pass everywhere, no NPC is blocked, there are no console errors, and `foundryLane` fails only while Cinder Row's inspection is active.
- Same camera, phone viewport (390×844 @3x), before and after, for clear day and clear, overcast, rain and fog night (`compare-weather.png`). Also Market Square, the Foundry, a housing frontage and the terrace vista (`compare-places.png`).
- Daytime is unchanged (`compare-day.png`). At full daylight the sun intensity, hemisphere and keys are identical to before.
- Performance: no lights, meshes, shadow casters or post passes were added. Only light values and colours changed.
- Screenshots: `screenshots/review-2026-09-30-night/`.
