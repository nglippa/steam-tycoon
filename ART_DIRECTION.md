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

## Painted light and scale — September 25, 2026

- **One lighting language.** `src/world/tone.ts` replaces per-material banding with a single hard terminator shared by world materials and citizens: a warm lit color and a colored (blue-violet) shadow color, keyed by weather, hour and prosperity in `atmosphere.ts`. Hemisphere light is neutral; all color comes from the keys. Never reintroduce gray shadows or metalness on painted materials.
- **Ink.** The ink pass draws silhouettes from depth jumps against the nearer surface (including against the sky) and creases, fading only past ~55–240 m.
- **Sky.** Saturated cerulean with flat-based anime cumulus whose lower band takes a colored shadow. Early prosperity adds a cool soot haze (never sepia); it clears by stage 4.
- **Color blocking.** Each business owns one wall paint (`facadePaints`): salvage ochre, civic navy, Finch teal, blackened foundry, tavern wine, ivory Exchange. Ivory stone trim sits on colored walls. Roads are a dark painted-sett mass; sidewalks are light.
- **Scale.** The clock tower is ~48 m (ivory shaft, navy clock stage, open pressure lantern, verdigris bell roof). The Great Main, a 1.7 m pressure artery on lattice pylons, crosses the street 14 m overhead from the municipal boiler. The backdrop is three planes: flat rooftops, the Pressure Spires, and Veyr's snow ridge.
- **Rooflines.** Residential blocks use steep street-facing gables in navy, terracotta or verdigris, with tall chimneys and turrets on alternate blocks.
- **Progression.** Pennant strings multiply along the spine (stage 2 → 4) and radiate from the clock at stage 4+; the clock lantern moves from a dim amber to aether cyan at Grand Terra.
- **Citizens.** Larger heads, anime eyes (iris gradient, highlights, heavy lash flick, blush), overhanging hair caps with pointed bangs and face-framing side locks, A-line coats for civic roles and chunkier boots.

## Character, life and depth — September 25, 2026 (second pass)

- **Characters** are built on the existing rig but no longer read as cylinders. Profiled torsos have a shoulder line, waist and hips. Legs have shaped thighs, calves and ankles and end in real boots. Hands are mittens with a thumb. Six clothing families change the silhouette: worker (rolled sleeves, canvas apron, tool belt), engineer (asymmetric coat, standing collar, coat tails, gloves, goggles), merchant (split vest, sash, skirt), guard (full coat, epaulettes, crest badge, peaked cap), resident (dress or coat) and courier (short jacket, satchel, cap). There are eight hairstyles, and the hair crown is a true hemisphere at the hairline so it never covers the eyes. Faces have seven states, including surprised.
- **Motion.** Walks lean and bob; idle figures shift weight. Coat tails, skirts and aprons swing from a waist pivot, and ponytails and long hair from a head pivot. Early Terra stoops (`setLifeConditions`). Walkers open umbrellas in rain. Reduced motion freezes secondary motion.
- **Motifs** (`art-kit.ts`): the split pressure ring, Finch's winged valve and the aether diamond, used on lamps, railings, the Great Main, pressure stations, the calliope and business signatures. Keep them selective.
- **Façades.** There are four window families (arch, civic, grid, rect) with projecting jambs, lintels and bracketed sills, plus glass that fakes a room behind it. Doorways have jambs and steps; cornices have brackets. Shops get 0.6 m projecting displays with interior shells, boarded while a property is derelict and stocked with its trade's goods as it levels up.
- **Life** lives in `Presentation`: staged workers gated by stage and time of day, partner conversations and walking paths. The Great Main has regulators, a catwalk, branch pipes and crews. There are also the calliope crowd, bench lunches, balconies, night drinkers at the tavern, the foundry ingot cart, the waterfront crane and barge, the salvage pulley and the clock swifts.
- **Street and variety pass.** Warm-stone loading bands frame a roughly 9 m dark carriageway. Verge trees follow prosperity: bare in iron wells, then leafy, then blossoming at Grand Terra. Every other lamp is dead in the Lowworks; crest banners arrive at stage 3. Each house gets one idea (oriel, jettied timber top, iron stair to a landing door, or rooftop cistern) plus a stoop. Characters come in slim, standard and sturdy builds, lean on walls, sit on stoops, and a friendly few wave at the player. Skyline planes use weighted horizon tinting (`tintSkyline`), not fog.

## Structural pass — September 26, 2026

