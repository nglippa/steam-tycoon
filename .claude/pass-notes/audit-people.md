# Terra people audit: construction, variation, animation, batching

Read-only audit of worktree `presentation` @ `70f73c4`. All paths are relative to `/Users/nicholaslippa/city-tycoon/.claude/worktrees/presentation/`.

Triangle, mesh and node counts come from building `citizen()` in Node, with `document`/canvas stubbed (script: `scratchpad/pres/measure.mts`; 24 seeds per role). Variation figures come from `scratchpad/pres/combos.mjs`. No server or browser was started, and no repository file was changed.

---

## 1. Module map

| File | Key symbols (line) | Responsibility | Lines |
|---|---|---|---|
| `src/world/citizens.ts` | `ramp`/`toon` 8-10; `clothMap` 19-27; `coloredToon` + `wardrobeHook` 28-37; `plainToon` 39-40; `setCitizenProsperity` 41; `outfitMaterial` 43; `LOOK` 45-49; `Expression` 50; `TALK` 51; `tailored` 54-60; `panel` 61; `bakeCharacter` 62-72; `FACE_TYPES/FACE_COLS`, `faceTypes` 78-90; `paintEye` 96-132; `BROW`/`paintBrow` 135-140; `paintMouth` 142-151; `paintFace` 152-172; `faceAtlas` 173-183; `FACE_MAP` shader 186-188; `faceMaterial` 191-198; `faces` 199; `contactShape` 200-201; `hairChunk` 202; `foot` 208-210; `crestPin` 212; `hand` 215-220; `gripSocket` 223; `weathervaneMask` 227-251; **`citizen()` 253-452**; `type Citizen` 454 | The whole figure: geometry, garments, hair, hats, faces, materials, rig nodes, motion state, expression API | 455 |
| `src/world/citizen-life.ts` | `Activity` 6; `streetScenes` 10-25; `makeScene` 26-39; `sceneFor` 41; `Social`/`setSocialField` 49-51; `dwelling` 56; `CHIN` 58; `setLifeConditions` 60; `hipHeight=.84, bodyHeight=-.14` 61; `personality` 63-66; `LEG`, `walking` 69; `BASE/PATROL/WEARY/HURRIED/GAIT` 71-72; `turnTaking` 75; **`animateLife` 77-249**; `eased` 251; `routeLeg` 253; `stageCitizen` 257-267 | The only joint writer: gait application, idle, activities, gestures, gaze, drape, secondary motion, pose easing, expression choice | 267 |
| `src/simulation/gait.ts` | `L1=.43, L2=.495, SOLE=.052, HIP=.09, STANCE=.62, REST=.97` 5; `HEEL/BALL` 7; `Params`/`Pose` 10-13; `footing` 18; `advance` 28-39; `KNEE`/`PITCH` 40-41; `legZ` 61; `ik` 63-66; `planted`/`place` 70-81; `walk` 84-96 | Pure walk: planted feet, sole roll, planar 2-bone IK, pelvis height, yaw, roll and sway (tested) | 96 |
| `src/simulation/occupation.ts` | `isOccupier`/`standingOf` 78-79; `admits`/`present` 87-92; `seedOf` 94; `Trait`/`Stance`/`Manner` 97-100; `mannerOf` 118; `Conduct`/`conduct` 126-127; `Tone`/`Bearing`/`bodyFor` 134-142; `faceAllowed` 146; `Mood` 150; `moodOfTone` 153; `MoodIn`/`moodFor` 166-170; `MoodState`/`newMood`/`nearBand`/`stepMood` 184-190; `berth`/`makeRoom` 229-232; `PostRole`/`canAct`/`AUTHORITY_BUDGET` 237-240 | Moods, manners, traits, conduct rules, standing and density (pure, tested) | 284 |
| `src/world/crowd-batch.ts` | `class CrowdBatch` 5-41: ctor buckets by material 9-22; holder 26; `update` 29-40 (face colour packing 35) | Turns every articulated person into instances of one `BatchedMesh` per material | 41 |
| `src/world/palette.ts` | `palette.skin` 8; `palette.hair` 9; `Archetype` 25; `wardrobes` 29-38 | Curated wardrobe and skin/hair swatches | 38 |
| `src/world/assets.ts` | shared `boxGeo/cylinderGeo/sphereGeo` 107; `box` 108; `cyl` 114; `sphere` 115; `torus` 116; `thinLine` 121; `propMat`/`asProp` 128-130; `bake` 218-225; `seeded` 6 | Primitive helpers, the per-group merge (`bake`), prop materials and the line class | 239 |
| `src/world/tone.ts` | `tone`, `painted` 5-34 | Shared cel terminator for the world and people | 36 |
| `src/world/city.ts` | `Person` type 33; `crowd` 57; `npcs` 61; `mind`/`routeClock`/`speaks`/`forget`/`giveRoom` 95-112; ctor 210 (`createPopulation`, then `Presentation`, then `new CrowdBatch(...)`); `setSocialField` 211; **`createPopulation` 484-492** (42 NPCs plus cargo, umbrella and ledger props); construction twins 564; `update` NPC loop 590-605, `crowd.update()` 605, construction arm 610 | 42 authored street NPCs, social field, room-making, batching, construction workers | 613 |
| `src/world/presentation.ts` | `workers` record 46; `posts` 48; garrison 450-468; `watchCurfew` 475-489; `authority`/`ordinance` 491-492; **`addWorker` 493-509** (role defaults 495; tools 499-507); `update` worker loop 600-618 (90 m hide 602) | About 194 staged workers: posts, scenes, tools, gating, paths, curfew perception | 621 |
| `src/world/intro.ts` | `Figure` 20; `cast` 33-36; `update` 71 | The opening's three solo (unbatched) figures: guard, ordinal, masked courier | 84 |
| `src/world/patrol.ts` | `Actor` 6; `Patrol` 33-100 | Patrol state machine; moves `person.group` and writes `tone` | 111 |
| `src/simulation/crowd.ts` | `ThreatGrid`, `respond`, `stepGroup`, `routeState`, `stepClock` | Pure crowd reactions to the Ordinance (tested) | 193 |
| `src/review.ts` | `frame` 20-35 | Dev review harness: reads `expression`, `gaze`, `head.rotation`, `skirt`, `tails.scale`, `legs` (drape "poke" probe) | 87 |
| `src/world/detail-cull.ts` | `DetailCull` | Small-object layer culling; skips `BatchedMesh`, so it never touches people | 32 |
| Site modules that spawn people | `market-square.ts` 105-153; `cinder-row.ts` 64-143; `foundry-works.ts` 120-127; `ration-line.ts` 68-96; `rook-yard.ts` 51-58; `finch-run.ts` 94; `ward-call.ts` 110, 164; `weatherside.ts` 153-311; `canal-ward.ts` 134-145; `roofwalk.ts` 150-166; `hangway.ts` 105; `checkpoints.ts` 107-108 | Story and population placements through `addWorker` | — |

