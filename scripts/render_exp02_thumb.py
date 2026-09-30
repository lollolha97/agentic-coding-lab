"""Render the EXP-002 thumbnail (camera moves) with Pillow. Run from any working directory."""
import math
from pathlib import Path
from PIL import Image
from render_catalog import PlateDraw, font, label, signal

ROOT = Path(__file__).resolve().parents[1]
PAPER = '#f2f2f0'
INK = '#161616'
ACCENT = '#ff4d00'
GREY = '#62625e'
HAIR = '#c9c9c4'


def rot(points, cx, cy, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return [(cx + (x-cx)*c - (y-cy)*s, cy + (x-cx)*s + (y-cy)*c) for x, y in points]


def outline(d, pts, fill, width=2):
    d.line(list(pts) + [pts[0]], fill=fill, width=width, joint='curve')


def dashed(d, p0, p1, fill=GREY, width=2, dash=7, gap=5):
    (x0, y0), (x1, y1) = p0, p1
    length = math.hypot(x1-x0, y1-y0)
    t = 0
    while t < length:
        e = min(t+dash, length)
        d.line([(x0+(x1-x0)*t/length, y0+(y1-y0)*t/length), (x0+(x1-x0)*e/length, y0+(y1-y0)*e/length)], fill=fill, width=width)
        t += dash + gap


def head(d, tip, angle, fill, size=9):
    a = math.radians(angle)
    pts = [tip] + [(tip[0]-size*math.cos(a+s*0.45), tip[1]-size*math.sin(a+s*0.45)) for s in (-1, 1)]
    d.polygon(pts, fill=fill)


def arrow(d, p0, p1, fill=ACCENT, width=3):
    d.line([p0, p1], fill=fill, width=width)
    head(d, p1, math.degrees(math.atan2(p1[1]-p0[1], p1[0]-p0[0])), fill)


def arc_arrow(d, cx, cy, r, a0, a1, fill=ACCENT, width=3, at_start=False):
    """Clockwise arc a0→a1 (screen degrees); the arrowhead sits at the end, or at the start when at_start."""
    d.arc((cx-r, cy-r, cx+r, cy+r), a0, a1, fill=fill, width=width)
    a = a0 if at_start else a1
    tip = (cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a)))
    head(d, tip, a - 90 if at_start else a + 90, fill)


def camera(d, cx, cy, deg=-90, fill=INK, solid=True):
    """Camera pointing along `deg` (screen angle, 0 = right). Body + lens, drawn around (cx, cy)."""
    body = [(-14, -9), (8, -9), (8, 9), (-14, 9)]
    lens = [(8, -5), (19, -10), (19, 10), (8, 5)]
    for shape in (body, lens):
        pts = rot([(cx+x, cy+y) for x, y in shape], cx, cy, deg)
        if solid:
            d.polygon(pts, fill=fill)
        else:
            outline(d, pts, fill)


def lens_tip(cx, cy, deg, dist=19):
    a = math.radians(deg)
    return cx + dist*math.cos(a), cy + dist*math.sin(a)


def fov(d, cx, cy, deg, length=62, spread=17, fill=INK, dash=False):
    tip = lens_tip(cx, cy, deg)
    for s in (-spread, spread):
        a = math.radians(deg + s)
        end = (tip[0] + length*math.cos(a), tip[1] + length*math.sin(a))
        if dash:
            dashed(d, tip, end, fill=fill)
        else:
            d.line([tip, end], fill=fill, width=2)


