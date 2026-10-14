# Independent art review, round 2: UI and rendering (brief §19 Q15–28, §20 Q2–3)

I judged only the images and measurement JSON under `screenshots/presentation/`, and paths below are relative to that folder. I did not read QA.md, ART_DIRECTION.md, the git log, commit messages or implementation notes. Crops and pixel measurements were made with PIL.

The previous build is in `hud/`, `ink/` and `ink-vi/before/`. I checked that `ink-vi/before/` matches `ink/`: on world pixels the mean difference is 0.2–0.5 and at most 0.75% of pixels differ by more than 20. The new build is in `hud-iv/after/` and `ink-vi/after/`.

## 1. Verdict table

| # | Question | Prior | New |
|---|---|---|---|
| 15 | Is persistent UI materially slimmer? | YES | **YES** |
| 16 | Is all important information still readable? | PARTIAL | **YES** (nits) |
| 17 | Does the world dominate the screen? | YES | **YES** |
| 18 | Did we avoid generic SaaS/dashboard styling? | YES (notes) | **YES** (one new note) |
| 19 | Are prompts/toasts quieter? | YES | **YES** |
| 20 | Does the interface still feel like Terra? | YES | **YES** |
| 21 | Is the original illustrated style preserved? | YES | **YES** |
| 22 | Are close views still strong? | YES | **YES** |
| 23 | Is mid-distance cleaner? | PARTIAL | **YES** (with a cost, see Q25) |
| 24 | Is far-distance substantially clearer? | NO | **YES** |
| 25 | Are silhouettes preserved? | PARTIAL | **PARTIAL**: the two named merges are fixed, but new losses appeared |
| 26 | Did internal edge noise decrease? | PARTIAL | **YES**, though silhouette-edge noise rose |
| 27 | Did fog interaction improve? | PARTIAL | **YES** |
| 28 | Did we avoid simply washing the scene smooth? | YES | **YES** (watch foliage) |
| §20-2 | Does the UI get out of the world's way? | YES (caveat) | **YES** |
| §20-3 | Does distant Terra look illustrated without a mass of ink? | YES (not earned) | **YES**, and now earned |

Overall, the UI round is a clean success: every item on the prior UI fix list landed, with a few small new nits. The rendering round fixed the worst prior artefact, the thick dashed wire bands, and made the far view clearly better. It also proved the resolution hold under load.

The rendering round has a cost. The projected-thickness and contrast fades now remove or speckle some silhouettes that should stay solid: mid-band tree crowns and the checkpoint frame. Q25 stays PARTIAL, and that is the one blocking item.

---

## 2. Justifications

### UI

**Q15: Is persistent UI materially slimmer? YES.**
From `hud-iv/after/hud-measure.json`:
- Persistent area is 6.84% of the screen, against 7.11% in the previous build and 11.63% in the baseline.
- The top band is 56 px. The bottom band is 61 px; the objective ticket grew 1 px because of the larger text.
- The ribbon is 347 px wide, down from 422.

The worst desk state, `desk-curfew-worst`, wraps to 72 px (see Q16 and fix 5). That is still 25% below the baseline's 96 px, and it only occurs with curfew, lockdown and fog together.

**Q16: Is all important information still readable? YES, with nits.**

*Text sizes* (`hud-iv/after/hud-measure.json` and the `fonts` maps in `hud-mock-states.json`):
- weather and curfew: 12 px (was 10);
- step and prosperity: 12 px (was 10);
- objective overline, treasury label, toast overline, prompt subline, dialogue speaker, kbd caps and hint labels: 11 px (several were 10);
- clock 15, objective 14, crowns 22, income 13.

Nothing is under 11 px, and every important line is at least 12 px, with one exception: the ward value inside the rust pill ("HEAVY 80%") is 11 px bold caps. It is white on rust with high contrast and readable, but strictly it is important state below the 12 px bar.

*Ward pill noun.* The pill now reads "OCCUPATION │ HEAVY 80%" in every state (3× crops of `hud-mock-desk-normal.png` and `product-test-clear.png`). The same word appears in the ward toast ("CINDER ROW · OCCUPATION 80% · Heavy occupation…", `hud-mock-desk-toast-ward.png`), so the vocabulary is consistent. The pill text dropped from 13 px to 11 px and the pill from 18 px to 14 px tall, so it no longer shouts.

