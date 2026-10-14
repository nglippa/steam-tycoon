

<pasted_content id="fd27">
CITY TYCOON — PEOPLE / PRESENTATION FOUNDATION

STOP GAMEPLAY FEATURE DEVELOPMENT.

Do not begin another story, economy, resistance, Ordinance, district, mission or progression pass.

The game has reached a point where its PRESENTATION FOUNDATION is now the limiting factor.

This pass has three priorities, in this order:

1. PEOPLE — rebuild the character construction methodology and assets
2. UI — substantially slimmer, cleaner, quieter HUD/interface
3. RENDERING — preserve the illustrated art style while reducing excessive shader/outline weight and distant blur/noise

This is NOT a generic polish pass.

It is a deliberate art-production-system correction.

==================================================
0. SAFETY / BASELINE
==================================================

Inspect actual repository state first.

The Signal currently exists on branch:
signal

Last reported Signal tip:
0461fad8691da3133a2dba8e1c803d6db5d24e23

But do NOT assume that is current main.

Inspect:
- HEAD
- main
- origin/main
- branches
- worktrees
- status
- stashes

Do not merge or push anything without approval.

If The Signal has not yet been accepted/merged, DO NOT silently build this pass on an unapproved Signal branch.

Report actual state and choose the safest isolated worktree only after establishing the authoritative approved baseline.

Preserve all unrelated work.

==================================================
1. FIRST PHASE IS RESEARCH — NOT CODING
==================================================

Before editing character generation, UI or shaders:

RESEARCH.

Use high-quality character-art and real-time rendering references.

Study specifically:

CHARACTER CONSTRUCTION
- stylized human anatomy
- anime-influenced 3D proportions
- silhouette design
- shape language
- appealing stylization versus primitive assembly
- head/neck/shoulder construction
- ribcage/pelvis relationship
- arm/leg taper
- knees/elbows
- hands and feet
- facial plane simplification
- hair mass construction
- clothing layering
- garment weight
- hems/cuffs/collars/lapels
- asymmetry
- readable front/side/back silhouette
- character variation systems
- curated modular characters
- locomotion
- weight shift
- secondary motion
- idle posing

STYLIZED GAME CHARACTER PIPELINES
- concept → construction → clothing → rig → animation → game
- methods for producing many characters without procedural-looking randomness
- reusable authored archetypes
- constrained modularity
- LOD/readability considerations

NON-PHOTOREALISTIC RENDERING
- cel/toon shading
- screen-space outlines
- geometry/inverted-hull outlines if relevant
- depth/normal edge detection
- distance-dependent outlines
- edge thickness
- edge strength
- downsampling
- anti-aliasing
- temporal stability
- fog interaction
- distant readability
- avoiding NPR blur/noise accumulation

UI
- compact first-person HUDs
- diegetic/minimal management-game UI
- typography hierarchy
- information density
- compact notification/prompt systems
- reducing container/chrome weight

Do not blindly copy another game's art.

Extract PRINCIPLES.

==================================================
2. AUDIT TERRA'S ACTUAL IMPLEMENTATION
==================================================

Then perform a read-only audit.

PEOPLE:
Find every relevant module for:
- citizen geometry
- body construction
- faces
- hair
- clothing
- materials
- Ordinance characters
- Resistance characters
- workers
- merchants
- special NPCs
- gait
- idle animation
- seated poses
- gestures
- carried props
- procedural variation
- randomization
- archetypes
- population spawning
- LOD/culling if present

Determine WHY the characters currently read as:

- generated
- primitive
- incomplete
- assembled
- inconsistent
- unfinished

Do not simply say "needs more detail."

Identify structural causes.

Examples to investigate:
- excessive primitive intersections
- random proportions
- mathematically generated clothing
- no authored silhouette hierarchy
- disconnected torso/pelvis
- cylindrical limbs
- mitten/block hands
- shoe blocks
- generic head masses
- hair caps
- facial marks instead of facial construction
- clothing painted onto body shapes
- insufficient overlap
- no seams/hems/collars
- symmetric silhouettes
- random combinations without art direction
- animation exposing construction weaknesses

