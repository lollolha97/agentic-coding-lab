"""Render local catalog artwork with Pillow. Run from any working directory."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PAPER = '#f2f2f0'
SURFACE = '#e6e6e2'
INK = '#161616'
MUTED = '#62625e'
LINE = '#bcbcb6'
ORANGE = '#ff4d00'
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')


class PlateDraw:
    """Draw at 3× resolution, then downsample for clean diagram edges."""
    def __init__(self, image, scale=3):
        self.draw = ImageDraw.Draw(image)
        self.scale = scale

    def coords(self, values):
        if isinstance(values[0], (list, tuple)):
            return [(x*self.scale, y*self.scale) for x, y in values]
        return tuple(v*self.scale for v in values)

    def text(self, xy, text, font, **kw):
        self.draw.text(self.coords(xy), text, font=ImageFont.truetype(font.path, font.size*self.scale), **kw)

    def line(self, xy, width=1, **kw):
        self.draw.line(self.coords(xy), width=width*self.scale, **kw)

    def polygon(self, xy, **kw):
        self.draw.polygon(self.coords(xy), **kw)

    def ellipse(self, xy, width=1, **kw):
        self.draw.ellipse(self.coords(xy), width=width*self.scale, **kw)

    def rectangle(self, xy, **kw):
        self.draw.rectangle(self.coords(xy), **kw)

    def rounded_rectangle(self, xy, radius, width=1, **kw):
        self.draw.rounded_rectangle(self.coords(xy), radius=radius*self.scale, width=width*self.scale, **kw)

    def arc(self, xy, start, end, width=1, **kw):
        self.draw.arc(self.coords(xy), start, end, width=width*self.scale, **kw)


def font(size, bold=False, mono=False):
    family = 'DejaVuSansMono' if mono else 'DejaVuSans'
    suffix = '-Bold' if bold else ''
    return ImageFont.truetype(str(FONT_DIR / f'{family}{suffix}.ttf'), size)


def label(draw, xy, text, size=14, fill=MUTED, bold=False, mono=True):
    draw.text(xy, text, font=font(size, bold, mono), fill=fill)


def signal(draw, x, y, size):
    u = size / 32
    points = [(x+a*u, y+b*u) for a, b in [(2,26),(12,26),(12,10),(20,10),(20,26),(30,26),(30,22),(24,22),(24,6),(8,6),(8,22),(2,22)]]
    draw.polygon(points, fill=INK)


def circle(draw, x, y, r, fill=None, outline=INK, width=2):
    draw.ellipse((x-r, y-r, x+r, y+r), fill=fill, outline=outline, width=width)


def specimen(draw, number, x, y, w, h):
    """Ten diagrams reflect the actual terms, rather than decoration."""
    cx, cy = x + w/2, y + h/2 + 6
    left, right = x+26, x+w-26
    label(draw, (x+12, y+12), f'{number:02}', 13, INK)
    if number == 1:  # Ease curve + moving dot
        pts = [(left+(right-left)*t/80, cy+32-64*(3*(t/80)**2-2*(t/80)**3)) for t in range(81)]
        draw.line([(left,cy+38),(right,cy+38)], fill=LINE, width=2)
        draw.line(pts, fill=INK, width=3)
        circle(draw, cx+18, cy-14, 11, ORANGE, ORANGE)
    elif number == 2:  # Anticipation, compressed and lifted
        draw.line((left,cy+46,right,cy+46), fill=LINE, width=2)
        draw.rounded_rectangle((cx-22,cy+30,cx+22,cy+44), radius=4, outline=MUTED, width=2)
        draw.rounded_rectangle((cx-15,cy-36,cx+15,cy-2), radius=5, fill=INK)
        draw.line((cx,cy+16,cx,cy+2), fill=MUTED, width=2)
        draw.line([(cx-4,cy+7),(cx,cy+2),(cx+4,cy+7)], fill=MUTED, width=2)
    elif number == 3:  # Squash & stretch
        draw.ellipse((left,cy-24,left+26,cy+24), outline=INK, width=2)
        circle(draw,cx,cy,17,outline=INK)
        draw.ellipse((right-42,cy-10,right,cy+10), fill=INK)
    elif number == 4:  # Parabolic arc
        pts = [(left+(right-left)*t/80, cy+32-66*4*(t/80)*(1-t/80)) for t in range(81)]
        draw.line(pts, fill=MUTED, width=2)
        draw.line((left,cy+32,right,cy+32), fill=LINE, width=2)
        circle(draw,cx+22,cy-25,10,INK)
    elif number == 5:  # Body and swinging appendage
        draw.rounded_rectangle((cx-26,cy+16,cx+26,cy+40), radius=5, fill=INK)
        draw.line((cx,cy+16,cx+23,cy-32), fill=INK, width=3)
        circle(draw,cx+23,cy-32,6,INK)
        draw.arc((cx-46,cy-38,cx+46,cy+50),195,265,fill=MUTED,width=2)
    elif number == 6:  # Four linked joints
        pts = [(left,cy+15),(left+32,cy+2),(left+64,cy-4),(left+96,cy+6),(right,cy+27)]
        draw.line(pts, fill=INK, width=8, joint='curve')
        for px,py in pts[:-1]: circle(draw,px,py,4,SURFACE,SURFACE)
    elif number == 7:  # Staggered bars
        for i,height in enumerate([24,42,62,38,54,30]):
            xx = left+i*23
            draw.rectangle((xx,cy+32-height,xx+13,cy+32),fill=INK)
    elif number == 8:  # Same circular form, hard cut
        circle(draw,cx-35,cy,27,INK)
        circle(draw,cx-41,cy-8,6,SURFACE,SURFACE)
        circle(draw,cx-24,cy+10,8,SURFACE,SURFACE)
        circle(draw,cx+35,cy,27,outline=INK)
        draw.line((cx+8,cy,cx+62,cy),fill=INK,width=2)
        draw.arc((cx+16,cy-27,cx+54,cy+27),-90,90,fill=INK,width=2)
        draw.line((cx,cy-40,cx,cy+40),fill=LINE,width=1)
    elif number == 9:  # Distance layers
        draw.polygon([(left,cy+28),(cx-16,cy-34),(right,cy+28)],fill=LINE)
        draw.polygon([(left,cy+32),(cx+26,cy-14),(right,cy+32)],fill=MUTED)
        draw.polygon([(left,cy+40),(left+24,cy+4),(left+48,cy+40)],fill=INK)
        draw.line((left,cy+40,right,cy+40),fill=INK,width=3)
    else:  # Moving mask edge
        label(draw,(left,cy-22),'Aa',44,INK,bold=True,mono=False)
        draw.rectangle((cx+2,cy-28,right,cy+34),fill=SURFACE)
        draw.line((cx+2,cy-32,cx+2,cy+36),fill=ORANGE,width=4)


def thumbnail():
    im = Image.new('RGB', (3000, 2400), SURFACE)
    d = PlateDraw(im)
    label(d,(48,40),'EXP-001',16,INK)
    label(d,(744,40),'MOTION DESIGN',14)
    d.line((48,80,952,80),fill=INK,width=2)
    label(d,(44,100),'10',84,INK,bold=True,mono=False)
    label(d,(192,116),'MOTION',32,INK,bold=True,mono=False)
    label(d,(192,156),'TERMS',32,INK,bold=True,mono=False)
    label(d,(744,122),'CSS ONLY',14)
    label(d,(744,150),'LIVE SPECIMENS',14)
    start_x,start_y,w,h = 48,244,180.8,210
    for n in range(1,11):
        col,row=(n-1)%5,(n-1)//5
        specimen(d,n,start_x+col*w,start_y+row*h,w,h)
    # Hairlines form one honest instrument plate.
    for row in range(3):
        yy=start_y+row*h
        d.line((48,yy,952,yy),fill=LINE,width=1)
    for col in range(6):
        xx=start_x+col*w
        d.line((xx,start_y,xx,start_y+2*h),fill=LINE,width=1)
    label(d,(48,706),'01—10 / ANIMATION STUDIES',14,INK)
    label(d,(744,706),'2026.09.30',14)
    signal(d,48,746,28)
    label(d,(94,752),'agentic-coding-lab',14,INK,mono=False)
    return im.resize((1000,800), Image.Resampling.LANCZOS)


def og(thumb):
    im=Image.new('RGB',(1200,630),PAPER)
    d=ImageDraw.Draw(im)
    signal(d,48,36,44)
    label(d,(112,44),'agentic',18,INK,bold=True,mono=False)
    label(d,(112,66),'coding lab',18,INK,bold=True,mono=False)
    label(d,(900,54),'EXPERIMENT CATALOG',14)
    d.line((48,108,1152,108),fill=INK,width=1)
    label(d,(48,156),'AGENTIC',68,INK,bold=True,mono=False)
    label(d,(48,232),'CODING',68,INK,bold=True,mono=False)
    label(d,(48,308),'LAB',68,INK,bold=True,mono=False)
    d.rectangle((48,430,56,438),fill=ORANGE)
    label(d,(72,424),'EXP-001 / MOTION TERMS',17,INK)
    label(d,(48,464),'10 SPECIMENS · CSS ANIMATION',14)
    im.paste(thumb.resize((490,392),Image.Resampling.LANCZOS),(662,144))
    d.line((48,568,1152,568),fill=INK,width=1)
    label(d,(48,592),'lollolha97.github.io/agentic-coding-lab',13,INK)
    label(d,(944,592),'EST. 2026.09.30',13)
    return im


if __name__ == '__main__':
    thumb=thumbnail()
    thumb.save(ROOT/'experiments/2026-09-30-motion-terms-demo/thumb.png',optimize=True)
    og(thumb).save(ROOT/'assets/og.png',optimize=True)
    print('Rendered thumb.png (1000×800) and og.png (1200×630).')
