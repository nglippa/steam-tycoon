# Independent art review: UI and rendering (brief §19 Q15–28, §20 Q2–3)

The review is based only on the screenshots and measurement JSON under `screenshots/presentation/`. Paths below are relative to that folder. I did not read QA.md, ART_DIRECTION.md, the git log or any implementation notes.

## Verdict table

| # | Question | Verdict |
|---|---|---|
| 15 | Is persistent UI materially slimmer? | **YES** |
| 16 | Is all important information still readable? | **PARTIAL** |
| 17 | Does the world dominate the screen? | **YES** |
| 18 | Did we avoid generic SaaS/dashboard styling? | **YES** (with notes) |
| 19 | Are prompts/toasts quieter? | **YES** |
| 20 | Does the interface still feel like Terra? | **YES** |
| 21 | Is the original illustrated style preserved? | **YES** |
| 22 | Are close views still strong? | **YES** |
| 23 | Is mid-distance cleaner? | **PARTIAL** |
| 24 | Is far-distance substantially clearer? | **NO** (not shown by the evidence) |
| 25 | Are silhouettes preserved? | **PARTIAL** |
| 26 | Did internal edge noise decrease? | **PARTIAL** |
| 27 | Did fog interaction improve? | **PARTIAL** |
| 28 | Did we avoid simply washing the scene smooth? | **YES** |
| §20-2 | Does the UI get out of the world's way? | **YES** (one caveat) |
| §20-3 | Does distant Terra still look illustrated without a mass of ink? | **YES**, but it already did in the baseline captures. This pass did not earn it. |

Overall: the UI work succeeds. The rendering work is safe but timid. It preserves the style and trims mid-distance ink by about 10–20%. The far and very-far bands are essentially unchanged in every capture provided. The brief's strongest rendering demand, "far-distance substantially clearer", is not demonstrated.

---

## Evidence sanity check: do the two "before" sets match?

- **World pixels match.** I diffed `baseline/shader-*.png` against `ink/before/shader-*.png` on the world area only (y 110–580). The mean absolute difference is 0.04–0.95 per channel and at most 2% of pixels differ by more than 20. The 2% case is the rain Market Square view, where rain particles and walking people move. So the two sets show the same rendering.
- **The HUD does not match.** `ink/before/` already shows the new slim HUD, while `baseline/` shows the old one. The two sets are interchangeable for judging rendering but not for judging the HUD.
- **Change from before to after is small.** `ink/` against `ink/before/` changes only 0.3–3% of world pixels by more than 20. In `shader-veryfar-skyline-edge` the figure is 0.02%, which means that view is effectively unchanged.

---

## UI details

**Q15: Is persistent UI materially slimmer? YES.**
Comparing `baseline/hud-measure.json` with `hud/hud-measure.json`:

| Measure | Before | After | Change |
|---|---|---|---|
| Persistent area | 11.63% of screen | 7.11% | −39% |
| Top band | 96 px | 56 px | −42% |
| Bottom band | 97 px | 60 px | −38% |
| Identity, ribbon, treasury height | 56 / 80 / 78 px | 44 px each | |
| Key-hints bar | 42 px | 30 px | |

Borders dropped from 2 px to 1 px, and the dashed rule and progress bar are gone. This beats the brief's 20–30% target. The side-by-side in `hud/hud-before-after.png` is convincing.

**Q16: Is all important information still readable? PARTIAL.**
Nearly all state survives. The objective, step, prosperity, ward, treasury, income, clock, weather and the ward-level pill are all present, and the dialogue card no longer overlaps the objective ticket. The baseline had them overlapping at x 320–374, y 589–614. The problems:

- **Text below 13 px.** Several pieces of state sit at 10 px letterspaced caps: the weather/curfew line, the treasury label, the objective's overline, step and prosperity lines, kbd caps, the prompt subline and the dialogue speaker. The key-hint labels are 11 px.
  - The weather/curfew line matters most. In `hud-mock-crowded-status.png` it carries "INDUSTRIAL FOG · KNOWN TO THE PATROLS", which is gameplay-relevant curfew state.
  - The prosperity line ("PROSPERITY 0 / 5 · THE LOWWORKS") is the second most important.
