# Agentic Coding Lab

A Korean-first static archive of CSS motion and camera studies. All interface assets are local; no fonts, libraries, embeds, analytics or CDN resources are requested. Source credits are ordinary outbound links and load only when followed.

## Run locally

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080. No install or build is required. Relative paths support GitHub Pages project sites. Deploy the repository root from `main`; `.nojekyll` disables Jekyll processing.

## Add an experiment

1. Add an object to `window.LAB.experiments` in `assets/data.js`. Use a unique `slug`, an ID, Korean title/description, category, source URL, and a `demos` array. Keep source Korean copy verbatim.
2. Copy an experiment HTML page into `experiments/<slug>/index.html`. Set `body[data-page]` to the new slug and update its title, metadata and navigation.
3. Add a diagram case in `assets/app.js` and corresponding CSS keyframes in `assets/style.css`. Give moving elements `animated` and keep motion shorter than five seconds. The common renderer supplies replay, viewport playback and reduced-motion controls.
4. Add a category filter button to the catalog if the new experiment uses a new category. Counts and search are derived from the array.

Animations play once on entering the viewport. Each demo supports replay; the toolbar supports replay all and pause/resume. Keyboard users can operate native buttons with Enter/Space and press `/` to focus catalog search. OS dark mode and reduced motion are respected, including live preference changes.

## Browser verification

Optional QA uses Playwright (not a site dependency). With Playwright installed outside the repository, run:

```sh
PLAYWRIGHT_MODULE_PATH=/path/to/playwright \
BROWSER_EXECUTABLE=/path/to/chrome \
node tests/verify.mjs
```

Omit the environment variables if Playwright and its bundled browser are already installed. The script starts and stops its own local server. It checks all three pages at 390px and 1440px in light/dark mode, overflow, all 18 animations and replay, pause, keyboard activation, reduced motion, catalog search/filtering, links, console errors, external requests and a simulated GitHub Pages project prefix. Screenshots go to `/tmp/agentic-coding-lab-screenshots` by default. Set `REQUIRE_CONTENT=1` to also require complete source copy before publication.

The local results in `tests/verification.json` record 12 passing browser configurations. Full-page screenshots were also visually reviewed. The latest run used `REQUIRE_CONTENT=1` and passed with `contentReady: true`.

## Content status

All 10 motion-term descriptions and 8 camera-move descriptions in `assets/data.js` are copied verbatim from `/tmp/acl-content.md`, with source credits to Threads @glitter_ai_factory and Threads @juuouse. `copyPending: false` records the completed integration. The site name is Agentic Coding Lab, and the interface and demo descriptions remain Korean primary. The brief supplies its site concept and experiment section headings only in English; those are copied verbatim into the introduction and experiment summaries rather than translated or paraphrased.
