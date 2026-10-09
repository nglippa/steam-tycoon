# Final in-game QA set (QA V-b)

Captured at 3cc0c49 (branch `presentation`) from a Vite dev server, headless Chromium, 1280x720 at device scale 1 and quality high unless a line says otherwise. The game clock is held still for each shot. `?people=new` (the shipping figures) unless a line says otherwise. Per-shot cameras, draw calls, triangles and people counts are in each folder's captures.json. Console results for every load: console.json. Performance: perf.json.

Commands: `node tools/qa-captures.mjs <base> screenshots/presentation/final/game/scene --part=game --people=new`; `... /intro --part=intro --people=new`; `... /perf-run --part=perf --people=new|old` (and `/perf-run2`, old then new); `node tools/game-captures.mjs <base> .../bands --people=new --sets=shader` (also `bands-head-people-old` with `--people=old`, and `bands-baseline-70f73c4` against a dev server on `git archive 70f73c4`); `node tools/game-captures.mjs <base> .../hud --people=new --sets=hud,hudsizes`; `node tools/hud-mock.mjs .../hud-mock --bg=.../scene/product-test-clear-world.png --only=<view>-normal,<view>-curfew-worst`.

## 1. Product test (brief §20)

- `scene/product-test-clear.png` — Market Square (default state), clear, 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · CLEAR SKIES · HEAVY 76%); 5 people 1.5-20 m in frame, 4 of them 2.5-12 m in the centre cone.
- `scene/product-test-clear-world.png` — the same frame with the HUD hidden.
- `scene/product-test-rain.png` — Market Square (default state), rain (drizzle), 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · DRIZZLE · HEAVY 76%); 6 people 1.5-20 m in frame, 4 of them 2.5-12 m in the centre cone.
- `scene/product-test-rain-world.png` — the same frame with the HUD hidden.
- `scene/product-test-fog.png` — Market Square (default state), industrial fog, 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · INDUSTRIAL FOG · HEAVY 76%); 5 people 1.5-20 m in frame, 4 of them 2.5-12 m in the centre cone.
- `scene/product-test-fog-world.png` — the same frame with the HUD hidden.
- `scene/product-test-night.png` — Market Square (default state), clear, 23:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 23:00 · CURFEW · CLEAR SKIES · HEAVY 76%); 5 people 1.5-20 m in frame, 2 of them 2.5-12 m in the centre cone.
- `scene/product-test-night-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site3-clear.png` — Market Square (market site 3), clear, 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · CLEAR SKIES · LOW 38%); 7 people 1.5-20 m in frame, 6 of them 2.5-12 m in the centre cone.
- `scene/product-test-site3-clear-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site3-rain.png` — Market Square (market site 3), rain (drizzle), 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · DRIZZLE · LOW 38%); 7 people 1.5-20 m in frame, 5 of them 2.5-12 m in the centre cone.
- `scene/product-test-site3-rain-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site3-fog.png` — Market Square (market site 3), industrial fog, 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · INDUSTRIAL FOG · LOW 38%); 8 people 1.5-20 m in frame, 4 of them 2.5-12 m in the centre cone.
- `scene/product-test-site3-fog-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site3-night.png` — Market Square (market site 3), clear, 23:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 23:00 · CURFEW · CLEAR SKIES · LOW 38%); 4 people 1.5-20 m in frame, 2 of them 2.5-12 m in the centre cone.
- `scene/product-test-site3-night-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site5-clear.png` — Market Square (market site 5), clear, 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · CLEAR SKIES · FREE 0%); 11 people 1.5-20 m in frame, 6 of them 2.5-12 m in the centre cone.
- `scene/product-test-site5-clear-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site5-rain.png` — Market Square (market site 5), rain (drizzle), 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · DRIZZLE · FREE 0%); 11 people 1.5-20 m in frame, 6 of them 2.5-12 m in the centre cone.
- `scene/product-test-site5-rain-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site5-fog.png` — Market Square (market site 5), industrial fog, 12:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 12:00 · INDUSTRIAL FOG · FREE 0%); 11 people 1.5-20 m in frame, 6 of them 2.5-12 m in the centre cone.
- `scene/product-test-site5-fog-world.png` — the same frame with the HUD hidden.
- `scene/product-test-site5-night.png` — Market Square (market site 5), clear, 23:00: the product-test placement facing north, the stalls, the street and the Clock Tower beyond, with the HUD (status line: 23:00 · CLEAR SKIES · FREE 0%); 11 people 1.5-20 m in frame, 6 of them 2.5-12 m in the centre cone.
- `scene/product-test-site5-night-world.png` — the same frame with the HUD hidden.

