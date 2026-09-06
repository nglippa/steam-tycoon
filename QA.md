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