- **The ward pill has no noun.** "HEAVY 80%", "LOW 38%", "FREE 0%" and "LOCKDOWN 100%" never say what is heavy. This is mystery-meat UI, which §9 forbids. It was inherited from the baseline, but the pill grew from 10 px to 13 px and is now the loudest element in the HUD.
- **"DAY" was dropped.** The weather line used to read "CLEAR SKIES · DAY". The clock partly covers this, but day/night phase is no longer stated.
- **Phone portrait (`hud-mock-phone-390x844.png`) loses the objective.** The objective ticket does not appear at all. If that is intentional, the objective state is gone on that layout.

**Fix:**
- Raise `#weather`/`#curfew` to 12–13 px.
- Raise the objective's step and prosperity lines to 12 px.
- Give the ward pill a noun, such as "PATROLS HEAVY 80%" or a 10–11 px "ORDINANCE" overline beside it, and shrink the pill back to 11–12 px so it stops shouting.
- Restore the day/night word, or a small sun/moon mark next to the clock.
- Show a one-line objective on phone portrait.

**Q17: Does the world dominate the screen? YES.**
With 93% of the frame free and a slim 56 px top band, the world dominates. The street, arch and checkpoint read clearly in `hud/hud-normal.png`, `qa/product-test-clear.png` and `qa/market-square-close.png`.

**Q18: Did we avoid generic SaaS/dashboard styling? YES, with notes.**
Several things keep it on the right side of the line:
- the serif ward title;
- letterspaced small-caps overlines;
- the compass tape with tick marks;
- cream paper with a brass coin glyph;
- square corners, no drop shadows, no pills-as-buttons.

Two notes:
- **Still five matching boxes.** The HUD remains five near-identical cream rectangles with 1 px borders. That is the most "card"-like part of it.
- **Backing is barely translucent.** It is 0.88 opacity (`color(srgb … / 0.88)`), so it is not the "restrained translucent backing" §10 asks for.

Neither note is a failure.

**Q19: Are prompts and toasts quieter? YES.**

| Element | Before | After |
|---|---|---|
| Toast | 520×63, 2 px border with 6 px accent, two lines | 592×28, 1 px border with 3 px accent, one line |
| Prompt | 226×53 | 201×37 |
| Dialogue | 66 px tall | 54 px tall |

See `hud/hud-toast.png` and `hud/hud-prompt.png`. A small cost: the toast now sits 8 px under the ribbon, so the top-centre stack grows to about 92 px while a toast shows. That is acceptable for a transient element.

**Q20: Does the interface still feel like Terra? YES.**
The palette, serif/sans pairing, compass ribbon, coin glyph and rust ward pill are all retained. It reads as the same interface, refined.

**Mock-state flags.** No element overlaps another in any desktop or 800×600 state; I checked the boxes in `hud-mock-states.json`. Still:

- **800×600 crowded (`hud-mock-narrow-800x600-crowded.png`).** "LOCKDOWN 100%" wraps onto its own flush-left line, so the ribbon grows to 62 px and loses balance. It looks like an accidental wrap, not a designed second row.
- **800×600 normal.** The Interact and Sprint hints are silently dropped.
- **Phone portrait (`hud-mock-phone-390x844.png`):**
  - The compass tape is clipped at both ends: "W" renders as "V" and "E" as "]".
  - The identity plate starts at x≈68 while the ribbon and toast start at x≈17, so the left edges don't line up.
  - The objective is missing (see Q16).
- **Phone landscape (`hud-mock-phone-844x390.png`).** The identity plate (x≈68) and the objective (x≈16) don't share a left edge either.
- **Ribbon spacing.** The ribbon's second row has about 230 px of dead space between "CLEAR SKIES" and the pill (`hud-normal.png`). The ribbon could be about 80–100 px narrower.
- **Contrast** is fine. Grey-green #46524F on cream #F2E4C9 is about 6.4:1, and white on rust is high.

---

## Rendering details

Band numbers come from `ink/measurements.json` and are given as before → after. Bands: near < 30 m, mid 30–90 m, far > 90 m.

**Q21: Is the original illustrated style preserved? YES.**
Every after frame still carries flat cel-shaded colour, painted clouds and dark ink lines. Nothing reads as generic Three.js.

**Q22: Are close views still strong? YES.**
`pair-close-character-storefront.png` is visually identical: near-band ink stays at 17.0% → 17.0% and only 0.25–0.38% of world pixels change. The near band (< 30 m) is untouched in every view.