## 2. Crowd samples

- `scene/market-square-close.png` — Market Square (default state), clear, 12:00: the placement with the most people 2-7 m away in view, any heading (3 people).
- `scene/market-square-site3-close.png` — Market Square (market site 3), clear, 12:00: the same search (2 people 2-7 m).
- `scene/market-square-site5-close.png` — Market Square (market site 5), clear, 12:00: the same search (4 people 2-7 m).
- `scene/street-crowd.png` — the Great Main, clear, 12:00: the placement with the most people 3-30 m away in view (7 people), facing north.

## 3. Figures in the game and the intro

- `scene/umbrella-rain.png` — the Great Main, rain, 12:00: a walking street person with an open umbrella, from 3.4 m ahead of them.
- `scene/seated-mug-1.png` — the Weatherside, clear, 12:00: a seated worker with a mug, front three-quarter, sip-cycle frame 1.
- `scene/seated-mug-2.png` — the Weatherside, clear, 12:00: a seated worker with a mug, front three-quarter, sip-cycle frame 2.
- `scene/seated-mug-3.png` — the Weatherside, clear, 12:00: a seated worker with a mug, front three-quarter, sip-cycle frame 3.
- `scene/seated-mug-side.png` — the Weatherside, clear, 12:00: the same seated worker from their right side, on the crate they sit on.
- `intro/intro-1-door-guards.png` — the Steward's room, intro, clear: the door answered and the two Ordinance men in it, their first line on the dialogue card.
- `intro/intro-2-stranger-porch.png` — the porch where the intro's stranger waits, intro, clear: the masked stranger on the stoop, the porch line on the dialogue card.
- `intro/intro-2b-stranger-porch-nocard.png` — the same moment with the dialogue card hidden.
- `intro/intro-3-stranger-leaves.png` — the same place, the farewell beat: the stranger up from the stoop.

## 4. Rendering bands

Views are tools/game-captures.mjs's shader set, the views of Ink VII (screenshots/presentation/ink-vii). `bands/` is HEAD with `?people=new`; `bands-head-people-old/` is HEAD with `?people=old` (the ink and world of HEAD with the old figures, as Ink VII shot them); `bands-baseline-70f73c4/` is the pre-pass baseline rendered live from a `git archive 70f73c4` tree by the same tool (it matches screenshots/presentation/baseline, shot at 8946b2b with `?people=old`, to a mean absolute luma difference of 0.02-0.44 of 255 per image). `bands-pairs/` stacks 70f73c4 (top) over HEAD `?people=new` (bottom), labelled.