- **Massing before decoration.** Residential families: tenement (a taller narrow unit with an overhanging timber attic, plus a rear shop), rowhouse (jetty, side dormers, triple flue), merchant house (corbelled corner turret, outside stair) and workshop house (sawtooth rear shed, rooftop cistern). All sit on an older stone ground storey. Set-back infill houses close every gap, with vaulted passages into lit service courts.
- **Businesses are two or three volumes:** a salvage lookout cantilevered on iron knees, an engaged copper pressure tower, Finch's narrow braced tower carrying a wider workroom, a foundry roof condenser and rear furnace hall, a jettied tavern with a timber turret, and the ribbed Exchange dome.
- **Compression → reveal:** the Market Bridge-house (a vaulted masonry span with rooms above) frames the clock, and the Foundry Lane pipe gantry precedes the boiler yard. The Great Main now rides on masonry regulator towers whose rooms wrap the pipe.
- **Characters:** the anime head profile (forward chin, 24-segment skull), separated back locks and crown tufts, hat-compatible hairstyles, the crested peaked cap, the engineer's crossed harness, flared cuffs and boot buckles.

## Massing, outer city and motion — September 26, 2026

- **Composed business bodies** (`architecture.businessBody`; `businessHeights` is the source of truth for heights). Every trade keeps a shared 4.4 m shopfront storey; above it:
  - Rook: an accumulated set of old shop, lean-to shed, salvage tower with hoist jib and cantilevered sorting room.
  - Boiler: a low control house before a horizontal boiler drum with catwalk, stack and engaged pressure tower.
  - Finch: stepped symmetric wings around a braced instrument tower with a pressure lift.
  - Foundry: a low sawtooth hall with furnace-glass teeth, a rear hall, one dominant exhaust and a crane.
  - Tavern: the jettied box with turret.
  - Exchange: a colonnaded base, pediment, open rotunda gallery, verdigris dome and restrained aether spire.
- **Outer city** (`architecture.archetype`, `buildOuterCity`): eight silhouettes (tenement, stacked house, tower house, roof workshop, sawtooth shed, merchant row, courtyard block, pressure house). They are placed in 3–6 building clusters with one taller anchor and gaps between clusters, and the height rhythm varies along the ring. The far skyline ring uses the same grammar in flat tinted planes. Boundary walls are low parapets.
- **Motion** (`citizen-life.ts`): gait is derived from real velocity, so routes that ease in and out produce start and stop transitions. Walks have a pelvis bob, hip and torso counter-rotation, knee lift, forward foot placement and a stabilized head. Idle weight holds on one leg, then shifts. Turns are led by the head. Tails and hair are damped springs. Personality parameters vary by role, and tempo varies per citizen. Conversations have irregular turn-taking, nods, tilts and gesture bursts. Valve, hammer, gauge and sweep loops follow reach-turn-release and raise-strike-recoil beats.
- **Signatures:** a pneumatic parcel line with firing capsules, the Finch pressure lift, and night lamp-moths.

## North star (user, September 26, 2026)

Anime steampunk, art-directed by **Messenger and Borderlands**: steampunk grime rendered with Borderlands/anime smoothness. Grime is graphic (inked soot shapes, painted stains, hard-edged color blocks), never noisy texture. Messenger is the primary reference for atmosphere and composition.

- **Ground floors differ by trade** (`architecture.shopfront`; `shopWindows` drives goods and boarding): Rook's half-raised yard shutter, the Boiler's louvred civic portal, Finch's continuous brass-mullioned glazing, the foundry's glowing loading mouth under an iron hood, the tavern's bow windows and the Exchange arcade. Awnings and sign boards are per trade.
- **Grime language** (`art-kit.soot`, `grimeSkirt`, `sootStreak`): jagged soot skirts at every façade foot and streaks from cornices. Opacity falls with prosperity.
- **Outer façades:** framed windows with sills and lintels, lit and dark room patterns, doors with steps and hoods, stone bases, merchant-row shopfronts with color-block awnings.
- **Planted walk:** a stance/swing foot cycle (62% stance). Stride rate is solved from speed and leg length, so the stance foot drifts only about 15% of body travel. Turning in place takes steps.

## Ink, palette and sky — September 26, 2026

