"""Render native-size before/after loops from two final encoded atlases."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

before = Image.open(sys.argv[1]).convert('RGBA')
after = Image.open('final/spritesheet.webp').convert('RGBA')
out = Path('previews/comparison')
out.mkdir(parents=True, exist_ok=True)
for state, indexes, durations in [
    ('idle', [(0,i) for i in range(6)], [280,110,110,140,140,320]),
    ('waving', [(3,i) for i in range(4)], [140]*3+[280]),
    ('jumping', [(4,i) for i in range(5)], [140]*4+[280]),
    ('waiting', [(6,i) for i in range(6)], [150]*5+[260]),
    ('typing', [(7,i) for i in range(6)], [120]*5+[220]),
    ('review', [(8,i) for i in range(6)], [150]*5+[280]),
    ('look', [(9+i//8,i%8) for i in range(16)], [200]*16),
]:
    frames=[]
    for row,col in indexes:
        frame=Image.new('RGB',(384,232),(244,244,246)); d=ImageDraw.Draw(frame)
        for side,(atlas,label) in enumerate([(before,'Before'),(after,'After')]):
            d.text((side*192+8,4),label,fill=(60,60,70))
            cell=atlas.crop((col*192,row*208,(col+1)*192,(row+1)*208))
            frame.paste(cell,(side*192,24),cell)
        frames.append(frame)
    frames[0].save(out/f'{state}.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=False)
print(out)
