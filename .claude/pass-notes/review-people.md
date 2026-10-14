# People review: blind, from images only

Reviewer: independent character-art pass. Sources: `screenshots/presentation/final/people/` (INDEX.md, looks.json, the PNGs, foot-slide.json). No code, git history, QA.md or character book was read. Tool captions ("People XXIII", "new builder") were ignored.

Measurements were taken with PIL. Crops are listed in section (d). Paths below are relative to `screenshots/presentation/final/people/` unless absolute.

## (a) Verdict table

| # | Question | Verdict |
|---|----------|---------|
| 1 | Authored designs rather than primitive assemblies | PARTIAL |
| 2 | Proportions appealing and consistent with the style | PARTIAL |
| 3 | Heads, necks and shoulders connect believably | PARTIAL |
| 4 | Ribcage, pelvis and limbs taper and connect (elbows, knees) | PARTIAL |
| 5 | Faces constructed rather than marked on (incl. dark skin) | PARTIAL |
| 6 | Hair reads as designed masses | PARTIAL |
| 7 | Hands and feet believable (incl. seated feet) | PARTIAL |
| 8 | Front, side and back views all work | NO |
| 9 | Walking preserves anatomy (cloth against legs) | PARTIAL |
| 10 | Variation curated rather than random | PARTIAL |
| 11 | Are repeated citizens obvious? (YES is a failure here) | YES, in the courier and worker rows (fail) |
| 12 | Ordinance personnel authored and coherent | PARTIAL |
| 13 | Population belongs to one coherent world | YES |
| 14 | Would an artist call these finished game characters | NO |

Totals: YES 1 (Q13), PARTIAL 10, NO 2 (Q8, Q14), and Q11 fails.

## (b) Justifications

**1. Authored vs assembled: PARTIAL.** From the front and in 3/4 (`matrix-01-front.png`, `matrix-02-quarter.png`) the eleven read as costume designs: goggles on the young mechanic, braces on the labourer, a crossbelt and kepi on the garrison, an armband on the inspector, a brooch on the stallholder, all in one restrained palette. The side views break this. Aprons are separate flat planks, belts are flat bands that stick out past the back of the body, and torsos are thin slabs (`matrix-03-side.png`; crop `side_detail.png`: slim civilian, older mechanic, shop merchant, foundry worker). From those angles the parts show up as parts.

**2. Proportions: PARTIAL.** The proportions are consistent: about 7 to 7.5 heads, slim, small heads, stature spread only ~10% (silhouette heights 492–542 px in `matrix-09-silhouette-front.png`). The problems are heads that look small on the broad frames (standard civilian, garrison in `matrix-01-front.png`) and the same puffed, leg-of-mutton sleeve cap on almost every body, men and soldiers included. That sleeve makes shoulders look padded rather than built (`sil.png`: nine of eleven share the bump).

**3. Head/neck/shoulders: PARTIAL.** Heads sit on necks plausibly in profile (`m03_L.png`, `m03_R.png`). From the front the neck is a narrow stalk dropping into a stand collar, with no trapezius slope, and the shoulder line is a horizontal shelf ending in a balloon sleeve (`f01_L.png`: young mechanic, older mechanic; `f01_R.png`: foundry worker). It connects, but the result is a coat-hanger shoulder, not anatomy.

**4. Torso/limbs taper: PARTIAL.** Seen from the front, the torso tapers to the waist reasonably. In side view the torsos are planks: labourer and young mechanic are roughly 100–108 px deep against 123–146 px wide (silhouette bounding boxes, `matrix-10` vs `matrix-09`), with no chest or seat curve (`m03_R.png`). Arms are uniform tubes with no elbow landmark. The knees do break in stride (`stride_side_detail.png`). Seated from the front, both legs fuse into a single column from knee to ankle (`seated_front_detail.png`: young mechanic, older mechanic, merchant, garrison).

**5. Faces: PARTIAL.** At x2 (`faces-01-front.png`, crop `f01_heads4.png`) the faces have lidded almond eyes, brows, a nose tick and a mouth. The head has a real profile (nose bump in `m03_L.png`), so these are not stickers. Three faults count against them:
- The stallholder's face washes out. Her darkest feature pixels are L≈92 against ≈47–77 on the other ten (PIL, faces-01 face band), and her eyes read as closed smudges (`f01_heads4.png`, third tile).
- The older mechanic's beard is a grey chin-strap band that reads as a mask (`f01_heads4.png`, second tile; `side_detail.png`).
- On dark skin (skin index 2) feature contrast roughly halves. At seed-row scale the dark-feature delta is about 24–31 L, against 49–84 for skins 0 and 1 (seeds-courier-front: seeds 0, 8, 16 vs 5, 14, 18), and the eyes of seeds 0 and 8 almost disappear (`face_contrast_strip.png`). In `faces-06-dark-skin-heads-x4.png` the pale sclerae carry the read, but all 28 dark faces share one stare.

