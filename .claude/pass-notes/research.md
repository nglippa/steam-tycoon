# Terra art-correction research: characters, NPR outlines, compact HUD

Research for the art-correction pass. These are principles drawn from sources; no art is copied.
Units are metres unless noted. **h** = one head unit (crown to chin). "[derived]" marks a rule
I inferred from the sources and the project's constraints rather than one a source states.
"[convention]" marks common practice that I did not verify in a source during this pass.

---

## (a) Sources

Opened and read, unless a line says otherwise.

### Character construction and art direction
1. **Junya C. Motomura, "GuiltyGearXrd's Art Style: The X Factor Between 2D and 3D", GDC 2015 handout (PDF)**:
   https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf. Read the full English text.
   Taken from it: about 40k tris per character with detail modelled as geometry. Data lives in vertex
   normals, vertex colours and UVs rather than textures. A cel step with a per-vertex threshold offset
   (vertex colour as "occlusion"). One light vector per character, not a global light. Normals are hand-edited
   "on every major feature", faces especially. Shading uses a lit colour × a tint ("shade") colour, not
   ambient multiply. Outlines are inverted hulls whose width is set per vertex, including erasing them.
   Inner lines are UV-aligned texture beams. Animation is held keys only, and the mesh is deformed per key.
   (The GDC Vault page, https://www.gdcvault.com/play/1022031, returned a description only. The video
   was not watched.)
2. **Valve, Mitchell/Francke/Eng, "Illustrative Rendering in Team Fortress 2", SIGGRAPH 2007 course notes**:
   https://www.advances.realtimerendering.com/s2007/Mitchell-IllustrativeRenderingInTF2(Siggraph07%20Course%20Notes).pdf.
   Taken from it: silhouettes are designed per class and validated with silhouette-only renders. Interior
   folds echo silhouette shapes. High-frequency detail is omitted. Rim highlights replace dark outlines.
   Shadows shift warm to cool, with a saturated, reddened terminator. Half-Lambert plus a 1D warp ramp.
   Repetitive structures are kept minimal ("impression of repetition").
3. **Valve, "Stylization with a Purpose", GDC 2008 slides**:
   https://cdn.fastly.steamstatic.com/apps/valve/2008/GDC2008_StylizationWithAPurpose_TF2.pdf.
   Taken from it: a read hierarchy of team colour, then class silhouette, then weapon. The highest contrast
   sits at chest level. A value gradient runs from dark feet to a light chest. The pipeline goes
   silhouette → interior shadow shapes → model sheet → 3D (three-quarter paintovers) → skin.
4. **Proko, "Human Proportions – Average Figure" (Richer)**: https://www.proko.com/s/9sB5. Taken from it:
   7.5 h. Landmarks fall 1, 2 and 3 h below the chin (nipples, navel, crotch). Shoulders are 2 h (male) and
   about 1⅔ h (female). Female trochanters are 1.5 h apart, and the male pelvis is narrower. The arm from the
   armpit is 3 h. The foot is a bit longer than the head. Acromion→elbow equals elbow→knuckles.
5. **Proko, "Idealistic Figures" (Loomis)**: https://www.proko.com/course-lesson/human-proportions-idealistic-figures/notes.
   Taken from it: 8 h ideal, with Loomis shoulders at 2⅓ h and hips at 1.5 h.
6. **Proko, "Landmarks of the Human Body"**: https://www.proko.com/s/F7jP. Taken from it: the landmarks
   (pit of neck, sternum, navel, pubis, ASIS, greater trochanter, patella, ankle) are skeletal and so stable
   across builds. ASIS gives pelvic tilt.
7. **Wikipedia, "Body proportions"**: https://en.wikipedia.org/wiki/Body_proportions. Taken from it: canons
   of 7.5, 8 and 8.5 h. The midpoint is at the greater trochanters. Hands are as long as the face.
   Hip:shoulder width is about 1:1.03 for women and 1:1.18 for men.
8. **Local skill `figure-construction`** (distilled from Wikipedia's Contrapposto, Gait, Walk cycle and Body
   proportions, plus AnimeOutline tutorials). Taken from it: anime side-view head landmarks, leg S-rhythm,
   contrapposto, gait determinants, and "clothes over the body".
9. **80.lv, "Achieve Clean Stylized Rendering With Custom Normals Add-on"**:
   https://80.lv/articles/achieve-clean-stylized-rendering-with-custom-normals-add-on-for-blender/.
   Taken from it: stylized shading simplifies the surface. Laplacian-smoothed or proxy-transferred normals
   make shading independent of topology. Anime faces get their normals from a "face proxy mesh".
10. **Reallusion, "CC Clothing Modeling Guidelines"**: https://wiki.reallusion.com/Content_Dev:CC_Clothing_Modeling_Guidelines.
    Taken from it: per-garment quad budgets (tops 3–10k, jackets 5–12k, trousers 3–7k, boots 2–4k).
    Hems and edges are given thickness. Layers keep clearance in the rest pose. It gives no mm values.
11. **Blizzard, "Overwatch 2 'Evolving the Art' panel recap"**: https://overwatch.blizzard.com/en-us/news/23189038.
    Taken from it: a redesign keeps the silhouette and palette and changes the detail. The source is thin.

### Pipelines, crowds, variation
12. **GDC 2015, Cournoyer, "Massive Crowd on Assassin's Creed Unity: AI Recycling"**: https://gdcvault.com/play/1022141.
    Abstract only (via search; the video was not opened). Taken from it: 40 full AIs and 120 high-res models
    pooled behind about 10,000 low-res crowd NPCs, swapped without the player noticing.