*Day/night cue.* A yellow sun disc appears at 12:00 and an ink crescent at 23:00/23:40 (`product-test-clear.png`, `product-test-clear-night.png`). Night also adds an underlined "CURFEW".

*Phone portrait* (`hud-mock-phone-normal.png`, `-curfew-worst.png`, `-toast.png`):
- A one-line objective, "Report to work at Rook & Son Salvage.", now sits under the ribbon at x 16–374.
- The identity plate, ribbon and objective all share x = 16, and the right edges share 374.
- The compass ends show only ticks; no letter is sliced. I zoomed 6× on both ends.
- The instrument still reports `slicedTapeGlyphs: 2`, probably counting fully clipped, invisible glyphs. Visually it is clean.

*Phone landscape* (`hud-mock-phoneland-normal.png`): left edges align at x = 16, and the objective is a single line.

*Contrast* (`hud-iv/after/contrast.json`): ribbon text at 0.72 opacity is at least 6.92:1 over the real scene in all four product shots, and 5.94:1 over pure black. That passes comfortably.

Nits:
- **The phone pause control now reads as a Roman numeral.** It is a serif "II" inside the identity plate, so "II │ THE LOWWORKS" reads like "Ward II" (6× crop of `hud-mock-phone-normal.png`, x 16–60). The previous build used a distinct dark button with a sans pause glyph. Its box is also 44×40, under a 44 px touch target.
- **At 800×600 the Interact and Sprint hints are still dropped** (`hud-mock-narrow-normal.png`). The E prompt still appears in context, so this is minor.
- **The objective marker overlaps a tape letter at the ribbon edge.** At night the ◄ sits on the "W" (`product-test-clear-night.png`, x≈455). In fog the edge "W" is faded and half clipped (`product-test-fog.png`, x 452–470).

**Q17: Does the world dominate the screen? YES.**
93% of the frame is free. In `product-test-clear/fog/rain/clear-night.png` the plaza, banner gantry, fountain kiosk and tower carry the frame.

**Q18: Did we avoid generic SaaS/dashboard styling? YES, with one new note.**
The square corners, serif titles, letterspaced caps, compass tape and coin glyph all remain. The ribbon is more translucent (0.72), which also answers the prior §10 note.

New note: the split label/value tag ("OCCUPATION" outlined, "HEAVY 80%" filled) is the shields.io badge pattern, and the yellow sun disc reads at 1× more like a status dot than a sun. Both stay inside Terra's palette, so this is not a failure. Still, the badge adds a box-inside-a-box (§10 asks for fewer duplicated borders), and the sun would sit better as an inked mark (see fixes).

**Q19: Are prompts and toasts quieter? YES.**
- Toast: 592×28 in one line. The ward toast is 640×47 (`hud-mock-desk-toast-ward.png`).
- Prompt: 216×38. It grew 15 px wider than the previous build's 201×37 because of the 11 px subline, but is still far quieter than the baseline's 226×53 (crop of `hud-prompt.png`).
- Dialogue: 55 px tall.

**Q20: Does the interface still feel like Terra? YES.**
The palette, Georgia/Avenir pairing, compass, coin and rust pill are unchanged. The crescent moon and underlined CURFEW add character without adding chrome.

### Rendering

Numbers are before → after, comparing `ink-vi/before` (57fc511) with `ink-vi/after`. They come from `ink-vi/measurements.json` and `internal-lines.json`.

**Q21: Is the original illustrated style preserved? YES.**
Every after frame keeps the flat cel colour, painted clouds and dark ink. Nothing reads as generic Three.js.

**Q22: Are close views still strong? YES.**
`pairs/pair-close-character-storefront.png` is visually identical to before:
- near-band ink is 16.99 → 16.96%, and internal near-band lines are unchanged at 10.89%;
- 0.26% of world pixels changed.

The only visible change is a thin street-crossing wire at left, which is now a faint, slightly beaded line.

Near band generally: internal-line ink is identical in every view. Total near ink dropped 5–7% only in `mid-street` and `far-clock-tower`, and that comes from the overhead wires (which sit under 30 m) being thinned. That is acceptable.

**Q23: Is mid-distance cleaner? YES.**

