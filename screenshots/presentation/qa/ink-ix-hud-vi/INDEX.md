# Ink IX + HUD VI: before / after

Captured at the commits named below with `tools/game-captures.mjs --people=new` (headless, 1280x720, device scale 1, noon, the game clock frozen), the capture tools stubbing pointer lock. "Before" is 27e8343 (HEAD at the start), "after" is the final commit of this round, "baseline" is `final/game/bands-baseline-70f73c4/`. Pairs are at most 1000 px wide.

Measured on the same rendered frame by `tools/ink-regions.mjs` (each variant's ink quad drawn again over one scene) and `tools/ink-measure.mjs --mode=ink --before=<27e8343's ink-renderer.ts>`; the whole-image edge shares of the PNGs include the HUD, a toast when one is up and whatever people are in the frame, so the world band (y 100 to 600) is the figure to read. Raw numbers: `ink-regions.json`, `ink-measure.json`, `ink-crawl-before.json`, `ink-crawl-after.json`, `hud-sizes-before.json`, `hud-sizes-after.json`, `hud-measure-before.json`, `hud-measure-after.json`.

## Images

| File | What |
|---|---|
| `1-isle-veryfar.png` | very-far isle, crop x1000-1280 y300-560: baseline, before, after |
| `1-far-clock-tower-fog.png` | far clock tower in fog, world band: before, after (no ink mass) |
| `2-crown-mid-street.png` | mid-street crown, crop x400-700 y300-450: baseline, before, after |
| `2-crown-far-clock-tower.png`, `2-crown-far-clock-tower-fog.png` | crown, crop x360-560 y370-500: baseline, before, after |
| `4-people-market-square.png` | clear Market Square, figures 20 to 30 m out: before, after |
| `5-hud-800x600-night-fog.png` | 800x600 at 23:40 in fog, top and bottom strips: before, after |
| `5-hud-1280x720.png` | 1280x720 top (fog) and bottom strips: before, after |

## Ink

| Item | Measure | Before | Baseline | After |
|---|---|---|---|---|
| 1 isle (commit d1ba881) | outer-edge luma below the isle fill (row sampling, x1000-1280, rows 362-440; mean / 90th pct) | 2.3 / 10.7 | 4.4 / 13.9 | 24.4 / 25.1 |
| 1 | mean luma of the isle's inked pixels in the crop | 116.2 | 119.0 | 111.7 |
| 1 | far clock tower in fog, world-band edge share | 0.357 | 0.748 | 0.365 (no ink mass) |
| 2 crown (bc394b7) | mean final luma on the exact crown-edge pixels, mid street (4,821 px) | 88.0 | 84.5 | 84.3 |
| 2 | far clock tower (6,950 px) | 78.4 | 77.6 | 76.4 |
| 2 | far clock tower in fog (7,466 px) | 80.3 | 77.3 | 77.5 |
| 3 far value pull | tried at .3, past 90 m, sky excluded: world-band edge share 0.668 to 0.650 (clock tower), 0.219 to 0.216 (rooftops); far-band luma +2.8 and +2.4 (it lightens); only 1.2% of the clock tower's world band is past 90 m | | | **reverted, not committed** |
| 4 people (df69ae9) | clear Market Square, ink share of the figure boxes over the world's | 1.206 | 1.185 | 1.183 |
| 4 | Market Square in fog | 1.207 | 1.182 | 1.188 |
| 4 | far clock tower (figures 8 to 25 m) | 2.104 | 2.062 | 1.719 |
| 4 | close storefront figure, 4 m (must not move) | 25.54% | 25.80% | 25.53% |

Whole-image edge share (|dL| over 60, horizontal pairs, HUD included) of `shader-far-clock-tower.png`: baseline 1.570, before 1.227 (a toast and a different foreground in the earlier shot made the review's 1.43), after 1.495 in a shot with a different crowd; the target (at most 1.25) is met by the render itself, not by item 3.

`ink-measure --mode=ink` (live against 27e8343's shader, same scene): ink share of the far band 1.14 to 1.33% (Market Square in fog), 1.29 to 1.40 (Market Square), 1.21 to 1.36 (rain), 3.83 to 4.00 (rooftops), 1.34 to 1.35 (clock tower fog), mid and near bands down 0.1 to 0.2 point. Crawl (compensated change per frame, mid band / far band): mid street .0066 / .0004 to .0066 / .0005, very far .0030 / 0 to .0029 / 0, clock tower in rain .0062 / .0002 to .0064 / .0003. `ink-crawl` (d2): tree +5.0%, foliage +3.6% / +1.0% / +2.7%, central third +3.1 to +5.1%, but checkpoint +12.6%, cables above +11.5% (clear) and +10.6% (rain), cables at the banner +3.6 to +6.3%.

## HUD VI (commit 2d35d42)

Computed sizes (px, before to after): ribbon status 12 to 13, heat tag 12 to 13, ward noun 11 to 12, objective overline 11 to 12, key hints 11 to 12, keys 11 to 12.

| State | Ribbon height | Overlap with identity plate | Persistent plates (share of window) |
|---|---|---|---|
| 800x600 night-fog | 59 to **44** (one row, noun dropped, weather name clipped) | none | 14.01% to 12.96% |
| 800x600 clear | 44 to 44 (341 to 274 wide) | none | 12.62% to 12.09% |
| 900x600 night-fog | 59 to 44 | none | 12.96% to 11.54% |
| 1280x720 clear | 44 to 44 (352 to 372 wide) | none | 6.86% to **7.02%** |
| 1280x720 night-fog | 44 to 44 (457 to 485 wide) | none | 7.36% to 7.56% |
| 1920x1080 clear | 44 | none | 3.05% to 3.12% |
| phone 390x844 | 44 / 59 unchanged (its own 12 and 11 px sizes kept) | none | 11.89% / 13.53% unchanged |

`hud-measure-after.json`: `lock.fallback` false (it was true), `#save-status` empty, `#pause` hidden, the body is "started playing", no dim overlay (the prompt frame's blue-grey is the world's own grade).