---

## 2. Construction pipeline, end to end

**1. Creation.** There are three paths:
- `City.createPopulation` (city.ts:484) runs `citizen(mats.rust, i, sceneFor(i).role)` for i = 0..41.
- `Presentation.addWorker` (presentation.ts:496) runs `citizen(mats.rust, this.workers.length+43, role, {mask})`. The seed is the spawn index.
- Solo figures: `intro.ts:34` (`{solo:true, mask}`) and `city.ts:564` (construction: two calls with seed 0).

**2. Selection inside `citizen()`.** Everything is a modular function of the integer seed:
- outfit = `wardrobes[arch][(seed+⌊seed/3⌋)%len]` (257)
- skin = `seed%3` (259)
- dress = `resident && ⌊seed/6⌋%2==0` (259-260)
- a per-archetype `kit` table (262-270): shirt, trousers, sleeve, coat, tails, boots, hands, hat
- build `k` = `[1.16,1,1.1][seed%3]` for worker, guard and ordinal, else `[1,.9,1.08,1][seed%4]` (273)
- jaw = `.94+(seed*7%5)*.03` (327)
- face type and skull shape (330)
- hair colour and style (344)
- global scale x/y (445)

**3. Geometry.** Almost every piece is a `tailored()` loft (54-60): stacked elliptical rings `[y, halfWidth, halfDepth, zOffset]` with 6-24 segments. Ends are closed by shrinking a ring to ~0; a partial `arc` makes an open shell. The remaining pieces are:
- `ShapeGeometry` flat panels (`panel` 61)
- `ExtrudeGeometry` (hair fringe 202, satchel 307, visors 381-382)
- `LatheGeometry` hats (380)
- `ConeGeometry` hair locks and spikes (359-367)
- `SphereGeometry` hair crown (345)
- shared unit `box`/`sphere`/`torus` from assets.ts (buttons, badges, straps, ears, buckles, chains)

**4. Rig.** A fixed hierarchy (positions in figure units, about 2.13 tall):

```
group
├─ contact (blob shadow)
├─ body (rotY/rotX/rotZ, pos)
│   ├─ torso / neck / lapels … (baked)
│   ├─ tails (y 1.08) ── skirt/coat/apron
│   ├─ scarf (−.04, 1.51, .1)
│   ├─ head (y 1.86, scale 1.16) ── skull(face), ears, hair, hat, mask, swing (0,.1,−.2)
│   ├─ shoulder×2 (±.215k, 1.44) = arms[k] ── elbow (y −.25) = elbows[k] ── hand, grip socket = grips[k]
│   ├─ worn (patches), finery (watch chain; hidden)
├─ pelvis (pelvis + belt; baked)
└─ hip×2 (±.09k, .98) = legs[k] ── knee (−.43) = knees[k] ── ankle (−.495) = ankles[k] ── foot
```

Finally `body`, `pelvis` and the hips are lowered by .14 (444).

