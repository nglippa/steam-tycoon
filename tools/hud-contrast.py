"""Text contrast of the HUD plates against the real world behind them.
  python3 tools/hud-contrast.py <dir with game-captures --sets=product output> [out.json]
For each `*-world.png` (the frame with the HUD hidden) every pixel under a plate is composited with the plate's paper at its
opacity, as the browser does (sRGB), and the WCAG ratio of each text colour on it is taken; the minimum and 1st percentile
are reported, and the same over a black scene. The ribbon's rows (tape, status line) are reported separately."""
import json, sys
import numpy as np
from PIL import Image

d = sys.argv[1].rstrip('/') + '/'
cap = json.load(open(d + 'captures.json'))
hexc = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
def lum(c):
    c = c / 255; l = np.where(c <= .03928, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    return .2126 * l[..., 0] + .7152 * l[..., 1] + .0722 * l[..., 2]
paper = hexc('#f2e4c9')
# plate: (opacity, text colours on it). The ribbon was .88 with --hud-soft text before HUD IV; it is now .72 with --ink.
PLATES = {'ribbon': (.72, {'ink': '#22283c'}), 'ribbon@before(.88)': (.88, {'hud-soft': '#38433f', 'burgundy': '#793d59'}),
          'identity': (.88, {'ink': '#22283c'}), 'treasury': (.88, {'ink': '#22283c', 'hud-soft': '#38433f', 'hud-good': '#275a4d'}),
          'objective': (.88, {'ink': '#22283c', 'hud-soft': '#38433f', 'burgundy': '#793d59'})}
out = {'method': __doc__.strip(), 'shots': {}}
for s in cap['shots']:
    if not s['name'].endswith('-world.png'): continue
    im = np.asarray(Image.open(d + s['name']).convert('RGB'), float); res = {}
    for plate, (a, texts) in PLATES.items():
        x, y, w, h = s['boxes'][plate.split('@')[0]]
        rows = {'tape': im[y + 1:y + 19, x + 1:x + w - 1], 'status': im[y + 19:y + h - 1, x + 1:x + w - 1]} if plate.startswith('ribbon') else {'all': im[y + 1:y + h - 1, x + 1:x + w - 1]}
        for rn, px in rows.items():
            Lb = lum(a * paper + (1 - a) * px.reshape(-1, 3)); Lk = lum(a * paper)
            for tn, t in texts.items():
                Lt = lum(hexc(t)); r = (np.maximum(Lb, Lt) + .05) / (np.minimum(Lb, Lt) + .05)
                res[f'{plate} {rn} {tn}'] = {'opacity': a, 'min': round(float(r.min()), 2), 'p1': round(float(np.percentile(r, 1)), 2), 'overBlack': round(float((max(Lk, Lt) + .05) / (min(Lk, Lt) + .05)), 2)}
    out['shots'][s['name']] = res
    print(s['name']); [print(f'  {k:38s} min {v["min"]:5.2f}  p1 {v["p1"]:5.2f}  black {v["overBlack"]:5.2f}') for k, v in res.items()]
if len(sys.argv) > 2: json.dump(out, open(sys.argv[2], 'w'), indent=1)
