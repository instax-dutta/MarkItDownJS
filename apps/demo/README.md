# MarkItDownJS Demo

A browser demo for MarkItDownJS — drag and drop a document to convert it to
Markdown, inspect the rendered output, and visualize RAG chunks.

## Run locally

```bash
# from the repository root
pnpm install
pnpm build          # build the workspace packages the demo depends on
pnpm --filter demo dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
pnpm --filter demo build     # typecheck + vite build
pnpm --filter demo preview   # serve the production build locally
```

The build output is written to `apps/demo/dist/`. Deploy that directory to any
static host (Vercel, Netlify, GitHub Pages, S3, etc.).