| View | Mid ink (≥ 0.2) | Mid internal lines |
|---|---|---|
| Clock tower | 31.4 → 26.1% | 4.56 → 2.53% (−45%) |
| Street | 24.9 → 20.5% | 5.34 → 4.04% (−24%) |
| Rooftops | 19.1 → 15.7% | 5.37 → 2.67% (−50%) |
| Square | 14.1 → 12.7% | 3.09 → 2.01% (−35%) |

This time the change means fewer lines, not only lighter ones. In the arcade region (x 440–840, y 300–440) of `shader-far-clock-tower` and `shader-mid-street`:
- the thick dashed horizontal rails across the arch and gantry are gone;
- the background trees and arcade ironwork carry fewer internal marks;
- the doubled arch line is lighter.

See `pairs/pair-mid-street.png` and `pairs/pair-far-clock-tower.png`, middle rows. The cost is under Q25.

**Q24: Is far-distance substantially clearer? YES.**

*Clear frames.* In a baseline-versus-new crop of `shader-far-clock-tower` (x 440–840, y 110–450), the two black dashed wire bands that crossed under and over the clock face are now thin continuous lines. The background houses and arch are lighter. The tower reads cleanly as a designed silhouette. That is a substantial, visible change in exactly the view the brief names.

*Under load.* `pairs/strain-far-clock-tower.png` shows the resolution hold at device pixels:
- pre-Ink III drops to pixel ratio 0.83, softening everything and stair-stepping the wires;
- 57fc511 and Ink VI hold 1.17, and Ink VI's wires are also thin.

*Far band.* Visible ink dropped (clock tower 1.37 → 0.61%, rooftops 2.94 → 2.22%). In `pairs/strain-far-rooftops-overview.png` the distant tower and houses are outlined in lighter, fog-pulled lines.

*Very far.* It is still pixel-identical (0.01% of pixels differ from baseline). It never needed work. The strain crop for it shows only clouds, so it is not useful evidence.

*Caveat.* The big diagonal cables are now 1 px wide, aliased and beaded. Above the banner they render as alternating dark and light pixels (8× crop of `shader-far-clock-tower`, x 690–730, y 330–380). Where they cross the "WITHOUT ORDER / TERRA FALLS" banner they still break into a stair-stepped ladder about 5 px wide (x 660–720, y 370–420), unchanged from before. Where they cross the arch ring itself they are continuous, but they cut a small light notch in the arch's dark band. In fog they are continuous throughout (`shader-far-clock-tower-fog`, x 540–740, y 300–380).

So the answer to "continuous or dashed?" is: horizontals are continuous; diagonals are continuous over the arch but beaded above the banner and ladder-hatched across it.

**Q25: Are silhouettes preserved? PARTIAL.**

Fixed:
- **Chimney and smoke** (`shader-far-rooftops-overview`, x 760–1000, y 100–380). The baseline, previous and new builds compared side by side show the stack's left and right edges and top rim outlined again, close to baseline.
- **Tree and gantry** (`shader-mid-market-square-fog`, x 730–890, y 320–430; `pairs/pair-mid-market-square-fog.png`). The crown is outlined again on its top and right.

New losses:
- **Mid-street right-hand tree** (`shader-mid-street`, x 750–830, y 330–410). Before, the crown had a continuous 2 px outline. Now its top edge is gone where it meets the paler facade, and the rest is a ragged, speckled scatter of dark pixels.
- **Far-clock-tower bottom-right foliage** (x 770–840, y 410–445). The crown top outline is gone, and the crown merges into the grey background. This is the same failure as the old chimney, moved to foliage.
- **Checkpoint frame in mid-street** (x 580–700, y 310–420; `pairs/pair-mid-street.png`, middle row).
  - The horizontal lintel between the two angled poles fell from about 85 to about 25 levels of contrast (rows 315–317: mean luminance 110 before, 170 after, against a background of about 195). It reads as missing.
  - The poles are beaded, with a 2–3 px gap near y 332.
  - The checkpoint is the focal object of that view.

Some fixes landed and new losses appeared, so the answer stays PARTIAL. This is the item that blocks a clean rendering YES.

**Q26: Did internal edge noise decrease? YES.**
`internal-lines.json` shows mid-band internal lines down 24–50% in every view, and the near band is untouched. Visually the water-tower planks, arcade ironwork and background-tree interiors are calmer.

Edge noise of a different kind did rise:
- speckled foliage silhouettes (Q25);
- 1 px beaded thin lines.

