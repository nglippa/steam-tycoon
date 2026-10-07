"""A pixel-exact enlargement of part of a capture (nearest neighbour), for figures shot at their true in-game size.
   python3 tools/qa-zoom.py <in.png> <out.png> <x0> <y0> <x1> <y1> <scale>"""
import sys
from PIL import Image
src, dst, x0, y0, x1, y1, k = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
Image.open(src).crop((x0, y0, x1, y1)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST).save(dst)