- `bands/shader-close-character-storefront.png` — close band, clear, 12:00: a staged worker seated outside a storefront, from 4 m (HEAD, ?people=new).
- `bands/shader-mid-street.png` — mid band, clear, 12:00: the Great Main looking north to the checkpoint (HEAD, ?people=new).
- `bands/shader-mid-market-square.png` — mid band, clear, 12:00: Market Square looking north (HEAD, ?people=new).
- `bands/shader-far-clock-tower.png` — far band, clear, 12:00: the Clock Tower down the street, camera pitched up (HEAD, ?people=new).
- `bands/shader-far-rooftops-overview.png` — far band, clear, 12:00: the rooftops from 25 m up, looking north-north-west (HEAD, ?people=new).
- `bands/shader-veryfar-skyline-edge.png` — very far band, clear, 12:00: the skyline at the city's south edge, looking south (HEAD, ?people=new).
- `bands/shader-mid-market-square-rain.png` — mid band, rain, 12:00: Market Square looking north (HEAD, ?people=new).
- `bands/shader-far-clock-tower-rain.png` — far band, rain, 12:00: the Clock Tower down the street (HEAD, ?people=new).
- `bands/shader-mid-market-square-fog.png` — mid band, fog, 12:00: Market Square looking north (HEAD, ?people=new).
- `bands/shader-far-clock-tower-fog.png` — far band, fog, 12:00: the Clock Tower down the street (HEAD, ?people=new).
- `bands-head-people-old/shader-close-character-storefront.png` — close band, clear, 12:00: a staged worker seated outside a storefront, from 4 m (HEAD, ?people=old).
- `bands-head-people-old/shader-mid-street.png` — mid band, clear, 12:00: the Great Main looking north to the checkpoint (HEAD, ?people=old).
- `bands-head-people-old/shader-mid-market-square.png` — mid band, clear, 12:00: Market Square looking north (HEAD, ?people=old).
- `bands-head-people-old/shader-far-clock-tower.png` — far band, clear, 12:00: the Clock Tower down the street, camera pitched up (HEAD, ?people=old).
- `bands-head-people-old/shader-far-rooftops-overview.png` — far band, clear, 12:00: the rooftops from 25 m up, looking north-north-west (HEAD, ?people=old).
- `bands-head-people-old/shader-veryfar-skyline-edge.png` — very far band, clear, 12:00: the skyline at the city's south edge, looking south (HEAD, ?people=old).
- `bands-head-people-old/shader-mid-market-square-rain.png` — mid band, rain, 12:00: Market Square looking north (HEAD, ?people=old).
- `bands-head-people-old/shader-far-clock-tower-rain.png` — far band, rain, 12:00: the Clock Tower down the street (HEAD, ?people=old).
- `bands-head-people-old/shader-mid-market-square-fog.png` — mid band, fog, 12:00: Market Square looking north (HEAD, ?people=old).
- `bands-head-people-old/shader-far-clock-tower-fog.png` — far band, fog, 12:00: the Clock Tower down the street (HEAD, ?people=old).
- `bands-baseline-70f73c4/shader-close-character-storefront.png` — close band, clear, 12:00: a staged worker seated outside a storefront, from 4 m (70f73c4).
- `bands-baseline-70f73c4/shader-mid-street.png` — mid band, clear, 12:00: the Great Main looking north to the checkpoint (70f73c4).
- `bands-baseline-70f73c4/shader-mid-market-square.png` — mid band, clear, 12:00: Market Square looking north (70f73c4).
- `bands-baseline-70f73c4/shader-far-clock-tower.png` — far band, clear, 12:00: the Clock Tower down the street, camera pitched up (70f73c4).
- `bands-baseline-70f73c4/shader-far-rooftops-overview.png` — far band, clear, 12:00: the rooftops from 25 m up, looking north-north-west (70f73c4).
- `bands-baseline-70f73c4/shader-veryfar-skyline-edge.png` — very far band, clear, 12:00: the skyline at the city's south edge, looking south (70f73c4).
- `bands-baseline-70f73c4/shader-mid-market-square-rain.png` — mid band, rain, 12:00: Market Square looking north (70f73c4).
- `bands-baseline-70f73c4/shader-far-clock-tower-rain.png` — far band, rain, 12:00: the Clock Tower down the street (70f73c4).
- `bands-baseline-70f73c4/shader-mid-market-square-fog.png` — mid band, fog, 12:00: Market Square looking north (70f73c4).
- `bands-baseline-70f73c4/shader-far-clock-tower-fog.png` — far band, fog, 12:00: the Clock Tower down the street (70f73c4).
- `bands-pairs/pair-close-character-storefront.png` — close band, clear, 12:00: a staged worker seated outside a storefront, from 4 m; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-mid-street.png` — mid band, clear, 12:00: the Great Main looking north to the checkpoint; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-mid-market-square.png` — mid band, clear, 12:00: Market Square looking north; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-far-clock-tower.png` — far band, clear, 12:00: the Clock Tower down the street, camera pitched up; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-far-rooftops-overview.png` — far band, clear, 12:00: the rooftops from 25 m up, looking north-north-west; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-veryfar-skyline-edge.png` — very far band, clear, 12:00: the skyline at the city's south edge, looking south; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-mid-market-square-rain.png` — mid band, rain, 12:00: Market Square looking north; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-far-clock-tower-rain.png` — far band, rain, 12:00: the Clock Tower down the street; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-mid-market-square-fog.png` — mid band, fog, 12:00: Market Square looking north; 70f73c4 above, HEAD `?people=new` below.
- `bands-pairs/pair-far-clock-tower-fog.png` — far band, fog, 12:00: the Clock Tower down the street; 70f73c4 above, HEAD `?people=new` below.