13. **GDC 2013, Fauerby, "Crowds in Hitman: Absolution"**: https://gdcvault.com/play/1016443. Abstract only
    (via search). Taken from it: 1,200+ crowd at 30 fps, with gameplay-driven design of crowd LOD.
14. **Game Developer, "How Watch Dogs: Legion's play-as-anyone simulation works"**:
    https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works.
    Taken from it: avoid "procedural soup". Characters are generated from tags anchored on role and context,
    so outfit, income and behaviour stay coherent, with controlled surprise layered on top.

### Locomotion and idle
15. **MoCap Online, "Idle Animation for Games"** (vendor blog, medium credibility):
    https://mocaponline.com/blogs/mocap-news/idle-animation-design-guide. Taken from it: breathing loops of
    2–4 s and full cycles of 8–12 s. 15–20 breaths/min relaxed, 20–25 alert. 1–2 cm chest travel. A weight
    shift every 4–8 s. Fidgets every 30–60 s on randomized timers, with 5–10 fidgets per character.
16. **AnimSchool blog, "Breathing Life into Idle Animations"**: https://blog.animschool.edu/2024/06/14/breathing-life-into-idle-animations.
    Taken from it: the hips drive the motion and overlap travels up the spine into the arms. Layers run at
    different frequencies, with macro variations every 3–6 loops.

### NPR, outlines, anti-aliasing
17. **Roystan, "Outline Shader"**: https://roystan.net/articles/outline-shader/. Taken from it: Roberts-cross
    depth and normal edges. The depth threshold is scaled by depth (`_DepthThreshold * depth0`) and by view
    angle (`normalThreshold = saturate((NdotV-0.5)/(1-0.5))*7+1`) to kill grazing-angle false edges.
18. **Roystan, "Toon Shader"**: https://roystan.net/articles/toon-shader/. Taken from it: `smoothstep(0,0.01,NdotL)`
    for the band edge, rim at `smoothstep(rim±0.01)`, specular `smoothstep(0.005,0.01)`.
19. **Alexander Ameye, "5 ways to draw an outline"**: https://ameye.dev/notes/rendering-outlines/. Taken from it:
    the five methods compared. Hull extrusion belongs in clip space for constant width. Hard normals open gaps,
    which baked smooth normals fix. Edge detection needs a depth-modulated threshold and a fresnel mask, and
    can use a custom discontinuity buffer.
20. **Ameye, Linework docs, "Edge Detection"**: https://linework.ameye.dev/edge-detection/. Taken from it: the
    production settings to copy are "Distance Mask", "Sharp Angle Mask", "Scale With Resolution" and
    "Fade In Distance" (fade lines toward a colour or transparent, with start and falloff).
21. **Ben Golus, "The Quest for Very Wide Outlines"**: https://bgolus.medium.com/the-quest-for-very-wide-outlines-ba82ed442cd9.
    Taken from it: hulls give holes, seams and inconsistent widths unless the content is set up for them.
    Downsampling or blurring loses thin features and makes AA harder. A 1-px outline on sub-pixel geometry
    needs a 1.5-px distance and sub-pixel edge estimation. An interior stencil composites correctly with MSAA.
22. **Omar Shehata, "Better outline rendering using surface IDs with WebGL" (Three.js)**:
    https://omar-shehata.medium.com/better-outline-rendering-using-surface-ids-with-webgl-e13cdab1fd94.
    Taken from it: replace normals with a per-connected-component surface ID written to a HalfFloat buffer.
    Any ID difference is an edge. This fixes edges that vanish when normals align, and the author controls
    the edges.
23. **Maxime Heckel, "Moebius-style post-processing" (Three.js)**: https://blog.maximeheckel.com/posts/moebius-style-post-processing.
    Taken from it: the Three.js plumbing. A `DepthTexture` FBO, `scene.overrideMaterial` for the normal
    buffer, and `perspectiveDepthToViewZ` / `viewZToOrthographicDepth` to linearize. A 3×3 Sobel with
    `outline = gradDepth*25 + gradNormal`, `depth <= 0.99` to skip sky, and thickness as a texel offset multiplier.
24. **Lettier, "3D Game Shaders for Beginners: Outlining"** and **"Fog"**:
    https://lettier.github.io/3d-game-shaders-for-beginners/outlining.html,
    https://lettier.github.io/3d-game-shaders-for-beginners/fog.html. Taken from them: separation goes from
    `mix(maxSeparation=3, minSeparation=1, depth01)`, so lines thin with distance. Edge significance is
    `smoothstep(0.5, 2.0, maxPosDelta)` (soft, not a step). Line colour is the scene colour × a dark tint,
    not flat black. Linear fog intensity is `clamp((d-near)/(far-near))`.
25. **ColinLeung-NiloCat, "UnityURPToonLitShaderExample", `NiloOutlineUtil.hlsl`** (code read):
    https://github.com/ColinLeung-NiloCat/UnityURPToonLitShaderExample. Taken from it: hull width =
    `_OutlineWidth * saturate(abs(viewZ)) * fov * 0.00005`. Inside 1 unit the width stays screen-constant;
    beyond it, world-constant, so screen width falls off as 1/d ("fadeout if character is too small").
26. **godotshaders, "Post-Process Outline (Depth/Normal)"**: https://godotshaders.com/shader/post-process-outline-depth-normal/.
    Taken from it: a Roystan port with defaults depth 0.2, normal 0.2 and angle scale. Edges combine with max().
27. **three.js forum, "Awful aliasing when using post processing"**: https://discourse.threejs.org/t/awful-aliasing-when-using-post-processing/8596.
    Taken from it: offscreen targets lose the default AA. Use WebGL2 multisampled targets. FXAA needs its
    resolution uniform set and blurs crisp lines. Aliasing in a custom edge shader comes from the hard
    step, so use smoothstep. (The search result also surfaced "EffectComposer edges blurred": FXAA blurs models.)