**Q23: Is mid-distance cleaner? PARTIAL.**

| View | Mid-band meanInk | Visible ink |
|---|---|---|
| Street | 0.24 → 0.21 | 31.6% → 27.4% |
| Clock tower | 0.29 → 0.25 | 32.0% → 28.4% |
| Rooftops | 0.17 → 0.14 | 19.0% → 14.8% |

Visible gains:
- The doubled dark arch outline and the tower outlines are lighter and fog-tinted (my crop of `shader-far-clock-tower` in fog).
- The plank lines on the rooftop water tower are calmer.

But the worst mid-distance clutter is barely touched. The ironwork, foliage and lamp cluster under the arcade in `shader-mid-street` and `shader-far-clock-tower` (roughly x 440–840, y 300–440) is still a dense web of dark lines. Ink coverage in the mid band (≥ 0.2 strength) only moved from 32.1% to 31.4% in the clock-tower view. Lines got lighter but not fewer.

**Fix:** in the 30–90 m band, cut normal-based (internal) edge contribution by another 25–35% so fewer lines draw, not just lighter ones. Hold depth-discontinuity (silhouette) edges at current strength. Treat foliage as a special case: keep only its outer silhouette.

**Q24: Is far-distance substantially clearer? NO.**
- **The far band was barely changed.** It held almost no ink in the baseline: 1.5–1.6% of pixels in the street, square and tower views, moving to 1.3%. Rooftops went from 5.0% to 4.0%.
- **The very-far view is pixel-identical.** `shader-veryfar-skyline-edge` changed in 0.01% of world pixels.

So the captures neither show a far-distance problem nor show it being fixed. The visible improvement in the "far" shots all comes from geometry 30–90 m away.

The one possibly substantive fix is invisible in the images. In the `strain` test, the before build's adaptive pixel ratio decayed from 1.457 to 0.834, while the after build held 1.457 (lowest 1.165). If the user's "distant blur" came from that resolution drop, it may be fixed. But there are no screenshots at real DPR or under load to show it, so I cannot credit it visually.

Also, horizontal overhead cables still break into dashed, stair-stepped segments in every far frame, both before and after. Examples are the wires crossing the clock tower in `shader-far-clock-tower*` and in `pair-far-clock-tower-rain.png`. In motion this will shimmer, and it is exactly the "depth-edge instability / AA" cause that §11-F asks to be fixed.

**Fix:**
1. Capture the far set at deviceScaleFactor 2 under the strain load, before and after, so the resolution-hold fix can be seen.
2. Fix the cable aliasing. Either fade ink by projected line thickness, so lines under about 1 px of coverage fade rather than break up, or give those wires a minimum ink width with coverage-based alpha.
3. Pull ink on over-90 m silhouettes toward the fog colour by about 30–50%, so distant shapes separate by value as well as line.

**Q25: Are silhouettes preserved? PARTIAL.**
Major silhouettes hold:
- the clock tower and water tower (`pair-far-rooftops-overview.png`);
- the floating island (`pair-veryfar-skyline-edge.png`);
- the balustrade, banner gantry and people.

Two local losses are worse than before:
- **Chimney into smoke.** In `shader-far-rooftops-overview`, roughly x 800–900, y 150–350, the dark chimney stack now melts into the dark smoke plume. The baseline had a thin outline separating them.
- **Trees into gantry.** In `shader-mid-market-square-fog`, roughly x 740–880, y 330–420, the right-hand tree loses its outline and merges into the dark gantry behind it.

**Fix:** when the luminance on both sides of a depth edge is within about 0.1, keep that silhouette at full baseline strength. Only fade silhouettes that already separate by value.

**Q26: Did internal edge noise decrease? PARTIAL.**
Yes, modestly, in the mid band: the water-tower planks, the arch double line and the background house outlines in the rooftop view. Two kinds of noise remain:
- the dashed-cable artefacts;
- foliage and ironwork clusters, still the dominant noise sources.

The crawl metric moved only slightly: compensated change in the street mid band went from 0.0073 to 0.0059. Same fix as Q23 and Q24.

