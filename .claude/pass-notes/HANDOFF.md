# Handoff: People / Presentation Foundation pass

Written 2026-10-14, when the orchestrator stopped. The weekly usage limit cut off the last two workers mid-task. Both were brought to green points, committed and pushed. This file is the whole briefing; read it top to bottom before touching anything.

## 0. What this pass is

The brief is `.claude/pass-notes/brief-full.md`. Read sections 0–21.

- It is a presentation-only pass: people (character construction), a slimmer UI and lighter ink/shader rendering.
- No gameplay, economy, story, spawn-count, path or role changes. Every commit so far keeps gameplay unchanged.
- The brief's standing rule was that every requirement must be met before anything merged to `main`. On 2026-10-14 the user asked for the work to be pullable, so `presentation` (with `people-xxvi` merged in) was fast-forwarded into `main` and pushed. The brief is **not** yet complete: §5 below is still the remaining work.
- Continue on `main` (or a branch from it). Ask the user before any further push to `main`.

## 1. Branches and worktrees

| Branch | Worktree | Tip | Contents |
|---|---|---|---|
| `main` | the repo root | same as `presentation` | Everything: People I–XXVII, HUD I–V, Ink I–VII, QA I–V-b, and the merges of People XX–XXIII and XXVI–XXVII. Pushed. |
| `presentation` | `.claude/worktrees/presentation` | see `git log -1` | The integration branch. `main` was fast-forwarded to it. |
| `people-xxvi` | `.claude/worktrees/people-xxvi` | `f536d13` | People XXVI–XXVII. **Merged** into `presentation` as `d557845`, plus the merge fix `92bc1f9`: a seated lap is flattened only as far as XXVI's parted thighs allow. |

Other worktrees under `.claude/worktrees/` (`people`, `people-xx`, `fixes`, `pass3`, `pass4`, `resistance`, `two-paths`, `agent-*`) belong to earlier passes. Leave them alone.

`node_modules` in `people-xxvi` is a symlink to `../presentation/node_modules`. If you start on a fresh clone, run `npm ci` once.

## 2. Machine and process rules (from the user)

- **At most two heavy agents at a time, never three.** This MacBook is weak. A dev server or headless browser counts as heavy.
- **Every browser runs headless** (Playwright `headless: true`). Never open a visible window.
- Dev servers:
  - `npx vite --host 127.0.0.1 --port 5199 --strictPort` for `presentation`
  - port 5791 for a second worktree
  - Kill what you start. `ps` is aliased, so use `/bin/ps`.
- **Context discipline for anything visual.** Never Read a full-size PNG (the line-ups are 2560 px wide). Crop or downscale with PIL to ≤ 900–1200 px first, and cap image reads (~8–20 per task). Three workers died from 2–3 MB transcripts before this rule existed.
- Before every commit: `npm run typecheck && npm test && npm run build`, all green.
- Commit per item. Message style: a long descriptive subject prefixed by the round name (`People XXVIII: …`), as in `git log`. End every message with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Repo hooks:
  - They may block `git commit --amend`, `rm` of scratch files and main-session edits to `src/`. Don't fight them.
  - Untracked scratch files (`tests/_dbg*.ts`, `tests/_probe.ts`, `tests/_look.ts`, `tests/_expr.mjs`, `tests/_shots.mjs`, `tools/_x27*.ts`, `screenshots/presentation/qa/people-xxvi/raw/`) are disposable. Ask the user before deleting them, and never commit them.
- Cortex memory namespace is `steam-tycoon` (see `AGENTS.md`).

## 3. Key files

- People builder: `src/world/people/{figure,body,loft,head,headform,hair,hat,look,parts,wardrobe,mask}.ts`
- Cloth that follows the legs: `src/world/drape.ts` (`drape`, `carryPanel`, `seatPanel`)
- Poses: `src/world/citizen-life.ts` (`animateLife`, `standFeet`, `seatLegs`, `seatCloth`, bite)
- Cast sheet: `src/sheet.ts`
- Capture tools:
  - `tools/qa-captures.mjs` (`--part=sheet|seated|…`)
  - `tools/game-captures.mjs`
  - `tools/ink-crawl.mjs`
  - `tools/variety-measure.ts` (on `people-xxvi`)
