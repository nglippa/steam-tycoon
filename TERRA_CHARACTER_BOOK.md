# Terra Character Book

The source of truth for how people in Terra are designed, built, varied, animated and checked.
Where this book and an older people section of `ART_DIRECTION.md` disagree, this book wins. The
sections it replaces are listed in [What this supersedes](#what-this-supersedes).

It is written for whoever builds the next figure, whether a person or a coding agent. Read
sections 1 to 4 before touching geometry. Sections 5 to 12 are the rules for each part. Section 13
is the acceptance test; a figure that has not passed it is not finished.

Sources and the reasoning behind the numbers are in the `stylized-game-characters` skill
(`~/.agents/skills/stylized-game-characters`) and the `figure-construction` skill it builds on.

---

## 1. Visual target

Anime-influenced, stylized adults who live and work in an illustrated steampunk sky city. They are
drawn with the same hand as the buildings: flat cel tone, a dark line, graphic grime. The world
reference is Thief and Dishonored; the people are weathered, dressed for a trade, and serious.

The test for every figure: **would an artist plausibly have drawn this person on purpose?**

Terra's people are not:

- Roblox, Minecraft or Funko figures (big head, pod limbs, block hands);
- generic low-poly mannequins, or primitives assembled into a body;
- chibi, unless a specific character is authored that way;
- photoreal;
- random procedural people, where a seed designs the character.

### Why the old figures read as generated

The audit of the old builder found six structural causes. Every rule in this book answers one of
them. Small corrections on top of the old construction made it worse, because each fix added
another primitive.

1. **A four-head figure.** The body below the chin was already built at close to adult lengths,
   but it carried a head 0.55 units tall on a 2.13 unit figure, twice the size the body calls for.
   That one ratio is most of the toy read.
2. **The body was the clothing.** The torso tube was the shirt, the thigh tube was the trouser leg.
   Nothing sat over anything, so every silhouette was the same sausage outline in another colour.
3. **Rigid tubes met at butt joints**, hidden by a ball at the elbow and nothing at the knee.
   Walking and sitting opened them.
4. **Head, hair, hands and feet were a primitive kit:** an egg, a hemisphere cap, cones, mittens,
   pods.
5. **Variation was `seed % n`.** Build was tied to skin tone, the lower half of the whole crowd
   wore one costume, and no story character had a designed look.
6. **Two sizes of form only:** big smooth masses and tiny buttons, with no mid-scale shapes that
   have thickness (collars, lapels, cuffs, pockets, bags).

---

## 2. Units and the rig contract

Heights in this book are **above the sole**, in figure units, at group scale 1. One unit is about
a metre. In `citizens.ts`, body-local `y` is the height above the sole plus 0.01.

**h** is one head: crown to chin, without hair or hat.

The gait solver, the activity poses and the crowd batch depend on the pivots below. They do not
move. The rebuild changes what hangs on them.

| Pivot | Height | Notes |
|---|---|---|
| Sole | 0 | Flat. The gait rolls it heel to ball. |
| Ankle | 0.045 | The built rig's ankle pivot. `gait.ts` assumes the flat sole is `SOLE` = 0.052 under the ankle, so the shoe's sole plane is built at -0.052 and a standing figure is 7 mm taller on the sheet than the table says (height is measured to the lowest point of the shoe). |
| Knee | 0.54 | Shin length 0.495 |
| Hip joint | 0.97 | Thigh length 0.43. Half-spacing 0.09 × family width. |
| Crotch | 0.845 | |
| Waist pivot (cloth below the belt) | 1.07 | |
| Shoulder joint | 1.43 | Half-spacing by family, section 3 |
| Elbow | 1.18 | Upper arm 0.25 |
| Wrist | 0.94 | Forearm 0.24 |

Three things about the rig do change, all inside the builder:

- **The head.** It shrinks to one **h** and its pivot moves from the middle of the skull to the
  top of the neck (section 6).
- **Cloth below the belt** hangs from the pelvis, not from the chest.
- **Stature** comes from a uniform group scale. The old non-uniform scale squashed heads, faces
  and hats, and is not used again.

Figures are rigid groups, not skinned meshes. The crowd is drawn as a handful of `BatchedMesh`
draws, and a skinned mesh cannot be batched. Every joint rule in section 5 exists to make rigid
segments look continuous.

---

## 3. Proportion system

### The canon

Terra's adults stand **about 6⅔ heads tall**. That is a little bigger in the head than a realistic
7½, which keeps the anime influence and keeps a face readable at ten metres, and it is nowhere
near the old four.

With the chin at 1.60 and **h** = 0.285, a standard adult is 1.885 units tall (the chin is 1.575 for slim and 1.616 for sturdy, so that every family stands 6.5 to 6.8 heads on the sheet). The mouth lands at 1.637, about 9 cm below where the old head put it (1.725), so the hand-to-mouth pose (the bite) needs a retune of about 9 cm; the head was not raised and the neck was not lengthened to avoid it.

| Landmark | Height | Rule |
|---|---|---|
| Crown | 1.885 | chin + h |
| Hairline | 1.844 | .857 H: the third third of the Loomis head (section 6) |
| Brow | 1.752 | .535 H; the ball's equator is at .571 H |
| Eye line | 1.724 | .435 H, below the middle of the head |
| Nose tip | 1.677 | .26 H (oval), .25 to .29 H across the shapes |
| Mouth | 1.637 | .13 H, between .12 and .15 H |
| Chin | 1.60 | |
| Pit of the neck | 1.49 | the neck shows about 0.4 h in front |
| Top of the shoulder | 1.47 | |
| Chest line | 1.355 | a third of the way from chin to crotch |
| Waist, navel | 1.10 | two thirds of the way; the narrowest point |
| Crotch | 0.845 | 45% of the height; long in the leg, as anime is |
| Fingertips, arm hanging | 0.75 | mid-thigh |

### Three families, two frames

A family is an authored set of ring tables, not a width multiplier. Each has its own neck, slope of
shoulder, belly and limb profile. Do not derive one from another by scaling.

Each family comes in two frames. The **broad** frame is shoulder-led: the table gives shoulders wider than hips by about 1.5 to 1 (.57 against .36 for a standard adult; measured on the built, dressed figure .58 against .38). The **narrow** frame has shoulders and hips about equal, a higher and smaller
waist, and a slimmer neck and wrist. Frames are not tied to a wardrobe; a narrow-framed foundry
worker and a broad-framed stallholder are both valid.

Widths are full widths, front view, of the body under the clothes.

| | Slim | Standard | Sturdy |
|---|---|---|---|
| Heads tall | 6.8 | 6.65 | 6.5 |
| Head height **h** | 0.275 | 0.285 | 0.295 |
| Shoulders, broad frame | 0.50 | 0.57 | 0.64 |
| Shoulders, narrow frame | 0.45 | 0.50 | 0.56 |
| Chest depth | 0.20 | 0.23 | 0.27 |
| Waist, broad / narrow | 0.26 / 0.23 | 0.30 / 0.27 | 0.37 / 0.33 |
| Hips, broad / narrow | 0.32 / 0.34 | 0.36 / 0.38 | 0.40 / 0.43 |
| Neck width | 0.098 | 0.108 | 0.128 |
| Upper arm, widest | 0.075 | 0.09 | 0.11 |
| Wrist | 0.045 | 0.05 | 0.058 |
| Thigh, widest | 0.125 | 0.145 | 0.17 |
| Calf, widest | 0.095 | 0.108 | 0.125 |
| Ankle | 0.06 | 0.066 | 0.075 |
| Hand, wrist to fingertip | 0.185 | 0.19 | 0.20 |
| Shoe length | 0.27 | 0.285 | 0.30 |

What separates the families beyond width:

- **Slim** has a longer-looking neck, a slight forward set of the head, sloping narrow shoulders,
  and clothes that hang with more gap.
- **Standard** is the reference.
- **Sturdy** has a short thick neck, heavy sloped trapezius, a belly that carries forward of the
  chest line, thick forearms and calves, and a lower visual centre. Sturdy is mass, not a wide
  version of standard.

**Stature** is a uniform group scale between 0.96 and 1.04, chosen with the look, never per axis.

**Elder** is a posture and detail modifier on any family: head and shoulders forward, a little
more bend at the knee, shorter stride.

**Children** are their own authored family at about 5½ heads with a narrow frame. A child is never
an adult scaled down: its proportions are its own, built on the adult rig, and the builder then
sets the whole figure at .72 (times its stature), so the crown stands at about 1.36 m, at an
adult's chest to shoulder. The child owns that size; a spawn site never scales it again.

---

## 4. Silhouette rules

Design the outline before any interior detail. A character must be identifiable without its face.

Every cast member passes four silhouette checks as a solid black shape:

1. front;
2. three-quarter;
3. side;
4. distance: the same shape at 40 to 60 px tall, which is how a person is usually seen.

To be told apart at distance, two cast members must differ on at least two of these:

- **mass**: top-heavy, bottom-heavy or columnar;
- **headgear**: kepi, helm, flat cap, bowler, top hat, headscarf, bare head;
- **hem**: short jacket, long coat, apron, skirt, greatcoat;
- **carried or worn load**: satchel, tool roll, crossbelt, basket;
- **stance**.

Three sizes of form, in this order of importance:

1. **Primary:** head and hat, torso mass, hem shape, legs.
2. **Secondary, with real thickness:** collar, lapel, cuff, belt, pocket, bag, apron bib, boot
   top. The old figures had none of these. They are what makes a figure look dressed.
3. **Tertiary:** buttons, buckles, stitching. Few, and never relied on for the read.

Interior shapes echo the outline and never compete with it. Value runs dark at the feet to light
at the chest and face, with the strongest contrast at the collar.

**Shape language by side.** Civilians are rounded and soft-edged: slumped shoulders, worn hems,
caps that have lost their shape. The Ordinance is squared and vertical: boards on the shoulders,
straight hems, stiff collars, hard hat lines. The Embers are civilians; they are marked by one
small thing, never by a uniform.

### Telling the dark coats apart

At ~50 px a long dark coat is a dark column, so every cast that might wear one carries its own
light shape or outline, from the colours chapter 10 already allows:

- **Garrison soldier:** the belt and crossbelt in pipeclayed bone over the green-charcoal
  greatcoat: a light diagonal and waistline (at least four times the coat's value).
- **Inspector:** stays the plain dark column, squared at the shoulder by wider boards edged in
  bone, with bone piping on the high oxblood collar under the jaw, and the round helm.
- **Older mechanic:** never in a dark coat: a canvas, stone or bone shop coat with its sleeves
  rolled, or shirt sleeves and a canvas work apron (at least three times the Ordinance's value).
- **Sturdy against standard:** a sturdy figure is not the standard outline scaled up. The sturdy
  stallholder's skirt is cut fuller from the hip (its hem at least 1.15 times the standard's).

`tests/cast-reads.test.ts` holds these.

---

## 5. Body construction

The body is a reference form. Most of it is never drawn, because clothes cover it. It still has to
be defined, because every garment is measured from it.

### The loft

Parts are lofts of authored cross-sections, not cylinders and not plain ellipses. A cross-section
needs:

- a width and separate **front** and **back** depths, so a calf can swell behind a straight shin;
- a forward or backward offset of the whole ring;
- a squareness, so a chest or a boot toe can have a flatter face than its sides.

A part whose rings are all plain ellipses of slowly changing radius is a sausage. Reject it.

### Torso

Two masses with their own transforms, joined at the waist.

- **Ribcage:** an egg, widest at the chest line, tilted back a little so the chest faces slightly
  up. The front is flatter than the sides.
- **Pelvis:** a bucket, tilted forward a little, widest at the hip joints, set back into a seat,
  closing under into the crotch.
- **Waist:** the narrowest ring and the twist zone. The ribcage and pelvis counter-rotate here on
  every stride, so the two overlap by at least 6 cm and the outer garment covers the overlap.
- From the side the torso is an S: chest forward, small of the back in, seat back.

**Rule: the torso is an S in profile (People XXVI).** The body reference carries the S, so every shirt, waistcoat, coat and belt cut from it carries it too: the shoulder blades stand 2 to 2.5 cm behind the small of the back, the small of the back and the waist's front draw in 1 to 1.8 cm, the seat stands 2.2 to 3.8 cm out behind, and the chest .6 to 1.9 cm forward (`blade`, `lumbar`, `seat`, `chestF` in `body.ts`, by family and frame: the narrow frame has the fuller chest and seat, the sturdy family the least waist to draw in, since its belly carries forward). Widths, ring heights and triangle counts are unchanged. A back line straight from the collar to the hip is the fail (`tests/body-form.test.ts`).

### Neck and shoulders

- The neck is an oval column that **leans forward** 10 to 20 degrees from the shoulders into the
  skull, and enters the skull behind the jaw, not under the centre of the chin.
- The trapezius slopes from the side of the neck down to the point of the shoulder. Seen from the
  front the shoulder line is a shallow A. A horizontal bar with a pin for a neck is the mannequin.
- The **shoulder cap belongs to the arm** and turns with it. The arm hangs from below and slightly
  in front of the point of the shoulder.
- At shoulder height the ribcage is narrower than the shoulder joints. The arm is never buried in
  the chest. Under a raised arm there is an armpit: the side of the ribcage, visible.

### Joints between rigid segments

There is one technique, used at every joint that bends:

> Both segments end in a rounded cap of the **same radius and the same material**, centred exactly
> on the pivot.

The two caps share a centre, so the outline stays continuous at any angle and no gap can open. It
replaces the butt joint and the visible elbow ball. Then, on top:

- **Knee:** the front of the cap is flattened with a small kneecap bump, carried on the thigh. The
  trouser breaks here: the shin shell starts as a slightly wider cuff over the cap. No ring, no
  band, no stitched hem.
- **Elbow:** a point at the back, carried on the upper arm. The sleeve creases on the inside.

**Rule: the elbow is a landmark (People XXVI).** The upper arm tapers from its fullest, a third of the way down, into an elbow narrower than it (under .9 of its width) and than the forearm's swell just below (the forearm's widest ring is 1.05 of its width); the elbow's point stands about a centimetre out behind. A sleeve draws in over the joint (`ELBOW_GATHER`, 9 mm under its offset, with the upper and forearm sleeves sharing that radius at the cap) and swells again below it, so a sleeve breaks at the elbow, bent or straight, and is never one tube from shoulder to cuff (`tests/body-form.test.ts`).
- **Hip:** the thigh ends in a cap inside the pelvis shell. The pelvis has a leg opening, not a
  closed point the thigh passes through. Seated, the seat of the trousers or the skirt covers it.
- **Shoulder:** the cap is the deltoid. The garment's yoke or armhole overlaps it from the torso
  side.
- **Wrist and ankle:** covered by a cuff or a boot top that belongs to the forearm or shin and
  overlaps the hand or foot.

### Limbs

- **Upper arm:** fullest a third of the way down, front and back unequal.
- **Forearm:** widest a third below the elbow, tapering to a wrist twice as wide as it is deep.
- **Thigh:** fullest in the upper middle, bowed forward in side view, narrowing to the knee. From
  the front the legs run in, out, then in again past the knee.
- **Shin:** the calf swells behind, a third of the way down, then a long taper to the ankle. The
  front stays straight.

### Hands

A hand is as long as the face, chin to hairline. It is built from:

- a **palm** wedge, thick at the heel and wide at the knuckles;
- **fingers** in two masses, the index and the other three, the same length as the palm, with the
  knuckle line arched and the curl increasing toward the little finger;
- a **thumb** of two segments from the side of the palm, turned 30 to 45 degrees out of its plane;
- a **wrist** narrower than the palm.

The relaxed hand is a loose C. The grip socket stays in the palm with the handle along local z, as
now. No spheres, no boxes, no thumbless mittens.

**Rule: a hand reads as a hand at the game's sizes (People XXVI).** The fingers run on from the knuckles to about the hand's length in a loose C, never hooked back up past the knuckle line (that was a block or a hook about 12 cm long); the index is its own mass beside the other three, so the tips show a notch; the thumb stands off the front of the palm. Four sweeps and a palm loft, about 50 triangles more a hand.

### Feet

Shoes and boots, not pods. In side view a shoe is a wedge: narrow heel, high instep, wider toe box,
**flat sole**. It has:

- a sole slab 1.5 to 3 cm thick, slightly larger than the upper, so a sole line shows all round;
- a heel block;
- a toe that is rounded or squared, never a point;
- for boots, a shaft that is continuous with the foot, with a visible thickness at its top.

The sole and heel match the gait's `SOLE`, `HEEL` and `BALL`, so the planted foot sits flat.

---

## 6. Face language

Faces are **constructed, then drawn on**. The form carries the profile and the planes; the atlas
carries eyes, brows and mouth. Readable, restrained, never an emoji.

### Head form

The head is **derived, not tuned**: `src/world/people/headform.ts` computes every landmark from the head height **H** (chin to crown, no hair) and one of four parameter rows, using the Loomis ball-and-plane construction with a restrained anime shift (skill `figure-construction`, chapter 7, which the numbers below are taken from; the side-view landmarks are chapter 5). `head.ts` only builds geometry from it, and `tests/headform.test.ts` checks the ranges.

- **The ball.** Let t = H / 3.5. The cranium is a ball of radius **R = 1.5 t = .429 H** centred on the Loomis brow line (2 t = .571 H); it reaches the crown at the top. The head is as deep as the ball: **depth = .86 H** (the built head measures .85 H), with a rounded back of the skull. A head built from rings tuned in the front view comes out near .75 H deep, a coin from the side, with hats and hair sitting on it like helmets. Depth is never allowed below .84 H.
- **The side planes.** Each side of the ball is cut flat by a circle of radius t centred on the brow line; its top is the hairline (.857 H), its centre the brow, its bottom the nose base. Head **width** is .69 to .75 H by shape (the ball's width, not its depth).
- **The face plane.** The front of the face is a flatter plane hung off the front of the ball from brow to chin, the chin carried forward to about .8 R from the ball's centre. Below the mouth the plane is not a straight run to the chin: the skin dips a little under the lower lip (about .4 % of H at .1 H) and the chin stands about 1 % of H forward of the line at .045 H, so the profile has a chin and not only the corner where the face meets the jaw.
- **The jaw.** It runs from under the ear, through a rounded **jaw corner** at .14 to .19 H, to a rounded chin: the four shape rows below.
- **The ear.** In the back lower quarter of the side plane, **behind the depth midline**, tilted back, from about .5 H (just under the brow) to about .25 H (the nose base).
- **The neck** leaves behind the jaw from the underside of the ball, leaning forward, and is about .38 H across (half the head's width; never under .36 H). The neck that is drawn carries on above the body reference's top ring, up behind the jaw into the skull: its throat is set back under the jaw (so the jaw has an underside plane, chin to throat, in profile) and its back rises into the occiput, with its top closed. No rim, notch or step shows between the neck and the head in profile, even with the head nodded. The body reference, and so every collar, is unchanged.
- A **nose** in the geometry: a small wedge on the face plane that breaks the profile at .26 H. From the front it is a mark; from the side a nose. The brow is a soft change of plane, not a ridge.
- The head pivots at the top of the neck.

A cel shadow lies under the jaw on the neck: a crescent, about 3.6 cm deep under the chin and narrowing to nothing under each ear, so it is never a ring. It hangs from the head, not the body, so it follows the jaw when the head turns or nods, and its upper edge is tucked inside the jaw, so no band of lit neck opens between the jaw and the shadow (that band was the pale wedge). It is a darker skin with its normals turned down out of the light: it is always in the shade tone, and so always darker than the neck beside it, whatever the light. A lighter-than-skin shadow is a fail. The painted face is a front plane (ear to ear, chin to hairline) faded out toward the ears; the atlas is not wrapped round the head.

### Shading the head

A cel threshold turns any small bump in a face into a blotch, and the ink pass turns any sharp
plane into a crease. So after the head is shaped, **its normals are replaced** with those of a
simple ellipsoid around the same centre, blended back to the true normals at the jaw line and
neck. The outline keeps the constructed profile; the tone stays clean.

Under the fringe, under the jaw onto the neck, and inside collars are always in shadow.

### Head shape families

Four, authored, and nothing but four parameter rows on the one shared ball (`HEAD_SHAPES` in `headform.ts`): the cranium, the depth and the eye line are identical, so every head is one species. The shape is part of the look, chosen with it.

| Shape | Width | Jaw corner / width | Chin / width | Nose tip (lower third) | Jaw corner height |
|---|---|---|---|---|---|
| **oval** | .72 H | .72 | .20 | .27 H | .17 H |
| **square** (wide jaw, flat chin) | .75 H | .80 | .26 | .27 H | .14 H |
| **long** (tall, narrow jaw) | .69 H | .70 | .20 | .29 H | .18 H |
| **heart** (wide cheekbones, small chin) | .74 H | .64 | .15 | .25 H | .19 H |

### Features

Placed by the formula, as fractions of H up from the chin (restrained anime), and measured on every build (`__SHEET__.measureHead()`; the numbers are in `screenshots/presentation/people-next/head-measure-after.json`):

| Feature | Height |
|---|---|
| Eye centre | .435 H (range .43 to .46) |
| Brow | .55 H (range .52 to .55) |
| Nose tip | .26 H (.25 to .28; .25 to .29 across shapes) |
| Lip line | .13 H (.12 to .15) |

- **Eyes:** five eye-widths across the face at the eye line, one eye-width between the eyes, one outside each. An eye is about .145 H wide and .6 to .8 as tall as it is wide. The upper lid sits over the top of the iris. One inking hand for all eyes. The tile's vertical scale is squeezed to .78 in the eye band and .5 in the brow band (`faceUV`), which is how the tall painted eye lands on the formula.
- **Irises:** brown, dark brown, hazel, grey, grey-green, slate blue. No violet, red or teal.
- **Brows:** thin, close to the eye; weight and arch vary by face type.
- **Nose:** the atlas adds at most a short mark under the wedge.
- **Mouth:** a short thin line (about 1.6 cm long and 2 mm thick: one length and one weight for every face) in a darker, slightly redder version of that head's skin, with its corners no wider than the pupils. Every mouth of the expression set is drawn at that weight on these faces: a smile or a frown is the same line curved, talking and shouting open it to a small oval at most about 8 by 6 mm, and nothing is a filled slab that reads as a moustache from a few metres away.
- **Marks** (stubble, freckles, a scar, laugh lines, bags under the eyes): at most one per face, and on fewer than half the faces.

The atlas layout, the expression set and the packing stay as they are. Feature positions are
repainted to the landmarks above and aligned to the built nose.

### Value per skin tone

At the game's distance a face is 4 to 8 px wide and the painted features average away: an eye of
white, iris and lash comes out near the value of a mid skin, so mid and dark faces went blank while
light ones kept a dark eye row. The skin itself therefore carries the face's big value shapes,
scaled to its tone (`FACE_VALUE` and `FACE_PAINT` in `head.ts`, applied by the face material, no
new texture or draw): a shadowed band over the brows and eyes; lighter planes on the forehead, the
cheekbones, the bridge of the nose and the lower lip; a shade under the nose. Close up they are
modelling, not make-up (eye band no deeper than x.74, lighter planes no more than x1.3); the darker
the skin, the deeper the band and the lighter the planes, so the step from cheek to eye band is at
least 1.35 on the mid and dark skins. No shape is drawn narrower than about a pixel, and once the
face is too small for its painted features to be told apart each shape doubles its depth, so the
eye row lands on every tone at ~50 px. `tests/face-value.test.ts` holds the ordering and the limits.

---

## 7. Hair and hats

Hair is a few designed masses with a silhouette. It is not a cap with things stuck to it: a head
whose hair is a slightly larger skull is a helmet, and "the hair's outline is the skull's outline"
is a fail (section 13). That is measured, not judged by eye: `npx tsx tools/hair-measure.ts`
rasterises each style's front and side silhouettes and reports, along rays from the ball's centre,
how far the outline stands off the skull's, how evenly, and where the skull's own outline shows.

### How a style is built

`src/world/people/hair.ts`. Each of the ten styles is data in the units of the standard head
(H = .285), written once for a parting on one side and mirrored for the other.

- **A hairline:** a contour round the head through authored points: where the forehead, the
  temples, the sideburn, the ear and the nape show. A point can be sharp (the tip of a lock, the
  notch between two, the end of a sideburn), so the edge comes to a point instead of a scallop, and
  the main mass puts a column on every authored point, so a tip stays a tip with few columns.
- **An offset field:** how far the outer surface stands off the scalp in each direction, built from
  lobes of volume, a groove at the parting and tight areas (a crop's back and sides). This, never a
  constant offset, is what makes the outline the style's own. Where the hair grows out of a hairline
  the style leaves bare (a combed-back forehead, the temples) it starts thin and thickens over the
  first few centimetres; where hair ends (a fringe, a nape, a bob's hem) the edge is thick. The
  sideburn in front of the ear is trimmed to a slim point. Below the ear, long hair falls straight
  instead of following the jaw in.
- **Walls:** every edge of the mass turns back toward the scalp, at most 1.4 cm deep, in the hair's
  shade colour: a thickness and a dark underside, never a knife edge.
- **Locks:** few, and each has a job: points standing off the crown and over the ears of the tousled
  style, the loose piece and the upward flow of the high knot. No rows of cones, no even chunks.
- **Tied masses:** a bun, a knot, a tail; they hang from the swing group and move with the walk.

### The ten styles

| Style | Front | Side | Edges | Stands off the skull |
|---|---|---|---|---|
| **short crop** | a flat, squared top over tight sides | a flat top run forward into a short fringe; tight back | six uneven fringe points 4 to 7 cm above the brows, swept to one side; temples and ears clear; four clumps at the nape | top 3 cm, sides .5 |
| **side part** | lopsided: a rise over the far temple, flat on the parting side | a rounded back of the head over a tapered nape | a swoop of fringe across the forehead in two points; a notch at the parting; the temple shows on the parting side | far temple 4.5, parting side .6 |
| **swept back** | tall and narrow over a bare forehead with a small peak | a lift behind the hairline, the hair running back to the collar and turning out in points | no fringe; the tops of the ears covered; three points at the nape | front lift 6, back 4 |
| **tousled** | wide and broken | a big round top with points standing off the crown | six uneven points falling to the brows; points over and behind the ears; four at the nape | 3 to 6.6 |
| **bob** | a bell, widest at the jaw | a block with a blunt hem, longer at the front | a fringe cut straight across above the brows; curtains to the jaw; a slight parting off the centre | top 2, jaw 3.5 to 6 |
| **low bun** | close over the top, soft wings over the upper ears | smooth, a bun low at the back | bare forehead and temples, a centre parting, the hair over the top of the ear | top 1, wings 3.5 |
| **high knot** | tight, a knot above the crown | tight, the knot high at the back | bare forehead, ears and nape; one loose piece in front of one ear | about 1, the knot 6 |
| **ponytail** | close, with a lift over one side of the front | a tail from the back of the crown to the shoulder blades | one long point of fringe swept across; ears clear | sides .7, lift 2 |
| **long, tied back** | full at the sides down to the jaw | drawn behind the ear into a broad tail low at the nape | points framing the face in front of the ears; bare forehead | sides 3.5 to 5 |
| **balding** | a bare crown between two tufts over the ears | a horseshoe round the back, receding from the temples | the top edge feathers into the scalp; clumps at the nape | tufts 3 |

Every style has a side: a parting, a sweep, or the lean of its fringe points. Measured on the
standard oval head, every style's outline is at least 2 cm off the skull somewhere and uneven
(the offset's standard deviation along the outline is 1 to 4 cm in front or in profile), and no two
styles' outlines are closer than 5 mm on average in either view; the closest pair, the crop and the
swept-back style from the front, is 6 mm apart (`tests/hair.test.ts` holds both). The one weak view is
the ponytail from the front, which is close to the skull by nature; its profile carries it.

### Under a hat

A hat never sits on a full head of hair. The style is cut at the hat's **seat** (the line where the
hat's lower edge rests, below): above the band only a thin layer tucked under it, below the band the
style as it is: the sideburns, the nape, a bob's curtains, a crop's clumps. Under a bonnet or a
headscarf the bun is gathered inside the cloth, which swells over it; under a cap a ponytail is
tied lower so that it leaves from under the band. For every pairing `HAT_HAIR` allows, on every head
shape and size, no hair and no skull comes through a crown and some hair shows under the band
(`tests/hair.test.ts`).

### Hats

`src/world/people/hat.ts`. Every hat has a defined crown, a band, and a brim or a peak with a
thickness where it has one. A rigid hat is built level in its own frame, on a ring fitted round the
skull along its seat with room for the hair under it, then tilted onto the head. Its sections are
true ellipses: a squarer section kinks where its front and back halves meet at the sides, and the
ink draws that kink as a seam down the crown. The cloth texture's garment side seams are kept off
hats; the only lines on a crown are designed ones (the soft cap's panels, the helm's comb). A brim
is closed in section (a top, a rounded edge and an underside), so it reads from above and below.

| Hat | Seat (front, side, back; fractions of H) | What it is |
|---|---|---|
| **flat cap** | .66, .65, .65 | pulled low over the brow; a band, a crown that comes forward from the band down onto a short stiff peak, its top sloping to the front |
| **soft cap** | .69, .67, .66 | fuller, rounder and higher than the flat cap; six panels meeting at a button; a short peak |
| **bowler** | .81, .79, .78 | rides high; a hard round crown, a narrow brim curled up at the sides, a ribbon band |
| **top hat** | .79, .76, .75 | a tall crown flaring a little to a flat top, a brim curled at the sides, a deep ribbon band |
| **kepi** | .73, .72, .72 | level; a stiff band, a crown narrowing a little to a top that slopes down to the front, a flat visor, a brass pin |
| **helm** | .69, .67, .67 | level; a tall rounded shell, a comb from brow to nape, a short peak pitched down, a deep guard over the nape, a leather band, a brass badge |
| **elder's hat** | .72, .70, .68 | soft felt; a low crown dented along the top, a wide brim drooping at the front and back, a ribbon band |
| **bonnet** | .86, .54, .25 | cloth over the back of the head to the nape, a brim standing round the face from ear to ear, ribbon ties |
| **headscarf** | .83, .58, .20 | cloth over the head and behind the ears to the nape, its edge turned back in a roll, tied at the nape with two tails |
| **kerchief** | .79, .64, .48 | a tight cloth cap low on the forehead with a rolled edge, a knot and two short tails at the back |

A head with its hair is 1,480 to 1,890 triangles (skull, ears, hair and the jaw shadow), and with a
hat 1,940 to 2,360. People VI's were 1,370 to 1,960 and 2,000 to 2,500.

### Facial hair

A separate small set, attached to the lip and jaw and never painted: a moustache in two tapered
halves parted at the philtrum, on the upper lip and well clear of the painted mouth; a short beard;
sideburns.

### Colour

Soot black, umber brown, chestnut, deep auburn, dull straw, iron grey, white. No plum and no
bright ginger. Grey and white are for elders.

### Reads that failed, and the rules they left

- **Balding is a symmetric horseshoe.** The mass sits above and behind the ears and across the back
  of the head, and thins to a slim point a few centimetres ahead of the ear; it never stops thick on
  the temple (that read as one tuft at one ear). Under a hat its sides lie close, at most 1.1 cm off
  the scalp (`underHat`), so nothing flares under a brim like a headphone pad.
- **A bob is not dealt under a soft cap.** With the fringe hidden under the peak only the curtains
  showed, and they read as the ear flaps of the cap.
- **Facial hair is a shade darker than the hair**, and iron grey is a warm grey (red at least equal to
  blue): an iron moustache over the lip read as a pale blue mouth in rain light.
  `tests/hair-reads.test.ts` holds all three.

---

## 8. Clothing

**Garments are objects, built over the body.** A garment is a shell at a set distance from the
body's reference rings, with its own shape, its own edges and its own thickness.

### Shell distances

| Garment | Off the body |
|---|---|
| Shirt, fitted trousers, hose | 0.5 to 1 cm |
| Waistcoat | 1 to 1.5 cm over the shirt |
| Jacket, work coat | 1.5 to 3 cm |
| Greatcoat | 3 to 6 cm, more at the hem |

Each layer clears the one under it by at least half a centimetre. Skin is drawn only where it
shows.

### Every garment has

- **An edge with thickness.** A hem, cuff or lapel is a turned lip with a lit face and a shadowed
  underside: 4 to 8 mm on a shirt, 1 to 2 cm on a coat. No knife-edged sheets.
- **An opening**, where it has one: a front that overlaps one side over the other, slightly off
  centre.
- **A way of hanging.** Cloth hugs the shoulders, hangs from the chest with a gap, and flares at
  the hem. A coat's hem is wider than the hips and stands 5 to 15 degrees off the legs.
- **Both faces.** Any shell that can be seen from inside (coat skirts, aprons, skirts, a seated
  dress) is closed or double-sided.

### Parts modelled as their own shapes

Collars that stand 3 to 5 cm. Lapels as plates with a notch, lying **on** the chest and curved
with it. Cuffs a centimetre larger than the wrist. Waistbands and belts as rings with a buckle.
Pockets as flaps or patches with thickness. Straps that **wrap** the torso along its curve.

Nothing floats. Nothing is a flat panel held in front of a curved surface. Nothing is a straight
box laid across a round chest.

### Below the belt

Skirts, dresses, coat skirts and aprons hang from the **pelvis**. They open front and back as the
thighs swing, as now, but they turn with the hips.

### Folds and seams

Folds go where cloth is compressed or pulled: inside the elbow, behind the knee, at the waist, at
the crotch. A few, shaped to echo the outline. Seams are drawn only where a garment has one: side
seams, a shoulder seam, a real hem. **The stitched hems the old cloth texture painted at the ends
of every segment are removed**; they drew a line around every knee and elbow.

### Material

Wool, canvas, leather and metal must not read as the same stuff in different colours. Leather is
darker, has harder edges and takes a small highlight. Canvas is pale and matte. Brass and steel
take a hard highlight. Wool is the default.

As built (`wardrobe.ts`, `citizens.ts` `bakeCharacter`): cloth is the stitched cloth map on the
cloth material, every colour with a restored twin for prosperity. Leather and metal are the
**plain material** (no cloth map: smooth, so they do not read as stitched) and carry their
highlight in vertex colour, baked once with the geometry, so there is no extra material and no
extra draw. Leather is its swatch at 86 % value with a narrow lighter band on the upward faces of
its forms (a boot's instep and toe, a belt's top edge) and a lighter edge binding on aprons, flaps
and straps; brass and steel get a small hard light spot on the upper-left of each part that looks
toward the light. Canvas is the `canvas` swatch on cloth, with no highlight.

### The wardrobe, as built

`dress()` in `wardrobe.ts` builds the twelve casts that are not inline; the labourer and the row
coat are the inline branch of `figure.ts`, and take their trade items (the leather apron, the hook,
the pouch and the rag) from `dress()` too. Every garment is a shell off the body reference with a
turned edge, a lining where it can be seen from inside, and its own opening. Long cloth below the
belt (a skirt, a long coat, an apron, the foundry slab, the greatcoat) is **hinged at the knee**: see
section 12. Under a coat only what the coat leaves open is built of the shirt (an arc, not a tube),
a tall boot hides the trouser leg below its top, and a sleeve hides the forearm, so triangles go to
the head, the hands, the collar and the hem. The Ordinance's colours have no restored twin and
neither the Ordinance's cloth nor its mending is ever swapped: no scarf, no patch.

### Asymmetry

One or two authored asymmetries per figure, and everything else mirrored. Choose from: a satchel
and its strap; one sleeve rolled; an apron tie; a scarf tail; a tool pouch on one hip; an uneven
coat front; a cloth tucked in the belt; the hair's parting; an armband. Ten small accessories are
weaker than one that means something.

---

## 9. Occupation and the cast

Clothing says what a person does and how they are doing. A person's cast is fixed by their role
and where they stand, never by the seed.

### Wardrobe families

| Family | Reads by | Key garments |
|---|---|---|
| Ordinary resident | plain, mended, layered for the cold | work coat or shawl, waistcoat, skirt or trousers, soft boots, cap or bare head |
| Poorer resident | fewer layers, visible mending, no hat | shirt and braces, patched skirt, shawl, wrapped scarf |
| Affluent resident | length, fit, a hat with a shape | frock coat or fitted jacket over a long skirt, waistcoat and watch chain, top hat or trimmed bonnet, gloves |
| Labourer | bulk at the shoulders, bare forearms | collarless shirt, sleeves rolled, braces, heavy trousers, hobnail boots, flat cap, neckerchief |
| Foundry worker | the apron | leather apron to the shin, gauntlets, kerchief, goggles pushed up, heavy boots |
| Merchant | the waistcoat and the apron or sash | waistcoat, sleeve garters, long apron or sash, bowler, or headscarf and full skirt for stallholders |
| Mechanic | tools on the body | short jacket or long shop coat, tool roll or pouch belt, goggles, gloves, tall boots |
| Courier | the satchel | short jacket, cap, scarf, satchel on a diagonal strap, heavy boots |
| Ordinance, rank and file | the greatcoat and kepi | long buttoned greatcoat, crossbelt, kepi, gloves, tall boots |
| Ordinance, inspector or officer | the collar and the boards | long fitted coat, high oxblood collar, shoulder boards, armband, peaked helm, gloves |
| Embers-associated | nothing, by design | their trade's clothes plus one mark: chalk on the fingers and cuff, a turquoise thread, a lantern |

### The cast library

Fourteen authored casts. Each fixes a family and frame range, face and hair compatibility, a
wardrobe, a posture, a palette range and its asymmetries.

| # | Cast | Family | Outline |
|---|---|---|---|
| 1 | Row resident, coat | slim or standard | columnar; work coat to mid-thigh; cap or bare |
| 2 | Row resident, skirt | slim or standard, narrow | bottom-heavy; shawl, long skirt, bun or headscarf |
| 3 | Elder resident | slim, elder | stooped; long coat, stick or basket, hat |
| 4 | Affluent resident | slim or standard | tall and fitted; frock coat and top hat, or long skirt and bonnet |
| 5 | Stallholder | standard or sturdy | bottom-heavy; full skirt, long apron, headscarf |
| 6 | Shop merchant | standard or sturdy | waistcoat front, apron, bowler |
| 7 | Labourer, porter | sturdy or standard, broad | top-heavy; rolled sleeves, braces, flat cap |
| 8 | Foundry worker | sturdy | apron slab front to the shin; gauntlets; goggles up |
| 9 | Young mechanic | slim or standard | short jacket, tool roll on the hip, goggles |
| 10 | Older mechanic | standard or sturdy | long shop coat, cap, spectacles, moustache |
| 11 | Courier | slim | short jacket, satchel, cap, scarf tail |
| 12 | Garrison soldier | standard or sturdy, broad | greatcoat column, kepi, crossbelt |
| 13 | Ordinance inspector | slim or standard, broad | squared shoulders, high collar, helm, armband |
| 14 | Child | child | short coat or pinafore, cap or bare head |

The seven gameplay archetypes keep their names and behaviour. Each maps to a set of casts:

| Archetype | Casts |
|---|---|
| resident | 1, 2, 3, 4, and 14 where the scene asks for a child |
| merchant | 5, 6 |
| worker | 7, 8 |
| engineer | 9, 10 |
| courier | 11 |
| guard | 12 |
| ordinal | 13 |

Built, all fourteen. Triangles at the standard seeds of the sheet: row coat 6,250, row skirt 6,328,
elder 6,410, affluent 6,528, stallholder 5,660, shop merchant 5,958, labourer 5,408, foundry 6,486,
young mechanic 6,796, older mechanic 5,992, courier 6,514, garrison 6,280, inspector 6,464, child
6,190; every one at or under 6,800.

Which casts appear depends on place: foundry workers at the Foundry and Cinder Row, stallholders
and shop merchants at the Market, affluent residents on the east bank and the terraces and only as
Terra recovers.

### Story characters

Every named or story-bearing person has a **fixed, authored look**, independent of spawn order:

| Character | Look |
|---|---|
| The officer at the Sael Gate | inspector cast; the tallest stature; grey at the temples; ledger |
| The collection clerk at Rook's | inspector cast, slim, without the helm; spectacles; sleeve guards |
| Rook's hand | labourer; leather apron; a scrap magnet or hook on the belt |
| Finch's hand | young mechanic; Finch's winged valve on the sleeve; grease rag in the belt |
| The Embers' chalker | row resident; chalk on the cuff and fingers |
| The Embers' lookout | courier without the satchel; scarf up; hands in pockets |
| The Embers' courier | courier; a turquoise thread on the satchel strap |
| The masked stranger | as now, with the Weathervane mask |
| Foundry overseer, ration warden, market beat | inspector cast, each with one distinguishing item |

As built (`STORY` in `look.ts`; the spawn sites pass `look: '<name>'` to `Presentation.addWorker`,
which takes effect under the new builder; a test holds each site to its name):

| Look | Items built |
|---|---|
| `officer` (market-square) | tallest stature, iron hair, a book on a strap at the hip, the armband |
| `clerk` (rook-yard) | no helm, spectacles, black sleeve guards |
| `rookHand` (rook-yard) | labourer, a leather apron with bib and straps, a scrap hook on a belt loop |
| `finchHand` (finch-run) | young mechanic, a brass winged valve on the right sleeve, a grease rag in the belt |
| `embersChalker` (cinder-row) | row coat, chalk on the right cuff and fingers |
| `embersLookout` (cinder-row) | courier with no satchel and the scarf drawn up over the mouth (hands in pockets is not built: the arms are posed by `animateLife`) |
| `embersCourier` (cinder-row) | courier, a turquoise thread along the satchel strap |
| `masked` (rook-yard, intro) | courier; the Weathervane mask, fitted to the skull (`mask.ts`) |
| `overseer` (foundry-works) | inspector with a ring of brass keys |
| `warden` (ration-line) | inspector with the book at the hip |
| `beat` (market-square) | inspector with a baton |
| `introGuard`, `introOrdinal` (intro) | a garrison soldier and an inspector for the opening scene |

Items only a named person carries live in `Cast.story`: they are valid in a look and never dealt by the
resolver. Every other asymmetry in a cast table is built by `wardrobe.ts` or `figure.ts`, and a test
fails on a name that is built nowhere.

### Age reads on the head

An older cast carries its age where it shows at a distance, on the head: the older mechanic is always
iron grey (under a cap it shows at the temples and the nape), wears a moustache five times in seven
and a short beard once, and draws his face from the heavier-browed rows (`Cast.faceRows`). A short
beard keeps to the chin and the jaw and leaves the mouth clear under the lip; one that covered the
mouth read as a mask. Moustaches and beards stay under an eighth of the crowd.

---

## 10. Colour

No colour is generated. Every colour on a person comes from a named swatch.

- **A cast owns a palette of three or four colours and one accent.** Muted bases; the accent is
  small and sits near the chest or face.
- **Legs and feet are darker than the chest**, but trousers, skirts and boots vary by cast. The
  old crowd shared one pair of navy trousers and one pair of black boots. The first (default)
  trouser swatch of each cast is its own: row coat navy, elder stone, affluent slate, shop
  merchant charcoal, labourer umber, foundry rust, young mechanic canvas, older mechanic
  green-charcoal, courier grey-green, child leather; the Ordinance shares soot, as one outfit.
- **Civilians:** umber, soot, oxblood, grey-green, bone, slate, dull mustard.
- **Trades:** foundry leather and soot with a rust kerchief; market ochre, burgundy and cream;
  mechanics slate, canvas and brass.
- **Ordinance:** green-charcoal, black leather, oxblood, bone. One outfit. The Ordinance never
  dresses up for prosperity and never weathers into patches: its swatches have no restored twin and
  it has no mending patch (checked at stage 0 and 5 on the prosperity sheet).
- **Embers:** Terra's own turquoise and ivory, as a thread or a ribbon and nothing larger.
- **District** shifts the mix, not the swatches: the Lowworks and Cinder Row are sootier, the
  Market warmer, the east bank cleaner and cooler.
- **Prosperity** is the same garment in better times: cleaner, a little more colour, patches gone,
  a watch chain. It is never a new costume and never a candy palette.
- **Skin** keeps the three weathered tones, chosen independently of everything else.

---

## 11. Variation

**Variation is curated. Randomness chooses between authored, valid combinations. It never designs
the character.**

A look is resolved in this order, and each step narrows the next:

1. **Cast**, from the archetype, the place and the scene. A story character names its look.
2. **Family and frame**, from the cast's allowed range.
3. **Stature**, a uniform scale within 0.96 to 1.04.
4. **Skin**, independent of everything.
5. **Head shape and face type**, from the pairs that are authored to go together.
6. **Hair style and colour**, from the styles the cast, the head shape and the hat allow.
7. **Wardrobe variant and palette**, from the cast's two to four authored outfits.
8. **Asymmetries**, one or two, from the cast's list.

Rules:

- Choices are drawn from a real hash of the person's seed, with a separate stream for each step.
  No two properties may be tied together by arithmetic on the seed. Build tied to skin tone, as
  before, is a defect.
- Every combination the tables allow must look right. If one does not, remove it from the table;
  do not add a special case.
- Two people who stand in the same scene do not share a cast, a hat and a palette. Scenes that
  seat or stage people together pick looks together.
- Identical twins are a bug, unless authored.
- The whitelists are data, in one place, and are covered by a test (section 14).

### Variation minimums

Measured as QA II measured them (seeds 0 to 19 of each street archetype under the street's cast
weights, 100 figures) and held by `tests/variation.test.ts`:

- **Outfits:** every street archetype has at least three authored outfits, and every street outfit
  at least three palettes from the cloth swatches. A new outfit is a different garment (the
  courier's buttoned coat to mid-thigh, or shirt sleeves and a waistcoat; the stallholder's shawl
  over a bibless apron; the older mechanic's canvas work apron), never a recolour.
- **Neighbours:** outfit and palette are drawn as one combination, and neighbouring seeds (the spawn
  order) draw from alternate halves of the cast's combinations, so two of a cast side by side never
  match; at most 10 of the 95 neighbouring pairs of the QA rows may share an outfit and palette
  (People XX: 0, from 30). The Ordinance keeps its one uniform.
- **Faces:** at least 40 distinct faces (skin, head shape, face row) in every hundred (People XX: 56,
  from 21). All eight atlas rows are dealt, six to each head shape, and the face is drawn from the
  seed mixed with the cast, so one seed is never the same face in every cast.

---

## 12. Animation

Animation shows weight and character. It also must not break the construction: every pose the game
uses is checked on the new figure.

### Kept as they are

The planted-foot gait solver, the activity set, gaze, mood, expression choice and the easing of
arms and hands.

### Standing

Nobody stands square. Rest is weight on one leg: that hip up, the same shoulder down, each by 3 to
6 degrees, the free knee soft, the shoulders turned slightly off the hips. The weight changes legs
every 4 to 8 seconds. Breathing runs at 15 to 20 breaths a minute, belly before chest, about a
centimetre. A fidget comes every 30 to 60 seconds on the person's own timer. No two people breathe
or shift together.

### Walking

The pelvis leads. It turns toward the forward leg, drops on the swinging side and shifts over the
standing leg. The ribcage turns the other way, by a half to all of the pelvis's turn. The head
steadies the gaze. The forearm trails the upper arm, and hair, hems and bags trail further.

### By cast

These are parameter sets on the one gait, not new systems.

| Cast | Carriage | Walk |
|---|---|---|
| Inspector, officer | upright, chest lifted, chin level | long stride, little bob, short stiff arm swing |
| Garrison soldier | upright, heavier | even stride, arms close to the coat |
| Labourer, foundry worker | forward lean 5 to 10 degrees, wide stance | heavy bob, arms swing from the shoulder |
| Merchant, stallholder | settled, hands busy | short stride, arms close, small turn |
| Mechanic | loose, head down to the work | middling stride, one hand at the tools |
| Courier | light, forward | quick cadence, satchel hand steadying the bag |
| Resident | by mood and district | plain |
| Elder | stooped | slow cadence, more knee bend, less turn |
| Affluent | upright, unhurried | long slow stride |

The existing stoop of early Terra and the registers of the Ordinance (halt, scrutiny) sit on top
of these.

### Long cloth and the knee hinge

A skirt, a long coat, an apron and the foundry slab are built in two parts (`HEM_Y` in
`wardrobe.ts`, the child group `hem` of `tails`, exposed on the figure as `hem`): from the belt to
the knee, no deeper front to back than a lap needs, closed at its end by a dome; and from the knee
to the hem, a bell. `animateLife` turns `tails` about the waist when the figure sits (and a little
in a stride); it then counter-rotates `hem` about the knee so the lower part hangs from the knees
(`hem.rotation.x = -tails.rotation.x`, in a stride 0.6 of it, so the hem trails). Seated (People
XXIII, `seatCloth`), the lap turns to lie along the solved thighs toward the knees and the hem lies
along the shins, at 0.8 of its depth so it closes round the calf and still ends well ahead of the
seat (it was 0.45 while it hung plumb from the knees). The old figures have no `hem`, and their pose is unchanged. Aprons open less in a stride
than coats do (their drape length is capped at 0.5), and the greatcoat's depth is floored at 0.27
so it stays a column.

**Rule: a lifted knee never pierces cloth (People XIX).** Long cloth follows the legs (`drape.ts`): each frame the part above the knee turns and opens, and the hem turns and flares about
the knee, just as far as it takes for every leg ring, the knee and a striding foot to stay inside it, front and side. Above the knee the cloth keeps its depth for the walk (a seated lap is
flattened back to .19); the hem's top is cut narrow inside the upper part, so its flare never steps out at the knee; an apron over a skirt is built outside the skirt.

**Rule: an apron hangs in front of the legs (People XXII).** An apron or the foundry slab worn over trousers hangs square to the line of walk, not turned with the pelvis's stride yaw, so
neither of its edges falls back behind the forward leg: seen from the side its hem is in front of or on the forward thigh and shin, and no leg is drawn over it. It may swing and lift with the
knee. Long skirts and coats still trail.

**Rule: a seated apron lies on the lap (People XXIV).** Seated, an apron or the foundry slab worn over trousers is its own part (`drape.ts` `seatPanel`): its lap lies along the thighs' tops, within 3 cm of the thighs and knees, and ends on the knee; its hem falls from a fold over the knee down the shins, never more than 3 cm ahead of them. It is never a board over the lap or past the knees. An apron over a skirt is carried with the skirt, and standing or walking every apron is carried with the long cloth.

**Rule: cloth has weight (People XIX).** The hem trails the upper part on a softer, underdamped spring: it lags, swings past and settles, and it bends at the knee, sideways too. It never turns
with the lap as one board.

**Rule: an apron's back is designed (People XIX).** Seen from behind, an apron shows its straps and ties over the back garment: a bib's straps cross on the back and meet the band at the
waist. Every lining faces in (`inward` in `loft.ts`), so the inside of an apron, a skirt or a coat is drawn as cloth, never an empty outline.

**Rule: what is carried at the hip clears the arm (People XIX).** Pouches, the tool roll, the hook and the Ordinance's ledger, truncheon, keys and crossbelt pouch hang in front of the hip
(about .6 to 1 rad from the centre front), never at the side where the arm hangs and swings; the tool roll hangs upright. No hand or forearm passes through one standing, walking or on guard.

**Rule: nothing stands off the silhouette as a sliver (People XIX).** Ties, tails and straps lie on what they cross (an apron's tie tails on the seat, a headscarf's tails at the nape,
bib straps on the shirt); a greatcoat's vent is two lapped edges, not a slit; a button sits on its cloth, not half off the edge; an apron's lower half is never cut narrower than its upper.

**Rule: a held thing is in the hand (People XIX).** An umbrella hangs in the free hand's grip socket, its shaft through the closed fist, and the wrist keeps it upright over the head,
standing or walking; an elder's stick keeps the right hand, so the umbrella goes in the left.

**Rule: nobody sits on air (People XIX).** A seat is .42 m over the pavement whoever sits (stature does not raise it; People XXIII solves the legs to it, so a child's feet reach too); every seated spawn has a bench, a crate,
a step or a rim under the pelvis, within a few centimetres (audited in the running game by a ray down from the posed hips).

**Rule: a seated foot is on the pavement (People XXIII).** Seated, `citizen-life.ts` `seatLegs` solves each leg to the figure's own hip, limbs and pavement (shin leaning .24 rad forward, thigh between .2 up and .3 down, sole flat and 2 mm up), the hips do not shift or bob, and the lap and hem follow the solved knees and shins: every sole within -2 mm..+1 cm sitting, eating and with a mug, no knee seen through a lap (tests/walk.test.ts, tests/drape.test.ts).

**Rule: a standing foot is on the pavement (People XXII).** Standing, the free foot rests on its toe with the heel up, and the weighted foot is flat on the pavement: `citizen-life.ts`
`standFeet` raises the figure by whatever a flat weighted sole is under it (the rest hip height is 7 mm short of a straight leg and its sole) and turns each ankle just far enough that no
edge of its sole goes under. The breath's bob fades with the stand, not the walk. Within 2 mm standing, starting and stopping (tests/walk.test.ts).

**Rule: the stride clock runs in the figure's own units (People XIX).** The distance walked is divided by the figure's scale before it drives the gait, so stature never makes a planted
foot skate; the flat-footed ankle holds within a millimetre or so (tests/walk.test.ts).

### The bite

The new head's mouth is about 9 cm lower than the old one, so for a figure from the new builder the
eating stroke (`activity === 'eat'`) stops 0.55 rad short at the shoulder, folds 0.7 rad more at
the elbow and comes in with the shoulder width (`citizen-life.ts`, marked by `group.userData.next`).
Solved with the sheet's `probe()`: the grip lands within 2 cm of the mouth's height and about 9 cm
off its front, as the old pose does.

**Rule: the bite reaches the mouth (People XXVI).** The food (parts.ts `FOOD`) is cupped in the curl of the fingers, and the stroke's top is solved once per figure from its own rig (citizen-life.ts `biteReach`): the food's centre just ahead of the lips (`head.userData.mouth`), every point of the hand under the lips, near the old stroke. The head comes round to face the food as it reaches the lips. At the top of the bite the food is within 4 cm of the lips and no part of the forearm or hand rises past the nose, for every representative, the child and the elder (`tests/body-form.test.ts`). The mug keeps the stroke solved with the sheet's `probe()`.

### Poses that must hold

Seated, with thighs level. Arm raised overhead. Both arms forward with a load. Hand to mouth. Deep
stride at full knee bend. Each is checked from the front and the side for gaps, for a limb passing
through the body, and for cloth passing through a leg.

---

## 13. Acceptance: the cast sheet

A figure is judged in a **cast sheet**: a plain backdrop with the game's own lighting, shader and
ink, the figures in a row, and nothing else loaded. It is cheap to render and it is where people
are reviewed. Looking at people only in the street hides faults.

For each cast, and for each family it allows:

| View | What is checked |
|---|---|
| Front, three-quarter, side, back | anatomy, clothing, finish. The back is designed, not left over. |
| The same four as black silhouettes | section 4 |
| At 40 to 60 px tall | the cast is still identifiable |
| Mid-stride, seated, arm raised, carrying | section 12; no gaps or pass-throughs |
| A row of twenty resolved from consecutive seeds | section 11 |

### Each figure is judged on

Silhouette · anatomy · face · hair · clothing · hands · feet · pose · motion · finish ·
profession read · fit with Terra.

### It fails if any of these is true

- The head is more than a sixth of the height, or under an eighth.
- A joint shows a gap, a ring, a ball or a stitched band at any pose the game uses.
- A limb is buried in the torso, or passes through it or through cloth.
- A garment is the body recoloured: no edge, no thickness, no gap, no overlap.
- Anything floats, or a flat panel or straight box sits on a curved surface.
- The hair's outline is the skull's outline.
- The hand is a mitten or the foot is a pod.
- The profile has no nose and no chin.
- The back view is blank.
- The trade cannot be read from the silhouette.
- Two casts cannot be told apart at distance.
- A colour is not from the palette.

### The row of twenty fails if

- two figures are the same body in different colours;
- a combination is impossible or comic: a top hat on a foundry apron, a frock coat on a porter;
- a face, a hat or a palette repeats side by side;
- any property tracks another: all the sturdy ones share a skin tone, all the caps share a coat.

"Technically improved" is not a pass. The question is the one from section 1.

---

## 14. Budget and tests

The rebuild must not buy quality with geometry.

- **Triangles:** no more than the old average of about 5,000 for a figure, about 6,800 for the
  most dressed (the cap the cast is held to; see section 9 for the table). Spend them on the head, the hands, the collar and the hem, not on smooth tubes.
- **Materials:** the same four per figure, shared across the crowd. No per-person materials.
- **Draws:** the crowd stays batched; the number of draws does not grow with the population.
- **Geometry is shared.** A part variant is built once and reused by everyone who wears it. The loft cache shares a part by key while a figure is assembled; `bakeCharacter` then merges each figure's parts per material, so a baked figure's three meshes (cloth, plain, face) are its own geometry, and `CrowdBatch` batches them by material (one material per mesh, the face material flagged `faceAtlas`).
- **Distance:** parts under about two pixels (buttons, buckles, thin straps) are dropped first.
  The silhouette is the same at every distance.

Tests cover the rules, not the coordinates:

- every look the tables can produce is valid: the hat suits the hair, the wardrobe suits the cast,
  the cast suits the archetype;
- the same seed always gives the same look;
- no property is correlated with another across a large run of seeds;
- every colour is a palette swatch;
- part geometry and materials are reused, not rebuilt per person;
- every story character resolves to its authored look.

---

## What this supersedes

In `ART_DIRECTION.md`:

- **"Proportion. Terra's citizens are about 4 heads tall (big-head anime)"** in *Body construction:
  torso, pelvis and legs*. Replaced by section 3. The warning attached to it still holds in
  reverse: the head was restyled, and the legs were not stretched.
- **The hair crown as a hemisphere, cone side locks, mitten hands** in *Character, life and depth*
  and *Dreary pass*. Replaced by sections 5 and 7.
- **"The head is a soft form with no flattened front plane"** in *People pass 3*. The intent
  stands, and is now met by replacing the head's normals (section 6), which lets the head have a
  constructed profile.
- **The inked cloth map's stitched hems** in *Direction reset*. Replaced by section 8.
- **Hair and iris colours** in `palette.ts`. Replaced by sections 6 and 7.

Everything those sections say about motion, staging, gaze, grips, held things and how cloth opens
over the legs remains in force.