UI:
Audit every persistent HUD component and common interaction surface.

Measure:
- heights
- widths
- padding
- margins
- font sizes
- line heights
- border thickness
- card count
- screen coverage
- duplicated information
- always-visible versus contextual information

RENDERING:
Find exact implementation of:
- toon/cel shader
- outlines
- edge detection
- postprocessing
- fog
- anti-aliasing
- resolution/downsampling
- color grading
- shadow stylization

Determine WHY distance becomes blurry/noisy.

Do not guess.

==================================================
3. CREATE A DURABLE TERRA CHARACTER ART BOOK
==================================================

Before rebuilding characters, write the rules.

Create or substantially upgrade an appropriate repo art-direction document.

Preferred concept:

TERRA_CHARACTER_BOOK.md

If an existing ART_DIRECTION.md is clearly the correct canonical location, use/extend it intelligently rather than creating conflicting doctrine.

This must become the source of truth.

Document:

A. VISUAL TARGET

Anime-influenced stylized people living in an illustrated steampunk sky city.

NOT:
- Roblox
- Minecraft
- Funko
- generic low-poly
- primitive mannequins
- chibi unless explicitly authored
- photorealistic
- random procedural people

B. PROPORTION SYSTEM

Define controlled adult proportion families.

For example:
- slim
- standard
- sturdy

But make them authored construction families, not random scale multipliers.

Specify:
- head ratio
- shoulder width
- ribcage
- waist
- pelvis
- leg length
- arm length
- hand size
- foot size

C. SILHOUETTE RULES

Every archetype must pass:
- front silhouette
- 3/4 silhouette
- side silhouette
- distance silhouette

A character should remain identifiable without facial detail.

D. BODY CONSTRUCTION

Define how:
- neck enters torso
- shoulders slope
- ribcage transitions to waist
- waist transitions to pelvis
- pelvis creates leg sockets
- thighs taper
- knees interrupt the leg
- calves carry shape
- ankles narrow
- arms taper
- elbows read
- wrists narrow
- hands terminate naturally

No arbitrary primitive intersections.

E. FACE LANGUAGE

Define:
- head shape families
- jaw
- chin
- nose
- brow
- eye placement
- eye size
- mouth
- ears
- anime influence

Faces should be readable but restrained.

No emoji faces.

No dots pasted onto spheres.

F. HAIR

Hair is designed as MASSES and SILHOUETTES.

Define authored hairstyle families.

Avoid:
- random spikes
- helmet caps
- evenly distributed chunks

G. CLOTHING

Garments are objects with construction.

Require where appropriate:
- collar
- opening
- hem
- cuff
- lapel
- waistband
- belt
- overlap
- seam implication
- layered silhouette

Clothing should sit OVER the body.

H. OCCUPATION / PROFESSION

Define coherent wardrobe families for:
- ordinary residents
- laborers
- merchants
- mechanics
- foundry workers
- Ordinance
- Embers-associated civilians
- affluent citizens
- poorer citizens

I. COLOR

Constrain palettes by:
- profession
- district
- occupation level
- faction/world state

No random RGB clothing generator.

J. VARIATION

VARIATION MUST BE CURATED.

Define compatible sets.

Randomness may choose between authored valid combinations.

Randomness must NOT design the character.

K. ANIMATION

Define:
- walk
- stance
- weight
- arm swing
- head behavior
- idle
- gestures

Animation should reinforce personality/archetype.

==================================================
4. CREATE / UPGRADE A REUSABLE CHARACTER-CONSTRUCTION SKILL
==================================================

The user explicitly wants this knowledge committed to a reusable skill.

Inspect the existing shared skill architecture.

There is historically a figure-construction skill.

Do not overwrite useful existing doctrine blindly.

Determine whether to:
- substantially upgrade figure-construction
OR
- create a complementary stylized-game-character skill

