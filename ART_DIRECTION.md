# Terra — Art Direction

**This is the only authoritative art direction for Terra.** It describes the target, not the current build. Where the code, older screenshots, `QA.md` or `ART_DIRECTION_HISTORY.md` disagree with this document, this document wins. The history file is an archive of past passes and is **non-authoritative**.

Last consolidated: 2026-09-28. Reference board: `screenshots/references/reference-board.png`. Reference images guide study only. No reference asset is ever bundled, traced or copied.

---

## 1. Vision

Terra is **anime character design × Borderlands graphic rendering × Dishonored/Thief world atmosphere**, in its own fantasy-steampunk civilization: Terra, in the world of Locke.

The references have **different jobs** (§2). Do not blend them into an average.

The city's physical condition tells the game's story. The emotional arc is:

**Oppression → Recovery → Confidence → Prosperity → Wonder**

Dreariness is Terra's **starting condition, never its identity**. The Lowworks is surviving; Grand Terra is thriving. The player restores one old industrial city until it becomes magnificent, and its industrial history stays visible throughout. Terra must win, and the player must be able to see that they won.

Standing constraints:
- All art is generated procedurally in the project. No asset CDN or remote service is used.
- Visual progression is gameplay feedback in an idle tycoon, so it must be obvious rather than subtle (§10).

## 2. Reference hierarchy

| Reference | Job | Takes from it | Does **not** take |
|---|---|---|---|
| **Borderlands** (2/3/4) | Rendering language + confident colour | Bold ink, hand-drawn imperfection, painted surfaces, confident colour, strong material separation, hard graphic value shapes, selective exaggerated saturation, readable silhouettes | Neon cyberpunk; global cyan/magenta/acid green; emissive neon as a default lighting mode |
| **Dishonored 2 / Thief: Deadly Shadows** | World mood + architecture + industrial atmosphere | Enclosure, narrow streets, verticality, architectural drama, industrial oppression, raking light, warm light against cool shadow, soot, atmosphere, environmental storytelling, machinery built into the city, danger, mystery, night mood | Universal desaturation, permanently grey skies, muddy midtones, monochrome scenes, identical grime at every stage, Dishonored faces |
| **Anime** | People + expression + character silhouette | Faces, eyes, hair, expression, pose language, elongated stylised bodies | Chibi proportions, toy scale |
| **Messenger** | Clarity + restraint + graphic discipline | Clean shape language, readable planes, authored simplicity, selective detail, graphic clouds, visual hierarchy, knowing when *not* to add detail | Its world, palette or pastel high key. Messenger is not a visual-style target. |
| **Locke / Terra** | The actual identity | Its own civilization, history, motifs and machinery (`WORLD.md`) | Anything that would make Terra read as a copy of any reference |

**More detail is not better art.** When a reference seems to ask for more, Messenger's discipline decides what is kept.

## 3. Rendering language

- **Ink.** Lines are bold, near-black and colour-aware (a deep navy/umber ink, never pure black or grey). They carry stable hand-drawn wobble with no temporal flicker. Silhouettes and major creases are heaviest and thin with distance. Interior lines appear where colour blocks meet. The ink pass is a screen-space post pass (`src/world/ink-renderer.ts`).
- **Line classes.**
  - World architecture: heavy.
  - Characters: a clearly inked outer silhouette at every gameplay distance, with lighter interior lines.
  - Printed text: no interior ink.
- **Painted surfaces.** Materials are hand-painted procedural maps: brick, plaster over brick, ashlar, slate, planks, corrugated sheet, setts. Each has inked construction lines and chipped edges. Grime on them is **graphic**: hard-edged soot shapes, painted stains and runs, never photographic noise.
- **Shading.** One lighting language (`src/world/tone.ts`) is shared by world and characters. It uses a hard painted terminator between a warm lit side and a coloured cool shadow side. Shadows are never neutral grey, and painted materials have no PBR metalness sheen.
- **Value shapes.** Big, hard light and shadow shapes do the compositional work: sun patches across a shaded street, one lit wall against a dark one.
- **Final grade.** The grade may add a stage-dependent colour treatment (§10). It must never:
  - apply one global saturation cap across all stages;
  - lift blacks into a grey haze;
  - compress highlights until clear light looks overcast;
  - use a heavy global vignette.

  Atmosphere adds depth; it never erases it.