28. **three.js docs via Context7** (`webgl_multisampled_renderbuffers`, `SMAAPass`, `WebGLOutput`):
    `new WebGLRenderTarget(w,h,{samples:4,type:HalfFloatType})`. SMAAPass runs in linear sRGB and must run
    before OutputPass.
29. **Sable outline discussion (Steam forum)**: https://steamcommunity.com/app/757310/discussions/0/1696049513785363261/.
    Search excerpt only, not opened. Taken from it: Sable uses uniform-thickness post edge lines, unlike
    GGXrd's variable hull lines.

### HUD
30. **Microsoft, Xbox Accessibility Guideline 101 (Text display)**: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101.
    Taken from it: minimum body height (ascender to descender) of 18 px at 1080p on PC and 26 px on console.
    Text scales to 200%. Glyph inner text meets the same minimum. Text over gameplay gets an outline or plate.
    Lines are ≤80 chars, sentence case, and left-aligned.
31. **Fagerholt & Lorentzon, "Beyond the HUD" (Chalmers MSc thesis, 2009)**:
    https://publications.lib.chalmers.se/records/fulltext/111921.pdf. Read chapter 10. Taken from it: the
    taxonomy of non-diegetic, meta-perception, meta-representation, geometric (spatial) and diegetic UI, plus
    signifiers. Non-diegetic suits high-detail data; spatial suits navigation and environment; a fully diegetic
    UI is not automatically more immersive.
32. **The Famicast, "Immersive & impressionable UI" (BotW CEDEC talk summary)**:
    https://www.thefamicast.com/2017/12/part-2-immersive-impressionable-ui.html. Taken from it: "only display
    information when necessary". Pro HUD removes more. "Borderless, simply colored text with zero frills".
    Animate an element to get attention instead of enlarging it.
33. **Material Design snackbar spec** (via search excerpt; the m3 page is JS-rendered and was not opened):
    https://material.io/components/snackbars. Taken from it: 4–10 s on screen, one at a time, queued.

---

## (b) Principles per topic

### B1. Character construction (Three.js primitives → authored forms)

#### B1.1 Proportions (adult, anime-influenced, 6.5–7.5 h)
- **Pick a canon per archetype and derive everything from `h = height / heads`.** Adults: 7.0–7.5 h.
  A heroic or officer type: 7.5–8. Young adult or slight: 6.5–7. Never go below 6.5 for adults; a bigger
  head reads younger (src 7, 8).
- For a 1.75 m male at 7.25 h, h ≈ 0.241 m. Female at 1.65 m and 7 h: h ≈ 0.236 m.
- **Vertical landmarks** (measured down from the chin, src 4, 5):
  - Nipple line at 1 h.
  - Navel at 2 h.
  - Crotch and bottom of the glutes at 3 h.
  - The crotch sits at or slightly above half the height. For an anime leg read, put it at 0.50–0.52 × height [derived].
  - The knee centre is midway between the ASIS and the floor (src 4). In practice that is about 0.28 × height.
- **Widths in h** (src 4, 5, 7):

  | | Shoulder (deltoid to deltoid) | Hips (trochanters) | Waist |
  |---|---|---|---|
  | Male | 2.0–2.33 h | 1.35–1.45 h, narrower than his shoulders by about 1:1.18 | about 1.15–1.3 h [derived] |
  | Female | 1.65–1.8 h | 1.5 h, about equal to her shoulders | about 1.0–1.1 h [derived] |

- **Limbs:**
  - The arm from the armpit is 3 h.
  - Acromion→elbow equals elbow→knuckles (src 4).
  - The elbow falls at waist or navel level and the wrist at the trochanter/crotch level.
  - The hand (wrist to fingertip) is as long as the face, chin to hairline, about 0.75 h (src 7).
  - The foot is 1.05–1.1 h (src 4).
  - Thigh (crotch to knee bottom) equals shin (knee bottom to sole) (src 8).
- **Do not use one rig of proportions for everyone.** Proportion is the first silhouette differentiator.
  TF2 differentiates classes by "body proportions, weapons and silhouette lines" (src 2).

#### B1.2 Head, neck, shoulders
- **Head:**
  - Build it as a cranium ellipsoid plus a separate lower-face wedge (jaw → small chin), not one sphere (src 8).
  - The front of the face is a flatter plane. The side planes turn at the cheekbones. The jaw line rises to the ear.
- **Landmarks** (fractions of head height, measured up from the chin, src 8):
  - Nose tip slightly above 1/4. Mouth about 1/8.
  - Eyes at or below the vertical midline.
  - Ear just behind the vertical midline, top near the eye line.
- **Neck:**
  - An oval column, never vertical. It tilts forward 10–20° from the shoulders into the head [derived from src 8].
  - Width about 0.45–0.55 of head width (male) and 0.38–0.45 (female) [derived].
  - It enters the skull behind the jaw, not under the chin's centre.
- **Trapezius:**
  - A sloped wedge from the neck down to the acromion. The shoulder line is a shallow "A", never a horizontal bar.
  - The clavicles form a shallow V from the pit of the neck (src 6).
- **Shoulder:**
  - The deltoid is a cap that overlaps the top of the arm. The arm hangs from below and slightly in front of the shoulder point.
  - The deltoid's bottom inserts about 1/3 down the upper arm [convention].