The crawl metric agrees:
- the rain clock-tower mid band rose 0.0052 → 0.0061, which is +17% raw and about +37% per unit of ink (0.0227 → 0.031);
- the street rose 0.0059 → 0.0061, giving back part of the previous round's gain (0.0073 → 0.0059).

The reported attribution is "stronger dark-on-dark outlines on the moving crowd and trees". It is plausible for the people in `pairs/pair-mid-market-square-fog.png`, whose outlines are a little firmer. But the stills also show **static** geometry with beaded or speckled ink: the checkpoint poles, the diagonal cables and the tree crowns. Those crawl under camera motion whatever the crowd does, so I do not accept the attribution as the whole story without a motion capture. Not blocking on the stills, but it needs checking (fix 3).

**Q27: Did fog interaction improve? YES.**
In `pairs/pair-far-clock-tower-fog.png` the wires that used to break through the fog as near-black dashed bands are now thin, fog-tinted, continuous lines. The diagonals stay continuous through the arch in fog, and the arch outline is lighter. `pairs/pair-mid-market-square-fog.png` is still close to before, but the tree outline is restored.

**Q28: Did we avoid simply washing the scene smooth? YES.**
Ink is present at every distance and the near band is untouched. The one warning sign is foliage at 30–90 m, where the outer outline is starting to dissolve. If that spreads, the mid ground will start to look airbrushed.

---

## §20 product test (Q2 and Q3 only)

**Q2: Does the UI get out of the world's way? YES.**
In `hud-iv/after/product-test-clear/fog/rain/clear-night.png` the HUD is a thin top band plus two small bottom corners. At 0.72 opacity the Clock Tower ghosts through the ribbon: the tower shoulder and the lower arc of the clock dial are faintly visible in a 3× crop of `product-test-clear.png` (x 420–860, y 0–90), compared against `product-test-clear-world.png`. The clock still sits behind the ribbon, so the landmark is suggested rather than readable. That is acceptable for a top-centre compass.

**Q3: Does distant Terra still look illustrated without turning into a blurred mass of ink? YES, and this time the pass earned it.**
`ink-vi/after/shader-far-clock-tower.png` (clear, fog and rain) and `shader-far-rooftops-overview.png` read as illustrated, with designed silhouettes. The noisy wire bands are gone, and the strain captures show the image no longer softens under load.

---

## 3. Prior fix list, item by item

| # | Prior fix | Status | Evidence |
|---|---|---|---|
| 1 | Prove/deliver far clarity: DPR 2 strain captures, and pull far ink 30–50% toward fog | **Achieved** | `pairs/strain-*.png` and `ink-vi/*/captures.json` (0.834 → 1.165). Far visible ink −25 to −55%; distant outlines lighter in `strain-far-rooftops-overview`. The very-far strain crop is only sky (evidence gap). |
| 2 | Fix dashed and aliased cables; full fog on thin ink | **Partial** | Horizontal wires are continuous, thin and fog-attenuated (achieved). Diagonals are 1 px beaded and aliased above the banner and still ladder-hatched across it. Mid-street checkpoint members are now beaded and broken. |
| 3 | Thin mid-band clutter by 25–35% more; foliage outer silhouette only | **Partial** | Fewer internal lines, −24 to −50% (achieved). The foliage rule is inverted in places: the outer silhouette is what got lost or speckled (`mid-street` tree, `far-clock-tower` bottom-right foliage). |
| 4 | Protect low-contrast silhouettes | **Partial** | Chimney/smoke and tree/gantry are fixed. New similar-value losses: tree crowns against grey facades. The checkpoint lintel has faded to about 30% contrast. |
| 5 | Raise small text | **Achieved** | weather and curfew 12, steps and prosperity 12, overlines and subline and speaker 11. |
| 6 | Name the ward pill and shrink it to 11–12 px | **Achieved** | "OCCUPATION │ HEAVY 80%"; 11 px text in a 14 px pill. |
| 7 | Phone: one-line objective, unsliced compass ends, aligned left edge | **Achieved** | `hud-mock-phone-*.png`. New nit: the pause glyph reads as "II". |
| 8 | 800×600 crowded: design the wrap | **Achieved** | `hud-mock-narrow-curfew-worst.png`: the pill sits beside "INDUSTRIAL FOG" on the second status row, aligned flush. |
| 9 | Ribbon translucency to about 0.65–0.75 | **Achieved** | 0.72, with contrast at least 6.92:1 in the scene. The tower is only ghosted, not legible. |
| 10 | Day/night mark; narrow the ribbon 80–100 px | **Achieved** | Sun disc and crescent. Ribbon 422 → 347 (−75 px) with the dead gap gone. Side effect: ribbon and compass width now change with state (347 / 387 / 415 / 512 px). |