**5. Per-group bake.** `bakeCharacter` (62-72) clones each mesh's geometry, writes the material colour into a per-vertex `color` and the late colour into `restoredColor`, swaps the material to the shared `coloredToon` (cloth map) or `plainToon` (`userData.plain`: skin, hair, brass, lens, mask thread), then `bake()` merges per material (assets.ts:218). The face skull keeps one of three shared `faces[tone]`, or its own `faceMaterial` when `solo`. Result: 22-27 meshes and about 46 nodes per figure (measured).

**6. Faces.** One 4096×2048 RGBA atlas (173-183): 8 face types (rows) × 16 columns. It is painted on a canvas from parametric eye, brow and mouth drawers, and skin is left transparent and filled by the material colour.
- The skull's UVs map the full 360° of the head across one column (334).
- The fragment shader picks the brow, eye or mouth column by the tile's v band (`FACE_MAP` 186-188).
- The three numbers come from `batchingColor` when batched, or from the `uFace` uniform when solo (195).
- `setExpression` (450-451) packs `E | b<<4 | M<<8` into `face.userData.face`. `CrowdBatch.update` writes it as `setColorAt(id, (face&15, face>>4&15, face>>8))` (crowd-batch.ts:35).

**7. Batching.** At the end of the `City` ctor (city.ts:210), `new CrowdBatch([...npcs, ...presentation.workers].map(group), root)`:
- buckets every mesh by material, clones each unique geometry, and creates one `BatchedMesh` per material (crowd-batch.ts:14-22);
- hides the source meshes (`visible=false`, `matrixAutoUpdate=false`) and moves the actors to a holder outside the scene (26);
- each frame, `update()` calls `updateWorldMatrix` on each visible actor, walks each entry's parent chain for visibility, and copies its `matrixWorld` (29-40).

**8. Animation.** Each frame, for each visible person: `City.update` (590-604) or `Presentation.update` (600-618) stages the position (routes, `giveRoom`), then `animateLife(n, activity, dt, time, calm, viewer, target, speaking, moving)` (citizen-life.ts:77), which:
- refreshes the social field and mood at 2 Hz (81-82);
- derives speed and turn from the real displacement (86-92);
- advances `gait.advance` and `gait.walk` (100-103);
- writes body, legs, knees, ankles and arms (109-119);
- layers activity poses (122-169), gaze and head (184-235) and secondary springs (172-182);
- eases arms, elbows and body (239-242);
- picks the expression (246-248).

**9. Prosperity.** `setCitizenProsperity(stage)` sets the `wardrobePhase` uniform, which mixes `vColor`→`restoredColor` in the shared shader (29-41). `worn` and `finery` visibility is toggled by stage (city.ts:592, presentation.ts:603).

---

## 3. Archetypes, roles and looks

**Archetypes** (`palette.ts:25`): `worker | engineer | merchant | guard | resident | courier | ordinal`. Occupiers are `guard` and `ordinal` (occupation.ts:78). The `kit` table (citizens.ts:262-270) gives each archetype its silhouette:

| Archetype | Wardrobes | Silhouette (kit + extras) |
|---|---|---|
| worker | 2 | rolled sleeves, apron (303-304, 316), heavy boots, cap or scarf, satchel if `seed%3==0` |
| engineer | 2 | coat, short coat tails, tall boots, gloves, goggles, crossed straps and pouches (305-308) |
| merchant | 2 | puff sleeves, leather trousers, full skirt, vest flaps, sash box, top hat / bowler / none (302) |
| guard | **1** | coat, long tails, tall boots, gloves, kepi with crest pin (383-385), badge (297-300), sphere and torus shoulder pads (427) |
| resident | 2 | dress, or coat with short tails; scarf; bowler or none |
| courier | **1** | coat, short tails, heavy boots, cap, satchel, scarf |
| ordinal | **1** | the guard kit plus an oxblood high collar (296), helm (386-390), box shoulder boards (426), armband (424) |

**Expressions** (`LOOK`, citizens.ts:45-49): 29 named looks, including the Ordinance set (`cold`, `scrutiny`, `sideeye`, `impatient`, `contempt`, `challenge`, `scan`, `barking`, `bored`, `weary`).

**Activities** (`Activity`, citizen-life.ts:6): 18.

**Spawns.** Static count from call sites, with loops expanded:

| Source | Figures | Roles |
|---|---|---|
| `City.createPopulation` (city.ts:484; scenes citizen-life.ts:10-39) | 42 (14 + 5×stage visible) | merchant 10, resident 12, worker 9, courier 6, engineer 4, guard 1 |
| `presentation.ts` scenes (141-283) | ~52 | mostly worker, resident, engineer and merchant (role defaults by activity at 495); 2 children = resident × `scale .72/.74` (229, 274) |
| Garrison (`presentation.ts:450-468`) | 32 | 29 guard, 3 ordinal "inspectors" |
| Checkpoints (`checkpoints.ts:107-108`) | 4 (2 gates × 2) | guard |
| `weatherside.ts` 153-311 | 22 | 3 guard, 4 ordinal, residents, workers, couriers, a merchant, an engineer |
| `canal-ward.ts` 134-145 | 22 | 1 guard, residents, merchants, couriers, workers; 1 child (138) |
| `roofwalk.ts` 150-166 | 13 | 2 guard, residents, merchants, couriers, a worker |
| `cinder-row.ts` 64-143 | 13 | inspector **ordinal** (113); Embers: chalker resident (71), lookout courier (72), courier run courier (75); workers, merchant, residents, engineer |
| `foundry-works.ts` 120-127 | 11 | overseer **ordinal** (120); workers, engineer, courier |
| `market-square.ts` 105-153 | 9 | **officer at the Sael Gate, ordinal** (105; used by ward-call.ts:164); **beat, ordinal** (106); couriers, worker, residents (one child, 153) |
| `ration-line.ts` 68-96 | 5 | warden **ordinal** (75); stoker worker (68); worker, engineer, courier |
| `rook-yard.ts` 51-58 | 3 | **Rook hand**, worker (51); **clerk**, ordinal (52); **masked stranger**, courier `mask:true` on the catwalk (58) |
| `finch-run.ts` 94 | 1 | **Finch's hand**, worker (94) |
| `ward-call.ts` 110 | 4 | watchers: 2 resident, 2 worker |
| `hangway.ts` 105 | 3 | engineer, workers |
| `intro.ts` 35 (solo, unbatched) | 3 | guard seed 1, ordinal seed 2, **masked stranger** courier seed 7 |
| `city.ts:564` construction (solo) | 2 per construction | worker seed 0 **twice**: identical twins, because `coat` is ignored (`void coat`, citizens.ts:254) |

Totals: about 236 batched figures (42 NPCs and ~194 workers). Roughly 41 are `guard` and 13 `ordinal`. QA's junction probe sampled "all 270 characters in three districts" (QA.md:277).

**Story characters have no authored look.** Each one is whatever its spawn index's seed produces (presentation.ts:496). Nothing visually distinguishes:
- the Embers: chalker, lookout and courier are plain `resident`/`courier`;
- the Finch and Rook hands: plain `worker`;
- the Sael Gate officer, who is any `ordinal`.

The masked stranger alone is marked, by `weathervaneMask`.

---

## 4. Structural root causes, ranked by visual impact

### R1. The body is the clothing, and the clothing is a stack of lofted tubes (assembled, painted on, mathematically generated)

- Every garment is the body itself: the torso tube *is* the shirt or coat (`top` material, citizens.ts:277), the pelvis tube *is* the trousers (281), and the thigh and shin tubes are trouser legs (408, 412). There is no body under the cloth and no cloth over the body.
- Every tube is `tailored()`: 4-8 elliptical rings of 10-14 segments. The torso is 8 rings × 14 segments; the thigh 4 rings × 12; the shin 4 × 12; the upper arm 5 × 12. This makes smooth sausage forms with no plane changes, folds, gathers or seams in the geometry.
- Tailoring is faked with stuck-on primitives:
  - **zero-thickness `ShapeGeometry` panels** at a fixed z in front of a curved surface: the lapel at z=.14·kz (289), where the chest surface is ~.12-.13·kz, so it floats 1-2 cm off and its edges stand proud; the shirt placket diamond (293); the worn patches (438), each with a new `toon()` material per call; the scarf tail (324); the guard badge (297-299);
  - **boxes:** a straight satchel strap .036×.62×.014 rotated across a curved torso (305), which cuts in at the centre and floats at the sides; the merchant sash .05×.46×.012 (302); apron pockets .07×.08×.02 (304); a buckle (285); engineer pouches (308); ribbons (300);
  - **spheres and tori:** buttons r .014 (290), the watch chain (441), the merchant's neck ring (302).
- One 256² `clothMap` (19-27) is shared by every garment. It paints side seams at u=.25/.75 and **dashed hems at v=.06 and v=.94 of every piece**. Thigh, shin, upper arm, forearm, cuff and tails are separate pieces, so stitched "hems" appear around the knees, mid-thigh, elbows and shoulders. This advertises the segmentation instead of hiding it.
- Its hatching uses `Math.random` (21, 26), so it is not deterministic between loads.
- Trousers are `darkCloth #2c3148` and boots `P.neutral.ink` for nearly everyone (204, 263-269, 413). The whole lower half of the crowd is one costume.

### R2. Rigid segments with butt joints, exposed by animation

- **Knee:** the thigh ends at y −.43 (radius .062·k, 408); the shin begins at +.01 (radius .063, 412). There is no cap or overlap sleeve. The gait flexes the knee to 62° in swing (gait.ts:40 `KNEE`) and seated poses use 1.4 rad (citizen-life.ts:112), so a wedge opens at the front and back of the knee.
- **Elbow:** hidden by a **visible sphere** r .05 (citizens.ts:433). This is the classic puppet ball joint.
- **Shoulder:**
  - The arm tube is centred at x=±.215·k (421), inside the torso's half-width of .212-.225·k at y 1.42-1.47 (277).
  - Its top ring closes to a .02 point (423), so half the arm is buried in the ribcage.
  - There is no deltoid, armpit or sleeve-to-body seam. Raised poses (wave −2.7, repair and watch −2.2: citizen-life.ts:148, 164, 192) pivot it about a point inside the chest, exposing the intersection.
  - Occupiers also have their shoulders pushed outward and upward every frame (`a.position.x*1.05`, y 1.455, citizen-life.ts:206), which opens the joint further. Shoulder boards and pads (426-427) are the only cover.