## 4. Palette

Colour is a material or role, never an individual prop. `src/world/palette.ts` is the palette's code home and must follow this section.

**Confident colour.** A teal building is actually teal, and burgundy is actually burgundy. Copper reads as copper and brass as brass. Painted wood carries real pigment. Warm light feels warm and blue-violet shadow feels cool. Terra never collapses into grey-beige because it is industrial.

**Base families.**
- **Masonry:** sandstone, ochre ashlar, red-brown brick, ivory render.
- **Metals:** blackened iron, copper, brass, verdigris.
- **Roofs:** slate-teal, terracotta, verdigris copper.
- **Wood:** umber and painted timber.
- **Cloth:** oxblood, mustard, teal, navy, bone.
- **Light:** amber lamp, orange furnace.
- **Aether cyan:** reserved, rare, and increasingly present with progression.

**Trade identities.** Each business owns one wall paint that is recognisable at every stage:

| Business | Wall paint |
|---|---|
| Rook & Son (salvage) | Ochre |
| Municipal boiler | Civic navy |
| Finch | Teal |
| Foundry | Blackened iron |
| Tavern | Wine/burgundy |
| Bellweather Exchange | Ivory |

**Material states, not saturation sliders.** Progression changes the *material*, not just a number:

| Lowworks | Grand Terra |
|---|---|
| Faded, chalky teal | Repainted teal |
| Dirty burgundy | Rich burgundy |
| Tarnished, green-brown brass | Maintained, polished brass |
| Oxidised, streaked copper | Clean copper with a deliberate verdigris patina on roofs |
| Soot-black render | Cleaned render |
| Dead planter, bare tree in an iron well | Healthy greenery and blossom |
| Boarded, cracked or dark glass | Lit, clean glass |

**Saturation budget.** Even the Lowworks keeps each family's hue identity; it is never greyscale. The most saturated colour at any stage goes to:
- characters' accent cloth, signage and banners;
- furnace, lamp and window glow;
- aether;
- trade paint (from mid-Terra onwards).

**Neon is an anti-target** (§13).

## 5. Lighting

- **Warm key against cool shadow** is the core relationship in every daylight weather.
  - Clear sun is warm gold. Shade is blue-violet.
  - Overcast and rain soften the split but keep a warm/cool difference.
- **Clear daylight must read as clear daylight.** That means a blue sky, sunlit surfaces that are genuinely bright, hard cast shadows and readable highlights. Clear weather must never look overcast.
- **Raking light:**
  - a low or backlit sun down the canyon streets;
  - sun patches crossing the street;
  - light shafts held in the middle distance, never washing the camera.
- **Controlled lows.** Deep shadow is dark and coloured, not lifted grey. Midtones stay separated.
- **Atmospheric depth.** Haze bleaches and cools distance to layer the skyline. It never flattens the foreground.
- **Civic light as progression.**
  - Lamps: every other lamp is dead in the Lowworks; all lamps work, warm and strong, by Grand Terra.
  - Windows and signs: few lit windows and dim signs early; many warm windows, lit signage and illuminated civic landmarks late.
  - Clock lantern: amber moving to aether cyan at Grand Terra.

## 6. Characters

**Target: elongated stylised anime.** Characters are Terra's own recognisable style. They are neither chibi nor Dishonored people.

**Proportion.** Aim for about **1:6 to 1:6.5 head-to-body**. This is an art target, not a rigid ratio.
- Long legs and arms.
- Narrow, tapered torsos with readable shoulders and a defined waist and hips.
- Expressive, larger hands.
- Strong, grounded boots.
- Longer face shapes.

**Anime identity** stays obvious in:
- **Face:** longer face with a tapered jaw.
- **Eyes:** stylised anime eyes that stay **open and readable at gameplay distance** (about 8–15 m). They must never collapse into closed lines except for an intended blink or expression.
- **Hair:** graphic shapes: pointed locks, bangs, strong silhouettes.
- **Expression and pose language.**

**Dishonored may influence** elongation, silhouette exaggeration and clothing shape (long coats, high collars, tall boots). It must not influence facial identity.

**Silhouette by role.** Each role reads from its outline alone:

| Role | Silhouette |
|---|---|
| Worker | Rolled sleeves, apron, tool belt |
| Engineer | Asymmetric coat, goggles, harness |
| Merchant | Vest and sash, bowler or top hat |
| Guard | Long coat, epaulettes, kepi |
| Resident | Dress or coat |
| Courier | Short jacket, satchel, cap |

Builds vary between slim, standard and sturdy.

**Hats** are proportionate to the head. They are an accent, never the dominant mass of the figure: brim no wider than the shoulders, crown well under the head's height.

**Colour arc.** Clothing follows the city's arc:
- **Lowworks:** worn, patched and dulled dye.
- **Grand Terra:** tailored panels, clean dye, satchels, watches, brass fittings.

**Readability.** Characters must be readable in every weather and at night (§11). An inked silhouette and face must hold against any background.

## 7. Architecture

- **Enclosure and verticality.** Streets are stone canyons.
  - Buildings stand 16–24 m on narrow frontages, over older stone ground storeys.
  - Upper storeys jetty over the pavement on corbels.
  - Cables and bridges cross overhead.
- **Landmark hierarchy** (fixed order):
  1. The clock tower
  2. The district boiler and Great Main
  3. The foundry
  4. The gate
  5. The market centre

  Residential roofs stay quieter than all of them.
- **One or two big ideas per building.** Each business has a distinct composed body; `architecture.businessHeights` is the source of truth for heights:

  | Business | Composed body |
  |---|---|
  | Rook & Son | Salvage tower and hoist |
  | Municipal boiler | Horizontal drum and pressure tower |
  | Finch | Braced instrument tower |
  | Foundry | Sawtooth hall and dominant stack |
  | Tavern | Jettied box with turret |
  | Bellweather Exchange | Colonnade and verdigris dome |

  Houses get one idea each (oriel, jetty, outside stair or cistern). There are no interchangeable ornament kits.
- **Trade ground floors differ.** Each shopfront, awning and sign is specific to its trade.
- **Compression then reveal.** Bridge-houses and gantries frame the landmarks behind them. The clock vista is the city's primary reveal.
- **Skyline.** Layered planes show outer clusters, the Pressure Spires and Veyr's ridge, all in the same architectural grammar. The skyline stays below the clock's dominance.
- **Gameplay constraints override art.** Six ledger approaches stay clear. Walkable corridors, collision layout and the one accessible elevated route (the industrial ramp) remain intact. Decorative upper structures never imply climbable paths.

## 8. Steampunk systems

Machinery is part of civic life, not decoration.
- **Pressure** is Terra's circulatory system. The Great Main crosses the street overhead from the municipal boiler, carried on regulator towers with branch pipes and crews. Steam releases in periodic bursts.
- **Industry:**
  - The foundry furnace glows orange.
  - The boiler hums.
  - Smoke and soot come from real sources (stacks, furnace), never from the air in general.
- **Aether** is induced through copper and crystal and supplements steam; it never replaces it. It is rare cyan in the Lowworks and grows into selective accents at Grand Terra: the clock lantern, the Exchange spire, lamp fittings and the parcel line. Aether is never a general wash of colour.
- **Civic motifs:**
  - Terra's three-flue shield
  - The split pressure ring
  - Finch's winged valve
  - The aether diamond
  - The three-lantern fitting
  - The numbered pressure gauge

  Use them selectively on civic and trade objects. A motif repeated everywhere loses its meaning.

## 9. Environmental storytelling

Every added prop must say something about Terra's condition.
- **Lowworks:**
  - protest slogans ("WHO OWNS THE STEAM?");
  - ration and receipts notices;
  - boarded shops;
  - dead lamps;
  - dented buckets and crates on doorsteps;
  - clutter pockets against walls.
- **Recovery onward:**
  - repaired glass;
  - stocked shop displays;
  - herbs, then flowers, then hanging baskets on doorsteps;
  - banners;
  - more staged citizens at work and at leisure.
- **Named places and goods:** stencilled cargo (VEYR IRON, ORISON SALT), named traders, datestones and plaques.
- **Staged life:** conversations, work loops, bench lunches, night drinkers. The number and mood of people track prosperity.
- **Placement:** props hug walls, carry colliders and never block ledger approaches.