**6. Hair: PARTIAL.** The bobs (sturdy civilian, merchant s10), the foundry worker's spiky crop and the young mechanic's swept crop read as designed masses with a silhouette (`f01_L.png`, `f01_R.png`, `dark_heads_R.png`). The weaker ones:
- The stallholder's hair reads as a tight red skullcap.
- The older mechanic's grey side hair is a flat patch.
- The courier ponytail is a thin strip that reads like a strap (`hair_quarter.png`, third tile).
- The elder's white hair puffs out under the hat as a cloud (`people-seated-sit-side_stack.png`, elder).

**7. Hands and feet: PARTIAL.** Feet pass. Shoes are well shaped, seated soles sit flat on the red pavement line (`feet.png`), and foot-slide.json reports the lowest sole at −0.09 cm with a median flat drift of 0.18 cm. Hands fail. They are small hooks or mitts at rest (`m01_L.png`). In the seated bite the fist goes into the nose and face instead of reaching the mouth with food (`bite_side.png`: slim civilian, standard civilian, garrison). The young mechanic's seated hands are pale lumps (`seated_front_detail.png`, first tile).

**8. Front/side/back: NO.** Front (`matrix-01`) and back (`matrix-04`, `back_and_strideside.png` top row) both hold up. Side view is where the cast fails:
- The slim civilian's apron projects forward as a stiff diagonal board.
- The older mechanic's apron is a vertical slab with a jagged spike at the knee, and his belt sticks out behind as a flat band.
- The merchant's apron is a short tilted plate with the hand clipping it, plus a flat belt projecting behind.
- The foundry apron is a board standing clear of the leg.
- The garrison crossbelt breaks into two flat slabs (`side_detail.png`, `m03_R.png`, `intro_fq.png` right).

One of the three standard views not working is a NO.

**9. Walking: PARTIAL.** Legs, knees and feet stride believably, and foot slide is negligible. Cloth does not walk. In front stride every apron stays a perfect rectangle while the legs move behind it (`stride_front_lower.png`: older mechanic, foundry, stallholder, merchant). In side stride the foundry apron stays rigid with a visible air gap to the leg, the merchant's panel stays tilted, and the older mechanic's apron hangs like a plank (`stride_side_detail.png`).

**10. Variation: PARTIAL.** The palette and outfit vocabulary are curated: 17 outfits and 17 palettes, all muted. Adjacent seeds never share outfit and palette (0 adjacent repeats in all five rows, looks.json). The resident row reads well (`seeds_three.png`, top). The axes are thin in some casts, though. All 20 couriers are `slim` with `softCap`, use 3 hairstyles, and cover only 7 outfit×palette combinations: `courier.coat` only ever comes in umber and `courier.jacket` oxblood appears 5 times. Workers are 13 of 20 sturdy and 8 of 20 share `softCap` (`seeds_three.png`, middle).

**11. Obvious repeats: YES (fail).**
- Courier seeds 4 and 6 are visual clones: same outfit, palette, hat, hair and skin. Their mean pixel difference is 5.5, against 9.6–17 for other courier pairs (`courier_4_5_6.png`).
- 17 groups across the 100 seeds share outfit, palette, hat and hairstyle, so they differ only by face or skin. Examples are `labourer.braced/soot/softCap/sidePart` ×3 and `courier.jacket/oxblood/softCap` ×5 (looks.json).
- At street distance (~50 px) only the silhouette and the jacket colour carry, so the courier row reads as a squad of near-clones (`seeds_courier.png`).

**12. Ordinance: PARTIAL.** The uniform language is coherent and authored: dark green-black greatcoats, brass buttons, a kepi and a comb helmet, a red armband and collar, a white crossbelt (`intro_fq.png`, `m02_R.png`). Against that:
- The crossbelt reads as a broken "Z" ribbon in 3/4 and as two slabs in side view (`intro_sit_and_garrisonQ.png` right, `intro_fq.png`).
- Both wear balloon blouse sleeves that undercut a military read.
- The introGuard's greatcoat passes through the bench when seated (`intro_sit_and_garrisonQ.png`).
- Garrison and inspector nearly merge as silhouettes (front IoU 0.82, side IoU 0.83) and at 50 px (`d50.png`, last two).
- The introGuard's square black moustache reads as a toothbrush moustache at seated scale (`intro_sit_and_garrisonQ.png`, left). That is a loaded association for an occupying authority, so decide whether it is intended.

