# MarkItDownJS Demo Video

Clean, annotated screen recording of the browser demo (`apps/demo`), delivered
as an animated GIF:

| File | Description |
|------|-------------|
| `demo.gif` | Full-resolution (1280×800), 256-color animated GIF at 12.5 fps — renders in GitHub markdown and VS Code preview |
| `sample.docx` | Sample document used in the recording |
| `record_demo.py` | Playwright choreography: drives the demo (drop → convert → source → chunks → copy) and captures JPEG frames |
| `annotate.py` | Composites a cursor, click ripples, caption pills, hero card and closing card onto the frames |
| `assemble.py` | Encodes the annotated frames into `demo.gif` (global 256-color palette, Floyd–Steinberg dither) |

## What the video shows

1. Hero intro card
2. Drag & drop a `.docx` onto the dropzone (highlight + live progress)
3. Converted Markdown rendered instantly (DOCX badge, word count, chunks count)
4. Markdown source view toggle
5. RAG chunking — "Show Chunks" reveals heading-aware chunks
6. Expanding a chunk (content + heading path + token count)
7. Copy Markdown to clipboard
8. Closing card

## Regenerating

Prereqs: the demo dev server running (`pnpm --filter demo dev`, port 3000),
Python 3 with `playwright` and `Pillow`.

```bash
# 1. record frames (writes /tmp/rec/frames_raw + meta.jsonl)
python record_demo.py
# 2. annotate (writes /tmp/rec/frames_ann)
python annotate.py
# 3. assemble (writes /tmp/rec/demo.gif)
python assemble.py
```

Note: the frame paths are hardcoded to `/tmp/rec`; tweak the `OUT` constant
in each script if you want a different working directory.