- **Hip and seat:** the thighs start inside a rigid pelvis tube that closes to a crotch point (281). Seated poses rotate the thigh −1.42 rad about the hip (citizen-life.ts:112), so the thigh's open top swings through the pelvis front and opens the seat.
- **Torso and pelvis:** two tubes overlap by 5 cm (1.09-1.15), hidden by a belt ring (284). The design counter-rotates them (pelvis yaw = body yaw + 1.7·twist; body yaw −.7·twist; citizen-life.ts:110, 225), so the overlap shears at every stride.
- **Skirts and tails hang from the thorax, not the pelvis.** `tails` is a child of `body` (citizens.ts:311), so the skirt turns with the chest against the hips it should hang from.
- **"Drape" is a non-uniform scale** of the whole tails shell along z (citizen-life.ts:181-182), not cloth deformation. Seated, the shell is rotated −1.25 rad into a horizontal open tube (177).
- **Open, single-sided shells.** Coat tails and aprons are partial arcs (`flare`, 315-321; apron 303, 316). Skirts and dresses are bottomless tubes. All are `FrontSide`, zero thickness and without hems, so from the front the inside of the back tails is culled (invisible), the edges are knife-thin from the side, and a seated skirt is hollow.
- There is no spine or chest–abdomen break: the torso is one rigid tube (277), and lean and posture rotate the whole mass, head included, from the hip. Arms rotate only in x and z (no twist); elbows only in x; there is no wrist (the hand is rigid in the forearm group, 434).

### R3. Head and hair are a primitive kit; the face is a decal of marks on an egg

- **Skull:** one 9-ring × 24-segment loft (332) reshaped by `shape()` (337-341), scaled 1.16 (326). The head is about .55 of a ~2.13 figure (~3.9 heads). It has no brow ridge, eye sockets, nose, lips or cheek planes in the geometry. All features are 2D marks from the atlas.
- **Ears:** spheres scaled .027×.046×.033 (343).
- **Hair:**
  - crown: a `SphereGeometry(.212, 20, 10, …, π/2)` **hemisphere cap** (345);
  - back mass: a partial-arc loft (348);
  - fringe: a **flat zig-zag polygon extruded .06 deep** (`hairChunk` 202, 349-356), a cardboard slab in front of the forehead;
  - side locks: **6-sided `ConeGeometry`** squashed `scale.z=.5` (359-360);
  - style 0: seven 5-sided cone spikes (361); style 7 "curls": nine spheres r .075 (362);
  - back fan: three 5-sided cones (365); crown tuft: a cone (366);
  - bun: a scaled sphere plus a torus (368); ponytail and long hair: lofts (373-375).
  - Under a hat, the crown is just rescaled .98/.9 and the fringe clipped at y .12 (356-357).
- **Hats:** `LatheGeometry` (380), the best-made pieces, but they stack on the cap.
- Every head's mass is identical apart from jaw .94-1.06 and a 3-way taper/cheek (327, 330). The 1.16 scale and identical heads swamp the body variation.

### R4. Hands and feet are pods

- **Hand** (215-220): a palm loft (4 rings, 8 segments, ~.07 long), a single finger-mass loft (4 rings) rotated inward 1.05 rad, and a 3-ring thumb. It is a mitten, with no wrist and a cuff ring (431). The skin material is shared with the face tone.
- **Foot** (`foot` 208-210): 6 rings along the forward axis, ~.25 long × .116 wide × .10 tall, closing to a .004 point at the toe. It has an elliptical (round) bottom: no flat sole, heel block, welt, laces or ankle shaft. The gait, meanwhile, models a flat sole with heel and ball arcs (`SOLE=.052`, `HEEL`, `BALL`; gait.ts:5-7). Tall and soft boots are tube sleeves around the shin (414-416), with no foot-to-shaft continuity.

### R5. Variation is modular arithmetic on sequential indices, not art direction

- Seeds are consecutive integers: 0..41 for NPCs and `workers.length+43` for workers. Every choice is `seed % n` or a variant of it (257, 259, 273, 327, 330, 344, 445).
- The variation calculation over 300 seeds found **skin tone ≡ build** for worker, guard and ordinal (both `seed%3`):
  - the lightest tone is always the 1.16 "sturdy" build;
  - the middle tone is always 1.0;
  - the darkest tone is always 1.1.

  This is a visible pattern and a representation problem.
- **Proportions barely vary.**
  - `k` scales the widths and depths of torso, pelvis and limbs only (275); arm length, leg length, neck and head are fixed.
  - Leg length is locked to the gait constants (`L1 .43`, `L2 .495`).
  - Height varies only through a **non-uniform** group scale: x .955-1.045, y .95-1.038, z 1 (445). This also squashes the head, face and hat.
  - Children are adults × .72/.74 (presentation.ts:229, 274; canal-ward.ts:138; market-square.ts:153; weatherside.ts:272).