On the reported top-band regression (56 → 72 px in the crowded state at 1280): it is **acceptable but avoidable**. It occurs only in the worst combined state, and 72 px is still 25% under the baseline's 96 px.

At 1280, though, there are about 840 px between the identity plate and the treasury, while the ribbon caps at 512 px. The single row "23:40 ☾ KNOWN TO THE PATROLS · INDUSTRIAL FOG · OCCUPATION LOCKDOWN 100%" would fit in about 620 px. The third row is also a lone right-aligned pill with dead space to its left, so it looks less designed than the 800×600 wrap. This does not block a YES.

---

## 4. Remaining fixes, prioritized

1. **Restore mid-band foliage silhouettes and remove the speckle.** Blocks YES on Q25.
   - *What:* the projected-thickness / luminance-difference fade is removing crown outlines where the crown is close in value to what is behind it. The speckle along the remaining edge looks like a hard threshold flickering per pixel.
   - *Where:* `shader-mid-street` (x 750–830, y 330–410) and `shader-far-clock-tower` (x 770–840, y 410–445). Check every tree at 30–90 m.
   - *How much:* hold depth-discontinuity edges on foliage at the previous build's strength, roughly 0.8–1.0 of before. Replace the hard cut-off with a smoothstep over about 0.1 of the test value, so edges fade continuously instead of dithering.
   - *Pass test:* crown outlines continuous in those two crops, as in `ink-vi/before`.

2. **Stop the thickness fade from eating solid structural members.** Blocks YES on Q25.
   - *Where:* the mid-street checkpoint lintel and poles (x 580–700, y 310–420).
   - *How much:* reserve the full coverage fade for wire-class geometry. Give solid geometry a floor of about 0.5–0.6 of the previous ink, so the lintel returns to at least about 60 contrast levels against the haze.
   - *Optional, for the diagonal cables:* use coverage-based alpha over 2 px instead of a hard 1 px line, so they read as a soft continuous stroke rather than beads. The ladder where they cross the banner (x 660–720, y 370–420) is the remaining aliasing artefact; it does not block Q24.

3. **Verify shimmer in motion.** Does not block on the stills, but it is a risk.
   - *What:* capture a 2–3 s camera pan at DPR 1 in rain and clear on `far-clock-tower` and `mid-street`, before and after.
   - *Why:* crawl rose 17% (rain clock tower). The stills show static beaded or speckled ink (fixes 1–2), so the "moving crowd" attribution is not sufficient.
   - *Expectation:* if fixes 1–2 land, crawl should return to 0.0052 or below.

4. **Phone pause control.** Does not block.
   - *What:* replace the serif "II" with a sans or SVG pause mark, or separate it visually from the ward name again.
   - *Where:* `hud-mock-phone*` and `hud-mock-phoneland*`, x 16–60.
   - *How much:* make it a 44×44 target (currently 44×40).

5. **Crowded state at 1280.** Does not block. Let the ribbon grow to about 640 px when the viewport is at least 1200 px wide, so the worst state stays at two rows and 56 px. Keep the designed three-row wrap for 800×600 and phone.

6. **Small HUD tidies.** None block.
   - Raise the ward value to 12 px.
   - Add a "·" between "KNOWN TO THE PATROLS" and "INDUSTRIAL FOG"; the two caps phrases run together.
   - Keep the objective ◄ marker from overlapping the edge letter (night, x≈455).
   - Fix the ribbon's width, or the tape's visible span, so the compass doesn't resize when weather or curfew text changes (347 → 512 px).

7. **Ink the sun.** Does not block. Draw it with an ink outline or short rays, matching the crescent's drawn quality, so it stops reading as a status dot. Optionally drop the outline on the "OCCUPATION" label half of the tag, so only the value is boxed, to remove the badge-in-box look.

8. **800×600 hints.** Does not block. Restore "E Interact" at least, or shorten "Walk" to fit.

9. **Evidence gap.** Does not block. Re-crop `strain-veryfar-skyline-edge` to include the floating island, so the very-far band is actually shown at device pixels.
