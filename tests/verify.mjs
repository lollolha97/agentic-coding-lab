// Optional local QA tooling; the site itself has no dependencies or build step.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import pathModule from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
let base = process.env.BASE_URL;
const output = process.env.SCREENSHOT_DIR || '/tmp/agentic-coding-lab-screenshots';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebRTC']
});
let server;
if (!base) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  server = createServer(async (request, response) => {
    try {
      let name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (name.endsWith('/')) name += 'index.html';
      const file = pathModule.resolve(root, `.${name}`);
      if (!file.startsWith(root)) throw new Error('Invalid path');
      const body = await fs.readFile(file);
      const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' }[pathModule.extname(file)] || 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': type });
      response.end(body);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const failures = [];
const reports = [];
try {
  for (const width of (process.env.QA_WIDTHS || '390,1440').split(',').map(Number)) {
    for (const colorScheme of ['light', 'dark']) {
      for (const [path, demos] of [['/', 0], ['/experiments/exp-001/', 10], ['/experiments/exp-002/', 8]]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme });
        // Feed only local HTTP responses through Node so container browser
        // private-network policies cannot prevent access to the test server.
        await page.route(`${base}/**`, async route => {
          const response = await fetch(route.request().url());
          await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
        });
        const errors = [];
        const external = [];
        const broken = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
        page.on('response', response => { if (response.status() >= 400) broken.push(`${response.status()} ${response.url()}`); });
        await page.goto(`${base}${path}`);
        await page.waitForFunction(() => document.querySelector('.experiment-card, .demo-card'));
        const geometry = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth, viewport: innerWidth,
          bg: getComputedStyle(document.body).backgroundColor,
          fg: getComputedStyle(document.body).color,
          overflow: [...document.querySelectorAll('h1, h2, h3, p, .demo-info, .card-info')]
            .filter(element => element.scrollWidth > element.clientWidth + 1)
            .map(element => element.outerHTML.slice(0, 100)),
          cards: document.querySelectorAll('.demo-card').length
        }));
        assert.equal(geometry.scroll, width, `${path}: horizontal overflow at ${width}`);
        assert.deepEqual(geometry.overflow, [], `${path}: text overflow at ${width}`);
        assert.equal(geometry.bg, colorScheme === 'light' ? 'rgb(245, 241, 240)' : 'rgb(0, 0, 0)');
        assert.equal(geometry.fg, colorScheme === 'light' ? 'rgb(52, 44, 42)' : 'rgb(255, 255, 255)');
        assert.equal(geometry.cards, demos);
        assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
        if (!demos) {
          assert.equal(await page.locator('.experiment-card').count(), 2);
          await page.getByRole('button', { name: '카메라', exact: true }).click();
          assert.equal(await page.locator('.experiment-card').count(), 1);
          await page.getByRole('button', { name: /^전체/ }).click();
          await page.locator('#search').fill('이징');
          assert.equal(await page.locator('.experiment-card').count(), 1);
          await page.locator('#search').fill('no-such-experiment');
          assert.equal(await page.locator('.experiment-card').count(), 0);
          assert(await page.locator('#empty-state').isVisible());
          await page.locator('#search').fill('');
          await page.locator('#search').blur();
          await page.keyboard.press('/');
          assert(await page.locator('#search').evaluate(element => element === document.activeElement));
          await page.locator('#search').blur();
        } else {
          // Each demo must animate, restart with Enter, and pause without time advancing.
          for (const card of await page.locator('.demo-card').all()) {
            await card.scrollIntoViewIfNeeded();
            const replay = card.locator('.replay');
            await replay.focus();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(90);
            const before = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => ({ time: animation.currentTime, state: animation.playState })));
            assert(before.length > 0 && before.some(item => item.state === 'running'), `${path}: demo has no running animation`);
            await page.waitForTimeout(80);
            const after = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
            assert(after.some((time, index) => time > before[index].time), `${path}: animation time did not advance`);
            await replay.click();
            const restarted = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
            assert(restarted.some((time, index) => time < after[index]), `${path}: replay did not restart animation`);
          }
          await page.locator('#replay-all').click();
          await page.locator('#pause-all').click();
          await page.waitForTimeout(60); // Let the pending compositor frame settle.
          const paused = await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'paused').map(animation => animation.currentTime));
          assert(paused.length > 0);
          await page.waitForTimeout(120);
          const pausedAfter = await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'paused').map(animation => animation.currentTime));
          assert.deepEqual(pausedAfter, paused);
          await page.locator('#pause-all').click();
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForFunction(() => document.querySelector('#replay-all').disabled);
          assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
          assert(await page.locator('#motion-notice').isVisible());
          assert(await page.locator('#replay-all').isDisabled());
          assert(await page.locator('.replay').first().isDisabled());
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.waitForFunction(() => !document.querySelector('#replay-all').disabled);
          assert(await page.locator('#replay-all').isEnabled());
          await page.locator('#replay-all').click();
          await page.waitForTimeout(1200);
          await page.locator('#pause-all').click();
          await page.evaluate(() => scrollTo(0, 0));
        }
        await page.screenshot({ path: `${output}/${demos ? `exp-${demos === 10 ? '001' : '002'}` : 'catalog'}-${width}-${colorScheme}.png`, fullPage: true });
        const links = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.href).filter(href => href.startsWith(location.origin)));
        for (const href of new Set(links.map(link => link.split('#')[0]))) {
          const response = await page.request.get(href);
          assert(response.ok(), `Broken internal link: ${href}`);
        }
        assert.deepEqual(errors, [], `${path}: browser errors`);
        assert.deepEqual(external, [], `${path}: external requests`);
        assert.deepEqual(broken, [], `${path}: failed responses`);
        reports.push({ path, width, colorScheme, demos, errors: 0, externalRequests: 0, overflow: false });
        process.stderr.write(`Verified ${path} ${width}px ${colorScheme}\n`);
        await page.close();
      }
    }
  }
  // Relative assets and links must also work below a GitHub Pages project prefix.
  const page = await browser.newPage();
  await page.route('**/agentic-coding-lab/**', async route => {
    const response = await fetch(route.request().url().replace('/agentic-coding-lab/', '/'));
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  await page.goto(`${base}/agentic-coding-lab/`);
  await page.locator('.experiment-card').first().click();
  assert.equal(await page.locator('.demo-card').count(), 10);
  assert(page.url().includes('/agentic-coding-lab/experiments/exp-001/'));
  await page.locator('.brand').click();
  assert.equal(await page.locator('.experiment-card').count(), 2);
  await page.close();
  const source = await fs.readFile(new URL('../assets/data.js', import.meta.url), 'utf8');
  const data = new Function('window', `${source}; return window.LAB;`)({});
  const contentReady = !data.copyPending && Boolean(data.intro) && data.experiments.every(item => item.description && item.demos.every(demo => demo.description));
  console.log(JSON.stringify({ passed: reports.length, projectPrefix: 'passed', contentReady, reports, screenshots: output }, null, 2));
  if (process.env.REQUIRE_CONTENT === '1') assert(contentReady, 'Source copy is still missing; publication is not ready.');
} catch (error) {
  failures.push(error.stack);
  console.error(failures.join('\n'));
  process.exitCode = 1;
} finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
