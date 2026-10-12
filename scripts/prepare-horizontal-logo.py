"""Derive branding from the supplied raster, never from fonts or vector tracing.

Requires Pillow and numpy; run from the repository root. The source is retained
outside the public build. Black unmatting preserves antialiasing; interiors keep
their original RGB values. Recomposition on black must differ by at most 8/255
(the discarded black-background compression noise).
"""
from pathlib import Path
from hashlib import sha256
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / "brand-source/neraium-horizontal-original.png"
assert sha256(source_path.read_bytes()).hexdigest() == '326db293b921fd1898c8d00054a6c8678d8a75af410eb9691450fea540ac3803'
source = Image.open(source_path).convert("RGB")
rgb = np.array(source)
value = rgb.max(axis=2)
interior = np.array(Image.fromarray((value > 128).astype('uint8') * 255).filter(ImageFilter.MinFilter(5))) > 0
alpha = np.where(interior | (value >= 248), 255, value).astype('uint8')
alpha[value <= 8] = 0
unmatted = np.rint(rgb.astype(float) * 255 / np.maximum(alpha[..., None], 1)).clip(0, 255).astype('uint8')
unmatted[alpha == 0] = 0
rgba = np.dstack((unmatted, alpha))
recomposed = np.rint(unmatted.astype(float) * alpha[..., None] / 255).astype('uint8')
assert np.abs(recomposed.astype(int) - rgb.astype(int)).max() <= 8
# Bounds include every pixel above the background noise plus two clear pixels.
ys, xs = np.where(alpha > 0)
bounds = (int(xs.min()) - 2, int(ys.min()) - 2, int(xs.max()) + 3, int(ys.max()) + 3)
logo = Image.fromarray(rgba).crop(bounds)
assert logo.size == (1820, 362), logo.size
out = ROOT / 'assets/images'
logo.save(out / 'neraium-horizontal-official-1820.png', optimize=True)
logo.resize((910, 181), Image.Resampling.LANCZOS).save(out / 'neraium-horizontal-official-910.png', optimize=True)
# A crop of the supplied symbol, with no lettering, tracing or reconstruction.
symbol = Image.fromarray(rgba).crop((182, 171, 542, 533))
for size, name in [(16, 'favicon-16'), (32, 'favicon-32'), (180, 'apple-touch'), (192, 'app-192'), (512, 'app-512')]:
    canvas = Image.new('RGBA', (size, size), (6, 12, 20, 255))
    thumb = symbol.copy()
    thumb.thumbnail((round(size * .84), round(size * .84)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2))
    canvas.save(out / f'neraium-horizontal-{name}.png', optimize=True)
    if size == 512:
        canvas.save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
# The existing social card has a uniform dark background beneath its old logo.
# Replace only that area; retain all existing copy and photography pixels.
social = Image.open(out / 'neraium-social.jpg').convert('RGBA')
social.paste((9, 19, 31, 255), (50, 30, 210, 145))
social.alpha_composite(logo.resize((360, 72), Image.Resampling.LANCZOS), (60, 42))
social.convert('RGB').save(out / 'neraium-social-horizontal.png', optimize=True)
print(f'Logo: {logo.size}; crop: {bounds}; black recomposition error <= 8/255')