#### B1.3 Torso: ribcage, waist, pelvis
- **Masses:** two separate masses with their own transforms:
  - an egg-shaped ribcage, tilted back slightly so the chest plane faces a little up;
  - a bucket-shaped pelvis, tilted forward slightly (ASIS just ahead of the pubis, src 6);
  - between them, an abdomen/waist that is the narrowest point and the twist zone. At rest the gap is about
    one hand width at the side [convention, Proko].
- **Side view** is an S: chest forward, lumbar curve in, glutes back.
- **Front view:** the centreline runs pit of neck → sternum → navel → pubis as a C or S curve in any pose
  (src 6), never a straight vertical.
- **Rig/pose:** at least three yaw/roll bones: pelvis, waist (abdomen), chest. In posing and locomotion they
  counter-rotate: shoulders tilt opposite the hips (contrapposto) and the thorax yaws opposite the pelvis
  (src 8). If pelvis and chest move as one block, the figure reads as "archaic kouros" or robotic.

#### B1.4 Limbs, knees, elbows
- **No constant-radius cylinders.** Build each segment as a lathe or loft with an authored profile (src 8):
  - **Upper arm:** the deltoid bulge at the top, the biceps bulge mid-front, the triceps behind.
  - **Forearm:** widest about 1/3 below the elbow. It tapers to a flattened wrist, oval about 2:1 wide:deep.
  - **Thigh:** widest in the upper-middle. In side view the front bows forward. It narrows to the knee.
  - **Lower leg:** a short widening to the calf peak about 1/3 below the knee (the calf swells *behind*),
    then a long taper to the ankle. The shin front stays straight.
- **Front view legs:** in, out, then in again past the knee (src 8).
- **Knees and elbows:**
  - Show them as hints: a flattened front plane with a patella bump, and an elbow point at the back.
  - A horizontal ring or seam at the joint is "the tell of a tube construction" (src 8).
  - Overlap the segment meshes and blend the silhouette. Never butt-join two cylinders at a sphere.

#### B1.5 Hands and feet (low-poly but believable)
- **Hand** (minimum believable) [derived]:
  - Palm: a wedge, thicker at the heel of the hand and wider at the knuckles.
  - Fingers: one or two grouped masses, about the same length as the palm, with a staggered knuckle arc
    (middle finger longest).
  - Thumb: a separate two-segment mass from the side of the palm, rotated 30–45° out of the palm plane.
  - Relaxed curl increases from index to pinky.
  - Wrist: narrower than the palm, oval.
  - A sphere or box "mitten" without a thumb reads as a mannequin.
- **Foot or shoe:** a wedge in side view. High instep, narrow heel, wider toe box, flat sole. A shoe adds a
  1.5–3 cm sole slab with a visible sole line and a slightly larger outline than the foot (src 8).
  Boots: a shaft ring at the top with visible thickness.

#### B1.6 Face for anime 3D
- **Simplify the planes:**
  - Front plane, two side planes, jaw wedge.
  - Nose: a small wedge or a single sharp point. Its shadow cue does most of the work, not full geometry.
  - Brow: a soft plane change, not a ridge.
  - Mouth: a line or a shallow notch.
- **Eyes are painted, not geometric.**
  - They are textures or decals on a nearly flat front plane, spaced about one eye-width apart.
  - In profile the iris foreshortens to a narrow oval with the upper lid over its top (src 8).
  - GGXrd keeps most information in mesh data, not textures, because of close-ups. For a distant
    first-person crowd, a canvas texture or shader-drawn eye is fine [derived].
- **Normal editing is mandatory for clean cel faces** (src 1, 9). "The slightest difference in the surface
  normal may end up as a huge blotch" (src 1).
  - In Three.js, after building the face geometry, overwrite face-region normals with `normalize(p - c)`,
    where `c` is the centre of a proxy ellipsoid (or transfer from a proxy mesh). The face then shades like
    a simple ball. Blend back to geometric normals at the jaw and neck [derived].
- **Cel threshold:**
  - Offset the threshold per vertex with a colour attribute (src 1). Mark always-shadowed areas: under the
    fringe, under the jaw onto the neck, inside sleeves, under the hair mass (src 8).
  - Keep the face lit with an "always lit" bias so it does not blotch.
- **Light:** one light vector per character rig, not only the world light (src 1). At minimum, clamp the
  light elevation the toon shader sees for characters so faces never flip to fully dark [derived].

#### B1.7 Hair as masses
- **Three sections** (src 8):
  - front clumps (fringe);
  - side clumps that split at their ends;
  - a back/top mass that follows the skull and ends in 2–4 clumps with varied bends.
- **Offset from the skull:** the volume sits 1.5–4 cm off the scalp [derived]. The silhouette must break
  the skull circle; a helmet sphere is the tell.
- **Clumps:** tapered wedges or curved cones, not cylinders. Vary their lengths. Tips point along a flow
  direction.
- **Shading:** a shadow under clumps onto the face and neck, and a single highlight streak (src 8).

#### B1.8 Clothing as layered objects
- **Draw the body first, then clothes over it** (src 8). A garment is a separate shell, never a recoloured
  body part.
- **Shell offsets from the skin** [derived; Reallusion gives no numbers, src 10]:

  | Garment | Offset |
  |---|---|
  | Fitted shirt or trousers | 0.5–1.0 cm |
  | Waistcoat | 1.0–1.5 cm |
  | Jacket | 1.5–3 cm |
  | Greatcoat | 3–6 cm, plus hang |

  Each outer layer clears the one beneath by at least 0.5 cm in the rest pose (src 10).
- **Support and hang:** garments hang from support points (shoulders, chest, waist) and fan out away from
  them. They "hug the shoulders, hang from the chest with a gap, and fan out at sleeve ends" (src 8).
  A coat's hem circumference is greater than the hip circumference, so it flares 5–15° away from the legs.
