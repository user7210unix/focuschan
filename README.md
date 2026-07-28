# A Quiet Reader

A minimalist, editorial-style client for reading 4chan threads. Pure HTML, CSS,
and vanilla JavaScript (ES modules) — no frameworks, no build step.

## How it works

- **Board view** (`#/wg`) — type a board code (or part of a board's name)
  and pick from a grouped, animated autocomplete dropdown, or browse the
  catalog as a quiet, text-first list.
- **Thread view** (`#/wg/123456`) — the reading experience. The original
  post sits fixed in the left sidebar (subject, date, time, comment only —
  no clutter). Replies scroll in the center column using a custom "camera
  focus" engine: the three replies nearest the center stay perfectly sharp,
  while ones further away soften into blur, and everything eases smoothly
  rather than snapping harshly.

### Reading controls

| Input | Action |
|---|---|
| Mouse wheel / trackpad | Scroll freely; releases snap to the nearest reply |
| `↓` / `j` | Move focus to the next reply |
| `↑` / `k` | Move focus to the previous reply |
| Click a `>>123456` reference | Jump focus straight to that reply |
| Click an image | Expand to full resolution |
| Click a spoiler | Reveal it |

The sidebar's **Tree** / **Images** legend items toggle the quote-tree
overlay and attached media on and off.

## Project structure

```
index.html            Board view + thread view markup (single page, both sections)
css/
  reset.css           Baseline reset
  variables.css        Design tokens (color, type, spacing, motion)
  layout.css            Page-level grid/flex structure, responsive rules
  board-view.css         Catalog/board picker styling
  thread-view.css         OP panel, reply stream, media, comment formatting
  legend.css               Sidebar legend + right-edge position indicator
js/
  config.js             Proxy + API endpoint constants
  api.js                  All network requests (routed through the proxy)
  utils.js                 Comment sanitizing, date formatting, small helpers
  router.js                 Hash-based routing between the two views
  boardView.js                Catalog view module
  boardAutocomplete.js           Board picker autocomplete (filter, group, keyboard nav)
  boardCategories.js               Static board -> category map for grouping suggestions
  threadView.js                      Thread reader orchestrator
  scrollFocus.js                  The camera-focus scroll/blur engine
  quoteTree.js                     Reply-relationship graph + SVG connectors
  navIndicator.js                    Right-edge position indicator
  keyboardNav.js                      Arrow key / j-k bindings
  mediaLoader.js                       Builds image/gif/video elements
  legend.js                             Sidebar legend toggles
  main.js                                 Entry point
```

## Data source

Every request — catalog JSON, thread JSON, thumbnails, full images, and
video — is routed through the required proxy and never touches 4chan's
domains directly:

```
https://chan-proxy.anonnousmes.workers.dev/?url=<encoded 4chan URL>
```

This is handled centrally in `js/config.js` / `js/api.js`; no other module
constructs a raw 4chan URL.

## Running it locally

Browsers block ES modules (`<script type="module">`) from loading over the
`file://` protocol — that's the "Cross-Origin Request Blocked" /
"Module source URI is not allowed" error you'll see if you just double-click
`index.html`. It isn't a bug in the app; every module-based static site
needs to be served over `http://`, even for local testing.

From inside the `chan-reader` folder, run one of these, then open the
printed `http://localhost:...` URL (not the file directly):

```bash
# Python (already on most systems)
python3 -m http.server 8000

# Node
npx serve .

# VS Code
# Right-click index.html -> "Open with Live Server"
```

GitHub Pages (below) serves everything over `https://`, so this only
matters for local testing.

## Deploying to GitHub Pages

1. Create a new GitHub repository and push this folder's contents to it
   (the repo root should contain `index.html` directly).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch",
   pick your default branch and the `/ (root)` folder, then save.
4. GitHub will publish the site at `https://<your-username>.github.io/<repo>/`
   within a minute or two.

No build step, no dependencies to install — it's static files served as-is.
