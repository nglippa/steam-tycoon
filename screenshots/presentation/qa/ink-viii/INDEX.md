# Ink VIII crops

Each PNG is three panels, left to right: baseline (70f73c4), before (d0ae382), after (this change). Captures: `node tools/game-captures.mjs <base> <out> --people=new --sets=shader`, 1280x720.

- 1-checkpoint-rails, 2-checkpoint-lintel: `shader-mid-street` rails (y263-264) and the lintel over the sign (y315-317)
- 3-crown-clock-tower, 3-crown-clock-tower-fog: far-band foliage crown top
- 4-veryfar-island, 4-veryfar-balustrade: `shader-veryfar-skyline-edge`
- 5-mid-street-cables, 6-clock-tower-wires: keep-wins (diagonal cables thin, continuous, unbeaded)
- 7-market-fog-tree-gantry: keep-wins (tree crown and gantry)

Numbers (mean luma / dark<100 px, x590-690): rows 263/264 baseline 81/97 + 126/32, before 101/47 + 99/45, after 95/74 + 92/87; rows 316/317 baseline 87/100, 89/100, before 125/7, 125/6, after 104/38, 104/36. Rows 260, 261, 265 (the baseline's outline rows beside the rail) are unchanged (163/0, 152/0): not recovered.