- **Visible edge thickness** sells cloth weight (src 10) [numbers derived]:
  - Shirt hem 0.4–0.8 cm. Coat hem and lapel 1–2 cm.
  - Build the hem as a turned-in lip (a short inward band or a second ring), so the edge has a light face
    and a shadowed underside.
- **Garment pieces to model explicitly**, each a separate small mesh that breaks the body silhouette:
  - collars that stand 3–5 cm;
  - lapels as flat plates with a notch;
  - cuffs as rings 0.5–1 cm larger than the wrist;
  - waistbands and belts as rings with a buckle;
  - placket or button lines;
  - straps crossing diagonally.
- **Folds:** concentrate them at joints (inner elbow, back of knee, waist) and at tension points (crotch
  "tension folds between the legs", src 8). Choose fold shapes that echo the silhouette (src 2).
- **Restrained asymmetry** [derived]: one or two asymmetric elements per character, for example a satchel
  strap diagonal, one rolled sleeve, a side-parted fringe or a single shoulder cape. Mirror everything else.
- **Value and colour** (src 2, 3):
  - Dark at the feet, lightest at the chest and face; the highest contrast at chest and face level.
  - Muted colours dominate, with small saturated accents.
  - Shadow colour shifts cool, the terminator band is slightly saturated and red, and shadows never go to
    black. GGXrd's shade colour is "lit × tint", so skin shade is reddish (src 1).

#### B1.9 Silhouette and shape language
- **Every archetype must be identifiable as a black silhouette** at the size it is usually seen. Test front,
  side and back, at about 40–60 px tall for a crowd member [derived; the method is src 2].
- **Differentiate on at least two of these axes:**
  - mass distribution (top-heavy, bottom-heavy, columnar);
  - headgear;
  - hem length and shape (short jacket, frock coat, apron, skirt);
  - a carried prop or tool;
  - stance.
- **Interior shapes** (shadow shapes, colour blocks) come second and must not compete with the silhouette (src 3).
- **Shape language** [convention, not sourced here]: round reads friendly or common; square reads stable or
  authority (Directorate officers); triangular or angular reads dynamic or threatening. Apply it per faction
  and keep it consistent across garments, props and architecture (TF2 used warm, natural and angular forms
  for RED against cool, industrial and orthogonal forms for BLU, src 2).

### B2. Stylized character pipeline, many characters without randomness
- **Valve's order** (src 3): silhouette → interior shapes → model sheet → 3D with three-quarter checks
  (paintovers) → skin → in game. Translated for code:
  1. Write an **archetype spec**: a proportion preset, a garment list, a palette, a stance, walk params and a
     prop. Do this before writing any geometry.
  2. Build a silhouette-only debug render, and approve each archetype against it.
  3. Build the body from authored profile curves, which can be shared.
  4. Add garment shells per archetype.
  5. Rig with pelvis, waist and chest separated.
  6. Give each archetype its own idle and walk parameters.
- **Constrained modularity, not sliders:**
  - Parts (heads, hair masses, coats, hats) share attachment conventions: neck socket, waist ring, wrist ring.
  - **Whitelist combinations per archetype.** A dock labourer never gets a frock coat.
  - Watch Dogs: Legion avoided "procedural soup" by anchoring generation on role and context tags, then
    filling in coherent detail (src 14).
- **Randomness only inside narrow, authored ranges** [derived]:
  - height ±3%, widths ±5%;
  - hue ±5° within the faction palette;
  - pick one of 2–4 authored hair and hat variants.
  - Never randomize proportions independently per limb.
- **Palette per role or faction:** 3–4 colours plus one accent. Muted base, saturated accent near the chest
  or face (src 2, 3).
- **LOD and readability at distance:**
  - Keep the silhouette classes at every LOD.
  - Drop sub-pixel parts (buttons, cuffs, straps under about 2 px) first.
  - Merge garments into the body silhouette next. The far LOD is the same silhouette, simplified.
  - Pool high-detail instances near the camera (AC Unity: 40 full AIs, 120 hi-res models, about 10k crowd, src 12).
- **Repetition:** avoid many identical characters side by side. Convey "the impression of repetition" rather
  than rendering every instance in full (src 2).

### B3. Locomotion and idle
- **Walk** (gait determinants, src 8):
  - Pelvic yaw ±4–8° (stylized), with the swing-leg hip forward.
  - Pelvic roll 3–5°, dropping on the swing side at mid-swing.
  - Lateral pelvis shift toward the stance leg.
  - Stance knee straight at heel strike, then flexed about 15° once the foot is flat.
  - Foot rolls heel→toe.
  - Thorax yaw opposite the pelvis at 0.5–1× its magnitude. Arms swing opposite their own-side leg.
  - At least one foot is always grounded, with a double-support phase.
- **Vertical bob:** two low points per cycle (just after each contact) and high points at passing.
  2–4 cm for a normal adult [convention]. Bigger for heavy or labouring archetypes, smaller for officers.
- **Overlap and secondary motion** [derived from src 16]:
  - Motion originates in the hips and travels up. Chest lags pelvis by about 1/16 of a cycle; head
    stabilises the gaze (counter-rotates).
  - Forearm lags upper arm by about 1/8 cycle (elbow follow-through).
  - Hair, coat hems and satchels lag 1/8–1/4 cycle with damping. Use a spring per hem bone, or a
    sine with a phase offset.
- **Archetype walks** (parameter sets, not new code) [derived]:

  | Archetype | Gait |
  |---|---|
  | Officer | Upright chest, short and stiff arm swing, minimal bob, longer stride |
  | Labourer | Forward lean 5–10°, wider stance, heavier bob, arms swing from the shoulder |
  | Merchant or clerk | Shorter stride, arms close, small yaw |
  | Elderly | Slower cadence, more knee bend, reduced pelvic yaw |

  Cadence is about 1.6–2.0 steps/s for adults [convention].
