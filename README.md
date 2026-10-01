# CITY TYCOON

**Terra, in the world of Locke.** A locally playable first-person incremental city game built with TypeScript, Three.js and Vite. All architectural geometry, textures, citizens and sound are generated in the project. No asset CDN, account, cloud API or paid service is required.

## Play locally

```sh
cd ~/Projects/steam-tycoon
npm install
npm run dev -- --port 5174
```

Open **http://127.0.0.1:5174/** in Chrome, Edge, Safari or a modern WebGL2 browser. Click **Enter the Lowworks**. Chrome is recommended for captured mouse controls. An embedded browser that declines pointer lock automatically uses click-and-drag look.

- **WASD** walk; **mouse** look; **Shift** sprint; **Space** jump.
- **E** interact while aiming at a brass ledger or discovery plaque within reach.
- **Tab** opens the city ledger while exploring; inside menus, Tab moves between controls. **Esc** closes the ledger or releases the mouse and pauses movement. The on-screen City ledger button also opens it.
- **F3** shows frame rate and position. It starts disabled.

Begin at Rook & Son, on the left past the arrival arch. Inspect its ledger, collect the first reserve, mend the sorting rig, restore the municipal boiler and fund street lighting. The treasury earns passive dividends even before a foreman is hired.

## The city

Six physical properties each have five named commissions, production cycles, milestone multipliers and independently purchased foremen. On-site ledgers are the only place to upgrade properties; the city ledger provides navigation, civic works, district charters, research, statistics and settings.

Unstaffed businesses deposit 40% of their production directly and keep 60% for collection at the property, capped at 30 production cycles. Foremen deposit 100% automatically. Civic improvements, district charters, research and discoveries multiply actual production. Construction uses a six-second scaffold-and-worker sequence before the new architectural details are revealed. Income increases immediately when a commission is funded.

Prices are meant to be felt. Each property level costs 3.5 times the last and yields 1.45 times as much (levels 3 and 5 keep their milestone bonuses), so a masterwork takes minutes of income to repay. Civic works, charters, research and the liberation steps are priced against income, not against the opening minutes. Played well, the first liberation arrives at about half an hour and the current city is finished in about 45 minutes; the first upgrade is still affordable in ten seconds. Levels 3 and 5, charters and research are announced with their own fanfare, every level-5 business raises an aether crown over its roof, and a hired foreman keeps a lit desk beside the ledger.

Prosperity advances through **The Lowworks → Recovery → Industry → Commerce → Innovation → Grand Terra**. Individual property improvements add functioning windows, brass detailing, upper floors, copper roofs and aether machinery. Lighting, paving/transit, pressure mains, housing and gardens each have three civic levels. The canal and institute districts unlock through charters. Citizens, carts, banners, pipes, the clock landmark, steam, smoke, elevated railway and a distant airship populate the district.

## Beyond the showcase streets (Phase 4)

Three vaulted passages under the west housing row lead out to **the Weatherside**, a back lane between the yards and the ward wall, where Terra's edge is closest:

- **Tether Yard** (south): a bonded warehouse, a freight pier that runs out past the rim, a crane over the void and an Ordinance freighter moored at the pier head.
- **Weatherside** (middle): the Ordinance's Ward Registry, an old garden with a dry fountain and a forgotten statue, a walled-up archive, and the **Weathervane**, a 31-metre ivory tower that is the high place of the ward.
- **Old Waterworks** (north): the cistern, a sealed gate in the ward wall, a workers' shrine and an aqueduct whose channel can be walked from the cistern roof to the registry roof.

Below the street, **the Hangway** is a maintenance walk slung inside the cleft. It passes under Cinder Row, where nobody checks papers.

Ladders are climbed with **E** (or **USE** on a phone) at either end; a ladder is offered to anyone standing at its foot or head, wherever they are looking.

## Liberation (Phase 1: Market Square)

Terra is occupied. The Ordinance built its checkpoints, iron and propaganda over an older sky civilization. Market Square is the first place where the player can peel that back, and progress is shown in the street itself rather than in a menu.