- **Ink** (`ink-renderer.ts`): an 8-direction depth kernel plus interior lines where color blocks meet (luma edges, not on sky). Line weight is about 2.3 px near and 1 px far, modulated along the line. Sample positions wobble by stable screen-space noise, so edges read hand-drawn without flicker. Lines persist to about 320 m at reduced strength. Ink is a color-aware navy-grey, not black.
- **Palette:** one family (sage, slate, ivory, soft teal) with muted trade identities (ochre, slate blue, soft teal, charcoal slate, brick rose, ivory). Roofs are slate-teal, terracotta and verdigris. Shadow keys are lifted and near-neutral teal-grey (clear shade ≈ 0.74/0.82/0.86). Saturation is reserved for characters, signage, furnace and lamp glow, and progression.
- **Sky:** a turquoise top over a pale mint horizon. Clouds are torn flat fbm masses with hard ragged edges and one tone step (lit crown, shaded underside), plus high wisps. Dusk is not gated by daylight, so evenings turn peach and rose.

## High-key Terra — September 26, 2026

Messenger's lesson applied: lightness and cohesion come from value, not hue. The whole city now sits in a light key.
- **Lighter values:** ivory render, sage and grey-green paint, light slate-teal roofs, mid-grey road, and iron lifted to slate grey. The foundry is the darkest mass and is still mid-grey.
- **Soft light:** shadows sit only slightly below the lit tone (clear shade 0.80/0.88/0.89). Night uses teal-navy, not black.
- **Grit is painted, not dark** (`art-kit.paintedWear`, `rustStreak`): a two-tone wainscot band, irregular light and dark render patches that the ink pass outlines, rust runs from downpipes and soot skirts. All are stronger in the Lowworks and fade with prosperity.
- Saturated color is kept for characters, signage, glow and festival decoration. Measured cost of the wear layer: nothing measurable.

## Terrace, everyday layer, early vs late — September 26, 2026

