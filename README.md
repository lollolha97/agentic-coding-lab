# Agentic Coding Lab

A Korean-first static archive of CSS motion and camera studies and a library of working web UI patterns. All interface assets are local; no fonts, libraries, embeds, analytics or CDN resources are requested. Source credits are ordinary outbound links and load only when followed.

## Run locally

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080. No install or build is required. Relative paths support GitHub Pages project sites. Deploy the repository root from `main`; `.nojekyll` disables Jekyll processing.

## Add an experiment

1. Add an object to `window.LAB.experiments` in `assets/data.js`. Use a unique `slug`, an ID, Korean title/description, category, source URL, and a `demos` array. Keep source Korean copy verbatim.
2. Copy an experiment HTML page into `experiments/<slug>/index.html`. Set `body[data-page]` to the new slug and update its title, metadata and navigation.
3. Add a diagram case in `assets/app.js` and corresponding CSS keyframes in `assets/style.css`. SVG diagrams give moving elements `animated` and play once, keeping motion shorter than five seconds. EXP-001's motion scenes and EXP-002's camera scenes are plain HTML/CSS (`scenes` / `cmScenes` in `app.js`, "Motion scenes" / "Camera scenes" in `style.css`) and loop; they are paused by the card's play state instead. Camera scenes animate one registered custom property (`--s` swing, `--t` turn) so the camera marker and viewfinder stay in sync. The common renderer supplies replay, viewport playback and reduced-motion controls.
4. Add a category filter button to the catalog if the new experiment uses a new category. Counts and search are derived from the array.

EXP-003 is different: its 13 demos are live UI patterns (tabs, dropdown, pagination, sticky header, scroll path, accordion, carousel, search/filter, modal, tooltip, toast, toggle switch, form validation), not animations. Each is registered in `experiments/exp-003/scenes.js` as `{ label, hint, html, init(root) }` and styled in `scenes.css` with an `exp003-` prefix; `interactive: true` on the experiment in `data.js` makes `app.js` mount them as real controls (reset button per card and 전체 초기화 in the toolbar instead of replay/pause). `init` wires events inside its root and returns an optional cleanup for timers and document listeners.

EXP-001 motion scenes and EXP-002 camera scenes loop while on screen and pause when scrolled away. Each demo supports replay directly below its stage; the sticky toolbar supports replay all and pause/resume throughout the grid. Replaying one or all demos preserves the global pause. Demo titles appear above their stages, and the jump index is collapsible. The compact theme menu retains Light/Dark/System choices in `localStorage['acl-theme']`, with 44px touch targets. Keyboard users can operate native buttons with Enter/Space and press `/` to focus catalog search. OS dark mode and reduced motion are respected, including live preference changes.

## Browser verification

Optional QA uses Playwright (not a site dependency). With Playwright installed outside the repository, run:

```sh
PLAYWRIGHT_MODULE_PATH=/path/to/playwright \
BROWSER_EXECUTABLE=/path/to/chrome \
node tests/verify.mjs
```

Omit the environment variables if Playwright and its bundled browser are already installed. The script starts and stops its own local server. It checks the catalog and all three category pages at 390×844 and 1440×1000 in light/dark mode, overflow, EXP-001/002 animations and replay, frozen animation clocks during pause, isolated replay during global pause, sticky toolbar access, keyboard activation, reduced motion on load and preference changes, every EXP-003 pattern operated by click, hover, typing, scroll and keyboard (including reset), theme persistence and touch targets, meaningful line contrast, catalog search/filtering, links, console errors, external requests and a simulated GitHub Pages project prefix. Full-page, viewport, reduced-motion and mobile interaction screenshots go to `/tmp/agentic-coding-lab-screenshots` by default. Set `REQUIRE_CONTENT=1` to also require complete source copy before publication.

The local results in `tests/verification.json` record 16 passing browser configurations (4 pages × 2 widths × 2 color schemes). Full-page screenshots were also visually reviewed. The latest run used `REQUIRE_CONTENT=1` and passed with `contentReady: true`.

## Content status

All 10 motion-term descriptions and 8 camera-move descriptions in `assets/data.js` are copied verbatim from `/tmp/acl-content.md`, with source credits to Threads @glitter_ai_factory and Threads @juuouse. `copyPending: false` records the completed integration. The site name is Agentic Coding Lab, and the interface, introduction and demo descriptions remain Korean primary. Model/date provenance is included in the page metadata alongside source credits.
