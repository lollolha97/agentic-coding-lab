"""Render experiment thumbnails and the og image in the Are.na language with Pillow.

    python3 scripts/render_thumbs.py

Writes experiments/*/thumb.png (1000x800) and assets/og.png (1200x630).
Needs Pillow plus Liberation Sans (Arial metrics) and Noto Sans CJK; run from any directory.
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG, FG = '#F5F1F0', '#342C2A'
G1, G2, G3, G4, G5, G6 = '#EAE6E5', '#E0DBDA', '#CAC5C4', '#AAA4A3', '#7F7977', '#4A4240'
B1, B2, B3, ALERT = '#E2DFE9', '#8082C5', '#00075F', '#D6540B'
SS = 3  # supersample

SANS = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
SANS_B = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
CJK = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
CJK_B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'


def font(path, size, index=0):
    return ImageFont.truetype(path, int(size * SS), index=index)


class Canvas:
    """Draws in logical pixels; everything is scaled by SS and downsampled at the end."""
    def __init__(self, w, h, bg=BG):
        self.w, self.h = w, h
        self.img = Image.new('RGB', (w * SS, h * SS), bg)
        self.d = ImageDraw.Draw(self.img)

    def p(self, v):
        if isinstance(v[0], (tuple, list)):
            return [(x * SS, y * SS) for x, y in v]
        return tuple(c * SS for c in v)

    def line(self, pts, fill=FG, width=1):
        self.d.line(self.p(pts), fill=fill, width=max(1, round(width * SS)), joint='curve')

    def rect(self, box, fill=None, outline=None, width=1):
        x0, y0, x1, y1 = box
        self.d.rectangle(self.p((x0, y0, x1 - 1 / SS, y1 - 1 / SS)), fill=fill, outline=outline, width=max(1, round(width * SS)))

    def ellipse(self, box, fill=None, outline=None, width=1):
        self.d.ellipse(self.p(box), fill=fill, outline=outline, width=max(1, round(width * SS)))

    def poly(self, pts, fill=None, outline=None, width=1):
        self.d.polygon(self.p(pts), fill=fill)
        if outline:
            self.line(list(pts) + [pts[0]], outline, width)

    def text(self, xy, s, fnt, fill=FG, anchor='la'):
        self.d.text(self.p(xy), s, font=fnt, fill=fill, anchor=anchor)

    def dashed(self, p0, p1, fill=G5, width=1, dash=5, gap=4):
        (x0, y0), (x1, y1) = p0, p1
        length = math.hypot(x1 - x0, y1 - y0)
        t = 0
        while t < length:
            e = min(t + dash, length)
            self.line([(x0 + (x1 - x0) * t / length, y0 + (y1 - y0) * t / length),
                       (x0 + (x1 - x0) * e / length, y0 + (y1 - y0) * e / length)], fill, width)
            t += dash + gap

    def curve(self, pts, fill=FG, width=1, dashed=False):
        if not dashed:
            return self.line(pts, fill, width)
        for i in range(0, len(pts) - 1, 2):
            self.line(pts[i:i + 2], fill, width)

    def arrow(self, p0, p1, fill=ALERT, width=2, size=8):
        self.line([p0, p1], fill, width)
        self.head(p1, math.atan2(p1[1] - p0[1], p1[0] - p0[0]), fill, size)

    def head(self, tip, ang, fill, size=8):
        pts = [tip] + [(tip[0] - size * math.cos(ang + s * 0.5), tip[1] - size * math.sin(ang + s * 0.5)) for s in (-1, 1)]
        self.d.polygon(self.p(pts), fill=fill)

    def save(self, path, size=None):
        out = self.img.resize(size or (self.w, self.h), Image.LANCZOS)
        out.save(path, optimize=True)


def block(c, box, label, num, small, glyph):
    """One Are.na-style block: hairline cell, glyph on top, caption under."""
    x0, y0, x1, y1 = box
    c.rect(box, fill=G1, outline=G3)
    cap_h = 34
    c.line([(x0, y1 - cap_h), (x1, y1 - cap_h)], G3)
    c.rect((x0 + 1, y1 - cap_h + 1, x1 - 1, y1 - 1), fill=BG)
    c.text((x0 + 10, y1 - cap_h / 2), num, small, G6, 'lm')
    c.text((x0 + 34, y1 - cap_h / 2), label, small, FG, 'lm')
    glyph(c, (x0 + 1, y0 + 1, x1 - 1, y1 - cap_h))


def shell(c, title, ident, w, h):
    f, fb = font(SANS, 15), font(SANS_B, 15)
    c.text((40, 32), 'agentic-coding-lab', fb, FG, 'lm')
    c.text((w - 40, 32), ident, f, G6, 'rm')
    c.line([(0, 56), (w, 56)], G3)
    c.line([(0, 57), (w, 57)], FG)


# ---------------------------------------------------------------- motion glyphs (cell box -> draw)
def cell_geo(box):
    x0, y0, x1, y1 = box
    return x0, y0, x1, y1, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0


def g_ease(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    gx0, gy0, gx1, gy1 = cx - 46, cy - 46, cx + 46, cy + 46
    c.rect((gx0, gy0, gx1, gy1), outline=G4)
    c.line([(gx0, gy1), (gx1, gy0)], G5, 2)
    pts = []
    for i in range(41):  # ease-in-out cubic
        t = i / 40
        v = 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2
        pts.append((gx0 + t * 92, gy1 - v * 92))
    c.line(pts, ALERT, 3)
    c.ellipse((gx1 - 6, gy0 - 6, gx1 + 6, gy0 + 6), fill=ALERT)


def g_anticip(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    gy = y1 - 30
    c.line([(x0 + 18, gy), (x1 - 18, gy)], G5)
    for a, b in (((cx - 14, gy - 72), (cx + 14, gy - 72)), ((cx - 14, gy - 30), (cx + 14, gy - 30)),
                 ((cx - 14, gy - 72), (cx - 14, gy - 30)), ((cx + 14, gy - 72), (cx + 14, gy - 30))):
        c.dashed(a, b, G5)
    c.rect((cx - 20, gy - 20, cx + 20, gy), fill=ALERT)
    c.arrow((cx + 42, gy - 8), (cx + 42, gy - 50), B3, 2, 7)


def g_squash(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    gy = y1 - 30
    c.line([(x0 + 18, gy), (x1 - 18, gy)], G5)
    c.ellipse((cx - 30, gy - 24, cx + 30, gy), fill=ALERT)
    c.ellipse((cx - 14, gy - 112, cx + 14, gy - 58), outline=G5)
    c.ellipse((cx - 20, gy - 70, cx + 20, gy - 34), outline=G4)


def g_arc(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    gy = y1 - 36
    ax0, ax1 = x0 + 28, x1 - 28
    pts = [(ax0 + (ax1 - ax0) * t / 30, gy - 4 * 70 * (t / 30) * (1 - t / 30)) for t in range(31)]
    c.dashed((ax0, gy), (ax1, gy), G5)
    c.curve(pts, B3, 2, dashed=True)
    c.ellipse((cx - 8, gy - 78, cx + 8, gy - 62), fill=ALERT)
    c.ellipse((ax0 - 7, gy - 7, ax0 + 7, gy + 7), outline=G6, width=1)
    c.ellipse((ax1 - 7, gy - 7, ax1 + 7, gy + 7), outline=G6, width=1)


def g_follow(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    gy = y1 - 34
    c.line([(x0 + 18, gy), (x1 - 18, gy)], G5)
    c.dashed((cx + 44, gy), (cx + 44, gy - 100), G4)
    c.rect((cx - 22, gy - 28, cx + 22, gy), fill=B3)
    bx, by = cx, gy - 28
    for ang, col in ((0, G4), (-18, G4), (26, FG)):
        a = math.radians(ang)
        tip = (bx + 62 * math.sin(a), by - 62 * math.cos(a))
        c.line([(bx, by), tip], col, 2)
    tip = (bx + 62 * math.sin(math.radians(26)), by - 62 * math.cos(math.radians(26)))
    c.ellipse((tip[0] - 7, tip[1] - 7, tip[0] + 7, tip[1] + 7), fill=ALERT)


def g_overlap(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    x, y, ang = cx - 58, cy + 34, 0.1
    cols = [B3, B3, B2, ALERT]
    for i in range(4):
        ang -= math.radians(12 + 8 * i)
        nx, ny = x + 34 * math.cos(ang), y + 34 * math.sin(ang)
        c.line([(x, y), (nx, ny)], cols[i], 7)
        c.ellipse((x - 3, y - 3, x + 3, y + 3), fill=BG)
        x, y = nx, ny


def g_stagger(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    gy = y1 - 34
    hs = [30, 48, 66, 78, 58, 38]
    start = cx - 60
    c.line([(x0 + 18, gy), (x1 - 18, gy)], G5)
    for i, hh in enumerate(hs):
        c.rect((start + i * 21, gy - hh, start + i * 21 + 14, gy), fill=ALERT if i == 5 else B3)
        c.text((start + i * 21 + 7, gy + 10), str(i + 1), font(SANS, 9), G6, 'mm')


def g_match(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    c.ellipse((cx - 62, cy - 30, cx - 2, cy + 30), fill=G6)
    for (ox, oy, r) in ((-44, -12, 6), (-24, 10, 9), (-50, 14, 4)):
        c.ellipse((cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r), fill=G1)
    bx = cx + 32
    c.ellipse((bx - 30, cy - 30, bx + 30, cy + 30), fill=ALERT)
    c.line([(bx - 30, cy), (bx + 30, cy)], G1, 2)
    c.line([(bx, cy - 30), (bx, cy + 30)], G1, 2)
    c.dashed((cx - 2, cy - 44), (cx - 2, cy + 44), B3, 1)


def g_parallax(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    gy = y1 - 40
    for i, (bx, hh) in enumerate(((cx - 50, 64), (cx, 52), (cx + 50, 60))):
        c.poly([(bx - 26, gy), (bx, gy - hh), (bx + 26, gy)], fill=G3)
    for bx in (cx - 44, cx + 8, cx + 54):
        c.ellipse((bx - 22, gy - 26, bx + 22, gy + 10), fill=G4)
    c.rect((x0 + 1, gy, x1 - 1, y1), fill=G2)
    c.line([(x0 + 1, gy), (x1 - 1, gy)], G4)
    for tx, th in ((cx - 64, 66), (cx - 8, 54), (cx + 54, 70)):
        c.poly([(tx - 13, gy + 30), (tx, gy + 30 - th), (tx + 13, gy + 30)], fill=G6)
    c.ellipse((cx + 28, y0 + 22, cx + 52, y0 + 46), fill=ALERT)


def g_mask(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    f = font(CJK_B, 56, 1)
    c.text((cx, cy), '모션', f, G3, 'mm')
    layer = Image.new('RGB', c.img.size, G1)
    ImageDraw.Draw(layer).text((cx * SS, cy * SS), '모션', font=f, fill=FG, anchor='mm')
    region = (int((cx - 6) * SS), int((cy - 40) * SS), int((cx + 70) * SS), int((cy + 40) * SS))
    c.img.paste(layer.crop(region), region[:2])
    c.rect((cx - 70, cy - 40, cx - 6, cy + 40), fill=B3)
    c.rect((cx - 70, cy - 40, cx + 70, cy + 40), outline=G4)


MOTION = [('Easing', g_ease), ('Anticipation', g_anticip), ('Squash & Stretch', g_squash), ('Arc', g_arc),
          ('Follow-through', g_follow), ('Overlap', g_overlap), ('Stagger', g_stagger), ('Match Cut', g_match),
          ('Parallax', g_parallax), ('Mask Reveal', g_mask)]


# ---------------------------------------------------------------- camera glyphs
def frame(c, box, col=FG, br=10):
    x0, y0, x1, y1 = box
    for (px, py, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        c.line([(px, py + dy * br), (px, py), (px + dx * br, py)], col, 2)


def scene_bits(c, cx, cy, s=1.0):
    c.poly([(cx - 40 * s, cy + 18), (cx - 18 * s, cy - 14), (cx + 4 * s, cy + 18)], fill=G3)
    c.rect((cx + 14 * s, cy - 2, cx + 30 * s, cy + 18), fill=G4)
    c.ellipse((cx - 8 * s - 4, cy - 14 * s - 2, cx + 8 * s - 4, cy + 2 * s - 2), fill=ALERT)


def g_pan(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    scene_bits(c, cx - 46, cy, .7); scene_bits(c, cx + 34, cy, .7)
    frame(c, (cx - 32, cy - 36, cx + 32, cy + 36))
    c.arrow((cx - 56, cy + 54), (cx + 56, cy + 54), B3, 2, 8)


def g_tilt(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    c.rect((cx - 12, cy - 74, cx + 12, cy + 50), fill=G4)
    c.ellipse((cx - 8, cy - 90, cx + 8, cy - 74), fill=ALERT)
    frame(c, (cx - 42, cy - 38, cx + 42, cy + 38))
    c.arrow((cx + 62, cy + 40), (cx + 62, cy - 50), B3, 2, 8)


def g_roll(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    c.dashed((cx - 64, cy), (cx + 64, cy), G5)
    a = math.radians(-12)
    pts = [(-42, -34), (42, -34), (42, 34), (-42, 34)]
    rot = [(cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)) for x, y in pts]
    c.line(rot + [rot[0]], FG, 2)
    c.line([(cx - 52, cy + 12), (cx + 52, cy - 12)], ALERT, 2)
    c.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=ALERT)


def g_truck(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    for i, (x, hh, col) in enumerate(((cx - 56, 20, G3), (cx - 10, 32, G4), (cx + 44, 52, G6))):
        c.rect((x, cy + 34 - hh, x + 22, cy + 34), fill=col)
    frame(c, (cx - 42, cy - 38, cx + 42, cy + 38))
    c.arrow((cx - 62, cy + 56), (cx + 62, cy + 56), B3, 2, 8)
    c.arrow((cx - 18, cy + 46), (cx + 18, cy + 46), ALERT, 2, 6)


def g_pedestal(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    c.rect((cx - 30, cy - 60, cx - 8, cy + 40), fill=G4)
    c.rect((cx + 14, cy - 30, cx + 40, cy + 40), fill=G6)
    c.ellipse((cx + 18, cy - 44, cx + 34, cy - 30), fill=ALERT)
    frame(c, (cx - 46, cy - 36, cx + 46, cy + 36))
    c.arrow((cx + 64, cy + 40), (cx + 64, cy - 48), B3, 2, 8)


def g_dolly(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    frame(c, (cx - 24, cy - 20, cx + 24, cy + 20), G5, 6)
    frame(c, (cx - 56, cy - 46, cx + 56, cy + 46), FG, 10)
    c.ellipse((cx - 9, cy - 9, cx + 9, cy + 9), fill=ALERT)
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        c.arrow((cx + sx * 26, cy + sy * 22), (cx + sx * 46, cy + sy * 40), B3, 2, 6)


def g_zoom(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    c.poly([(cx - 60, cy + 30), (cx - 36, cy - 10), (cx - 12, cy + 30)], fill=G3)
    c.poly([(cx + 12, cy + 30), (cx + 40, cy - 14), (cx + 62, cy + 30)], fill=G3)
    c.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), fill=ALERT)
    frame(c, (cx - 56, cy - 44, cx + 56, cy + 44))
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        c.arrow((cx + sx * 54, cy + sy * 42), (cx + sx * 34, cy + sy * 28), B3, 2, 6)


def g_orbit(c, box):
    x0, y0, x1, y1, cx, cy, w, h = cell_geo(box)
    c.ellipse((cx - 62, cy - 24, cx + 62, cy + 40), outline=G5)
    c.rect((cx - 12, cy - 16, cx + 12, cy + 12), fill=ALERT)
    c.poly([(cx - 12, cy - 16), (cx - 4, cy - 24), (cx + 20, cy - 24), (cx + 12, cy - 16)], fill=B3)
    for ang in (200, 330):
        a = math.radians(ang)
        c.rect((cx + 62 * math.cos(a) - 5, cy + 8 + 32 * math.sin(a) - 5, cx + 62 * math.cos(a) + 5, cy + 8 + 32 * math.sin(a) + 5), fill=G6)
    c.arrow((cx - 30, cy + 54), (cx + 32, cy + 54), B3, 2, 7)


CAMERA = [('Pan', g_pan), ('Tilt', g_tilt), ('Roll', g_roll), ('Truck', g_truck),
          ('Pedestal', g_pedestal), ('Dolly', g_dolly), ('Zoom', g_zoom), ('Orbit', g_orbit)]


def sheet(path, items, cols, rows, title, ident, sub):
    w, h = 1000, 800
    c = Canvas(w, h)
    shell(c, ident, ident, w, h)
    c.text((40, 118), title, font(SANS_B, 58), FG, 'lm')
    c.text((40, 170), sub, font(SANS, 17), G6, 'lm')
    small = font(SANS, 12)
    gx, gy0, gap = 40, 214, 12
    cw = (w - 2 * gx - (cols - 1) * gap) / cols
    ch = (h - gy0 - 40 - (rows - 1) * gap) / rows
    for i, (label, glyph) in enumerate(items):
        r, k = divmod(i, cols)
        x0 = gx + k * (cw + gap)
        y0 = gy0 + r * (ch + gap)
        block(c, (x0, y0, x0 + cw, y0 + ch), label, '%02d' % (i + 1), small, glyph)
    c.save(path)


def og(path):
    w, h = 1200, 630
    c = Canvas(w, h)
    fb, f = font(SANS_B, 15), font(SANS, 15)
    c.text((48, 32), 'agentic-coding-lab', fb, FG, 'lm')
    c.text((w - 48, 32), 'Experiment catalog', f, G6, 'rm')
    c.line([(0, 56), (w, 56)], G3)
    c.line([(0, 57), (w, 57)], FG)
    c.text((48, 130), 'Agentic Coding Lab', font(SANS_B, 76), FG, 'lm')
    c.text((48, 198), '실험 카탈로그', font(CJK, 36, 1), G6, 'lm')
    c.text((48, 250), 'Demos rebuilt from Instagram / Threads, with sources and notes.', font(SANS, 18), G6, 'lm')
    small = font(SANS, 12)
    picks = [MOTION[0], MOTION[1], MOTION[3], CAMERA[0], CAMERA[5], CAMERA[7]]
    labels = ['Easing', 'Anticipation', 'Arc', 'Pan', 'Dolly', 'Orbit']
    gx, gap, top = 48, 12, 300
    cw = (w - 2 * gx - 5 * gap) / 6
    for i, ((_, glyph), label) in enumerate(zip(picks, labels)):
        x0 = gx + i * (cw + gap)
        block(c, (x0, top, x0 + cw, h - 40), label, '%02d' % (i + 1), small, glyph)
    c.save(path)


if __name__ == '__main__':
    sheet(ROOT / 'experiments/2026-09-30-motion-terms-demo/thumb.png', MOTION, 5, 2, 'Motion terms', 'EXP-001', '10 specimens / CSS keyframes')
    sheet(ROOT / 'experiments/2026-10-01-camera-terms-demo/thumb.png', CAMERA, 4, 2, 'Camera moves', 'EXP-002', '8 specimens / CSS keyframes')
    og(ROOT / 'assets/og.png')
    print('ok')