## 10. Prosperity progression

Progression changes the **whole environmental condition**. More bunting, more props or fewer soot decals are not enough on their own. A side-by-side screenshot of the Lowworks and Grand Terra from the same view must need no explanation.

The four conceptual stages map onto the six game eras:

| | **Lowworks** (Lowworks) | **Recovery** (Recovery, Industry) | **Prosperity** (Commerce, Innovation) | **Grand Terra** |
|---|---|---|---|---|
| Emotion | Oppression | Recovery | Confidence | Prosperity → Wonder |
| Colour | Restrained, cool, desaturated, but every hue still identifiable | Pigment returns on repaired surfaces | Strong, intentional colour | The full authored palette |
| Paint | Faded, chalky, flaking | Patches of fresh paint | Repainted trades | Rich, clean paint everywhere that is maintained |
| Metals | Tarnished brass, streaked copper, rust | Cleaner | Polished | Maintained brass, copper and deliberate patina |
| Grime | High: soot skirts, streaks, stains, exposed brick | Reduced | Low | Selective historical grime only (§12) |
| Vegetation | Bare trees, dead planters | Leafing | Healthy | Healthy greenery and blossom |
| Light | Weak, dead lamps, few windows | More working lamps | Strong civic light | Many warm windows, lit landmarks, selective aether |
| Air | Soot haze, heavy smoke | Thinning | Clear | Clean, bright air; smoke only at active industry |
| Mids and values | Darker, compressed | Opening | Brighter mids | Brighter mids, crisp warm/cool light |
| Life | Few, stooped, worn clothes | More activity | Busy trade | Socially active, festive, well dressed |

The "Prosperity" column covers two game eras (Commerce, Innovation), as the "Recovery" column does (Recovery, Industry). Interpolate between them; don't hold one flat look for both.

**Grand Terra must feel prosperous, clean, warm, colourful, technologically impressive, socially active and beautiful.** It must never feel sterile, like a white-marble utopia, like neon cyberpunk or like a generic fantasy kingdom.

## 11. Night and weather

**Night: dark but readable.** Thief sets the mood; night is never uniformly black.
- **Compose from pools of light:**
  - street lamps;
  - shop windows and the tavern;
  - the foundry furnace and boiler glow;
  - occasional upper windows;
  - selective civic lighting.
- **Fill:** a cool moon and sky fill keeps silhouettes and roofline shapes legible.
- **Characters stay readable at night.** They show an inked silhouette and a face that reads under lamps and against the sky. Pale, ghost-like figures are a rendering defect.
- **Progression:** night becomes warmer and brighter with prosperity through more working lamps and lit windows.

**Weather:**
- Overcast, rain and fog are legitimate moods. Each keeps a warm/cool difference and never becomes grey mush.
- Clear weather is fully clear (§5).
- Rain reads as wet: darker ground, reflections of lamp colour, runoff.
- The share of heavy soot-haze and smog days falls as industry is cleaned up. Grand Terra is not trapped under a permanent grey sky.
- Clouds are graphic: torn flat masses with one tone step. Only clear skies get warm cream clouds; storm clouds are grey.

## 12. Detail and restraint

Messenger's discipline governs density.
- **Composition before decoration.** Silhouette, value and landmark hierarchy come first.
- **Concentrate detail.** Put it at eye level, at entrances and ledgers, and on landmarks. Leave calm planes between those clusters.
- **Ground supports the scene; it never competes** with characters, architecture or landmarks.
  - Use larger setts and grouped shapes rather than hundreds of individually inked cobbles.
  - Keep ground contrast lower than walls.
  - Reduce the ground's interior ink with distance.
  - Prefer broad value masses.
- **Grime communicates condition. It is not a permanent overlay.**
  - There is no hard minimum grime level at maximum prosperity.
  - Grand Terra may keep soot near active industry, weathering on old masonry, patina on copper and localised dirt.
  - Maintained civic and commercial surfaces become visibly **clean**.
- **Remove detail that doesn't read.** Anything invisible at gameplay distance, or repeated without a reason, gets cut.

## 13. Anti-targets