**13. One world: YES.** The whole cast shares one ink outline, one desaturated period palette (ochre, wine, slate, moss, umber), one costume era (stand collars, aprons, waistcoats, bowlers, kepis) and one shading treatment, from the intro figures through all 100 seeds (`seeds_three.png`, `intro_fq.png`, `matrix-01`). The Ordinance reads as the same world in a darker, stricter key.

**14. Finished characters: NO.** An artist would call this a strong, coherent style target at the WIP or vertical-slice stage, not shippable characters. The reasons are rigid board cloth in side view and walking, skirts and coats passing through the seat, hands entering faces in the bite, flat plank torsos in profile, a washed-out stallholder face, and clone couriers (sections 8, 9, 11 and the clipping list below).

### Specific checks

- **Clipping.**
  - Seated skirts pass through the bench plank and continue below it: slim civilian, sturdy civilian, stallholder (`seated_side_detail.png`, `people-seated-sit-side_stack.png`).
  - The dark pelvis or leggings mass shows through the back of the skirt when seated (same crops, the navy blob under the hips).
  - The introGuard greatcoat passes through the bench (`intro_sit_and_garrisonQ.png`).
  - Bite-pose fists enter the nose (`bite_side.png`).
  - The merchant's hand clips her apron plate in side view (`side_detail.png`, third tile).
- **Floating or detached pieces.** Belts stand out as flat bands behind the older mechanic and the merchant. The foundry apron hangs free of the body with an air gap in stride and seated: seated it stays a vertical board beside the knee instead of lying on the lap (`feet.png`, foundry worker). The merchant and older mechanic belts become horizontal "trays" in front of the lap when seated (`seated_front_detail.png`).
- **Aprons as boards.** Confirmed on the slim civilian, sturdy civilian, older mechanic, foundry worker, stallholder and shop merchant (`side_detail.png`, `stride_front_lower.png`, `stride_side_detail.png`, `seated_side_detail.png`).
- **Seated figures on the seat.** The hips are on the plank and the feet are on the pavement line (pass). In the front seated view the plank shows only on each figure's right (`people-seated-sit-front_stack.png`), which may be the camera, but check it.
- **Feet through pavement.** None seen (pass).
- **Faces lost at small size.** Expected at 50 px (`d50.png`). Two are premature: the stallholder at full size, and dark-skin seeds 0 and 8 at seed-row scale.
- **Indistinguishable at ~50 px.** Garrison vs inspector, sturdy civilian vs stallholder (side IoU 0.87), young mechanic vs labourer (front IoU 0.83, side 0.85), foundry vs merchant (front IoU 0.85) (`d50.png`, `sil.png`).

## (c) Prioritized fix list

1. **Aprons and skirt panels are rigid boards (Q1, Q8, Q9, Q14).**
   - Where: `matrix-03-side.png` at x 140–330 (slim civilian), 1010–1170 (older mechanic), 1420–1560 (foundry) and 1840–2010 (merchant), y 120–620; `matrix-05-stride-front.png` y 330–620; `matrix-06-stride-side.png` y 300–620.
   - Fixed: in side view the apron hugs the belly and thigh within a few cm and follows the leg line. In stride the apron bends or swings over the leading thigh and bells slightly. No air gap between apron and leg, and no straight rectangle edges at the hem.
2. **Seated cloth passes through the bench, and the pelvis shows through the skirt (Q7, Q14, clipping).**
   - Where: `people-seated-sit-side.png` at x 150–400, 520–790 and 1400–1660, y 200–530; `intro-figures-sit.png` introGuard; `people-seated-sit-side-feet.png` foundry apron.
   - Fixed: the skirt and greatcoat drape over the thighs and fall over the front edge of the seat, never below the plank inside its footprint. No navy hip mass shows under the back of the skirt. The foundry apron lies on the lap and drops at the knee.
3. **Clone citizens and thin variation axes (Q10, Q11).**
   - Where: `seeds-courier-front.png` seeds 4 and 6 (crop x 580–940, y 220–560); looks.json courier, worker and engineer rows.
   - Fixed: no two figures within one 20-seed row share outfit, palette, hat and hair. Couriers gain at least two hat options, a non-slim family and a second palette for `courier.coat`. The pixel difference between any same-row pair exceeds ~9 at sheet scale.
4. **Side-view torsos and limbs are planks (Q4, Q8).**
   - Where: `matrix-03-side.png` labourer (≈x 1260–1340) and young mechanic (≈x 1000–1060 in the left half); `matrix-10-silhouette-side.png`.
   - Fixed: a profile with a chest curve, a back curve into the seat, and a readable elbow landmark on the arm. Side silhouette edges that curve rather than run straight from collar to hip. The labourer's side-to-front bounding ratio is 0.68 now (100/146 px), and bounding boxes include the arms, so judge this by eye on the profile edge.