- **Idle** (src 15, 16):
  - Base loop of 2–4 s of breathing: 15–20 breaths/min relaxed, 20–25 alert.
  - Chest and shoulders rise 1–2 cm and the belly leads the chest.
  - Weight shift between feet every 4–8 s.
  - One-shot fidgets every 30–60 s on per-NPC random timers. Desynchronize all phases per NPC.
  - Macro variation every 3–6 loops.
- **Rest stance is contrapposto** (src 8): weight on one leg, that hip up and the same-side shoulder down,
  each by 3–6° [derived]. Shoulders twisted slightly off the hip axis. The free knee is bent.
  A symmetrical T or A stance at rest is the mannequin tell.

### B4. NPR: cel bands and outlines

#### B4.1 Cel bands
- **One hard band**, plus an optional thin "outer shadow" band. AA the band edge with
  `smoothstep(t - w, t + w, NdotL)`, where `w ≈ fwidth(NdotL)` or 0.01 (src 18). A raw `step` aliases.
- **Shadow colour** is authored per material (lit colour × tint), not lit × ambient (src 1). Use warm-to-cool,
  with a saturated terminator (src 2).
- **Control the three inputs** of a cel shader: the threshold (a per-vertex offset), the light vector
  (per character), and the normals (edited) (src 1).
- **Rim highlight** can carry the silhouette where dark lines get heavy (TF2 used rim instead of outlines,
  src 2). Use `smoothstep(rim ± 0.01, (1 - NdotV) * NdotL^k)` (src 18).

#### B4.2 Outline methods and how each behaves with distance

| Method | Width behaviour | Distance problems | Fix |
|---|---|---|---|
| Inverted hull, extruded along the normal in world space | World-constant, so screen width falls as 1/d | Gaps at hard normals; fine at distance | Smooth normals in an attribute (src 19); clip-space extrusion for constant pixel width (src 19) |
| Hull with distance multiplier (NiloCat) | `width * saturate(abs(viewZ)) * fov`: screen-constant close, 1/d falloff far (src 25) | Thin, sub-pixel lines far away | Fade alpha with distance or fog |
| Post depth/normal Sobel or Roberts | Screen-constant (kernel in texels) | **Noisy at distance**: see the causes below | B4.3 |
| Surface/object-ID edge (src 22) | Screen-constant | Deterministic; no threshold noise | IDs per mesh or part; still apply distance fade |
| Rim/fresnel | Shape-dependent | Breaks on flat or boxy forms (src 19) | Characters only |

GGXrd chose hulls because they preview in the DCC and allow per-vertex width and erasure (src 1). Sable uses
uniform post lines (src 29). For a city of code-built primitives, keep the post pass for the world, and
consider an **ID or hull path for characters** [derived].

#### B4.3 Why depth/normal post edges get noisy or smeary at distance
1. **Constant screen width.** A 2–3 px line around a 20 px tall figure is 10–15% of its size. Lines
   dominate distant objects and turn them into ink blobs. Sources scale width or threshold with depth
   (src 17, 20, 24).
2. **Sub-pixel geometry.** Railings, limbs and cables thinner than 1 px pop in and out of the depth buffer
   between frames. The edge detector turns this into flickering dashes (src 21, the 1-px sub-pixel case).