Terra must never become:
- **Neon cyberpunk.** No global cyan, magenta, acid green or emissive neon flooding.
- **Grey-beige industrial mush.** No universal desaturation, muddy midtones or monochrome scenes.
- **Permanently dreary.** No grey skies at every stage, no fixed grime floor, no saturation cap at Grand Terra.
- **Chibi.** No oversized heads, compressed bodies, toy proportions, giant hats or closed-line eyes at distance.
- **Dishonored faces.** Faces are anime.
- **Messenger pastel.** No washed-out high key.
- **Noisy.** No texture noise, photographic grime or ground that outshouts the scene.
- **Sterile.** Grand Terra is not white marble or a generic fantasy kingdom, and its industry is never erased.
- **Flattened by the grade.** No lifted grey blacks, compressed highlights, heavy vignette or atmospheric wash over the foreground.
- **Copied.** No bundled, traced or copied reference assets.

## 14. Validation

Judge the rendered game, not the code. Use review mode, which runs on memory-only storage and doesn't touch saves:

```
/?dev=1&review=1&clean=1&view=<view>&level=<0-5>&weather=<clear|overcast|rain|fog>&day=<0-1>
```

Views include `spawn`, `street`, `square`, `market`, `clock`, `conversation`, `citizens`, `housing`, `foundry`, `boilerYard`, `gate`, `canal`, `roof` and `overview`.

`level` sets every property to that level, which is **not** the same as the prosperity era: levels 0–5 land on eras 0, 0, 2, 4, 5, 5. To review a specific era, call `__TERRA__.era(n)` in the console (dev mode only); it returns the era the economy actually reached.

The spec passes only when all of these hold:
1. **Terra wins.** `street`, `square` and `overview` at `level=0` next to `level=5`, same weather and time. The difference needs no explanation: colour, cleanliness, light, vegetation and life have all changed, not only the props.
2. **Lowworks keeps colour.** At `level=0`, every trade paint is still identifiable by hue. A greyscale conversion is not an acceptable approximation of the frame.
3. **Clear daylight is clear.** `square`, `level=5`, `weather=clear`, `day≈0.45`: blue sky, bright sunlit planes, and sampled shadows that are blue-violet rather than grey. It must not read as overcast.
4. **Warm key, cool shadow** is visible in every daylight weather.
5. **Night is dark but readable.** `housing` and `square`, `day≈0.9`, rain and clear: composed from light pools, characters inked and readable, no ghost figures, no uniform black.
6. **Characters.** `conversation` and `citizens`: roughly 1:6–1:6.5 proportions, anime faces with eyes open and readable at 8–15 m, each role identifiable from silhouette alone, hats proportionate.
7. **Ground is quiet.** `street` and `conversation`: close ground doesn't draw the eye before characters or architecture.
8. **Hierarchy.** `overview` and `street`: the clock reads first, then the boiler and Great Main, the foundry, the gate and the market. Residential roofs stay quieter.
9. **Grime tracks condition.** `level=0` → `5`: grime falls steadily, and maintained surfaces at `level=5` are clean.
10. **Gameplay intact.** The review traversal and ledger checks (`&check`) pass at levels 0 and 5. Performance stays within the budget recorded in `QA.md`.

### Known gaps between the current build and this spec (as of 2026-09-28, after pass 19)

These are known deviations to fix. They are not rules. Evidence: `screenshots/review-2026-09-28-pass19/`.
- **Characters.** Proportions are now about 1:6 and eyes read as open, but the construction is still stiff and doll-like next to the painted city. Shoulders are blocky, hands are mittens, and faces are small, simple painted planes that carry little expression at gameplay distance. Hair is serviceable rather than graphic anime.
- **Lowworks mood.** Clear and overcast Lowworks days look almost the same. The Lowworks reads grey and flat rather than oppressive, and night along the main street lacks a strong dark–light–dark rhythm of lamp pools.
- **Innovation → Grand Terra.** Stage 5 is warmer, greener and cleaner than stage 4, but the step is mostly colour and light. There is no memorable "wonder" beat yet (aether landmarks, civic illumination).
- **Wet weather.** Rain is darker and cooler, but surfaces don't read as wet: the painted shading ignores specular, so there are no reflections.
- **Composition.** In street-level views the road still fills the lower third of the frame. It is quieter now, but it's a large mass.