The skill must encode the durable METHOD learned from:
- external research
- Terra's failures
- successful corrections
- the new Character Book

It should instruct future coding agents how to:

1. audit a procedural character
2. diagnose generated appearance
3. construct silhouette first
4. establish anatomy
5. build clothing over anatomy
6. author face/hair
7. create constrained variation
8. animate without breaking anatomy
9. validate in front/side/3/4
10. validate at gameplay distance
11. avoid primitive-intersection artifacts
12. avoid random-combination art direction

Include visual QA requirements.

If shared ~/.agents skill synchronization is involved:
follow the existing canonical shared-skill mechanism.

Do not create five divergent copies manually if symlinks/linker are the established architecture.

Report exactly what was changed and where.

==================================================
5. CHARACTER REBUILD — NOT ANOTHER MICRO-PATCH
==================================================

After the book and skill exist:

REBUILD THE PEOPLE CONSTRUCTION SYSTEM.

Do not make another sequence of tiny fixes such as:
- thighs 4% thinner
- hands 6% smaller
- torso moved 2 cm
- add another hair cone

We've done that.

It is not enough.

Preserve gameplay-facing NPC systems:
- routes
- occupation behaviors
- traits
- dialogue
- interactions
- population density
- guard logic
- performance architecture

Replace/rework the VISUAL CONSTRUCTION underneath them.

==================================================
6. AUTHORED BASE CAST
==================================================

Prefer a modest number of excellent authored construction families over huge procedural variety.

Target something like:

BODY FAMILIES
- slim
- standard
- sturdy

with controlled authored variants.

Then create a small CAST LIBRARY.

For example:
- young mechanic
- older mechanic
- market merchant
- laborer
- foundry worker
- ordinary resident
- affluent resident
- Ordinance rank-and-file
- Ordinance inspector/officer

Exact count should come from the audit.

Each should have deliberate:
- proportions
- face family
- hairstyle compatibility
- clothing family
- posture tendencies
- palette range

Variation should occur INSIDE those authored constraints.

==================================================
7. PEOPLE MUST LOOK FINISHED
==================================================

Characters need a finish pass.

At natural gameplay distance, inspect:

HEAD
- recognizable shape
- hair silhouette
- brow/eye read
- nose indication
- mouth/jaw

UPPER BODY
- neck
- shoulder transition
- collar
- garment opening/lapel if relevant
- sleeves/cuffs
- torso layering

LOWER BODY
- waistband/belt
- pelvis
- trouser/skirt construction
- thigh/knee/calf transitions
- ankle
- shoe/boot shape

HANDS
- no giant blocks
- no floating mittens
- natural termination
- readable when gesturing

CLOTHING
- actual overlap
- actual hems
- visual construction
- profession-specific details

BACK VIEW
- must look authored too

Characters cannot only work from the front.

==================================================
8. ASYMMETRY
==================================================

Add restrained authored asymmetry.

Examples:
- rolled sleeve
- satchel
- apron tie
- scarf tail
- tool pouch
- uneven coat opening
- tucked cloth
- hair part
- shoulder strap

Do not procedural-noise everything.

One or two meaningful asymmetries are stronger than ten random accessories.

==================================================
9. UI — SLIMMER AND CLEANER
==================================================

The current UI remains too bulky.

Preserve information and functionality.

Reduce CHROME.

Target:
- thinner bars
- tighter vertical rhythm
- less padding
- smaller persistent footprint
- lighter borders
- fewer giant containers
- cleaner typography
- more breathing room around the WORLD, not inside giant cards

First-person exploration should dominate the screen.

HUD should feel like a refined overlay, not a web dashboard placed over a game.

Audit persistent top UI especially.

Aim for roughly:
- 20–30% less persistent vertical footprint where feasible
- smaller internal padding
- shorter line heights
- compact weather/time/ward information
- compact interaction prompts
- compact toast treatment

Do NOT make text unreadably small.

Do NOT remove important state.

Do NOT convert everything to icons.

