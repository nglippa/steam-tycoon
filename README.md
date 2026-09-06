# CITY TYCOON

**Terra, in the world of Locke.** A locally playable first-person incremental city game built with TypeScript, Three.js and Vite. All architectural geometry, textures, citizens and sound are generated in the project. No asset CDN, account, cloud API or paid service is required.

## Play locally

```sh
cd ~/city-tycoon
npm install
npm run dev -- --port 5174
```

Open **http://127.0.0.1:5174/** in Chrome, Edge, Safari or a modern WebGL2 browser. Click **Enter the Lowworks**. Chrome is recommended for captured mouse controls. An embedded browser that declines pointer lock automatically uses click-and-drag look.

- **WASD** walk; **mouse** look; **Shift** sprint; **Space** jump.
- **E** interact while aiming at a brass ledger or discovery plaque within reach.
- **Tab** opens/closes the city ledger; **Esc** releases the mouse and pauses movement.
- **F3** shows frame rate and position. It starts disabled.

Begin at Rook & Son, on the left past the arrival arch. Inspect its ledger, collect the first reserve, mend the sorting rig, restore the municipal boiler and fund street lighting. The treasury earns passive dividends even before a foreman is hired.

## The city

Six physical properties each have five named commissions, production cycles, milestone multipliers and independently purchased foremen. On-site ledgers are the only place to upgrade properties; the city ledger provides navigation, civic works, district charters, research, statistics and settings.

Unstaffed businesses deposit 40% of their production directly and keep 60% for collection at the property, capped at 30 production cycles. Foremen deposit 100% automatically. Civic improvements, district charters, research and discoveries multiply actual production. Construction uses a six-second scaffold-and-worker sequence before the new architectural details are revealed. Income increases immediately when a commission is funded.

Prosperity advances through **The Lowworks → Recovery → Industry → Commerce → Innovation → Grand Terra**. Individual property improvements add functioning windows, brass detailing, upper floors, copper roofs and aether machinery. Lighting, paving/transit, pressure mains, housing and gardens each have three civic levels. The canal and institute districts unlock through charters. Citizens, carts, banners, pipes, the clock landmark, steam, smoke, elevated railway and a distant airship populate the district.

The industrial ramp in the western alley reaches a six-metre-high overlook. Three discoverable plaques/objects offer original Locke lore, a small reward and persistent output bonuses.

The world has a 12-minute day/night cycle and rotating drizzle, overcast and industrial fog. Original Web Audio synthesis supplies rain/steam ambience, positional machinery, steps, bells, construction and purchase sounds. There is no recorded music track.

## Saves

Versioned localStorage saves persist treasury, businesses, civic works, districts, discoveries, research, settings and city time. Records autosave every ten seconds and on commissions. Opening the game credits up to **four hours** of automatic dividends since the last save. Invalid saves recover to a fresh city; v1 data migrates to v2. Settings contains manual save and a confirmed new-game/reset flow. Saves are browser- and origin-specific. Browser storage must be enabled.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173
```

The economy suite covers spending, passive/manual accounting, automation, offline caps, invalid timestamps, migration, roundtrips, milestones, gates and reset. See `QA.md` for browser verification and known scope limits.

## Architecture

- `src/simulation/economy.ts`: serializable simulation, progression data and an injected persistence adapter. It has no Three.js or DOM dependency. Replace the storage adapter to integrate server persistence later.
- `src/world/assets.ts`: seeded modular modeling, generated textures and material-based static geometry batching.
- `src/world/citizens.ts`: original illustrated faces, cel-shaded procedural models, and articulated limbs with batched vertex-color materials. See `ART_DIRECTION.md` for the anime-inspired visual direction.
- `src/world/city.ts`: street layout, collision volumes, property visual states, construction, citizens and animated machinery.
- `src/world/atmosphere.ts`: centralized day/night, weather and pooled particle systems.
- `src/player/controller.ts`: pointer lock/fallback, bounded movement substeps, gravity, ramp heights, collisions and interaction raycasting.
- `src/audio/sound.ts`: synthesized audio buses and spatial machinery.
- `src/ui/interface.ts`: contextual property management and city ledger; UI reads the simulation, not the renderer.
- `src/main.ts`: bounded animation loop, system coordination, autosaving and opt-in developer hooks.

Static architecture is merged by shared material. Materials and primitive geometry are reused, gears are batched, particles use fixed buffers, citizen routes are inexpensive and rendering resolution is capped. Performance quality disables shadows and reduces particle count and pixel density.

## Developer inspection

Append `?dev=1` to expose `window.__TERRA__` in the browser console. This is a local QA surface, not a gameplay UI.

```js
__TERRA__.status()               // FPS, draw calls, position, economy
__TERRA__.view('market')         // spawn, street, scrap, boiler, market, square, roof, canal
__TERRA__.stage(3)               // set property/infrastructure visual test state
__TERRA__.economy.state.day = .5 // noon; 0 = midnight
__TERRA__.atmosphere.override = 'rain' // 'overcast', 'fog', or null for cycle
```

Developer saves are isolated from the ordinary game. The starting district is the most detailed area; expansion districts are compact explorable extensions. NPC life is route-based ambient choreography, not a full individual-needs simulation. Prestige, politics, supply-chain logistics and multiplayer are deliberately reserved for future development.