- **Palette.** The wardrobe is curated, not random RGB (palette.ts:29-38), but thin:
  - guard, courier and ordinal have one outfit each; the other archetypes have two;
  - 4 hair colours (palette.ts:9), including **plum `#5a3a5e`** and **ginger `#cf9450`**;
  - irises in violet `#6d4a86`, red `#8c3f46` and teal `#2f7f72` (citizens.ts:82-89);
  - all of these are candy anime accents that clash with the "Thief/Dishonored, dreary" direction (ART_DIRECTION.md:126-158).
- `citizen(coat, …)` ignores `coat` (254), so identical seeds give identical people: the construction "twins" (city.ts:564).

### R6. No silhouette hierarchy

The pieces come in only two sizes: big smooth forms (an oversized head and sausage limbs) and tiny detail (buttons r .014, chain tube .006, badge .09, pins). There are almost no mid-scale forms with thickness: lapels, collars and cuffs are flat or ring-thin, and there are no pockets, folds, rolled-cuff volumes or bag mass with straps that wrap.

The base body is perfectly bilateral: only the lapel offset, badge, armband, scarf tail and mask knot break symmetry. The neck is a .05 tube into a torso that pinches to a .06 point at 1.545 (277, 282): no trapezius or shoulder slope.

### R7. One material language for every surface

Everything is a 3-step toon with a single cloth texture. Leather, wool, canvas, brass and boots differ only by vertex colour (`bakeCharacter` 62-72). Skin, hair, brass and lenses use `plainToon`. The ink pass treats all people at class .5 (`thinLine`). So nothing reads as material-specific. Brass is a flat yellow because `brass.userData.plain`.

### Why passes have not fixed it

ART_DIRECTION.md:68-75, 175-182, 190-196 and 231-236, and QA.md:268-282 and 419-424, record successive fixes on the same architecture:
- a hemisphere crown "never covers the eyes";
- cone side locks "not slabs";
- an elbow cap "closes the notch";
- the junction probe re-parents the legs to the pelvis;
- drape scaling stops legs poking through.

Each fix adds or patches a primitive, so the assembled read compounds.

---

## 5. Constraints and interfaces a rebuild must preserve

**Constructor**
```ts
export function citizen(coat?: Material, seed?: number, archetype?: Archetype,
  opts?: { solo?: boolean; mask?: boolean }): Citizen            // citizens.ts:253
export type Citizen = ReturnType<typeof citizen>                 // citizens.ts:454
export type Expression = keyof typeof LOOK                       // citizens.ts:50
export const FACE_TYPES = 8, FACE_COLS = 16                      // citizens.ts:78
export function setCitizenProsperity(stage: number)              // citizens.ts:41
```

**Return shape that consumers depend on.** Object identity must be stable per person: it is a WeakMap key in `city.minds` (city.ts:93) and `citizen-life.fields` (citizen-life.ts:52).
- `group: T.Group`. Moved by `giveRoom`, `Patrol`, `intro.go` and the stagers; `.visible` gates batching. `userData.umbrella` and `userData.upright` are set by city.ts:487 and presentation.ts:501. `scale.y` is read at citizen-life.ts:109; `scale.multiplyScalar` is used by addWorker at 496.
- `body: T.Group`. Written: `position`, `rotation`. Children added: cargo, umbrella and ledger (city.ts:486-488; presentation.ts:506).
- `pelvis: T.Group`. Written: `position`, `rotation` (citizen-life.ts:225-227).
- `legs[2]` (hip groups): `position` (re-derived from the pelvis), `rotation.x/y/z`; `userData.hipX` is cached (230).
- `knees[2].rotation.x`, `ankles[2].rotation.x`.
- `arms[2]` (shoulders): `rotation.x/z`, and for occupiers `position.x/y`; `userData.sx` is cached (206).
- `elbows[2].rotation.x`.
- `grips[2]`: tool parent at `grips[0]`; `grips[0].rotation.x` is written for a mug (244). Grip convention: the handle along local z at the origin (citizens.ts:221-223).
- `head.rotation.x/y/z`.
- `tails`: `rotation`, `scale` (drape). `skirt: {drop, depth}`, read by the drape logic and by review.ts.
- `swing.rotation`, `scarf.rotation.x`.
- `worn`, `finery`: visibility toggled by stage.
- `face: T.Mesh`, whose material has `userData.faceAtlas` and `userData.look`. `face.userData.face` holds the packed number. `face.material.dispose()` is called for construction twins (city.ts:610).
- `archetype`, `phase`, `manner` (overwritten at city.ts:485), `tone` (written by intro, patrol, watchCurfew and site modules), `motion` (the internals are private to animateLife but created by `citizen`: `stride, latch: footing(), gait, speed, prevX, prevZ, prevYaw, turn, tail, tailV, hair, hairV, tempo, idle, drape, pose, mood: newMood(), pick`), `expression`, `gaze`, `packed`, `setExpression(state, blink?, talk?, eye?)`.