- **Occupied:** a checkpoint gallery is bolted across the ancient Sael Gate, with regime banners on its piers. The Saelspring is caged under an Ordinance seal, the water channels are plated over, a soldier holds the boom and a patrol walks the beat. At night a searchlight sweeps the square.
- **Covert (3 steps):** the cellar door of the Copper Finch is the Embers' contact. It appears once the tavern reopens. Knocking buys quiet steps: a turquoise signal lamp and a lookout, defaced propaganda and couriers crossing the square, then tools under a tarp and ribbons on the lamps. The door refuses you while the patrol is watching.
- **Liberated:** the gallery, banners, boom, patrol and plates come off the same stones. Civic ivory-and-turquoise banners hang where the regime's did, and resistance members stand openly at the gate. +15% city income.
- **Restored:** the spring itself carries the last step. Once the water mains are clean (gardens level 1), civic engineers break the seal. The petals open, water fills the basin, and light runs from the spring along the channels, up the piers and around the arch. +10% city income.

Economic prosperity and control are separate. A rich, occupied square still has its checkpoint. Liberation needs Terra to reach Industry and the Foundry's cutters (see below), and the covert steps are gated by the Copper Finch and Bellweather Exchange levels.

## Liberation (Phase 2: Cinder No. 3, the Foundry)

The Foundry tells a different story from the square. The regime runs it as a coal foundry built into something older. Behind its furnace sits the **Armillary**, an ancient ivory frame with three gold rings that the Ordinance welded still. In front of the furnace, an ivory fabrication table serves as an anvil.

- **Occupied:** plates are bolted over the frame, braces weld the rings to the wall, and the furnace flue is driven into the core. An inspection booth and turnstile stand at the gate, along with a floodlight, a locked supply cage, a quota board and a requisition plate over the business sign. The overseer turns between the quota board and the outgoing stock.
- **Prosperous but occupied:** Foundry levels stack more output crates and raise the quota, and nothing else changes.
- **Covert (3 steps), at the shift board:** (1) a second count chalked under the quota, and stools behind the coal bunker. (2) A false-bottom crate among the stock; the packer only lifts the lid while the overseer faces away. (3) Bolt cutters and pressure keys racked under a tarp. The workers at the board talk when the overseer's back is turned and go back to their clipboards when he looks.
- **Liberated ("Down tools", needs Terra to reach Commerce):** the booth, turnstile, floodlight and half the plates come off. The cage stands open, the board becomes the works council's, and the workers hold the gate. +15% city income.
- **Restored ("Wake the Armillary", needs steam distribution level 2):** the furnace comes out of the wall. The rings turn silently, aether runs around the frame, and the table lifts the parts it was built to make. +10% city income.

**The network.** Foundry step 1 needs the Copper Finch to vouch (Market Square covert step 1). Market Square's liberation needs the Foundry's cutters (Foundry step 3), and once they are forged a crate of them appears at the Finch's cellar door.

## The city responds (Phase 3: Cinder Row)

Cinder Row is the street between the Foundry gate and the main street. Its story is made of the other districts' consequences, so walking between businesses is part of progression.

1. **The network.** Once the Copper Finch vouches (Market Square step 1) and the yard answers its shift board (Foundry step 1), the Steward chalks the Row's old ivory waymark. From then on a courier walks between the yard and the Finch cellar. A chalker works the waymark, and a lookout holds the corner.
2. **They noticed.** Once crates leave the yard light (Foundry step 2) and couriers use the Row, the Directorate of Labour reacts on its own. An inspection post appears mid-Row (a table, sawhorses, a searched worker, an inspector) with a "materials are missing" notice and a searchlight mast. A barrier closes the foundry-lane shortcut north. The inspector turns between the Row and his table. The courier waits while the inspector could see him, and the chalker stops and turns to the street.
3. **The cutters travel.** The Foundry's cutters no longer appear at the Finch by themselves. The Steward carries the crate from the yard to the Finch cellar. If the inspector sees it, it goes back to the yard with a whistle. The way through is to time the crossing for when he bends over his table, or to take the long way round. Market Square's liberation needs the crate delivered.
4. **Terra under the lamp.** Cutting the searchlight feed lifts the cable plates: the Directorate was running its lamp off an ancient aether conduit, still faintly alight. A dark night also shortens the inspector's reach.
5. **The Lantern Way.** With the square and the yard both free, the post comes down. The table becomes a stall, the sawhorses a bench, bunting goes up, the ivory street plate returns, and the conduit lights from end to end. +15% city income.

