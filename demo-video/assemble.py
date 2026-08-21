"""Assemble annotated frames into a full-resolution, color demo.gif."""
import glob, os
from PIL import Image

ANN = "/tmp/rec/frames_ann"
OUT = "/tmp/rec"
FPS = 25

# ---------- GIF (12.5 fps, full resolution, 256-color global palette) ----------
sub = sorted(glob.glob(os.path.join(ANN, "f_*.png")))[::2]
imgs = [Image.open(fp).convert("RGB") for fp in sub]
w, h = imgs[0].size

# One global adaptive palette (per-frame palettes bloat the file and band).
montage = Image.new("RGB", (w * 8, h))
for i, im in enumerate(imgs[::25][:8]):
    montage.paste(im, (i * w, 0))
pal = montage.convert("P", palette=Image.ADAPTIVE, colors=256)

quantized = [im.quantize(palette=pal, dither=Image.Dither.FLOYDSTEINBERG) for im in imgs]
quantized[0].save(
    os.path.join(OUT, "demo.gif"),
    save_all=True,
    append_images=quantized[1:],
    duration=1000 / (FPS / 2),
    loop=0,
    optimize=True,
)
print("gif:", os.path.getsize(os.path.join(OUT, "demo.gif")) // 1024, "KB")