5. **Faces: stallholder washout, chin-strap beard, dark-skin contrast (Q5).**
   - Where: `faces-01-front.png` panel x 2461–2798 (stallholder) and 1410–1749 (older mechanic); `faces-06-dark-skin-heads-x4.png`; `seeds-courier-front.png` seeds 0 and 8.
   - Fixed: the stallholder's eyes read open, with lash lines as dark as the other ten (darkest feature L ≤ ~70). The beard is a shaped mass that joins the hair at the sideburn, not a band. On skin index 2, the lash, brow and mouth lines keep a luminance delta of at least ~45 against the skin at seed-row scale, so the eyes survive at ~25 px head height.
6. **Belts and crossbelts render as detached flat bands (Q8, Q12).**
   - Where: `side_detail.png` tiles 2 and 3 (older mechanic, merchant belt behind the body); `matrix-02-quarter.png` garrison at x 1960–2200; `intro-figures-side.png` introGuard.
   - Fixed: the belt wraps the waist with thickness and stays on the body's outline. The crossbelt runs as one continuous strap shoulder to hip, with no Z-kink in 3/4.
7. **Hands and the bite pose (Q7).**
   - Where: `people-seated-bite-side.png`: slim civilian (x 180–330), standard civilian (x 370–520), garrison (x 2050–2200), all y 190–330. Also `matrix-01-front.png` hand ends.
   - Fixed: the hand holds a visible food item and stops at the lips. Neither the fist nor the knuckles cross the nose silhouette. At rest the hands show a thumb and a finger mass rather than a hook.
8. **Seated front legs fuse (Q4).**
   - Where: `people-seated-sit-front.png` young mechanic, older mechanic, merchant and garrison (x 670–1015 and 1560–1900, y 200–530).
   - Fixed: two distinct shins with a gap, or a deliberately crossed leg, and knees reading as two forms.
9. **Ordinance read (Q12).**
   - Where: `intro-figures-front.png`, `intro-figures-sit.png`, `matrix-07-distance-50px-x8.png` last two figures.
   - Fixed: soldier sleeves set in square or with epaulettes rather than balloon caps. Garrison and inspector separate at 50 px by silhouette (helmet comb vs kepi plus a different coat length or cape), not by colour alone. Re-decide the introGuard's moustache shape.
10. **Shoulders and sleeves (Q2, Q3).**
    - Where: `matrix-09-silhouette-front.png`: the shoulder bump on nine of eleven figures.
    - Fixed: the puffed sleeve cap is a costume choice for the period women's blouses, not a default for every body. Men's coats get a sloped trapezius-to-deltoid line.
11. **Hair outliers (Q6).**
    - Where: `faces-01-front.png` stallholder; `seeds-courier-quarter.png` ponytails; `people-seated-sit-side.png` elder.
    - Fixed: the stallholder's hair has volume and a hairline break, the ponytail has thickness and a taper, and the elder's white hair tucks under the brim.

## (d) Saved crops

All crops are in `/private/tmp/claude-501/-Users-nicholaslippa-city-tycoon/1b925ddc-0756-4e1e-85c4-e0d78dca5289/scratchpad/crops/`:

- `m01_L.png`, `m01_R.png`: matrix-01 front, halves
- `m02_L.png`, `m02_R.png`: matrix-02 3/4, halves
- `m03_L.png`, `m03_R.png`: matrix-03 side, halves
- `side_detail.png`: side view of the slim civilian, older mechanic, shop merchant and foundry worker at 1.5x
- `back_and_strideside.png`, `m04_back.png`, `m06_strideside.png`: back view and side stride
- `stride_side_detail.png`: lower bodies in side stride (slim, older mechanic, foundry, merchant, garrison)
- `stride_front_lower.png`: lower bodies in front stride
- `f01_L.png`, `f01_R.png`, `f01_heads4.png`, `f02_L.png`: face strips
- `people-seated-sit-side_stack.png`, `people-seated-sit-front_stack.png`: seated overviews
- `seated_side_detail.png`: seated slim civilian, sturdy civilian and stallholder (bench clipping)
- `seated_front_detail.png`: seated young mechanic, older mechanic, merchant and garrison (fused legs, lap trays)
- `feet.png`: seated feet close-up
- `bite_side.png`: bite pose heads and hands
- `d50.png`, `sil.png`: 50 px line-up and front silhouettes
- `seeds_courier.png`, `courier_4_5_6.png`, `seeds_three.png`: procedural rows and the clone pair
- `dark_heads_L.png`, `dark_heads_R.png`, `face_contrast_strip.png`, `face_c*.png`: dark-skin faces and the native-scale contrast check
- `intro_fq.png`, `intro_sit_and_garrisonQ.png`: Ordinance and intro figures
- `hair_quarter.png`, `hands.png`: hair and hand detail (the hand crops are partly off target; `bite_side.png` is the useful hand evidence)