## 5. HUD

In game (`hud/`): the hud set at 1280x720, and the `hudsizes` set at four sizes, each a fresh page at the hud set's street camera (the Great Main, the Lowworks, facing the checkpoint). "night-fog" is the fullest status line the clock and weather reach in game (23:40, fog, curfew). The phone page is 390x844 with touch emulation; the game does not lock the pointer there and its touch controls are not drawn in these frames. The crowded states the game cannot be put in by clock and weather alone are in `hud-mock/`: the real interface template and stylesheet over `scene/product-test-clear-world.png`, no game code running; "curfew-worst" is fog, curfew "KNOWN TO THE PATROLS", the lockdown band, 23:40, 12.4k crowns at +231.9.

- `hud/hud-normal.png` — the Great Main, clear, 12:00, 1280x720: the persistent HUD with the pointer locked.
- `hud/hud-toast.png` — the same, with a toast showing.
- `hud/hud-prompt.png` — the Great Main by the Rook & Son Salvage board, clear, 12:00, 1280x720: the interaction prompt.
- `hud/hud-dialogue.png` — the same place, 1280x720: a dialogue card open.
- `hud/hud-1920x1080-normal.png` — the Great Main, clear, 12:00, 1920x1080: the HUD in its normal state.
- `hud/hud-1920x1080-night-fog.png` — the Great Main, fog, 23:40, 1920x1080: the HUD with the curfew on the status line.
- `hud/hud-1280x720-normal.png` — the Great Main, clear, 12:00, 1280x720: the HUD in its normal state.
- `hud/hud-1280x720-night-fog.png` — the Great Main, fog, 23:40, 1280x720: the HUD with the curfew on the status line.
- `hud/hud-800x600-normal.png` — the Great Main, clear, 12:00, 800x600: the HUD in its normal state.
- `hud/hud-800x600-night-fog.png` — the Great Main, fog, 23:40, 800x600: the HUD with the curfew on the status line.
- `hud/hud-phone-390x844-normal.png` — the Great Main, clear, 12:00, phone 390x844 (touch): the HUD in its normal state.
- `hud/hud-phone-390x844-night-fog.png` — the Great Main, fog, 23:40, phone 390x844 (touch): the HUD with the curfew on the status line.
- `hud-mock/hud-mock-hd-normal.png` — mock over Market Square, 1920x1080: the HUD in its normal state.
- `hud-mock/hud-mock-hd-curfew-worst.png` — mock over Market Square, 1920x1080: the HUD in its most crowded state.
- `hud-mock/hud-mock-desk-normal.png` — mock over Market Square, 1280x720: the HUD in its normal state.
- `hud-mock/hud-mock-desk-curfew-worst.png` — mock over Market Square, 1280x720: the HUD in its most crowded state.
- `hud-mock/hud-mock-narrow-normal.png` — mock over Market Square, 800x600: the HUD in its normal state.
- `hud-mock/hud-mock-narrow-curfew-worst.png` — mock over Market Square, 800x600: the HUD in its most crowded state.
- `hud-mock/hud-mock-phone-normal.png` — mock over Market Square, phone portrait 390x844, touch controls: the HUD in its normal state.
- `hud-mock/hud-mock-phone-curfew-worst.png` — mock over Market Square, phone portrait 390x844, touch controls: the HUD in its most crowded state.
- `hud-mock/hud-mock-phoneland-normal.png` — mock over Market Square, phone landscape 844x390, touch controls: the HUD in its normal state.
- `hud-mock/hud-mock-phoneland-curfew-worst.png` — mock over Market Square, phone landscape 844x390, touch controls: the HUD in its most crowded state.

## 6-7. Measurements

- `perf.json` — HEAD against `?people=old`, street and Market Square, two runs (the QA IV method), with the QA IV numbers beside them; raw runs in `perf-run/` and `perf-run2/`.
- `console.json` — console errors and warnings, page errors, failed requests and HTTP errors for every load of this set.
- `hud-mock/hud-mock-states.json`, `hud/hud-measure.json` — the HUD's measured boxes and font sizes.