Do NOT create mystery-meat UI.

Ledger screens can retain more information density than exploration HUD.

==================================================
10. UI VISUAL LANGUAGE
==================================================

Preserve the premium illustrated/glass/brass Terra identity.

But reduce:
- thick outlines
- giant pills
- oversized cards
- unnecessary background opacity
- excessive corner radius
- duplicated borders
- excessive shadows

Prefer:
- thin rules
- typography
- restrained translucent backing
- compact alignment
- subtle brass/ivory accents

The world should remain visible.

==================================================
11. SHADER / OUTLINE — SOFTEN, DO NOT REPLACE
==================================================

The user LOVES the current art style.

Do not redesign it.

Problem:

At some distances the shader/outlines become too heavy and the scene begins to blur or visually merge.

Goal:

SAME ART DIRECTION.
LESS HEAVY.
BETTER DISTANT CLARITY.

Audit exact cause.

Potential strategies to evaluate:

A. DISTANCE-AWARE OUTLINE WEIGHT

Near:
retain current illustrated line character.

Mid:
slightly reduce outline contribution.

Far:
substantially reduce fine internal edge contribution.

Do not make far objects outline-free if silhouettes need them.

B. SILHOUETTE > INTERNAL EDGES

At distance:
preserve major object silhouettes.

Suppress tiny depth/normal discontinuities that become visual noise.

C. EDGE STRENGTH / THICKNESS

Tune conservatively.

Do not simply halve everything globally.

D. DOWNSAMPLING / RESOLUTION

If the current edge pass is causing soft broad lines because of render-target/downsample behavior, fix that deliberately.

E. FOG

Ensure outlines don't become dark smeared bands through fog.

Distance/fog should soften them coherently.

F. ANTI-ALIASING

Check whether the blur is actually:
- outline width
- FXAA interaction
- low-resolution postprocessing
- pixel ratio
- depth edge instability

Fix the cause.

==================================================
12. SHADER SUCCESS TEST
==================================================

Capture identical views on BASELINE and CANDIDATE.

Required distances:

CLOSE:
character / storefront

MID:
street segment / Market Square

FAR:
clock tower / rooftops / skyline

VERY FAR:
floating-city silhouette / distant architecture if available

The candidate should:

CLOSE:
still look illustrated.

MID:
look cleaner.

FAR:
retain shape separation without black/noisy merging.

VERY FAR:
read as designed silhouettes rather than shader soup.

If the new version merely looks like generic smooth Three.js:
FAIL.

If the old style is gone:
FAIL.

==================================================
13. PEOPLE VISUAL QA MATRIX
==================================================

Capture representative characters:

- slim civilian
- standard civilian
- sturdy civilian
- mechanic
- laborer/foundry worker
- merchant
- Ordinance rank-and-file
- Ordinance officer/inspector

For each where feasible:

- front
- 3/4
- side
- back
- walking
- idle
- natural gameplay distance

Judge:

SILHOUETTE
ANATOMY
FACE
HAIR
CLOTHING
HANDS
FEET
POSE
MOTION
FINISH
PROFESSION READ
ART-STYLE COHERENCE

Do not accept:
“technically improved.”

Ask:
“Would an artist plausibly have authored this character intentionally?”

==================================================
14. PROCEDURALITY TEST
==================================================

Spawn/capture a meaningful sample of civilians.

Look for:

- impossible clothing combinations
- repetitive faces
- random palette ugliness
- silhouette collisions
- clipping
- floating accessories
- identical body with different colors
- obvious primitive reuse
- accidental comedy
- nonsensical profession combinations

The system should create VARIETY WITHOUT LOOKING GENERATED.

==================================================
15. PERFORMANCE
==================================================

Do not solve quality by exploding geometry.

Measure:
- triangles
- draw calls
- materials
- NPC update cost
- shader/post cost
- representative frame time where possible

Reuse geometry/materials intelligently.

Instancing/shared geometries/material caching are encouraged where architecture supports them.

