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
