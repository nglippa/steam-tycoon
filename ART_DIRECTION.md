# Terra — anime art meets a steampunk world

The visual language applies to architecture, lighting, materials, skyline, citizens and movement. The reference is [Messenger by Abeto](https://messenger.abeto.co/): graphic silhouettes, restrained illustrated surfaces, expressive characters and playful motion. Terra adapts that direction into original steampunk geometry and local procedural artwork; no reference assets are bundled.

Copper, soot, cream and turquoise define the palette. Broad painted surfaces and subdued masonry marks replace photographic noise. Copper and brass read as matte painted enamel, with warm windows and aether accents kept distinct. A depth-based ink pass emphasizes close silhouettes and major structural creases, fading across distant geometry; stable, subtle paper grain avoids temporal flicker. Printed paper controls, irregular borders and a tall stacked title extend that language into the interface.

## Authored world families

- Terra's three-flue shield repeats on the gate, market masts, banners, municipal tanks and signs. The three-lantern fitting and numbered pressure gauge are recurring civic motifs.
- Façades have supported iron balconies, timber infill, rear service elevations, shutters, vents, asymmetric dormers and connected copper drainage. The six businesses have distinct upper silhouettes: salvage gantry, twin pressure tanks, Finch workshop tower, sawtooth foundry roofs, layered tavern gables and the Exchange pediment.
- One service bridge frames the market approach. A 12.6 m road, raised stone sidewalks, shallow rail channels and a few authored puddles define the street without narrowing its traversable corridors. Market stalls are staggered to preserve property-ledger access.
- Lowworks Gate has a curved iron structure, civic crests, plumbing and lamps. The boiler yard has a pressure manifold, gauge, maintenance deck and worker. The foundry has a furnace mouth, hot metal, hoist and sparks. The 32 m clock tower has four enlarged illuminated dials, an exposed mechanism and a swept copper-green cupola. The 10.7 m yard boiler, high maintenance deck and oversized exhaust dwarf its engineer; the foundry pairs a near-black mass with an orange furnace mouth and one dominant stack.
- Two simplified skyline layers use restrained roof clusters and an aqueduct; their heights and colors yield to the clock. Distant geometry avoids shadow casting.
- Environmental scenes include a cold meal by Finch's workshop, a ration notice and toy cart in the housing lane, a memorial, service signs and named market traders.

## Progression

Existing game progression drives these changes; no new economy or progression system was added.

- Repairs restore shop glass and align replacement windows to the original openings.
- Each business gains specific machinery, goods, signs or frontage details as its existing levels rise.
- The market expands from two stalls to six within reserved side pockets. Thin counter legs, hanging cloth and curved fabric roofs preserve open space beneath. One anchored lantern string, planted pockets and an armillary fountain support the clock vista.
- Business upgrades alter architecture: a salvage sorting clerestory, taller workshop tower, boiler manifold, foundry roof monitor, tavern terrace and open Exchange gallery. Roads retain the narrower lane; municipal lamps gain three-pronged fixtures and warm ground pools; steam repairs reduce leaks and light the clock structure.
- Citizens retain the illustrated faces, hair, goggles and articulated limbs. Worn patches and aprons give way to tailored panels, satchels and watch details as prosperity rises. Heights and proportions vary. Almond eyes, angular fringes, high collars, scarves and cross-body satchels give the citizens a shared graphic vocabulary. Boots meet the ground and shared flat contact shadows anchor their silhouettes without crowd shadow-map cost.

## Motion and atmosphere

The opening camera drifts over the city, then eases into the street on entry. Citizens have a restrained walking cadence, bent knees and elbows, subtle head turns and scarf movement. Continuous tapered body, sleeve and leg meshes replace stacked clothing blocks. Four painted face archetypes share three skin palettes; six hair silhouettes include a ponytail, bun, swept locks, messy bangs and two integrated cap styles. Small staged groups include a guard, talking pairs, and a merchant facing a customer. Both the device preference and in-game reduced-motion setting calm the camera and transitions, remove head bob and suppress the broken lamp’s flicker. Existing cloth and carts remain animated. Added loops show hammering, sweeping, reading, warming hands, a workshop drive and foundry hoist. Rain uses streaks, gutter runoff and small splash rings. The canal has geometric wave motion and drawn ripple highlights. Steam has multiple outlets; smoke remains industrial but diminishes with prosperity. The sky uses six broad authored cloud banks in two layers, with warm dusk and deep blue night colors. Location-based synthesized layers distinguish the foundry, market and housing from the boiler hum.

## Performance and scope

World art is built from local procedural assets; no remote asset service is required. Static additions are merged by material. Articulated citizens use material-based BatchedMesh submission, with their existing transforms driving each part. Street lighting uses four dynamic lights plus the foundry source, supported by emissive details. Shadow maps refresh periodically. Full quality caps pixel density at 1.5× and uses up to four samples in the ink render target; performance quality uses 1× and disables target multisampling while retaining outlines. Idle title screens and hidden pages render less often; active income still uses elapsed wall time.

This is original stylized procedural game art. Citizens still use lightweight ambient choreography, and decorative upper structures do not imply new climbable paths. The existing industrial ramp remains the accessible elevated route.

## Refinement discipline — September 2026

Composition comes before surface decoration. The clock is the first landmark, followed by the district boiler, foundry, gate and market center. Residential roofs stay lower and quieter. Broad cool green-gray street planes support cream, charcoal, rust and faded teal buildings; market fabrics carry richer wine and mustard accents. Repeated dormant flues, excess bridge braces, diagonal street cables, spare signs, generic cargo, rivets, vents and tiny ground marks were removed. Business rooflines carry one or two large ideas rather than a common roof plus interchangeable ornaments.

The explicit `?dev=1&review=1` review mode uses memory-only economy storage. Named views, property levels, time and weather produce repeatable comparisons; DOM diagnostics expose measured frame timing and optional real-controller traversal checks. It does not change the normal save.

## Anime-steampunk life and palette — September 2026

`src/world/palette.ts` defines semantic neutral, metal, warm, cool, sky, aether and wardrobe families. Roads now sit in cool slate/navy values against parchment/plaster and distinct iron, copper and brass. The paper HUD receives its primary colors from the same palette. Color restoration affects selected material families and clothing panels; it does not apply a global saturation filter. Brass becomes cleaner, housing paint lightens with housing investment, and warm street lighting remains gold even at maximum infrastructure. Cyan is reserved for aether and a few mechanical accents.

- Market: cream Exchange walls, burgundy/teal/mustard canvas, warm timber and curated merchant clothing.
- Foundry: blackened blue iron, rust, orange furnace and cream markings.
- Boiler and civic structures: dark blue-green reservoirs, copper connections, brass, pale stone and amber gauges.
- Housing: ivory tenements, dusty blue rowhouses and dusty rose balcony houses. Window states follow grouped facade patterns rather than independent randomness. Curtains, shutters, boarded/cracked panes, dark rooms, occasional silhouettes and laundry distinguish homes; housing investment restores damaged panes and adds flower boxes.

Citizens retain the existing population ceiling. Six archetype wardrobes distinguish workers, engineers, merchants, guards, residents and couriers; existing prosperity changes selected cloth colors through one shared shader. Three skin atlases provide four facial archetypes, each with neutral, happy, tired, focused, annoyed and blinking states. Face changes use the existing BatchedMesh instance color channel as an atlas index, keeping faces in three shared material batches.

Small scenes replace scattered walking: guard and courier; talking market pair; merchant and customer; engineer and worker; housing neighbors. Conversation partners alternate gestures. Gaze prioritizes partners/work targets, looks away, and allows only short staggered player glances within a few meters and within the actor's forward arc. Existing workers hammer, inspect a gauge, turn a valve, sweep, browse and read; existing route walkers haul crates or move more slowly in housing. Props and staged scenes remain clear of the six ledger approaches.

Clear skies use soft blue and a warm horizon, overcast uses blue-lavender, sunset adds peach/rose, and night combines midnight blue with teal haze and gold windows. The existing weather rotation now includes clear skies. There are no facial rigs, added currencies, district expansion, dialogue systems or additional population capacity.
