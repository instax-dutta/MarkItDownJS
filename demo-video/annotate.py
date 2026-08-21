"""Annotate recorded frames with a composited cursor, click ripples, captions,
a hero title and a closing card. Outputs PNG frames to /tmp/rec/frames_ann."""
import json, glob, os
from PIL import Image, ImageDraw, ImageFont

RAW = "/tmp/rec/frames_raw"
ANN = "/tmp/rec/frames_ann"
W, H = 1280, 800
FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

os.makedirs(ANN, exist_ok=True)

# ---------- load meta ----------
meta = {}
for line in open("/tmp/rec/meta.jsonl"):
    e = json.loads(line)
    meta[e["frame"]] = e

# ---------- cursor sprites ----------
def make_cursor(pressed=False):
    s = Image.new("RGBA", (34, 34), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    pts = [(0, 0), (0, 17), (5, 14), (9, 24), (13, 22), (10, 11), (17, 10)]
    off = 2 if pressed else 0
    d.polygon([(x + 3, y + 3) for x, y in pts], fill=(15, 23, 42, 70))  # shadow
    fill = (241, 245, 249, 255) if not pressed else (203, 213, 225, 255)
    d.polygon([(x + off, y + off) for x, y in pts], fill=fill, outline=(15, 23, 42, 255))
    return s

CUR = make_cursor(False)
CUR_P = make_cursor(True)

# ---------- fonts ----------
F_TITLE = ImageFont.truetype(FONT_BOLD, 62)
F_SUB = ImageFont.truetype(FONT_REG, 27)
F_CAP = ImageFont.truetype(FONT_REG, 22)
F_CARD_T = ImageFont.truetype(FONT_BOLD, 34)
F_CARD_S = ImageFont.truetype(FONT_REG, 21)

# ---------- caption plan: (start_frame, end_frame, text) ----------
CAPTIONS = [
    (58, 100, "Convert any document \u2014 no Python required"),
    (100, 118, "Drop a document \u2014 it all runs in the browser"),
    (118, 136, "Live conversion with progress reporting"),
    (136, 200, "Clean, structured Markdown \u2014 rendered instantly"),
    (200, 246, "Markdown source view"),
    (246, 300, "Rendered preview"),
    (300, 372, "RAG-ready chunks \u2014 split by heading"),
    (372, 412, "Expand a chunk \u2014 content + metadata"),
    (412, 452, "Copy the result anywhere"),
]

def draw_caption(img, text, alpha):
    d = ImageDraw.Draw(img, "RGBA")
    tb = d.textbbox((0, 0), text, font=F_CAP)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    pad_x, pad_y = 28, 13
    x0 = (W - tw) / 2 - pad_x
    y0 = H - 138
    x1 = (W + tw) / 2 + pad_x
    y1 = y0 + th + pad_y * 2
    a = int(alpha)
    d.rounded_rectangle([x0, y0, x1, y1], radius=(y1 - y0) // 2, fill=(255, 255, 255, min(235, a)))
    d.rounded_rectangle([x0, y0, x1, y1], radius=(y1 - y0) // 2, outline=(203, 213, 225, a), width=1)
    d.text(((W - tw) / 2 - tb[0], y0 + pad_y - tb[1]), text, font=F_CAP, fill=(15, 23, 42, a))

def draw_hero(img, alpha):
    d = ImageDraw.Draw(img, "RGBA")
    t1 = "MarkItDownJS"
    t2 = "Documents \u2192 Markdown, right in your browser"
    b1 = d.textbbox((0, 0), t1, font=F_TITLE)
    b2 = d.textbbox((0, 0), t2, font=F_SUB)
    tw = max(b1[2] - b1[0], b2[2] - b2[0])
    th = (b1[3] - b1[1]) + 24 + (b2[3] - b2[1])
    cw, ch = tw + 130, th + 110
    x0, y0 = (W - cw) / 2, 150
    d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=26, fill=(15, 23, 42, int(230 * alpha)))
    cx = W / 2
    d.text((cx - (b1[2] - b1[0]) / 2 - b1[0], y0 + 42 - b1[1]), t1, font=F_TITLE, fill=(255, 255, 255, alpha))
    d.text(
        (cx - (b2[2] - b2[0]) / 2 - b2[0], y0 + 42 + (b1[3] - b1[1]) + 24 - b2[1]),
        t2,
        font=F_SUB,
        fill=(148, 163, 184, alpha),
    )

def draw_closing(img, alpha):
    d = ImageDraw.Draw(img, "RGBA")
    t1 = "Try MarkItDownJS"
    t2 = "github.com/instax-dutta/MarkItDownJS"
    b1 = d.textbbox((0, 0), t1, font=F_CARD_T)
    b2 = d.textbbox((0, 0), t2, font=F_CARD_S)
    tw = max(b1[2] - b1[0], b2[2] - b2[0])
    th = (b1[3] - b1[1]) + 22 + (b2[3] - b2[1])
    cw, ch = tw + 120, th + 90
    x0, y0 = (W - cw) / 2, (H - ch) / 2
    d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=22, fill=(15, 23, 42, int(235 * alpha)))
    cx = W / 2
    d.text((cx - (b1[2] - b1[0]) / 2 - b1[0], y0 + 34 - b1[1]), t1, font=F_CARD_T, fill=(255, 255, 255, alpha))
    d.text((cx - (b2[2] - b2[0]) / 2 - b2[0], y0 + 34 + (b1[3] - b1[1]) + 22 - b2[1]), t2, font=F_CARD_S, fill=(148, 163, 184, alpha))

frames = sorted(glob.glob(os.path.join(RAW, "f_*.jpg")))
N = len(frames)
print("annotating", N, "frames")

for i, fp in enumerate(frames):
    img = Image.open(fp).convert("RGB")
    e = meta.get(i, {})

    # cursor
    m = e.get("mouse")
    if m:
        cur = CUR_P if e.get("pressed") else CUR
        img.paste(cur, (int(m[0]), int(m[1])), cur)

    # ripple (expanding ring right after a click)
    rp = e.get("ripple")
    if rp is not None:
        age = i - rp
        if 0 <= age <= 9:
            src = meta.get(rp, {})
            rx, ry = src.get("mouse", m or (0, 0))
            d = ImageDraw.Draw(img, "RGBA")
            r = 8 + 26 * (age / 9)
            a = int(200 * (1 - age / 9))
            d.ellipse([rx - r, ry - r, rx + r, ry + r], outline=(59, 130, 246, a), width=3)

    # captions
    for s, en, text in CAPTIONS:
        if s <= i < en:
            fade = min(1.0, (i - s) / 3) if i - s < 3 else min(1.0, (en - i) / 3)
            draw_caption(img, text, int(255 * fade))
            break

    # hero title (fade in fast, fade out before the cursor reaches the dropzone)
    if i < 56:
        if i < 5:
            a = int(255 * (i / 4))
        elif i > 46:
            a = int(255 * (1 - (i - 46) / 10))
        else:
            a = 255
        draw_hero(img, a)

    # closing card
    if i >= N - 40:
        a = int(255 * min(1.0, (i - (N - 40)) / 8))
        draw_closing(img, a)

    img.save(os.path.join(ANN, f"f_{i:05d}.png"))

print("done")