def specimen(d, n, x, y, w, h):
    cx, cy = x + w/2, y + h/2 + 4
    names = ['PAN', 'TILT', 'ROLL', 'TRUCK', 'PEDESTAL', 'DOLLY', 'ZOOM', 'ORBIT']
    label(d, (x+12, y+12), f'{n:02}', 13, INK)
    label(d, (x+12, y+h-26), names[n-1], 12, INK)
    if n == 1:    # top view: body turns in place, field of view sweeps
        c = (cx, cy+34)
        fov(d, *c, -90+30, length=54, fill=GREY, dash=True); camera(d, *c, deg=-90+30, fill=GREY, solid=False)
        fov(d, *c, -90-30, length=54); camera(d, *c, deg=-90-30)
        arc_arrow(d, c[0], c[1], 52, -135, -45)
    elif n == 2:  # side view: body tips up
        c = (cx-44, cy+24)
        d.line([(c[0]-14, c[1]+40), (c[0], c[1]+10), (c[0]+14, c[1]+40)], fill=GREY, width=2)
        fov(d, *c, 18, fill=GREY, dash=True); camera(d, *c, deg=18, fill=GREY, solid=False)
        fov(d, *c, -22); camera(d, *c, deg=-22)
        arc_arrow(d, c[0], c[1], 54, -40, 12, at_start=True)
    elif n == 3:  # view through the lens: frame rotates about its centre
        base = [(cx-58, cy-38), (cx+58, cy-38), (cx+58, cy+38), (cx-58, cy+38)]
        outline(d, base, GREY, 2)
        outline(d, rot(base, cx, cy, -12), INK, 3)
        d.line(rot([(cx-58, cy), (cx+58, cy)], cx, cy, -12), fill=ACCENT, width=3)
        arc_arrow(d, cx, cy, 70, -22, 8, width=3)
    elif n == 4:  # top view: body slides sideways, sightline stays parallel
        yy = cy+34
        for i, dx in enumerate((-64, 0, 64)):
            last = i == 2
            camera(d, cx+dx, yy, -90, INK if last else GREY, solid=last)
        fov(d, cx+64, yy, -90, spread=14, length=58)
        d.line([(cx-76, yy+22), (cx+60, yy+22)], fill=ACCENT, width=3); head(d, (cx+76, yy+22), 0, ACCENT)
        for dx in (-50, 0, 50):
            d.rectangle((cx+dx-9, cy-44, cx+dx+9, cy-26), fill=GREY)
    elif n == 5:  # side view: body rises, lens angle unchanged
        xx = cx-36
        for i, dy in enumerate((34, 0, -34)):
            last = i == 2
            camera(d, xx, cy+dy, 0, INK if last else GREY, solid=last)
        fov(d, xx, cy-34, 0, spread=10, length=60)
        arrow(d, (xx-34, cy+44), (xx-34, cy-50))
        outline(d, [(cx+54, cy-46), (cx+80, cy-46), (cx+80, cy+48), (cx+54, cy+48)], INK, 2)
    elif n == 6:  # top view: body moves toward subject
        d.ellipse((cx-13, cy-47, cx+13, cy-21), fill=INK)
        camera(d, cx, cy+50, -90, GREY, solid=False)
        camera(d, cx, cy+14, -90)
        fov(d, cx, cy+14, -90, spread=13, length=22)
        arrow(d, (cx+30, cy+52), (cx+30, cy+8))
    elif n == 7:  # top view: body fixed, frame tightens
        camera(d, cx, cy+46, -90)
        outline(d, [(cx-66, cy-44), (cx+66, cy-44), (cx+66, cy+14), (cx-66, cy+14)], GREY, 2)
        outline(d, [(cx-28, cy-28), (cx+28, cy-28), (cx+28, cy+0), (cx-28, cy+0)], ACCENT, 3)
        for sx in (-1, 1):
            dashed(d, (cx+sx*66, cy-44), (cx+sx*28, cy-28), GREY)
        d.ellipse((cx-6, cy-20, cx+6, cy-8), fill=INK)
    elif n == 8:  # top view: body circles the subject
        rx, ry = 70, 46
        d.ellipse((cx-rx, cy-ry, cx+rx, cy+ry), outline=GREY, width=2)
        d.ellipse((cx-13, cy-13, cx+13, cy+13), fill=INK)
        for ang, col, solid in ((205, GREY, False), (40, INK, True)):
            px = cx + rx*math.cos(math.radians(ang)); py = cy + ry*math.sin(math.radians(ang))
            camera(d, px, py, math.degrees(math.atan2(cy-py, cx-px)), col, solid)
        d.arc((cx-rx, cy-ry, cx+rx, cy+ry), 70, 160, fill=ACCENT, width=3)
        a = math.radians(160)
        head(d, (cx+rx*math.cos(a), cy+ry*math.sin(a)), 160+90-14, ACCENT)


def thumbnail():
    im = Image.new('RGB', (3000, 2400), PAPER)
    d = PlateDraw(im)
    label(d, (48, 40), 'EXP-002', 16, INK)
    label(d, (744, 40), 'CAMERA MOVES', 14, INK)
    d.line((48, 80, 952, 80), fill=INK, width=2)
    d.rectangle((48, 100, 56, 108), fill=ACCENT)
    label(d, (44, 112), '08', 84, INK, bold=True, mono=False)
    label(d, (192, 128), 'CAMERA', 32, INK, bold=True, mono=False)
    label(d, (192, 168), 'MOVES', 32, INK, bold=True, mono=False)
    label(d, (744, 134), 'CSS ONLY', 14, INK)
    label(d, (744, 162), 'LIVE SPECIMENS', 14, INK)
    sx, sy, w, h = 48, 244, 226, 210
    for n in range(1, 9):
        col, row = (n-1) % 4, (n-1) // 4
        specimen(d, n, sx+col*w, sy+row*h, w, h)
    for row in range(3):
        d.line((sx, sy+row*h, 952, sy+row*h), fill=HAIR, width=1)
    for col in range(5):
        d.line((sx+col*w, sy, sx+col*w, sy+2*h), fill=HAIR, width=1)
    label(d, (48, 706), '01—08 / VIEWFINDER STUDIES', 14, INK)
    label(d, (744, 706), '2026.10.01', 14, INK)
    signal(d, 48, 746, 28)
    label(d, (94, 752), 'agentic-coding-lab', 14, INK, mono=False)
    return im.resize((1000, 800), Image.Resampling.LANCZOS)


if __name__ == '__main__':
    out = ROOT / 'experiments/2026-10-01-camera-terms-demo/thumb.png'
    thumbnail().save(out, optimize=True)
    print('Rendered', out.relative_to(ROOT), '(1000×800).')
