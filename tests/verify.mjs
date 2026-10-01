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
const source = await fs.readFile(new URL('../assets/data.js', import.meta.url), 'utf8');
const data = new Function('window', `${source}; return window.LAB;`)({});
// Four categories, one page each; demo counts are asserted against both data.js and the rendered DOM.
const EXPECTED = { 'exp-001': 21, 'exp-002': 8, 'exp-003': 18, 'exp-004': 5 };
const ORDER = Object.keys(EXPECTED);
assert.deepEqual(data.experiments.map(item => item.slug), ORDER, 'data.js must list the four categories in order');
assert.deepEqual(data.categories, ['모션', '카메라', '웹 디자인', 'AI']);
data.experiments.forEach(item => assert.equal(item.demos.length, EXPECTED[item.slug], `${item.slug}: demo count in data.js`));
assert.equal(new Set(data.experiments.map(item => item.id)).size, ORDER.length, 'duplicate EXP ids in data.js');
const pageTable = [['/', 0, 'catalog'], ...ORDER.map(slug => [`/experiments/${slug}/`, EXPECTED[slug], slug])];
try {
  for (const width of (process.env.QA_WIDTHS || '390,1440').split(',').map(Number)) {
    for (const colorScheme of (process.env.QA_COLOR_SCHEMES || 'light,dark').split(',')) {
      for (const [path, demos, slug] of pageTable) {
        const interactive = slug === 'exp-004'; // EXP-004 is a hands-on guide: some steps animate only while you use them
        const entry = data.experiments.find(item => item.slug === slug);
        const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme });
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
            .filter(element => !element.classList.contains('sr-only') && element.scrollWidth > element.clientWidth + 1)
            .map(element => element.outerHTML.slice(0, 100)),
          cards: document.querySelectorAll('.demo-card').length,
          firstContentY: Math.round(document.querySelector('.experiment-card, .demo-card').getBoundingClientRect().top),
          firstStageY: Math.round(document.querySelector('.card-preview, .stage, .exp004-stage').getBoundingClientRect().top),
          pageHeight: document.documentElement.scrollHeight
        }));
        assert.equal(geometry.scroll, width, `${path}: horizontal overflow at ${width}`);
        assert.deepEqual(geometry.overflow, [], `${path}: text overflow at ${width}`);
        assert.equal(geometry.bg, colorScheme === 'light' ? 'rgb(245, 241, 240)' : 'rgb(0, 0, 0)');
        assert.equal(geometry.fg, colorScheme === 'light' ? 'rgb(52, 44, 42)' : 'rgb(255, 255, 255)');
        assert.equal(geometry.cards, demos);
        assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
        const shotName = `${slug}-${width}-${colorScheme}`;
        const headerHeight = await page.locator('.site-header').evaluate(element => element.offsetHeight);
        const trigger = page.locator('.theme-switch summary');
        assert(await trigger.evaluate(element => element.offsetHeight >= 44 && element.offsetWidth >= 44));
        await trigger.click();
        assert.equal(await page.locator('.site-header').evaluate(element => element.offsetHeight), headerHeight);
        assert(await page.locator('[data-theme-choice]').evaluateAll(elements => elements.every(element => element.offsetHeight >= 44)));
        assert(await page.locator('.theme-switch > div').evaluate(element => element.getBoundingClientRect().left >= 0 && element.getBoundingClientRect().right <= innerWidth));
        if (width === 390) await page.screenshot({ path: `${output}/${shotName}-theme.png` });
        const manualTheme = colorScheme === 'light' ? 'dark' : 'light';
        await page.locator(`[data-theme-choice="${manualTheme}"]`).click();
        assert.equal(await page.evaluate(() => localStorage.getItem('acl-theme')), manualTheme);
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('data-theme'), manualTheme);
        await page.locator('.theme-switch summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.theme-switch').getAttribute('open'), '');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.theme-switch').getAttribute('open'), null);
        await page.locator('.theme-switch summary').click();
        await page.locator('[data-theme-choice="system"]').click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'system');
        await page.locator('.skip-link').focus();
        assert(await page.locator('.skip-link').evaluate(element => element.getBoundingClientRect().top >= 0));
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => location.hash === '#main');
        assert.equal(new URL(page.url()).hash, '#main');
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        const contrast = await page.evaluate(() => {
          const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
          const luminance = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
          const ratio = (a, b) => { const x = luminance(rgb(a)), y = luminance(rgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
          const probe = document.createElement('div');
          document.body.append(probe);
          const token = name => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
          const line = token('--line'), blue = token('--diagram-blue');
          const results = { lineOnStage: ratio(line, token('--gray-1')), lineOnPage: ratio(line, token('--bg')), lineOnFloor: ratio(line, token('--gray-2')), blueOnPale: ratio(blue, token('--blue-1')) };
          probe.remove();
          return results;
        });
        assert(Object.values(contrast).every(value => value >= 3), `Meaningful line contrast below 3:1: ${JSON.stringify(contrast)}`);

        if (slug === 'catalog') {
          assert.equal(await page.locator('.experiment-card').count(), 4);
          assert.deepEqual(await page.locator('.experiment-card .experiment-code').allTextContents(), data.experiments.map(item => item.id));
          // The landing groups demos by category: no demo title is listed as its own card, and card text is unique.
          const cardText = await page.locator('.experiment-card').evaluateAll(cards => cards.map(card => ({ title: card.querySelector('h3').textContent, desc: card.querySelector('.card-desc').textContent, meta: card.querySelector('.card-meta').textContent })));
          assert.equal(new Set(cardText.map(card => card.title)).size, 4, 'duplicate landing titles');
          assert.equal(new Set(cardText.map(card => card.desc)).size, 4, 'duplicate landing descriptions');
          assert.equal(await page.locator('#total-count').textContent(), '04');
          assert.deepEqual(await page.locator('[data-filter]').allTextContents(), ['전체', ...data.categories]);
          assert.equal(await page.locator('.card-preview svg').count(), 4);
          await page.locator('.experiment-card').first().focus();
          assert.equal(await page.locator('.card-title h3').first().evaluate(element => getComputedStyle(element).textDecorationLine), 'underline');
          assert.equal(await page.locator('.experiment-card').first().evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
          for (const category of data.categories) {
            await page.getByRole('button', { name: category, exact: true }).click();
            assert.equal(await page.locator('.experiment-card').count(), 1, `filter ${category}`);
            assert.equal(await page.locator('.experiment-card .experiment-code').textContent(), data.experiments.find(item => item.category === category).id);
          }
          await page.getByRole('button', { name: /^전체/ }).click();
          assert.equal(await page.locator('.experiment-card').count(), 4);
          await page.locator('#search').fill('이징');
          assert.equal(await page.locator('.experiment-card').count(), 1);
          await page.locator('#search').fill('hosted');
          assert.equal(await page.locator('.experiment-card .experiment-code').textContent(), 'EXP-004');
          await page.locator('#search').fill('no-such-experiment');
          assert.equal(await page.locator('.experiment-card').count(), 0);
          assert(await page.locator('#empty-state').isVisible());
          await page.locator('#search').fill('');
          await page.locator('#search').blur();
          await page.keyboard.press('/');
          assert(await page.locator('#search').evaluate(element => element === document.activeElement));
          await page.locator('#search').blur();
        } else {
          // Rendered page must match data.js: same titles in order, unique ids/titles/descriptions, one credit line with a source link per sourced demo.
          const rendered = await page.evaluate(() => ({
            titles: [...document.querySelectorAll('.demo-card h3')].map(h => [...h.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim()),
            descriptions: [...document.querySelectorAll('.demo-card .demo-description')].map(p => p.textContent.trim()),
            ids: [...document.querySelectorAll('[id]')].map(element => element.id),
            headings: [...document.querySelectorAll('h1, h2')].map(h => h.textContent.replace(/\s+/g, ' ').trim()),
            groups: [...document.querySelectorAll('.demo-group, .exp003-group, .mo-group')].map(group => group.querySelector('h2').textContent.replace(/\s+\d+$/, '').trim()),
            cards: [...document.querySelectorAll('.demo-card')].map(card => ({ id: card.id, text: card.textContent, instagram: [...card.querySelectorAll('a[href^="https://www.instagram.com/"]')].map(a => a.href), targets: [...card.querySelectorAll('a[href^="http"]')].map(a => `${a.target}|${a.rel}`) })),
            numbers: [...document.querySelectorAll('.demo-number')].map(n => n.textContent),
            count: document.querySelector('.demo-toolbar .count').textContent,
            prev: document.querySelector('.experiment-pagination a[rel="prev"]')?.getAttribute('href') ?? null,
            next: document.querySelector('.experiment-pagination a[rel="next"]')?.getAttribute('href') ?? null,
            bodyText: document.body.innerText
          }));
          assert.deepEqual(rendered.titles, entry.demos.map(demo => demo.name), `${path}: card titles differ from data.js`);
          assert.deepEqual(rendered.descriptions, entry.demos.map(demo => demo.description), `${path}: card descriptions differ from data.js`);
          assert.equal(new Set(rendered.titles).size, rendered.titles.length, `${path}: duplicate demo titles`);
          assert.equal(new Set(rendered.descriptions).size, rendered.descriptions.length, `${path}: duplicate demo descriptions`);
          assert.equal(new Set(rendered.ids).size, rendered.ids.length, `${path}: duplicate element ids`);
          assert.equal(new Set(rendered.groups).size, rendered.groups.length, `${path}: duplicate group headings`);
          assert.deepEqual(rendered.groups, Object.values(entry.groups || {}).map(group => group[0]), `${path}: group headings`);
          assert.equal(rendered.numbers.length ? new Set(rendered.numbers).size : 0, rendered.numbers.length, `${path}: duplicate demo numbers`);
          assert.equal(rendered.count, String(demos).padStart(2, '0'));
          assert.equal(rendered.headings.filter(text => /^EXP-\d+/.test(text)).length, 0);
          for (const demo of entry.demos.filter(item => item.sources.length)) {
            const card = rendered.cards.find(item => item.id === demo.key);
            assert(card, `${path}: missing card ${demo.key}`);
            assert.equal(card.text.split(data.credit).length - 1, 1, `${path}: ${demo.key} must show the credit exactly once`);
            assert.deepEqual(card.instagram, demo.sources.map(source => source.url), `${path}: ${demo.key} source links`);
            assert(card.targets.every(target => target === '_blank|noopener noreferrer'), `${path}: ${demo.key} external links need noopener`);
          }
          if (slug === 'exp-004') assert.equal(rendered.bodyText.split(data.credit).length - 1, 6, 'exp-004: credit in the header and in each of the five steps');
          const neighbours = { 'exp-001': [null, '../exp-002/'], 'exp-002': ['../exp-001/', '../exp-003/'], 'exp-003': ['../exp-002/', '../exp-004/'], 'exp-004': ['../exp-003/', null] }[slug];
          assert.deepEqual([rendered.prev, rendered.next], neighbours, `${path}: previous/next links must follow EXP-001 ↔ 002 ↔ 003 ↔ 004`);
          await page.locator('.demo-jump summary').focus();
          await page.keyboard.press('Enter');
          await page.locator('#demo-index a').last().focus();
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('.demo-jump').getAttribute('open'), null);
          await page.waitForFunction(() => {
            const card = document.querySelector('.demo-card:last-child').getBoundingClientRect();
            const toolbar = document.querySelector('#demo-toolbar').getBoundingClientRect();
            return card.top >= toolbar.bottom && card.top < innerHeight;
          });
          // Each demo must animate, restart with Enter, and pause without time advancing.
          for (const card of await page.locator('.demo-card').all()) {
            await card.scrollIntoViewIfNeeded();
            const replay = card.locator('.replay');
            await replay.focus();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(90);
            const before = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => ({ time: animation.currentTime, state: animation.playState })));
            if (interactive && before.length === 0) { await replay.click(); continue; } // step driven by clicks, not CSS animation
            assert(before.length > 0 && before.some(item => item.state === 'running'), `${path}#${await card.getAttribute('id')}: demo has no running animation`);
            await page.waitForTimeout(80);
            const after = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
            if (!interactive) assert(after.some((time, index) => time > before[index].time), `${path}#${await card.getAttribute('id')}: animation time did not advance`);
            await replay.click();
            const restarted = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
            if (!interactive) assert(restarted.some((time, index) => time < after[index]), `${path}#${await card.getAttribute('id')}: replay did not restart animation (${after} → ${restarted})`); // EXP-004 loops its own animations and resets step state instead
          }
          await page.locator('#replay-all').click();
          await page.locator('#pause-all').click();
          await page.waitForTimeout(60); // Let the pending compositor frame settle.
          const paused = await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'paused').map(animation => animation.currentTime));
          assert(paused.length > 0);
          await page.waitForTimeout(120);
          const pausedAfter = await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'paused').map(animation => animation.currentTime));
          assert.deepEqual(pausedAfter, paused);
          // Restart exactly one card while preserving the global pause and other clocks.
          const withMotion = await page.locator('.demo-card').evaluateAll(cards => cards.findLastIndex(card => card.getAnimations({ subtree: true }).length > 0));
          const target = interactive ? page.locator('.demo-card').nth(withMotion) : page.locator('.demo-card').last();
          await target.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.waitForTimeout(80);
          assert(await page.locator('#pause-all').isVisible());
          assert(await page.locator('#demo-toolbar').evaluate(element => Math.abs(element.getBoundingClientRect().top) < 1));
          if (width === 390) await page.screenshot({ path: `${output}/${shotName}-sticky.png` });
          await target.evaluate(element => {
            window.__otherAnimations = document.getAnimations().filter(animation => !element.contains(animation.effect.target)).map(animation => ({ animation, time: animation.currentTime }));
          });
          await target.locator('.replay').click();
          assert.equal(await page.locator('#pause-all').getAttribute('aria-pressed'), 'true');
          assert(await page.locator('body').evaluate(element => element.classList.contains('is-paused')));
          assert.equal(await target.locator('[data-play-status]').textContent(), '일시정지');
          const restartTimes = await target.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
          if (interactive) assert(restartTimes.length > 0);
          else assert(restartTimes.length > 0 && restartTimes.every(time => time <= 34));
          await page.waitForTimeout(150);
          assert.deepEqual(await target.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime)), restartTimes);
          assert(await page.evaluate(() => window.__otherAnimations.every(({ animation, time }) => animation.currentTime === time && animation.playState === 'paused')));
          await page.locator('#replay-all').click();
          assert.equal(await page.locator('#pause-all').getAttribute('aria-pressed'), 'true');
          assert(await page.evaluate(() => document.getAnimations().every(animation => animation.playState === 'paused')));

          await page.locator('#pause-all').click();
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForFunction(() => document.querySelector('#replay-all').disabled);
          assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
          assert(await page.locator('#motion-notice').isVisible());
          assert(await page.locator('#replay-all').isDisabled());
          assert(await page.locator('#pause-all').isDisabled());
          if (interactive) assert(await page.locator('.replay').first().isEnabled()); // hands-on steps can still be reset to their still state
          else assert(await page.locator('.replay').first().isDisabled());
          await page.reload();
          await page.waitForFunction(() => document.querySelector('#replay-all')?.disabled);
          assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await page.mouse.move(0, 0);
          await page.screenshot({ path: `${output}/${shotName}-reduced.png`, fullPage: true });
          const stillFrame = await page.screenshot();
          await page.waitForTimeout(150);
          assert.deepEqual(await page.screenshot(), stillFrame, `${path}: reduced-motion frame changed`);
          if (!interactive) {
            const disabled = page.locator('.replay').first();
            await disabled.hover();
            assert.equal(await disabled.evaluate(element => getComputedStyle(element).textDecorationLine), 'none');
            assert.equal(await disabled.evaluate(element => getComputedStyle(element).cursor), 'not-allowed');
          }

          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.waitForFunction(() => !document.querySelector('#replay-all').disabled);
          assert(await page.locator('#replay-all').isEnabled());
          await page.locator('#replay-all').click();
          await page.waitForTimeout(1200);
          await page.locator('#pause-all').click();
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        }
        if (slug === 'catalog') {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
          await page.screenshot({ path: `${output}/${shotName}-reduced.png`, fullPage: true });
          await page.emulateMedia({ reducedMotion: 'no-preference' });
        }
        await page.evaluate(() => document.activeElement.blur());
        await page.mouse.move(0, 0);
        // A shared frozen frame makes every demo visible in full-page captures.
        if (slug !== 'catalog') await page.evaluate(() => document.getAnimations().forEach(animation => { animation.currentTime = 1200; }));
        await page.screenshot({ path: `${output}/${shotName}.png`, fullPage: true });
        await page.screenshot({ path: `${output}/${shotName}-viewport.png` });
        const links = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.href).filter(href => href.startsWith(location.origin)));
        for (const href of new Set(links.map(link => link.split('#')[0]))) {
          const response = await page.request.get(href);
          assert(response.ok(), `Broken internal link: ${href}`);
        }
        assert.deepEqual(errors, [], `${path}: browser errors`);
        assert.deepEqual(external, [], `${path}: external requests`);
        assert.deepEqual(broken, [], `${path}: failed responses`);
        reports.push({ path, width, height: width === 390 ? 844 : 1000, colorScheme, demos, firstContentY: geometry.firstContentY, firstStageY: geometry.firstStageY, pageHeight: geometry.pageHeight, screenshotAnimationTime: slug !== 'catalog' ? 1200 : null, contrast, errors: 0, externalRequests: 0, overflow: false, themeTouchTargets: 'passed', pauseReplay: slug !== 'catalog' ? 'passed' : 'n/a', reducedMotion: 'passed' });
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
  await page.locator('.demo-card').first().waitFor();
  assert.equal(await page.locator('.demo-card').count(), 21);
  assert(page.url().includes('/agentic-coding-lab/experiments/exp-001/'));
  await page.locator('.brand').click();
  await page.locator('.experiment-card').first().waitFor();
  assert.equal(await page.locator('.experiment-card').count(), 4);
  await page.close();
  const contentReady = !data.copyPending && Boolean(data.intro) && data.experiments.every(item => item.description && item.demos.every(demo => demo.description));
  console.log(JSON.stringify({ passed: reports.length, projectPrefix: 'passed', contentReady, reports, screenshots: output }, null, 2));
  if (process.env.REQUIRE_CONTENT === '1') assert(contentReady, 'Source copy is still missing; publication is not ready.');
} catch (error) {
  failures.push(error.stack);
  console.error(failures.join('\n'));
  process.exitCode = 1;
} finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
