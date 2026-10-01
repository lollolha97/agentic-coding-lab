# contact sheet: python3 sheet.py out.png in1.png in2.png ... (2 columns)
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size; cols = 2; rows = (len(ims) + 1) // 2
sheet = Image.new('RGB', (w * cols, h * rows), 'white')
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y)); d = ImageDraw.Draw(sheet); d.text((x + 8, y + 6), f.split('/')[-1][:-4], fill=(200, 0, 0))
sheet.save(out)
