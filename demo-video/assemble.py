"""Assemble annotated frames into demo.gif and demo.mp4."""
import glob, os, subprocess
import imageio.v3 as iio
from PIL import Image
import numpy as np

ANN = "/tmp/rec/frames_ann"
OUT = "/tmp/rec"
FF = "/tmp/recenv/lib/python3.13/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"

frames = sorted(glob.glob(os.path.join(ANN, "f_*.png")))
N = len(frames)
FPS = 25

# ---------- GIF (12.5 fps, 960x600) ----------
sub = frames[::2]
gif_frames = []
for fp in sub:
    im = Image.open(fp).convert("P", palette=Image.ADAPTIVE, colors=256)
    im = im.resize((960, 600), Image.LANCZOS)
    gif_frames.append(np.array(im))
iio.imwrite(
    os.path.join(OUT, "demo.gif"),
    gif_frames,
    duration=1000 / (FPS / 2),
    loop=0,
)
print("gif:", os.path.getsize(os.path.join(OUT, "demo.gif")) // 1024, "KB")

# ---------- MP4 (25 fps h264) ----------
cmd = [
    FF, "-y", "-framerate", str(FPS),
    "-i", os.path.join(ANN, "f_%05d.png"),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    os.path.join(OUT, "demo.mp4"),
]
subprocess.run(cmd, check=True, capture_output=True)
print("mp4:", os.path.getsize(os.path.join(OUT, "demo.mp4")) // 1024, "KB")