**Geometric contracts tied to gait and life.**
- Hip pivots at y .98, lowered .14 → .84 = `hipHeight` (citizen-life.ts:61); `bodyHeight=-.14`.
- Thigh length = `L1 .43`; knee→ankle = `L2 .495`; sole thickness about `SOLE .052`; hip half-spacing about `HIP .09` (the code uses .09·k); `REST .97`. The ground is .13 below the origin (citizen-life.ts:109).
- Shoulder pivot y 1.44 (1.455 for occupiers); elbow at −.25; tails pivot at body y 1.08; head at 1.86, scale 1.16.
- Activity poses and the "bite" were solved against this rig (citizen-life.ts:166-169, 140-142). Changing arm lengths or the shoulder or head height breaks hand-to-mouth, the read sheet and the clipboard placement.

**Batching contracts.**
- `CrowdBatch` accepts any `Mesh` with a single material. Geometries are deduped by object identity per material (crowd-batch.ts:15-16).
- The face material must read `batchingColor` as (eye, brow, mouth) and reset `vColor` (citizens.ts:195). The packing is `E|b<<4|M<<8` (451, crowd-batch.ts:35).
- The batch is built **once** in the `City` ctor (city.ts:210). People created later must be `solo` (unbatched).
- `BatchedMesh` (three 0.180) **cannot batch `SkinnedMesh`**. A skinned rebuild would remove the ~6-18-draw crowd. Keep rigid joint groups, or build a custom batched-skinning path.

**Material contracts.**
- `wardrobeHook` and `restoredColor` drive prosperity (29-41).
- Line class .5 via `thinLine`; `painted()` must not be applied twice (ART_DIRECTION.md:145).

**Gameplay signatures.**
```ts
addWorker(x, z, yaw, kind: Activity, o: { y?; role?: Archetype; minStage?; maxStage?; time?: 'any'|'day'|'night';
  scale?; partner?; path?: [x, z, speed]; tool?: string; when?: () => boolean; essential?: boolean; mask?: boolean }): number   // presentation.ts:493
animateLife(n: Citizen, activity: Activity, dt, time, calm, player: Vector3, target?, speaking = false, moving = false)  // citizen-life.ts:77
stageCitizen(n, index, clock) / sceneFor(i) / turnTaking / routeLeg / eased / setLifeConditions / setSocialField
City.giveRoom(c: { group, archetype, manner, phase }, dt, Room)   // city.ts:33, 112
```
- `workers[i] = { person, kind, tool, minStage, maxStage, time, partner, path, y, when, district, standing, seed, base, importance }` (presentation.ts:46, 508). Story modules hold indices into it: officer, beat, clerk, hand, inspector, overseer, warden, stoker, packer and cartPusher.

**Tests.** No unit test imports `citizens.ts`, `citizen-life.ts` or `crowd-batch.ts`. These are covered:
- `tests/gait.test.ts`: all gait exports and constants;
- `tests/mood.test.ts`: `moodFor`, `stepMood`, `faceAllowed`, `moodOfTone`;
- `tests/crowd.test.ts`: `mannerOf` and the crowd simulation.

`src/review.ts:20-29` (dev `?dev=1&check`) reads `npcs[].expression`, `gaze`, `head.rotation.y`, `skirt.depth`, `tails.scale.z` and `legs[].rotation.x`, and exposes `#life-status` `data-poke`/`data-expressions`. There are no Playwright specs in the repo.

---

## 6. Performance facts (from the code and the Node measurement)

**Per figure** (24 seeds per role; totals include the hidden `finery`, 400-650 tris):

| Role | Avg tris | Visible range | Meshes | Nodes |
|---|---|---|---|---|
| worker | 4,405 | 3,504-4,918 | 23.7 | 45.7 |
| engineer | 6,454 | 5,478-6,892 | 24.8 | 46.8 |
| merchant | 4,980 | 3,782-5,196 | 23.3 | 45.3 |
| guard | 6,166 | 5,420-5,864 | 26.6 | 48.6 |
| resident | 4,765 | 3,458-4,882 | 23.3 | 45.3 |
| courier | 5,534 | 4,788-5,232 | 24.6 | 46.6 |
| ordinal | 5,548 | 4,802-5,246 | 23.6 | 45.6 |

- **Where the triangles go.** Example worker seed 0: head subtree 1,412 (face skull 384; hair, hat and ears about 1,000), arms 936, legs 624, pelvis 208. Guard seed 1: head 1,843, arms 1,776 (pads and tori). Hair and hats are 20-30% of every figure.
- **Materials per figure:** 4 (`coloredToon`, `plainToon`, one of 3 shared `faces[tone]`, `contactInk`), plus prop materials (`propMat` clones; umbrella `fabricOf`).
- **Draw calls.**
  - The batched crowd is about 6 people batches plus one per prop material, roughly 15-20 draws for all ~236 batched figures, whatever their number (QA.md:273: "+0 to +2 draws … crowd batching absorbs the hand geometry").
  - Solo figures (intro, construction) are **not** batched: about 23 draws each, and each gets its own face material.