**Q27: Did fog interaction improve? PARTIAL.**
- **Better.** In fog, outlines are now tinted toward the fog colour, and the arch and tower lines are no longer near-black bands (my crop of `shader-far-clock-tower-fog`, tower and arch area).
- **Barely different overall.** The whole frames differ from baseline by a mean of only 1.5–2.1, and `pair-mid-market-square-fog.png` reads as essentially the same picture.
- **Wires still break through.** Cables crossing the fogged background still draw as dark dashed bands at nearly full strength.

**Fix:** apply the fog factor to thin-line ink as strongly as to other ink. Today the wires visibly escape it.

**Q28: Did we avoid simply washing the scene smooth? YES.**
The change is conservative. Ink is still clearly present at every distance, the near band is untouched, and nothing looks airbrushed. If anything the pass erred toward doing too little.

**Rendering regressions (after worse than before):**
1. **Chimney and smoke merge** in `shader-far-rooftops-overview` (Q25). Minor.
2. **Mid-distance tree outline lost** against the dark gantry in Market Square fog (Q25). Minor.

I saw nothing else: no new shimmer, no muddy fog, no washed-out mid-ground. The existing dashed-wire aliasing is not a regression, but it is unfixed.

---

## §20 product test (questions 2 and 3 only)

**Q2: Does the UI get out of the world's way? YES.**
In `qa/product-test-clear/fog/rain/site3/site5.png`, the HUD is a thin 56 px top band plus two small bottom corners. The plaza, stalls, banner gantry and fountain carry the frame.

One real collision: the compass ribbon sits top-centre, exactly where the Clock Tower's upper shaft lands. The tower top sits under the 0.88-opacity ribbon in `product-test-clear.png` (x 650–800, y 0–56) and in `product-test-site5-clear.png`. Making the ribbon backing more translucent, around 0.6–0.7, or dropping the backing behind the compass tape row would let the landmark show through.

**Q3: Does distant Terra still look illustrated without turning into a blurred mass of ink? YES.**
`ink/shader-far-clock-tower.png`, `ink/shader-far-rooftops-overview.png` and `ink/shader-veryfar-skyline-edge.png` read as illustrated, with designed silhouettes and atmospheric value falloff.

But be honest about why: the baseline captures at 1280×720 and DPR 1 already passed this. This pass changed the far band very little. I can say YES on the current state but cannot confirm improvement.

The Market Square product-test frames also don't contain a distant Clock Tower. It is too close and its top is cropped or under the ribbon. Only the separate `far-clock-tower` capture answers this question.

---

## Prioritized fix list

1. **Prove or deliver far-distance clarity (Q24).**
   - Re-capture the far and very-far set at DPR 2 under the strain load, before and after, so the pixel-ratio fix becomes visible evidence.
   - Pull over-90 m silhouette ink 30–50% toward the fog colour.
2. **Fix dashed and aliased cables (Q24, Q26, Q27).** Fade thin-geometry ink by projected thickness or coverage, and apply full fog attenuation to it. This is the most visible remaining artefact at mid and far distance, and it will shimmer in motion.
3. **Thin mid-band clutter (Q23, Q26).** Cut internal and normal edges a further 25–35% in the 30–90 m band so fewer lines draw. Keep foliage to its outer silhouette only.
4. **Protect low-contrast silhouettes (Q25).** Keep full-strength depth-edge ink where the luminance on either side differs by less than about 0.1. This fixes the chimney/smoke and tree/gantry merges.
5. **Raise small important text (Q16).**
   - Weather/curfew line to 12–13 px.
   - Prosperity and step lines to 12 px.
   - Toast overline, prompt subline and dialogue speaker to at least 11 px.
6. **Name the ward pill (Q16).** For example "PATROLS · HEAVY 80%", and shrink it back to 11–12 px so it stops being the loudest element.
7. **Phone layouts:**
   - Show a one-line objective on portrait.
   - Inset or mask the compass tape so the end glyphs aren't sliced.
   - Align the identity plate's left edge with the ribbon and objective (x≈16).
8. **800×600 crowded.** Design the wrap: put the pill on the right of the second row, or shorten the weather/curfew strings, instead of letting the pill fall to a flush-left third line.
9. **Ribbon translucency (§10, §20-2).** Drop the backing to about 0.65–0.75 opacity, or remove it behind the compass tape, so landmarks like the Clock Tower read through it.
10. **Minor UI tidies:**
    - Restore the day/night word or mark beside the clock.
    - Narrow the ribbon by about 80–100 px to remove the dead gap in its second row.