- **Clock terrace** (`city.TERRACE`, `terraceRise`): a circle of six concentric 0.2 m steps rises 1.2 m to a paved plateau around the tower. It is walkable through `groundHeight` (steps stay under the controller's 0.38 m limit). NPCs, staged workers, lamps, the calliope and the planters are placed at terrace height.
- **Everyday layer** (`presentation.everyday`): meters, vents and posters at homes; span wires with laundry across the housing lane; trolley wires over the rails hung from span wires; posters on civic masonry. Doorsteps follow prosperity: a dented bucket and crate, then herbs, then flowers and hanging baskets.
- **Early vs late:** stage drives soot, dark patches, rust runs and exposed brick (all heavy in the Lowworks and gone by Grand Terra). Fresh light patches peak mid-recovery. Early paint is greyed; late paint is clean and bright.

## Direction reset — September 26, 2026 (supersedes the Messenger-pastel key)

**Art style: Borderlands 2/3/4. Uniqueness: Messenger. World: Thief: Deadly Shadows / Dishonored 2.** The reference board is `screenshots/references/reference-board.png`.

- **Hand-painted inked surfaces** (`assets.surface`): brick, plaster-over-brick with cracks and fallen patches (4 m tile), ashlar, cobbles, slate, corrugated sheet and planks. Each has inked construction lines, chipped light edges and grime at the foot. Painted walls (trade paints, housing, plaster) all carry the plaster map.
- **Enclosure:** every composed business gains inserted storeys jettied 1.15 m over the pavement on timber corbels (`architecture.businessLift`, `liftCrown`). The trade's crown (towers, dome, drum, stacks) is lifted on top unchanged. The tavern is 16 m, residential blocks 16–24 m and the gate rows 17–21 m. The street reads as a stone canyon.
- **Palette and light:** sandstone, umber, soot, slate and oxblood with verdigris accents. The sun is backlit and raking (ahead of the main view, about 28° up): the tall walls shade most of the street, light patches cross it, and the distance is bleached and hazy. Shadows are cool (clear shade 0.36/0.40/0.55). Night is near-black blue-violet with amber windows and lamp pools. Rain is wet grey.
- **Ink:** near-black, 3 px near to 1.2 px far, with the hand-drawn wobble kept (Messenger).
- **Sky:** Messenger's torn flat clouds on a dusty, sun-bleached blue.
- **Night:** hemisphere light 0.28 and sun 0.12 at night; the night sky is near black. Additive lamp pools and wall halos (`presentation.nightLights`), plus door sconces on every house. Windows glow harder.
- **Density:** wrought-iron balconies with scroll railings and brackets, painted protest slogans ("WHO OWNS THE STEAM?"), clutter pockets hugging walls with colliders, and additive sun shafts aligned to the sun ray, anchored in the sunlit half of each street (`presentation.density`, `setShafts`).
- **Characters:** Karnaca/Thief wardrobes (oxblood, umber, soot, grey-green, bone) and an inked cloth map on `coloredToon`: side seams, stitched hems, hatching, patches and hem grime.
- **Trees:** forked trunks with three limbs; many small faceted clumps with a darker drooping underside; inked foliage texture.
- **Detail density** (`presentation.ornament`): dentil cornices, gutters and downpipes on every eave; string courses; iron hanging signs on scroll brackets; a cable web across the main street at the upper storeys; instanced debris (paper, bottles, broken setts) at wall feet (three draws).
- **Faces:** inked cheek hatching, a nose shadow and face-contour lines on the atlas, deeper lip line, weathered skin tones.
- **Trees:** lumpy subdivided clumps (sphere pushed by low sine bumps), no hard facets.
- **Shafts:** stronger, but faded by eye distance (from 7 m to 20 m, and out beyond 70–110 m), so they sit in the middle distance and never wash the camera. Rain and overcast clouds are grey; only clear skies get cream clouds.
- **Hand-built clutter** (`art-kit`: `labeledCrate`, `stencilBarrel`, `stove`, `workbench`, `cafeTable`, `anvil`, `pipeStack`; `presentation.vignettes`): stencilled cargo (VEYR IRON, ORISON SALT, FRAGILE GLASS...), per-trade spill-out with colliders. Keep ledger stands (±9, the ledger z) clear.
- **Per-building carving** (`presentation.carving`): each house draws a seeded window hood (pediment, arch, cornice with consoles, or keystone), door surround (columns and pediment, voussoir arch, iron canopy, rusticated), corner (quoins or pilasters), crown (balustrade, gable with oculus, stepped parapet, clock gable) and a unique datestone.
- **Faces:** heavier lash, brow and mouth ink with larger pupils; the atlas is mipmapped with anisotropy so features hold at 10–15 m.
- **Line classes** (ink pass reads the render-target alpha): 1 = world (heavy line), 0.5 = people and movable objects (`thinLine`, `propMat`, `asProp`; about 38% line weight), 0 = printed text (no interior ink). The class is taken as the minimum over the kernel neighbours, so both sides of a silhouette agree. Buildings and fixed structures keep the heavy line.
- **Faces:** angular Borderlands structure. The skull vertices are reshaped after build: a V jaw tapering to the chin, a flattened front plane giving a cheekbone edge, UVs unchanged. Hair, skin and metal use `plainToon` (no cloth stitching). Share `wardrobeHook` and never copy a painted `onBeforeCompile`, or tone uniforms are declared twice.
- **Carving at Dishonored scale:** hoods, door surrounds, quoins and eave cornices about 1.5× deeper and taller.

## Dreary pass — September 27, 2026 (user: "too toyish, more serious and dreary")

- **Final grade** (ink pass, `setRecovery(stage)`): desaturation (50% of original saturation early, rising to 72% at Grand Terra); soot-warm tint on lit tones and cool blue in the shadows; soft highlight roll-off; lifted blue-black floor; heavy vignette. Prosperity returns some colour, never the candy palette.
- **Weather** is mostly overcast: the cycle is overcast, rain, fog, overcast, clear, rain. Haze is denser.
- **Smoke:** heavy dark soot plumes (size 7.5, opacity 0.38 falling with stage).
- **Palette:** muted trade paints, dark rust, copper and brass, dull leaves, soot-faded bunting only at stage 4+, no pink blossom. Wall grime never drops below 35% even at Grand Terra.
- **Hats** are turned (lathe) profiles with a band and a shaped visor or brim: guard kepi (flared flat crown, crest pin, pitched visor), newsboy cap for workers and couriers, bowler and top hat for merchants and some residents. Under any hat the fringe is clipped at the band and the hair crown tucked in.
- **Hair silhouettes:** side locks are tapered pointed strands (two per side), not slabs. The back mass wraps the whole rear skull to the nape.

## Liberation pivot: three visual languages (2026-09-29)

The existing dark industrial Terra is now the occupation layer over an ancient sky city. A frame should tell you whose hand made each thing.

- **Ordinance (occupation):** charcoal, black-green iron, oxblood and bone. Riveted boxes bolted onto older stone, stencil type, the Clamp emblem, harsh printed propaganda and a searchlight. It is ugly on purpose, but composed, with one large statement per place rather than clutter.
- **Embers (resistance):** chalk and ember-orange paint, turquoise signal glass and ribbons. It stays small and secret until liberation, when the same colours are flown openly.
- **Ancient Terra:** ivory stone, turquoise tile, gold and aether blue. It uses slender piers, a gently pointed ring, swept gold fins, a sun-medallion in the paving, and a flower-like fountain whose petals open. It keeps to a few clean silhouettes and saves the luminous effects for the restoration.

Economic prosperity washes soot and fills stalls, but it never removes the occupation. Liberation removes the Ordinance's objects from the same stones. Restoration is the only thing that makes the ancient layer glow.

## Two industries and the sky below (2026-09-30)

- **Occupation industry** is welded, braced, riveted and smoky: plates bolted on at angles, braces welding moving parts still, a flue shoved into something finer, an anvil strapped over ivory. It is loud, and everything in it is mechanically obvious.
- **Ancient industry** is a different philosophy, not cleaner steampunk: broken gold arcs that turn in the plane of the wall, negative space inside the frame, a gimballed core, and a table that levitates and aligns parts. It moves silently and slowly and has no visible drive.
- **The sky** is painted, not simulated: layered flat cloud banks below eye level, haze planes for depth, and distant isles in flat skyline materials. Keep silhouettes readable at range. A single inverted cone reads as an arrow, so floating isles hang lopsided clusters of rock roots.

## Body construction: torso, pelvis and legs (2026-09-30)

These rules come from figure-drawing and 3D-topology references (Love Life Drawing on the pelvis; Wikipedia on body proportions; AnimeOutline's full-body anime proportions; Blender Artists and TopologyGuides on hip topology). Apply them to every character.

- **Two rigid masses.** The ribcage and the pelvis are separate masses joined at the waist. The shirt or coat body ends at the belt. The pelvis is its own mesh in the trouser material: widest at the hip joints, set slightly back into a seat (forward pelvic tilt), and closing under into the crotch, so the legs leave from a V and not from the rim of a tube.
- **The legs hang from the pelvis.** Hip joints sit inside the pelvis, just above the crotch; the height's halfway line runs between the greater trochanters. Thighs are slimmer at the root, fullest in the upper-middle, and angle in so the knees sit closer than the hips.
- **Motion turns about the hips.** Lean, twist and sway rotate the upper body around the hip joint, never around the feet. A sideways weight shift moves the hips, and the legs tilt so the feet stay planted.
- **Proportion.** Terra's citizens are about 4 heads tall (big-head anime). At this scale legs to crotch are about 1.6 heads, and the shoulder-to-crotch torso is about 1 head. Do not stretch the legs to 6.5-head canon without restyling the head.

## The city responds (2026-09-30)

- **The Directorate's response** is one authored post, not a wanted level: a table, sawhorses in oxblood and bone, a stencil sign, a searchlight mast, a notice in the regime's own words, and a closed lane. The player should think "they noticed", not "the alarm went up".
- **Resistance stays human and improvised:** chalk on a waymark, a courier with a satchel, a crate carried by hand, a lookout at a corner. No red banners. When the Row is freed, the colours are Terra's own turquoise and ivory, strung as small bunting.
- **Ancient Terra is the connective tissue:** occupation infrastructure is bolted into it (a searchlight fed from an aether conduit, a Directorate plate over an ivory street name). Resistance acts reveal it a little at a time.

## People pass: faces, arms, hands (2026-09-30)

The rules come from the `figure-construction` skill (`~/.agents/skills/figure-construction`, built from Anime Outline, Disney shape language, Epic's socket docs and animation-principles sources).
- **Faces:** eight face types per skin tone, varying eyes (shape, tilt, lash weight, iris), brows (weight, arch, set), nose (dash, dot, hook, button), mouth width and marks (freckles, stubble, mole, under-eye bags, scar, laugh lines). The skull varies round, square or triangle independently. Keep one inking hand; variety comes from the features.
- **Hands:** small relaxed C-curl hands (palm, finger mass, thumb). Never flat paddles.
- **Held things:** every hand has a grip socket in the palm. Props are authored grip-first, with the handle through the fist. Two-handed loads (crates) sit between both palms against the body.
- **Arms:** the hanging arms angle away from the body. In a walk, the forearm drags behind the swing and the back swing arcs out past the hips. Raised arms go forward and out, never through the head.