- **No geometry sharing.** Every `tailored()` allocates; `bakeCharacter` clones in order to add vertex colours; `bake()` merges per figure. CrowdBatch therefore stores one unique geometry per instance: about 236 × ~5k tris ≈ 1.2 M triangles resident in batch buffers. Only visible instances draw, with per-instance culling at the r180 default, since only object-level culling is off (crowd-batch.ts:18).
- **No LOD.** Full figures render at any distance.
  - Workers are hidden beyond 90 m (presentation.ts:602).
  - NPCs are gated only by count (`i < 14+5·stage`, city.ts:593).
  - `DetailCull` skips `BatchedMesh`.
- **No shadow casting:** `castShadow=false` (citizens.ts:446; crowd-batch.ts:18). There is a 14-tri blob contact per figure.
- **Face atlas:** 4096×2048 RGBA, mipmapped (~45 MB of GPU memory with mips), painted on the CPU at load and read back with `getImageData`.
- **CPU per frame:**
  - `animateLife` per visible person (O(1) with small loops);
  - `CrowdBatch.update`: `updateWorldMatrix(true,true)` per visible actor (~46 nodes), then for each entry (~24 per figure plus props) a parent-chain visibility walk and `setMatrixAt`;
  - social and mood refresh at 2 Hz per person.
- **Scene-level reference:** street 778 draws / 1.13 M tris; overview 1,181 / 1.40 M (QA.md:365).

---

## 7. Recommended rebuild seam

**Seam: the body of `citizen()` (citizens.ts:253-452), behind an unchanged return contract.** Everything gameplay-facing consumes the rig object, never the geometry. The data flow becomes:

```
citizen(coat, seed, archetype, opts)                     ← signature kept (opts gains optional `look?: LookId`)
  └─ resolveLook(seed, archetype, opts.look)             NEW: authored Look descriptor (body type, garment set, palette swatch,
                                                              hair, face type, skin) from curated per-role and per-story tables,
                                                              using a proper hash (assets.seeded) to decorrelate choices
  └─ buildFigure(look, opts)                             NEW module (e.g. src/world/people/): authored part library
        returns the SAME nodes: group/body/pelvis/legs/knees/ankles/arms/elbows/grips/head/tails/swing/scarf/worn/finery/face
  └─ existing tail of citizen(): bakeCharacter, motion state, setExpression   ← kept verbatim
```

1. **Keep untouched:**
   - `animateLife`, `gait.ts`, `occupation.ts`, `crowd.ts` and `CrowdBatch`;
   - the face atlas pipeline (`faceAtlas`, `FACE_MAP`, `faceMaterial`, `LOOK`, `setExpression` packing);
   - the wardrobe prosperity shader, `bakeCharacter` and `thinLine`/`painted`;
   - every `addWorker` call site.
2. **Keep the pivot positions** listed in §5 (hip .98/−.14, L1/L2, shoulder 1.44, elbow −.25, head 1.86, tails 1.08, grip socket), so the gait IK, the solved poses and the drape keep working.
3. **Build for rigid articulation, not around it.** Design each segment with overlapping sleeves and caps that hide rotation:
   - a cuff over the forearm and a boot shaft over the shin;
   - a deltoid or yoke that wraps the shoulder pivot;
   - a coat that overhangs the belt;
   - knee pads or a trouser break.
   Give garments thickness and closed, double-sided hems. **Re-parent `tails` to `pelvis`** (an internal change: animateLife writes `n.tails` by reference). Give shoes a flat sole and heel that matches `SOLE`/`HEEL`/`BALL`. Sculpt a head with planes; let hair be a few authored shell masses rather than cones and spheres.
4. **Author story NPCs.** Add an optional `look` to the `addWorker` options, passed through to `citizen` opts. It is non-breaking: the officer (market-square.ts:105), the Finch and Rook hands, the clerk, the Embers (cinder-row.ts:71-75) and the masked stranger (intro.ts:35, rook-yard.ts:58) get fixed, designed looks independent of spawn order.
5. **Optional phase 2, for performance.** Turn the part library into shared `BufferGeometry` per part variant, so CrowdBatch's existing identity dedup (crowd-batch.ts:15-16) shares geometry. That requires moving per-figure colour off per-vertex attributes:
   - for example a per-instance palette index read from a small data texture;
   - the instance colour channel is already used by faces, but only on the face material, so cloth batches can use `batchingColor` for their own tint;
   - prosperity can then become a second palette row instead of `restoredColor`.

   Add a two-level LOD (a far silhouette mesh per look) outside the 20-30 m band; today the full ~5k-tri figure draws up to 90 m.

**Risk notes.**
- Do not switch to `SkinnedMesh`; it breaks batching (§5).
- Do not change leg or arm lengths without retuning `gait.ts` constants and the solved activity poses.
- Keep `Citizen` object identity (WeakMaps).
- Late-created figures must stay `solo`.
- Fix the skin-tone ≡ build correlation (citizens.ts:259 vs 273) in the new `resolveLook`.