- Tests: `tests/*.ts`. `tests/people-rig.ts` builds figures in node; `REPS` holds the 11 QA representatives as `[label, combo, seed]`.
- Art rules: `TERRA_CHARACTER_BOOK.md`, `ART_DIRECTION.md`, `QA.md`.
- Skills: `stylized-game-characters`, `figure-construction`.
- Reviews (blind, images only):
  - `.claude/pass-notes/review-people.md`: people, §19 Q1–14; read its fix list (c).
  - `.claude/pass-notes/review-ui-render-2.md`: UI/render, Q15–28.
- Final image sets: `screenshots/presentation/final/people/INDEX.md` (QA V-a) and `screenshots/presentation/final/game/INDEX.md` (QA V-b, including `perf.json` and `console.json`).

## 4. Where the brief stands

Done and verified:

- Research, audits, Character Book and skill (§1–4).
- HUD (§9–10): blind re-review gave YES on Q15–20.
- Rendering (§11–12): blind re-review gave YES on Q21–28, except Q25 PARTIAL. Ink VII (`7b21616`) then fixed the three Q25 blockers. The orchestrator checked the images, but **no blind re-check of Q25 has run since**.
- Gameplay unchanged (§16).
- Performance (QA V-b `perf.json`):
  - people triangles +31% street / +39% Market Square;
  - frame CPU street ≈ old, square +4–8%;
  - heap +45 MB;
  - draw calls and shader programs equal.

The people blind review (`review-people.md`, on images taken at `967d31d`, before People XXV–XXVII):

- Q8 NO, Q14 NO, Q11 FAIL (repeats obvious), Q13 YES, the rest PARTIAL.
- Its fix list (c) has 11 items. Status:

| # | Fix-list item | Status |
|---|---|---|
| 1 | Aprons as rigid boards (side, stride) | **OPEN**: People XXV never reached it (see 5.2) |
| 2 | Seated cloth through bench; pelvis through skirt | Done on `presentation`: `0c8989e`, `cb50c64` |
| 3 | Clones / thin variation | Done on `people-xxvi`: `f536d13` (0 repeat groups in 100 seeds) |
| 4 | Torso planks, no elbows | Done on `people-xxvi`: `da4837a`, `9771bf7` |
| 5 | Faces | Done on `people-xxvi`: `4374354`. Darkest-skin contrast 28–33 → 46–53, still below light skin (73–83). |
| 6 | Belts / crossbelt | **Partial** on `presentation`: `c46d82d`; the garrison still has a 19.4 mm gap (see 5.2) |
| 7 | Hands and bite | Done on `people-xxvi`: `df02883` |
| 8 | Seated legs fuse | Done on `people-xxvi`: `04a15db` |
| 9 | Ordinance read (sleeves, garrison/inspector at 50 px, moustache) | Moustache done (`2b0b313`). Sleeves and the 50 px read are **OPEN** |
| 10 | Shoulders: puffed sleeve cap on 9 of 11 figures; men need a trapezius-to-deltoid slope | **OPEN** |
| 11 | Hair outliers (stallholder volume, ponytail thickness, elder's hair under the brim) | **OPEN** |

Not started:

- The blind review of §19 Q29–32 (system), and the §20 product test's three questions, from `final/game/`.
- The §21 deliverable report.

## 5. What to do next, in order

### 5.1 Merge `people-xxvi` into `presentation`: DONE

Merged as `d557845`, with follow-up fix `92bc1f9`. 269 tests pass.

- `sheet.ts`: keeps XXV's bench (`SEAT`), XXVI's bite food (`FOOD`) and `faces()`/`expressions()`.
- `citizen-life.ts`: keeps both sides.
- The two sides interacted in one place. XXV's `seatLong` flattened a seated lap until its underside rested on the bench, and XXVI's spread thighs then poked 0.6 cm through it. `seatLong` now flattens the lap only as far as the thighs allow.
- Seated captures show no cloth in the bench and no calves through hems.

### 5.2 Finish People XXV (cloth), on `presentation`

1. **Belts:**
   - Find why the garrison has a 19.4 mm gap. Measure with `beltGap(combo, seed)`, exported from `tests/cloth.test.ts`, using combo `garrison.sturdy.broad`, seed 10. Suspects: the waist belt over the closed coat's front overlap (the `plate`, recorded as a layer at `-.6..+.17`), or the crossbelt at the shoulder or back.
   - Get every cast to ≤ 6 mm. Then add the test: every REPS cast, `worst ≤ .006`, `lost == 0`.
2. **Aprons (fix-list item 1):**
   - Standing, an apron hangs within about 1.5 cm of the belly and thighs, following their curve. Add a test for that gap.
   - In stride it bends over the leading thigh (a soft fold or curve), not a flat rectangle, and its hem gets a slight taper or curve.
   - Don't regress the existing tests: apron in front of the forward leg, seated apron within 3 cm, no leg through cloth.
   - Code: `carryPanel` / `seatPanel` in `drape.ts`, `apron` in `wardrobe.ts`.
3. Take before/after crops into `screenshots/presentation/qa/people-xxv/`. The befores are already there.

### 5.3 People XXVIII: the remaining review items

- **50 px distinctness.** Target: same-scale silhouette IoU < 0.78 per pair, measured by `tools/variety-measure.ts`.

  | Pair | IoU now (front / side) |
  |---|---|
  | garrison / inspector | .764 / .775 |
  | sturdy civilian / stallholder | .721 / .749 |
  | young mechanic / labourer | .725 / **.838** (fails) |

  Add a `tests/cast-reads.test.ts`; the tool header already mentions it.
- **Ordinance sleeves.** Square-set sleeves or epaulettes instead of balloon caps. Garrison and inspector must separate by silhouette, not colour: helmet comb vs kepi, plus coat length or a cape.
- **Shoulders.** The puffed sleeve cap only on the period women's blouses. Men get a sloped trapezius-to-deltoid line.
- **Hair outliers.** The stallholder's hair gets volume and a hairline break, the ponytail thickness and a taper, and the elder's white hair tucks under the brim.

### 5.4 Reshoot and re-review (blind)

1. Reshoot the people set at the new HEAD, as QA V-a did: `tools/qa-captures.mjs --part=sheet` and `--part=seated --prefix=people` into `screenshots/presentation/final/people/`, with a neutral INDEX.md.
2. Reshoot the in-game product test and render bands with QA V-b's tools into `final/game/`, if people changed visibly in-game (they have).
3. Run two fresh, blind, read-only reviewer agents. Each gets only the image folders and must not read git, code or notes:
   - **People:** §19 Q1–14 plus the specific clipping checks. Copy the prompt style from `review-people.md`'s header.
   - **UI/render/system/product:** Q15–32, with Q25 specifically, and the three §20 questions.
4. Fix every PARTIAL or NO, and repeat until all are YES.

### 5.5 Deliverable report (brief §21)

Write the report the brief §21 asks for, every bullet in order: baseline, branch, research, audits, Book, skill, old/new architecture, variation rules, animation, UI measurements, rendering diagnosis and changes, close/mid/far, QA, procedurality, performance, typecheck/test/build, console, limitations, adversarial review. Finish with the exact line `PEOPLE / PRESENTATION FOUNDATION READY FOR VISUAL REVIEW.`

Then **ask the user** about merging `presentation` into `main`. Do not merge on your own.

## 6. Known limitations, already accepted or documented

- At the default state, Market Square has only about 4 people within 12 m of the product-test camera. Density is gameplay, so it is not changed; sites 3 and 5 show 7–11.
- In-game phone captures don't show the touch controls; only the static HUD mock does.
- Between 901 and 1199 px window width, the worst HUD status state wraps to two rows.
- Diagonal wires are about 2.4 px soft strokes (Ink VII). The orchestrator accepted this.
- On the darkest skin, face-feature contrast is still below light skin.
- Two commit messages have cosmetic slips (`967d31d` says "the lady"; `4374354` has a garbled clause). A hook blocks amending them; leave them.
