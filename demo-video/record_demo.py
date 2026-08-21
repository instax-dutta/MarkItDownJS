"""Record the MarkItDownJS demo interaction as JPEG frames.

Produces (perfectly aligned by frame index):
  - /tmp/rec/frames_raw/f_%05d.jpg
  - /tmp/rec/meta.jsonl   (per-frame mouse / press / ripple state)
"""
import asyncio, base64, json, time, os
from playwright.async_api import async_playwright

URL = "http://localhost:3000/MarkItDownJS/"
VIEW = (1280, 800)
OUT = "/tmp/rec"
RAW = os.path.join(OUT, "frames_raw")
os.makedirs(RAW, exist_ok=True)
TICK = 0.04  # 25 fps target

B64 = base64.b64encode(open("/tmp/sample.docx", "rb").read()).decode()
FNAME = "sample.docx"
MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class Rec:
    def __init__(self, page):
        self.page = page
        self.n = 0
        self.events = []
        self.mouse = [VIEW[0] - 60, VIEW[1] - 40]
        self.pressed = False
        self.ripple_frame = None

    async def shot(self, kind=None):
        path = f"{RAW}/f_{self.n:05d}.jpg"
        t0 = time.monotonic()
        await self.page.screenshot(path=path, type="jpeg", quality=92)
        self.events.append(
            {
                "frame": self.n,
                "mouse": list(self.mouse),
                "pressed": self.pressed,
                "ripple": self.ripple_frame,
                "kind": kind,
            }
        )
        self.n += 1
        # keep the frame cadence at TICK regardless of screenshot cost
        await asyncio.sleep(max(0.0, TICK - (time.monotonic() - t0)))

    async def hold(self, dur):
        end = time.monotonic() + dur
        while time.monotonic() < end:
            await self.shot()

    async def move(self, x2, y2, dur):
        x1, y1 = self.mouse
        steps = max(int(dur / TICK), 2)
        for i in range(1, steps + 1):
            t = i / steps
            t = t * t * (3 - 2 * t)
            mx = x1 + (x2 - x1) * t
            my = y1 + (y2 - y1) * t
            await self.page.mouse.move(mx, my)
            self.mouse = [mx, my]
            await self.shot()

    async def click(self, x, y, dur=0.45):
        await self.move(x, y, dur)
        self.pressed = True
        await self.shot("press")
        await self.page.mouse.down()
        await asyncio.sleep(0.09)
        self.pressed = False
        await self.shot("release")
        await self.page.mouse.up()
        self.ripple_frame = self.n
        await self.shot("ripple")
        await asyncio.sleep(0.05)


async def bbox(page, selector):
    b = await page.locator(selector).first.bounding_box()
    return b


def center(b):
    return (b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)


async def throttle(session, rate):
    await session.send("Emulation.setCPUThrottlingRate", {"rate": rate})


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": VIEW[0], "height": VIEW[1]})
        page = await context.new_page()
        session = await context.new_cdp_session(page)
        rec = Rec(page)

        await page.goto(URL, wait_until="networkidle")
        await rec.hold(2.0)  # hero title hold

        # --- approach dropzone ---
        dz = await bbox(page, ".dropzone")
        dzc = center(dz)
        await rec.move(dzc[0] - 40, dzc[1] + 60, 0.9)
        await rec.move(dzc[0], dzc[1] + 30, 0.7)
        await rec.move(dzc[0] + 25, dzc[1] + 45, 0.5)
        await rec.move(dzc[0], dzc[1] + 35, 0.5)
        await rec.hold(0.4)

        # --- dragover highlight ---
        await page.evaluate(
            """() => {
              const dz = document.querySelector('.dropzone');
              const r = dz.getBoundingClientRect();
              const dt = new DataTransfer();
              dt.items.add(new File(['x'], 'sample.docx'));
              dz.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }));
            }"""
        )
        await rec.hold(0.5)

        # --- drop + conversion (throttled so the progress bar is visible) ---
        await throttle(session, 20)
        await page.evaluate(
            """([b64, name, mime]) => {
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              const file = new File([bytes], name, { type: mime });
              const dt = new DataTransfer();
              dt.items.add(file);
              const dz = document.querySelector('.dropzone');
              const r = dz.getBoundingClientRect();
              dz.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }));
            }""",
            [B64, FNAME, MIME],
        )
        await rec.move(VIEW[0] - 200, VIEW[1] - 60, 0.6)
        for _ in range(120):
            if await page.query_selector(".result-section"):
                break
            await rec.shot()
        await throttle(session, 1)
        await rec.hold(1.1)  # hold on result

        # --- Source view ---
        sb = await bbox(page, 'button:has-text("Source")')
        sc = center(sb)
        await rec.move(sc[0], sc[1], 0.6)
        await rec.click(sc[0], sc[1])
        await rec.hold(1.2)

        # --- back to Rendered ---
        rb = await bbox(page, 'button:has-text("Rendered")')
        rc = center(rb)
        await rec.move(rc[0], rc[1], 0.55)
        await rec.click(rc[0], rc[1])
        await rec.hold(1.0)

        # --- Show Chunks ---
        cb = await bbox(page, 'button:has-text("Show Chunks")')
        cc = center(cb)
        await rec.move(cc[0], cc[1], 0.55)
        await rec.click(cc[0], cc[1])
        await rec.hold(0.9)
        # scroll chunks into view if needed
        card = await bbox(page, ".chunk-card")
        if card and card["y"] + card["height"] > VIEW[1] - 40:
            await page.mouse.wheel(0, 320)
            await rec.hold(0.6)
            await page.mouse.wheel(0, 240)
            await rec.hold(0.5)

        # --- expand first chunk (re-fetch position after scrolling) ---
        card = await bbox(page, ".chunk-card")
        if card:
            cx, cy = card["x"] + card["width"] / 2, card["y"] + card["height"] / 2
            await rec.move(cx, cy, 0.5)
            await rec.click(cx, cy)
            await rec.hold(1.1)

        # --- scroll back up so the header is visible ---
        if card and card["y"] > VIEW[1] - 100:
            await page.mouse.wheel(0, -700)
            await rec.hold(0.7)

        # --- Copy Markdown ---
        kpb = await bbox(page, 'button:has-text("Copy Markdown")')
        if kpb and kpb["y"] < 60:
            await page.mouse.wheel(0, -600)
            await rec.hold(0.6)
            kpb = await bbox(page, 'button:has-text("Copy Markdown")')
        kc = center(kpb)
        await rec.move(kc[0], kc[1], 0.55)
        await rec.click(kc[0], kc[1])
        await rec.hold(1.3)

        # --- drift away, closing hold ---
        await rec.move(VIEW[0] - 90, VIEW[1] - 70, 0.9)
        await rec.hold(1.6)

        await browser.close()

    with open(os.path.join(OUT, "meta.jsonl"), "w") as f:
        for e in rec.events:
            f.write(json.dumps(e) + "\n")
    print("frames:", rec.n)


asyncio.run(main())