Looking east along the Row, another floating isle hangs over the Canal Ward gate.

**Pattern for future districts.** `cityFacts()` in `economy.ts` derives cross-location facts (network, courier run, inspection, cutters waiting or delivered, searchlight cut, Row free) from saved site progress. Layers show them with `when.fact(...)`. `inView()` in `patrol.ts` is the shared "occupation eyes" test for any observer. A site step marked `carried` completes by physical delivery (`Economy.deliver`) and cannot be bought.

## The Ration Line (Phase 4: a second route through the same pattern)

Between the Boiler yard and Cinder No. 3, the Directorate meters the Boiler's pressure into the Foundry through a caged valve fixed at forty per cent. An older copper main runs beneath it, under iron plates.

1. **Learn the knock** (needs the Boiler restored and the yard's shift board answered). The stokers talk to the yard by tapping the main, and they chalk the true count under the gauge.
2. **They noticed.** Once the yard runs covert work (Foundry step 2), pressure goes missing. A valve warden is posted with a logbook, the valve gets a second seal, and a "pressure theft is sabotage" notice goes up. The warden turns between the gauge, the yard, his logbook and the Boiler yard. The knocking stoker stops while the warden could see him.
3. **Carry a pressure key.** The yard forged pressure keys alongside the cutters. The Steward carries one past the warden to a socket in the valve the Directorate never used. If he sees it, it goes back to the yard. You only have one pair of hands: the cutters and the key can't be carried together.
4. **Open the old main.** The Directorate's gauge still reads forty per cent, but the yard now gets all of it through ancient Terra. **Waking the Armillary now needs this**, because it "wants steady pressure, not coal".
5. **Break the ration** (the yard free, the Boiler at level 3). The valve is chained open and the station becomes the stokers', with a brazier shared by both yards and the old plate *The Breathing Main*.

The same pieces carry both routes. `cityFacts()` and `when.fact()` hold the rules. `Attention` (in `patrol.ts`) is an observer's authored gaze schedule, and `inView()` is its eyes. `Consignment` (in `logistics.ts`) is goods carried by hand, one at a time. Printed plates share one texture sheet (`signs` in `factions.ts`).

## Terra's edge

Behind the arrival gate the ward ends at a cliff. An ivory terrace juts past it. From its balustrade you can see a spillway pouring off into nothing, ancient ribs curving under the rim, a lesser isle hung on chains far below, a sister isle on the horizon, swifts on the updraft, and the cloud sea with Locke showing through. The sky, cloud sea and fall follow the day/night key and the weather.

**The sky canal.** The Lowworks "canal" is a cleft through the plate: from the bridge you look straight down past the city's ribs to the cloud sea and Locke's fields. Steam carriers (planked decks on brass lift-pods, turbine fans, a stack trailing steam) shuttle its length, out through the north rim into open sky and back under the bridge. Behind the housing lane the west rim opens to a balustrade over the clouds, and the north end of the cleft frames the sky between the outer ward's buildings.

**The undercroft lift.** A brass cage beside the arrival terrace (the call box reads *Ride down*) drops about a hundred metres down the cliff to a gallery hung on chains beneath the plate. From there you see Terra's underside (hanging rock, ivory ribs, regime pipes, an aether vent) with the chained isle and the cloud sea at eye level.

The industrial ramp in the western alley reaches a six-metre-high overlook. Three discoverable plaques/objects offer original Locke lore, a small reward and persistent output bonuses.

The world has a 12-minute day/night cycle and rotating drizzle, overcast and industrial fog. Original Web Audio synthesis supplies rain/steam ambience, positional machinery, steps, bells, construction and purchase sounds. There is no recorded music track.

## Saves

Versioned localStorage saves persist treasury, businesses, civic works, districts, discoveries, research, site liberation, settings and city time. Records autosave every ten seconds and on commissions. Opening the game credits **a tenth of the city's income for up to four hours** away: a welcome home, not the main engine. A browser tab left suspended for more than five minutes is paid the same way. Invalid saves recover to a fresh city. v1 and v2 data migrate to v3, with every site starting occupied. Settings contains manual save and a confirmed new-game/reset flow. Saves are browser- and origin-specific. Browser storage must be enabled.

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
- `src/world/architecture.ts`: façade families, business crowns and layered skyline.
- `src/world/presentation.ts`: authored landmarks, street scenes, micro-activities and visual progression.
- `src/world/layers.ts`: `LayeredSite`. A location authors each stratum (ancient, occupation, economic condition, covert, liberated, restored) once, and saved state decides which strata stand. Static strata are baked; animated ones are not.
- `src/world/factions.ts`: the three visual languages (Ordinance, Embers, ancient Terra), with emblems, printed cloth and posters, and the travelling water/aether material.
- `src/world/market-square.ts`: the Market Square slice. It covers the Saelspring, the Sael Gate, the checkpoint, the cellar and the restoration circuit.
- `src/world/foundry-works.ts`: the Foundry slice. It covers the Armillary, the fabrication table, the overseer's gaze, covert packing and the wake.
- `src/world/cinder-row.ts`: the connecting street. It covers the courier, the inspection post and its inspector, the carried cutters, the searchlight over the ancient conduit, and the liberated Lantern Way.
- `src/world/ration-line.ts`: the Boiler–Foundry route. It covers the ration valve, the warden, the knocking stoker, the pressure key and the old main.
- `src/world/logistics.ts`: `Consignment`, goods the Steward carries by hand between districts.
- `src/world/terra-edge.ts`: the south edge, with the cliff plate, arrival terrace, spillway fall, ribs, hanging isles and swifts. The cloud sea and horizon live in `weather-art.ts`.
- `src/world/patrol.ts`: one lightweight patrol that walks, notices, investigates, searches and returns, using a vision cone and collider line of sight.
- `src/world/art-kit.ts`: Terra crests, gauges, pipework, roofs and canopies.
- `src/world/weather-art.ts`: illustrated sky, canal ripples, runoff, splashes and sparks.
- `src/world/crowd-batch.ts`: shared draw submission for articulated citizens.
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
__TERRA__.site(4)                // Market Square control: 0 occupied, 1-3 covert, 4 liberated, 5 restored
__TERRA__.wake()                 // replay the Saelspring restoration (site 5 only)
__TERRA__.view('marketSquare')   // also saelGate, cellar, spring
__TERRA__.site(3, 'foundry')     // Foundry control, same ladder; &foundry=n in the URL
__TERRA__.wake('foundry')        // replay the Armillary waking (site 5 only)
__TERRA__.view('foundryYard')    // also shiftBoard, forge, edge, arrival
__TERRA__.site(1, 'row')         // Cinder Row: 0 occupied, 1 courier run, 2 cutters delivered, 3 searchlight cut, 4 free; &row=n
__TERRA__.carry('gauge.key')     // shoulder a waiting consignment ('row.crate' by default)
__TERRA__.site(2, 'gauge')       // the Ration Line; &gauge=n; views gauge, gaugeValve, gaugeYard
__TERRA__.view('rowPost')        // also row, rowLane, rowMast, rowSky
__TERRA__.view('chasm')          // also bridge, bridgeSouth, cleft, westEdge, liftTop, gallery, galleryOut
```

Developer saves are isolated from the ordinary game. The starting district is the most detailed area; expansion districts are compact explorable extensions. NPC life is route-based ambient choreography, not a full individual-needs simulation. Prestige, politics, supply-chain logistics and multiplayer are deliberately reserved for future development.

## Mobile and deployment

On touch devices (coarse pointer) the game skips pointer lock. The left side of the screen is a floating joystick (push to the rim to sprint) and the right side drags the view. Buttons provide USE (enabled when aiming at a ledger or plaque), JUMP, LEDGER and pause. A fresh game on a phone starts on the performance renderer, at 1–1.25× pixel density. Code: `src/player/touch.ts`.

Deployed to Vercel project `steam-tycoon` (https://steam-tycoon.vercel.app) with `vercel deploy --prod`. `.vercelignore` keeps screenshots and local tool folders out of the upload.