Characters can become more authored without becoming expensive.

Do not prematurely optimize away necessary visual quality.

==================================================
16. DO NOT TOUCH GAMEPLAY
==================================================

Do NOT implement:

- new missions
- Signal changes
- new faction behavior
- commitment changes
- defection
- economy changes
- new businesses
- new district
- combat
- progression
- new occupation systems
- new stealth
- story expansion

This pass is presentation foundation only.

==================================================
17. IMPLEMENTATION ORDER
==================================================

Preferred order:

I — research + audit
II — Character Book
III — reusable skill
IV — new character construction foundation
V — civilian authored cast
VI — profession / Ordinance cast
VII — animation integration / finish
VIII — UI slimming
IX — shader distance/readability
X — adversarial review / fixes

Do not force commit count if coherent implementation needs a different grouping.

Do NOT begin IV until II and III are complete.

==================================================
18. TESTS
==================================================

Preserve all existing functional tests.

Add focused structural tests where useful for:
- valid authored combinations
- deterministic archetype constraints
- material/geometry reuse
- no invalid profession/wardrobe combinations

Do not write meaningless snapshot tests for coordinates simply to increase count.

Run:

npm run typecheck
npm test
npm run build

==================================================
19. FINAL OPUS ART REVIEW
==================================================

Answer explicitly:

PEOPLE

1. Do characters still look procedurally generated?
2. Can body families be distinguished by silhouette?
3. Do professions read without dialogue labels?
4. Do clothes look worn over bodies rather than painted onto primitives?
5. Do faces look constructed rather than marked onto heads?
6. Does hair read as designed masses?
7. Are hands and feet believable in the style?
8. Do front/side/back all work?
9. Does walking preserve anatomy?
10. Is variation curated rather than random?
11. Are repeated citizens obvious?
12. Do Ordinance personnel look authored and coherent?
13. Does the population belong in Terra?
14. Would an artist plausibly call these finished game characters?

UI

15. Is persistent UI materially slimmer?
16. Is all important information still readable?
17. Does the world dominate the screen?
18. Did we avoid generic SaaS/dashboard styling?
19. Are prompts/toasts quieter?
20. Does the interface still feel like Terra?

RENDERING

21. Is the original illustrated style preserved?
22. Are close views still strong?
23. Is mid-distance cleaner?
24. Is far-distance substantially clearer?
25. Are silhouettes preserved?
26. Did internal edge noise decrease?
27. Did fog interaction improve?
28. Did we avoid simply washing the scene smooth?

SYSTEM

29. Is the Character Book sufficient for another artist/agent to continue?
30. Is the reusable skill sufficient to prevent regression into procedural mannequins?
31. Is performance acceptable?
32. Did gameplay remain unchanged?

==================================================
20. FINAL PRODUCT TEST
==================================================

Stand in Market Square.

Ignore the mechanics.

Look at:
- five nearby people
- the HUD
- the street
- the Clock Tower in the distance

Ask three questions:

DO THESE PEOPLE LOOK LIKE CHARACTERS AN ARTIST DESIGNED?

DOES THE UI GET OUT OF THE WORLD'S WAY?

DOES DISTANT TERRA STILL LOOK ILLUSTRATED WITHOUT TURNING INTO A BLURRED MASS OF INK?

All three must be YES.

==================================================
21. DELIVERABLE
==================================================

Return:

- baseline
- branch/worktree
- research sources/principles
- root-cause audit
- Character Book path and summary
- skill path and summary
- old versus new character architecture
- authored archetype/body/wardrobe system
- variation rules
- animation changes
- UI measurements before/after
- rendering/shader diagnosis
- exact rendering changes
- close/mid/far comparison
- character visual QA
- procedurality QA
- performance comparison
- typecheck/tests/build
- console
- known limitations
- Opus adversarial review

Do not merge.
Do not push.

Finish with:

PEOPLE / PRESENTATION FOUNDATION READY FOR VISUAL REVIEW.
</pasted_content id="fd27">