3. **Depth discontinuities scale with distance.**
   - Raw depth deltas between adjacent pixels on any slanted surface grow with z, so a fixed threshold fires
     on distant ground and walls (src 17's grazing-angle artifact).
   - Thresholds must be depth-relative (`threshold * depth`) and angle-relative (NdotV).
4. **Normal noise.** Smooth-shaded low-poly primitives have interpolated normals that vary per pixel.
   Distant faceted geometry packs many normal changes into few pixels, producing speckle. Normal edges are
   less reliable than depth for outer boundaries (src 23 weights depth ×25).
5. **Colour or luma edges** pick up texture and lighting contrast, which at grazing angles and distance is
   aliasing, not form.
6. **Resolution scale.**
   - When the drawing buffer is below the CSS size (pixel ratio < 1), a 1–1.5 texel line becomes a
     2–2.5 px *bilinear-smeared* line on screen.
   - Downsampling smooths thin features away and makes AA harder (src 21).
7. **AA order.**
   - FXAA after the edge pass blurs 1-px lines into grey smears (src 27).
   - Without MSAA on the scene target, the depth and colour inputs are aliased, and the edges inherit the
     stair-steps (src 27, 28).
   - A hard `step` threshold aliases (src 27).
8. **Fog not applied to lines.** The scene fades into fog, but a post line drawn after it stays dark. Far
   objects get dark contours on pale, fogged forms, which reads heavy and noisy. Linework treats "fade in
   distance" as a first-class setting (src 20).
9. **Stylized wobble or noise at 1-px scale** (hash displacement, src 23) becomes temporal shimmer at
   distance when the camera moves.
10. **Depth precision.** A small near plane spends depth precision near the camera. Precision at a distant
    z falls roughly as z²/near [convention]. Second-difference detectors amplify the quantization.

#### B4.4 Known fixes (general)
- **Width by distance:**
  - `w = mix(wNear, wFar, smoothstep(dNear, dFar, z))` with wNear 2–3 px and wFar 1.0 px (src 24 uses 3→1).
  - Never below 1.0 px. Below that, fade alpha instead of thinning.
  - Optionally a NiloCat-style 1/d falloff past a distance (src 25).
- **Thresholds:** depth-relative (`* depth`) and angle-relative (`* (1 + 7 * saturate((NdotV - 0.5) / 0.5))`)
  (src 17). Use `smoothstep(lo, hi, e)`, not `step` (src 24, 27).
- **Fade lines with fog:** compute the same fog factor as the scene. For FogExp2 that is
  `f = 1 - exp(-(density * d)^2)`. Then `ink *= 1 - f`, or blend the line colour toward the fogged surface
  colour. Linework exposes start and falloff (src 20).
- **Silhouette-only at range:**
  - Suppress normal, crease and colour edges beyond about 25–40 m.
  - Keep only depth silhouettes, and fade even those past the fog midpoint.
- **Line colour from the scene colour** × a dark tint (src 24), not flat black. Far lines approach the local
  colour and disappear naturally.
- **Full-resolution edge pass:** run the edge pass at ≥ 1.0 device px even when the scene renders lower, or
  hold the pixel ratio ≥ 1 for the ink.
- **AA:**
  - MSAA on the scene target (`samples: 4`) so the inputs are AA'd (src 28).
  - Smoothstep edges. If post AA is used, prefer SMAA before OutputPass (src 28) over FXAA, or skip post AA
    and AA the line analytically.
- **ID buffer:** for characters and props, an object or surface ID buffer gives crisp, author-controlled
  silhouettes independent of thresholds (src 22). In Three.js, write IDs with `scene.overrideMaterial` or a
  second MRT target as HalfFloat (src 22, 23).
- **No wobble at distance:** scale the displacement amplitude by `1 - smoothstep(10, 30, z)` [derived].

### B5. Compact HUD
- **Taxonomy** (src 31):
  - Non-diegetic overlay is for precise numbers.
  - Spatial/geometric is for "where" (markers, prompts at the object).
  - Diegetic is for "what the world says" (signs, lamps, banners).
  - Meta-perception is for state felt by the body (vignette, tint).
  - A fully diegetic UI is not automatically better. Choose per piece of information.
- **Show information only when necessary** (src 32). Persistent elements are the minimum the player needs
  every second. Everything else is contextual and timed, like BotW's stamina wheel. Provide a "pro" or
  minimal toggle (src 32).
- **Get attention with animation, not size.** Pulse, flash or tint an element; don't grow it (src 32).
- **Typography** (src 30, 32):
  - Plain, borderless, simply coloured text. One family, two weights, sentence case for lines.
  - Minimum essential text is **18 px body height at 1080p** on PC. Body height is ascender to descender,
    so a CSS font-size of about 18–20 px [derived].
  - Glyphs inside key icons must meet the same minimum. Support scaling to 200%.
- **Text over the 3D view** needs an outline, shadow or plate (src 30, Fenyx example). Prefer a soft text
  shadow or a local scrim over full chrome panels.
- **Toasts:** 4–10 s, one at a time, queued (src 33). Keep them to one line, verb first.

---

## (c) What procedural-primitive characters get wrong (structural causes)
1. **Everything is a constant-radius primitive.** Cylinders, spheres and boxes have no rhythm: no bulge
   offset front to back, no taper, no S-curve. Real and stylized limbs have asymmetric profiles (calf behind,
   shin straight, thigh bowed forward). Use lathe or loft profiles.
2. **Joints are butt-joins or spheres.** Knee and elbow balls or rings are "the tell of a tube construction".
   Overlap segments and author joint planes.
3. **One torso block.** No separate ribcage, waist and pelvis means no twist, no contrapposto and no S-curve.
   Posture reads as a kouros or mannequin.
4. **Horizontal shoulder bar and vertical neck.** There is no trapezius slope or forward neck tilt, and the
   arms hang from the box corners instead of under a deltoid cap.
5. **Clothing is a recolour of the body.** No shell offset, no hem thickness, no layers, no hang. The
   silhouette never breaks, so everyone has the same outline.
6. **Head is a sphere with features stuck on.** No jaw wedge, chin or ear placement. The hair is a helmet.
   Geometric normals blotch under a cel threshold (src 1).
7. **Randomness instead of design.** Per-part random colours and sizes give "procedural soup": incoherent
   palettes and no archetype silhouettes (src 14). Variety belongs between authored archetypes, not within
   random sliders.
8. **Uniform detail density.** No focal hierarchy, so value and contrast are the same at the feet and the
   face. TF2's gradient (dark feet → light chest) and its chest-level contrast are missing (src 3).
9. **Default normals and global lighting** under cel shading produce blotches. Normals, threshold and light
   need authoring (src 1).
10. **Lockstep animation.** Pelvis and shoulders rotate together, there is no overlap, and every NPC breathes
    in phase. The idle is a frozen T or A.

---

## (d) NPR fixes ranked by payoff, for a depth/normal Sobel-style post outline

### Observed in `src/world/ink-renderer.ts` and `src/main.ts` (read only, not edited)
- **Ink ignores fog.** The ink fades only 75% between 40 and 140 m: `fade = 1 - smoothstep(40,140,d)*.75`.
  The scene uses `FogExp2` with density 0.0078–0.02 (`atmosphere.ts`). At density 0.011, fog is about 54%
  at 80 m while the ink there is still about 74% strength. The result is dark contours on pale forms, the
  "heavy" far field.
- **Line weight is in render-target texels.** It runs `mix(3.0, 1.2, smoothstep(6,80,d))` with vnoise
  modulation of ×0.8–1.25. The pixel ratio can drop to 0.6 (`pixelRatio()`, and `strain` lowers it under
  load), so a 1.2-texel line becomes about 2 CSS px, bilinear-upscaled. That is the smear. With the noise,
  far lines drop to about 1 texel and break into dashes.
- **Wobble of ±0.8 texel** at all distances: temporal shimmer.
- **Low quality sets `samples: 0`**, so the depth and colour inputs are aliased.
- **The colour/luma edge** stays active until 14–42 m and is a main source of mid-range noise.

### Ranked fixes

| # | Fix | What to do | Cost |
|---|---|---|---|
| 1 | Fade ink with the scene's fog factor | Pass `fogDensity` (and fog colour) as uniforms and compute `f = 1 - exp(-(density*d)^2)` from `nearest`. Use `ink *= (1 - f)`, or lerp `inkColor` toward the fogged pixel colour by `f`. Keep the existing fade as an extra cap. | Trivial |
| 2 | Never draw ink below 1 device px on screen; decouple ink resolution from the dynamic pixel ratio | Express weight in **CSS px**: `weightTexels = weightCss * pixelRatio`, clamped to ≥ 1.0 texel. When pixelRatio < 1, fade line alpha instead of thinning. Better still, render scene and depth at the reduced ratio but the ink composite at ≥ 1.0. | Low |
| 3 | Silhouette-only beyond about 25–35 m | Fade `crease` and `colorEdge` to 0 by 25–35 m (colour edge sooner, by about 15–20 m). Keep only `silhouette`, and let #1 fade it past the fog midpoint. | Trivial |
| 4 | Remove wobble and width noise at distance | Multiply the wobble amplitude and the vnoise width modulation by `1 - smoothstep(8, 25, d)`. Distant lines should be steady and uniform (src 23 noise; src 29 Sable's uniform lines). | Trivial |
| 5 | Floor the far weight at 1.0 px and soften the threshold | Set `wFar = 1.0` CSS px with alpha falloff. Widen the `silhouette` smoothstep band slightly at distance so sub-pixel pops fade rather than toggle. | Low |
| 6 | Keep MSAA on the scene target at both quality levels where possible | Use `samples: 2` on low rather than 0 (src 28). Do not add FXAA after ink (src 27). If more AA is needed, apply SMAA *before* the grade and output stage (src 28). | Low or medium (GPU) |
| 7 | Exclude sub-pixel props from line input at range | Put thin props (railings, cables, bunting) on a layer, or give them an alpha class that skips ink beyond about 30 m, so their pops don't become dashes (src 21). | Medium |
| 8 | Character silhouettes from an ID buffer or a hull | For the crowd, write an object ID (or a "character" class) into the alpha or MRT, and draw the silhouette where the ID differs (src 22). Or use an inverted hull with NiloCat's distance multiplier (src 25) and vertex-colour width (src 1). This gives clean, controllable character lines at any distance. | Medium |
| 9 | Depth precision | Raise `camera.near` from 0.08 to about 0.15–0.25 if the first-person view allows; second-difference detectors amplify depth quantization. Or switch to a logarithmic depth buffer. | Low, test clipping |

---

## (e) HUD principles with numeric targets

**Footprint** [derived targets; the sources give principles, not area numbers]:
- Persistent HUD **≤ 5% of the screen area at 1920×1080** (about 100k px²). Target two small corner clusters,
  each ≤ about 320×90 px, plus a crosshair. Everything else is contextual.
- The interaction prompt sits near the crosshair or anchored to the target object (spatial, src 31). At most
  two lines: verb + object, and a key glyph.
- Margins of 24–40 px from the screen edge, inside the title-safe area [convention]. No full-width bars.

**Hierarchy** (three tiers) [derived from src 31 and 32]:

| Tier | What | Behaviour |
|---|---|---|
| 1, always visible | The 1–3 numbers the player acts on every few seconds (for example funds or day/time, one objective line) | Persistent |
| 2, contextual | Prompts, the target name, a meter only while it changes (BotW stamina, src 32) | Fades out after 2–3 s of no change [derived] |
| 3, on demand | Ledgers, faction standings, the city overlay | A hold-key or menu; never persistent |

**Toasts:** one at a time, queued, on screen 4–10 s (src 33). One line of ≤ about 60 characters (well under
XAG's 80-character line limit, src 30). Verb-first. They slide or fade in 150–250 ms [convention] and
honour `prefers-reduced-motion`. Merge duplicates ("+3 deliveries") instead of stacking.

**Typography** (src 30, 32):
- Essential text ≥ 18 px body height at 1080p, so a CSS font-size of about 18–20 px. Numerals can be
  20–24 px with tabular figures.
- Secondary labels can go smaller (12–14 px small caps) only if they are non-essential and scale with
  the 200% option.
- One family, two weights. Sentence case for lines. Left-aligned.
- Contrast ≥ 4.5:1 against the actual backdrop [WCAG convention]. Use a text shadow or 1 px outline over
  the 3D view (src 30).

**Backing:**
- Prefer **no chrome**: plain text with a soft shadow, or a local scrim (a dark radial or linear gradient at
  30–50% opacity behind the text block only) [derived].
- Where a frame suits the fiction, use a diegetic motif (paper slip, brass plate) at small size, not a card.

**Avoiding the SaaS dashboard look** [derived from src 31 and 32 and the design-quality policy]:
- No rounded-rectangle cards with drop shadows, no badge pills, no icon + label + value tiles in a grid,
  no progress bars for every number.
- Show deltas and state changes ("+12 ◦ steam") briefly, not running totals everywhere.

**Management overlay density:**
- Show the overlay only on demand.
- Aggregate to a few readings per district rather than per building.
- Use spatial markers in the world (geometric UI, src 31) rather than lists.
- Fade world labels by distance and occlusion.
- Cap visible markers (for example ≤ 7 at once [convention, Miller-style chunking]).

