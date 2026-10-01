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
// Three categories, one page each; demo counts are asserted against both data.js and the rendered DOM.
const EXPECTED = { 'exp-001': 21, 'exp-002': 8, 'exp-003': 13 };
const ORDER = Object.keys(EXPECTED);
assert.deepEqual(data.experiments.map(item => item.slug), ORDER, 'data.js must list the three categories in order');
assert.deepEqual(data.categories, ['모션', '카메라', '웹 디자인']);
data.experiments.forEach(item => assert.equal(item.demos.length, EXPECTED[item.slug], `${item.slug}: demo count in data.js`));
assert.equal(new Set(data.experiments.map(item => item.id)).size, ORDER.length, 'duplicate EXP ids in data.js');
// EXP-003 is a library of working patterns, so each one is operated like a user would (click, hover, type, scroll, keys) and the resulting state is asserted.
async function exerciseDemos(page, entry, width) {
  const keys = entry.demos.map(demo => demo.key);
  assert.deepEqual(keys, ['tabs', 'dropdown', 'pagination', 'sticky', 'scrollpath', 'accordion', 'carousel', 'filter', 'modal', 'tooltip', 'toast', 'toggle', 'form'], 'EXP-003 demo keys');
  const center = card => card.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const text = locator => locator.evaluate(element => element.textContent.trim());
  const attr = (locator, name) => locator.getAttribute(name);
  const away = () => page.mouse.move(2, 2);
  const failMsg = key => `exp-003#${key}`;
  // Interactive stages must not hide from assistive tech, and every control must sit inside its stage at this width.
  for (const key of keys) {
    const card = page.locator(`#${key}`);
    await center(card);
    assert.equal(await card.locator('.stage').getAttribute('role'), 'group', `${failMsg(key)}: stage must be a group, not an image`);
    assert.equal(await card.locator('.scene[aria-hidden]').count(), 0, `${failMsg(key)}: live scene must not be aria-hidden`);
    const outside = await card.evaluate(element => {
      const stage = element.querySelector('.stage').getBoundingClientRect();
      return [...element.querySelectorAll('.stage button, .stage input')].filter(control => control.getBoundingClientRect().width > 0)
        .filter(control => { const r = control.getBoundingClientRect(); const box = control.closest('.exp003-st-sc, .exp003-sp-sc, .exp003-fl-box'); return !box && (r.left < stage.left - 1 || r.right > stage.right + 1 || r.top < stage.top - 1 || r.bottom > stage.bottom + 1); })
        .map(control => control.outerHTML.slice(0, 80));
    });
    assert.deepEqual(outside, [], `${failMsg(key)}: controls spill out of the stage at ${width}px`);
    assert.equal(await card.locator('.scene').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, `${failMsg(key)}: horizontal overflow inside the stage`);
  }

  // 탭
  let card = page.locator('#tabs'); await center(card);
  const tabButtons = card.getByRole('tab');
  assert.equal(await attr(tabButtons.nth(0), 'aria-selected'), 'true');
  await tabButtons.nth(1).click();
  assert.equal(await attr(tabButtons.nth(1), 'aria-selected'), 'true');
  assert(await card.getByRole('tabpanel').filter({ hasText: '자동 저장' }).isVisible(), 'tabs: clicked panel must show');
  assert.equal(await card.getByRole('tabpanel', { includeHidden: false }).count(), 1, 'tabs: exactly one visible panel');
  await page.keyboard.press('ArrowRight');
  assert.equal(await attr(tabButtons.nth(2), 'aria-selected'), 'true', 'tabs: ArrowRight');
  await page.keyboard.press('ArrowRight');
  assert.equal(await attr(tabButtons.nth(0), 'aria-selected'), 'true', 'tabs: ArrowRight wraps');
  await page.keyboard.press('End');
  assert.equal(await attr(tabButtons.nth(2), 'aria-selected'), 'true', 'tabs: End');

  // 드롭다운
  card = page.locator('#dropdown'); await center(card);
  const ddButton = card.locator('.exp003-dd-btn'), ddMenu = card.getByRole('menu');
  assert(!(await ddMenu.isVisible()));
  await ddButton.click();
  assert(await ddMenu.isVisible()); assert.equal(await attr(ddButton, 'aria-expanded'), 'true');
  await card.getByRole('menuitemradio', { name: '낮은 가격순' }).click();
  assert(!(await ddMenu.isVisible()), 'dropdown: closes after choosing');
  assert.equal(await text(card.locator('[data-label]')), '낮은 가격순');
  assert.equal(await text(card.locator('.exp003-dd-list li').first()), '유리 병12,000원', 'dropdown: list re-sorted');
  await ddButton.focus(); await page.keyboard.press('ArrowDown');
  assert(await ddMenu.isVisible()); assert.equal(await card.getByRole('menuitemradio', { checked: true }).count(), 1);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  assert.equal(await text(card.locator('[data-label]')), '높은 가격순', 'dropdown: keyboard choose');
  assert.equal(await text(card.locator('.exp003-dd-list li').first()), '린넨 앞치마45,000원');
  await ddButton.click(); await page.keyboard.press('Escape');
  assert(!(await ddMenu.isVisible()), 'dropdown: Esc closes'); assert(await ddButton.evaluate(element => element === document.activeElement), 'dropdown: Esc returns focus');
  await ddButton.click(); await card.locator('.demo-heading h3').click();
  assert(!(await ddMenu.isVisible()), 'dropdown: outside click closes');

  // 페이지네이션
  card = page.locator('#pagination'); await center(card);
  const pgFirst = () => text(card.locator('.exp003-pg-list li').first());
  assert.equal(await pgFirst(), '디자인 노트 01'); assert(await card.getByRole('button', { name: '이전 페이지' }).isDisabled());
  await card.getByRole('button', { name: '다음 페이지' }).click();
  assert.equal(await pgFirst(), '디자인 노트 06'); assert.equal(await attr(card.getByRole('button', { name: '2페이지' }), 'aria-current'), 'page');
  await card.getByRole('button', { name: '4페이지' }).click();
  assert.equal(await pgFirst(), '디자인 노트 16'); assert(await card.getByRole('button', { name: '다음 페이지' }).isDisabled());
  assert.equal(await text(card.locator('[data-range]')), '16–20 / 20');
  await card.getByRole('button', { name: '이전 페이지' }).click();
  assert.equal(await pgFirst(), '디자인 노트 11');

  // 스티키 헤더
  card = page.locator('#sticky'); await center(card);
  const stHeader = card.locator('.exp003-st-hd'), stScroll = card.locator('.exp003-st-sc');
  const topOf = () => stHeader.evaluate(element => element.getBoundingClientRect().top - element.closest('.stage').getBoundingClientRect().top);
  const tall = await stHeader.evaluate(element => element.offsetHeight);
  assert(!(await stHeader.evaluate(element => element.classList.contains('is-stuck'))));
  await stScroll.evaluate(element => { element.scrollTop = 140; });
  await page.waitForFunction(selector => document.querySelector(selector).classList.contains('is-stuck'), '#sticky .exp003-st-hd');
  await page.waitForTimeout(350);
  assert(Math.abs(await topOf()) <= 2, 'sticky: header must stay at the top while scrolled');
  assert((await stHeader.evaluate(element => element.offsetHeight)) < tall, 'sticky: header shrinks when stuck');
  await card.getByRole('button', { name: '가격' }).click();
  await page.waitForFunction(() => document.querySelector('#sticky [data-go="2"]').getAttribute('aria-current') === 'true');
  assert(await stScroll.evaluate(element => element.scrollTop) > 140, 'sticky: link scrolls to its section');
  await stScroll.evaluate(element => { element.scrollTop = 0; });
  await page.waitForFunction(() => !document.querySelector('#sticky .exp003-st-hd').classList.contains('is-stuck'));

  // 스크롤 경로
  card = page.locator('#scrollpath'); await center(card);
  const spScroll = card.locator('.exp003-sp-sc');
  const spState = () => card.evaluate(element => ({ pct: element.querySelector('[data-pct]').textContent, offset: parseFloat(element.querySelector('[data-draw]').style.strokeDashoffset), on: [...element.querySelectorAll('[data-node]')].map(node => node.classList.contains('is-on')) }));
  let sp = await spState();
  assert.deepEqual([sp.pct, sp.offset, sp.on], ['0%', 100, [true, false, false, false]], 'scrollpath: start state');
  await spScroll.evaluate(element => { element.scrollTop = (element.scrollHeight - element.clientHeight) / 2; });
  await page.waitForTimeout(50);
  sp = await spState();
  assert(Math.abs(sp.offset - 50) < 1 && sp.pct === '50%', `scrollpath: halfway (${JSON.stringify(sp)})`);
  assert(sp.on[0] && !sp.on[3], 'scrollpath: partial nodes');
  await spScroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.waitForTimeout(50);
  sp = await spState();
  assert.deepEqual([sp.pct, sp.offset, sp.on], ['100%', 0, [true, true, true, true]], 'scrollpath: end state');
  await spScroll.evaluate(element => { element.scrollTop = 0; });

  // 아코디언
  card = page.locator('#accordion'); await center(card);
  const heads = card.locator('.exp003-ah button');
  const expanded = async () => (await heads.evaluateAll(list => list.map(element => element.getAttribute('aria-expanded') === 'true')));
  assert.deepEqual(await expanded(), [true, false, false]);
  await heads.nth(1).click();
  assert.deepEqual(await expanded(), [true, true, false], 'accordion: independent open');
  await page.waitForTimeout(350);
  assert(await card.getByText('내 계정에 연결된 서버').isVisible(), 'accordion: panel visible once open');
  await heads.nth(0).click(); await page.waitForTimeout(350);
  assert(!(await card.getByText('기본 기능은 무료입니다').isVisible()), 'accordion: collapsed panel hidden');
  await card.getByRole('switch').click();
  await heads.nth(2).click();
  assert.deepEqual(await expanded(), [false, false, true], 'accordion: single mode closes the others');

  // 캐러셀
  card = page.locator('#carousel'); await center(card);
  const csNo = () => text(card.locator('[data-no]'));
  assert.equal(await csNo(), '1 / 3');
  await card.getByRole('button', { name: '다음 슬라이드' }).click();
  assert.equal(await csNo(), '2 / 3');
  await card.getByRole('button', { name: '3번 슬라이드' }).click();
  assert.equal(await csNo(), '3 / 3'); assert.equal(await attr(card.getByRole('button', { name: '3번 슬라이드' }), 'aria-current'), 'true');
  await card.getByRole('button', { name: '다음 슬라이드' }).click();
  assert.equal(await csNo(), '1 / 3', 'carousel: wraps');
  await card.locator('.exp003-cs-vp').focus(); await page.keyboard.press('ArrowLeft');
  assert.equal(await csNo(), '3 / 3', 'carousel: ArrowLeft');
  const box = await card.locator('.exp003-cs-vp').boundingBox();
  await page.mouse.move(box.x + box.width - 20, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + 20, box.y + 30, { steps: 4 }); await page.mouse.up();
  assert.equal(await csNo(), '1 / 3', 'carousel: swipe left goes next');
  assert.equal(await card.locator('.exp003-cs-sl:not([inert])').count(), 1, 'carousel: only the current slide is reachable');
  await card.getByRole('button', { name: '자동 재생' }).click(); await away();
  assert.equal(await attr(card.getByRole('button', { name: '자동 재생' }), 'aria-pressed'), 'true');
  await page.waitForFunction(() => document.querySelector('#carousel [data-no]').textContent !== '1 / 3', null, { timeout: 5000 });
  await card.getByRole('button', { name: '자동 재생' }).click(); await away();
  const frozen = await csNo(); await page.waitForTimeout(3300);
  assert.equal(await csNo(), frozen, 'carousel: autoplay stops when switched off');

  // 검색·필터
  card = page.locator('#filter'); await center(card);
  const flCount = () => text(card.locator('[data-count]'));
  assert.equal(await flCount(), '12개');
  await card.getByRole('searchbox').fill('검사');
  assert.equal(await flCount(), '1개'); assert.equal(await card.locator('.exp003-fl-list li').count(), 1);
  await card.getByRole('searchbox').fill('없는말');
  assert.equal(await flCount(), '0개'); assert(await card.getByText('조건에 맞는 항목이 없습니다.').isVisible());
  await card.getByRole('searchbox').fill('');
  await card.getByRole('button', { name: '모션', exact: true }).click();
  assert.equal(await flCount(), '3개'); assert.equal(await attr(card.getByRole('button', { name: '모션', exact: true }), 'aria-pressed'), 'true');
  await card.getByRole('searchbox').fill('곡선');
  assert.equal(await flCount(), '1개', 'filter: chip and query combine');
  await card.getByRole('button', { name: '컬러', exact: true }).click();
  assert.equal(await flCount(), '0개');

  // 모달
  card = page.locator('#modal'); await center(card);
  const dialog = card.getByRole('dialog'), opener = card.getByRole('button', { name: '삭제…' });
  assert(!(await dialog.isVisible()));
  await opener.click();
  assert(await dialog.isVisible());
  assert.equal(await card.locator('[data-base]').evaluate(element => element.inert), true, 'modal: background inert');
  assert.equal(await dialog.getByRole('button', { name: '취소' }).evaluate(element => element === document.activeElement), true, 'modal: focus moves into the dialog');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await dialog.getByRole('button', { name: '삭제', exact: true }).evaluate(element => element === document.activeElement), true, 'modal: focus trapped backwards');
  await page.keyboard.press('Tab');
  assert.equal(await dialog.getByRole('button', { name: '취소' }).evaluate(element => element === document.activeElement), true, 'modal: focus trapped forwards');
  await page.keyboard.press('Escape');
  assert(!(await dialog.isVisible())); assert.equal(await opener.evaluate(element => element === document.activeElement), true, 'modal: focus returns to opener');
  await opener.click(); await card.locator('[data-overlay]').click({ position: { x: 4, y: 4 } });
  assert(!(await dialog.isVisible()), 'modal: scrim click closes');
  await opener.click(); await dialog.getByRole('button', { name: '삭제', exact: true }).click();
  assert(!(await dialog.isVisible())); assert.equal(await text(card.locator('[data-tag]')), '삭제됨');
  await card.getByRole('button', { name: '되돌리기' }).click();
  assert.equal(await text(card.locator('[data-tag]')), '사용 중');

  // 툴팁
  card = page.locator('#tooltip'); await center(card);
  const saveBtn = card.getByRole('button', { name: '저장', exact: true }), saveTip = card.locator('.exp003-tt-tip').first();
  assert(!(await saveTip.isVisible()));
  await saveBtn.hover(); await page.waitForTimeout(250);
  assert(await saveTip.isVisible(), 'tooltip: shows on hover');
  await away(); await page.waitForTimeout(250);
  assert(!(await saveTip.isVisible()), 'tooltip: hides when the pointer leaves');
  await saveBtn.focus(); await page.waitForTimeout(250);
  assert(await saveTip.isVisible(), 'tooltip: shows on keyboard focus');
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  assert(!(await saveTip.isVisible()), 'tooltip: Esc dismisses');
  assert.equal(await saveBtn.getAttribute('aria-describedby'), await saveTip.getAttribute('id'));
  await saveBtn.click();
  assert.equal(await text(card.locator('[data-out]')), '저장했습니다.');
  await card.getByRole('button', { name: 'API 키 도움말' }).hover(); await page.waitForTimeout(250);
  assert(await card.locator('.exp003-tt-tip').last().isVisible(), 'tooltip: help tooltip opens below');
  await away();

  // 토스트
  card = page.locator('#toast'); await center(card);
  const toasts = card.locator('.exp003-ts');
  assert.equal(await toasts.count(), 0);
  for (let i = 0; i < 3; i++) await card.getByRole('button', { name: '저장하기' }).click();
  assert.equal(await toasts.count(), 3);
  await card.getByRole('button', { name: '오류 내기' }).click();
  assert.equal(await toasts.count(), 3, 'toast: at most three at once');
  assert.equal(await toasts.last().evaluate(element => element.classList.contains('is-error')), true);
  await toasts.first().getByRole('button', { name: '알림 닫기' }).click();
  await page.waitForFunction(() => document.querySelectorAll('#toast .exp003-ts').length === 2);
  await away();
  await page.waitForFunction(() => document.querySelectorAll('#toast .exp003-ts').length === 0, null, { timeout: 7000 });

  // 토글 스위치
  card = page.locator('#toggle'); await center(card);
  const preview = card.locator('[data-pv]');
  const darkSwitch = card.getByRole('switch', { name: '다크 미리보기' });
  assert.equal(await attr(darkSwitch, 'aria-checked'), 'false');
  await darkSwitch.click();
  assert.equal(await attr(darkSwitch, 'aria-checked'), 'true'); assert(await preview.evaluate(element => element.classList.contains('is-dark')));
  assert.equal(await text(card.locator('[data-st="dark"]')), '켬');
  await card.getByRole('switch', { name: '알림 받기' }).click();
  assert.equal(await text(card.locator('[data-bell]')), '알림 켜짐');
  await card.getByRole('switch', { name: '자동 저장' }).focus(); await page.keyboard.press('Space');
  assert.match(await text(card.locator('[data-save]')), /저장됨/, 'toggle: Space toggles');
  await darkSwitch.click();
  assert(!(await preview.evaluate(element => element.classList.contains('is-dark'))));

  // 폼 검증
  card = page.locator('#form'); await center(card);
  const emailField = card.getByRole('textbox', { name: '이메일' }), pwField = card.locator('[name=pw]');
  await card.getByRole('button', { name: '가입하기' }).click();
  assert.equal(await attr(emailField, 'aria-invalid'), 'true'); assert.equal(await attr(pwField, 'aria-invalid'), 'true');
  assert.equal(await emailField.evaluate(element => element === document.activeElement), true, 'form: focus moves to the first error');
  assert.match(await text(card.locator('[data-msg="email"]')), /이메일을 입력/);
  await emailField.fill('abc');
  assert.match(await text(card.locator('[data-msg="email"]')), /이메일 형식/, 'form: live revalidation after the first error');
  await emailField.fill('hello@mail.com');
  assert.equal(await attr(emailField, 'aria-invalid'), null); assert.match(await text(card.locator('[data-msg="email"]')), /✓/);
  await pwField.fill('abc'); assert.match(await text(card.locator('[data-msg="pw"]')), /8자 이상/);
  await pwField.fill('abcdefgh'); assert.match(await text(card.locator('[data-msg="pw"]')), /숫자/);
  await card.getByRole('button', { name: '보기' }).click(); assert.equal(await attr(pwField, 'type'), 'text');
  await pwField.fill('abcdefg1'); assert.equal(await attr(pwField, 'aria-invalid'), null);
  await card.getByRole('button', { name: '가입하기' }).click();
  assert(await card.locator('[data-done]').isVisible()); assert(!(await card.locator('[data-form]').isVisible()));
  await card.getByRole('button', { name: '다시 입력' }).click();
  assert(await card.locator('[data-form]').isVisible()); assert.equal(await emailField.inputValue(), '');

  // 초기화: 한 카드, 전체
  card = page.locator('#tabs'); await center(card);
  await card.getByRole('tab').nth(2).click();
  await card.getByRole('button', { name: '탭 초기화' }).click();
  assert.equal(await attr(card.getByRole('tab').nth(0), 'aria-selected'), 'true', 'reset: single demo back to its first state');
  card = page.locator('#toggle'); await center(card);
  await card.getByRole('switch', { name: '알림 받기' }).click();
  await page.locator('#reset-all').click();
  assert.equal(await attr(card.getByRole('switch', { name: '알림 받기' }), 'aria-checked'), 'false', 'reset all');
  assert.equal(await text(card.locator('[data-bell]')), '알림 꺼짐');
  assert(await page.locator('#reset-all').isVisible() && await page.locator('#demo-toolbar').evaluate(element => Math.abs(element.getBoundingClientRect().top) < 1), 'sticky toolbar keeps reset-all reachable');
}

const pageTable = [['/', 0, 'catalog'], ...ORDER.map(slug => [`/experiments/${slug}/`, EXPECTED[slug], slug])];
try {
  for (const width of (process.env.QA_WIDTHS || '390,1440').split(',').map(Number)) {
    for (const colorScheme of (process.env.QA_COLOR_SCHEMES || 'light,dark').split(',')) {
      for (const [path, demos, slug] of pageTable) {
        const interactive = slug === 'exp-003'; // EXP-003 is a library of working UI patterns: each is exercised by click/keyboard below instead of watched
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
          firstStageY: Math.round(document.querySelector('.card-preview, .stage').getBoundingClientRect().top),
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
          assert.equal(await page.locator('.experiment-card').count(), 3);
          assert.deepEqual(await page.locator('.experiment-card .experiment-code').allTextContents(), data.experiments.map(item => item.id));
          // The landing groups demos by category: no demo title is listed as its own card, and card text is unique.
          const cardText = await page.locator('.experiment-card').evaluateAll(cards => cards.map(card => ({ title: card.querySelector('h3').textContent, desc: card.querySelector('.card-desc').textContent, meta: card.querySelector('.card-meta').textContent })));
          assert.equal(new Set(cardText.map(card => card.title)).size, 3, 'duplicate landing titles');
          assert.equal(new Set(cardText.map(card => card.desc)).size, 3, 'duplicate landing descriptions');
          assert.equal(await page.locator('#total-count').textContent(), '03');
          assert.deepEqual(await page.locator('[data-filter]').allTextContents(), ['전체', ...data.categories]);
          assert.equal(await page.locator('.card-preview svg').count(), 3);
          await page.locator('.experiment-card').first().focus();
          assert.equal(await page.locator('.card-title h3').first().evaluate(element => getComputedStyle(element).textDecorationLine), 'underline');
          assert.equal(await page.locator('.experiment-card').first().evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
          for (const category of data.categories) {
            await page.getByRole('button', { name: category, exact: true }).click();
            assert.equal(await page.locator('.experiment-card').count(), 1, `filter ${category}`);
            assert.equal(await page.locator('.experiment-card .experiment-code').textContent(), data.experiments.find(item => item.category === category).id);
          }
          await page.getByRole('button', { name: /^전체/ }).click();
          assert.equal(await page.locator('.experiment-card').count(), 3);
          await page.locator('#search').fill('이징');
          assert.equal(await page.locator('.experiment-card').count(), 1);
          await page.locator('#search').fill('accordion');
          assert.equal(await page.locator('.experiment-card .experiment-code').textContent(), 'EXP-003');
          await page.locator('#search').fill('GPU');
          assert.equal(await page.locator('.experiment-card').count(), 0, 'EXP-004 must be gone from search');
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
          const neighbours = { 'exp-001': [null, '../exp-002/'], 'exp-002': ['../exp-001/', '../exp-003/'], 'exp-003': ['../exp-002/', null] }[slug];
          assert.deepEqual([rendered.prev, rendered.next], neighbours, `${path}: previous/next links must follow EXP-001 ↔ 002 ↔ 003`);
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
          if (interactive) {
            await exerciseDemos(page, entry, width);
            assert.equal(await page.locator('#pause-all').count(), 0, `${path}: interactive page has no pause control`);
            await page.locator('#reset-all').click();
          } else {
            // Each demo must animate, restart with Enter, and pause without time advancing.
            for (const card of await page.locator('.demo-card').all()) {
              await card.scrollIntoViewIfNeeded();
              const replay = card.locator('.replay');
              await replay.focus();
              await page.keyboard.press('Enter');
              await page.waitForTimeout(90);
              const before = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => ({ time: animation.currentTime, state: animation.playState })));
              assert(before.length > 0 && before.some(item => item.state === 'running'), `${path}#${await card.getAttribute('id')}: demo has no running animation`);
              await page.waitForTimeout(80);
              const after = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
              assert(after.some((time, index) => time > before[index].time), `${path}#${await card.getAttribute('id')}: animation time did not advance`);
              await replay.click();
              const restarted = await card.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime));
              assert(restarted.some((time, index) => time < after[index]), `${path}#${await card.getAttribute('id')}: replay did not restart animation (${after} → ${restarted})`);
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
            const target = page.locator('.demo-card').last();
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
            assert(restartTimes.length > 0 && restartTimes.every(time => time <= 34));
            await page.waitForTimeout(150);
            assert.deepEqual(await target.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.currentTime)), restartTimes);
            assert(await page.evaluate(() => window.__otherAnimations.every(({ animation, time }) => animation.currentTime === time && animation.playState === 'paused')));
            await page.locator('#replay-all').click();
            assert.equal(await page.locator('#pause-all').getAttribute('aria-pressed'), 'true');
            assert(await page.evaluate(() => document.getAnimations().every(animation => animation.playState === 'paused')));
          }
          if (!interactive) await page.locator('#pause-all').click();
          await page.emulateMedia({ reducedMotion: 'reduce' });
          if (interactive) {
            assert(await page.locator('.replay').first().isEnabled()); // reset keeps working under reduced motion
            await page.reload();
            await page.waitForSelector('.demo-card');
            assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
          } else {
          await page.waitForFunction(() => document.querySelector('#replay-all').disabled);
          assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
          assert(await page.locator('#motion-notice').isVisible());
          assert(await page.locator('#replay-all').isDisabled());
          assert(await page.locator('#pause-all').isDisabled());
          assert(await page.locator('.replay').first().isDisabled());
          await page.reload();
          await page.waitForFunction(() => document.querySelector('#replay-all')?.disabled);
          assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
          }
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
          if (!interactive) {
            await page.waitForFunction(() => !document.querySelector('#replay-all').disabled);
            assert(await page.locator('#replay-all').isEnabled());
            await page.locator('#replay-all').click();
            await page.waitForTimeout(1200);
            await page.locator('#pause-all').click();
          }
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
        reports.push({ path, width, height: width === 390 ? 844 : 1000, colorScheme, demos, firstContentY: geometry.firstContentY, firstStageY: geometry.firstStageY, pageHeight: geometry.pageHeight, screenshotAnimationTime: slug !== 'catalog' ? 1200 : null, contrast, errors: 0, externalRequests: 0, overflow: false, themeTouchTargets: 'passed', pauseReplay: slug === 'catalog' || interactive ? 'n/a' : 'passed', interactions: interactive ? 'passed' : 'n/a', reducedMotion: 'passed' });
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
  assert.equal(await page.locator('.experiment-card').count(), 3);
  await page.close();
  const contentReady = !data.copyPending && Boolean(data.intro) && data.experiments.every(item => item.description && item.demos.every(demo => demo.description));
  console.log(JSON.stringify({ passed: reports.length, projectPrefix: 'passed', contentReady, reports, screenshots: output }, null, 2));
  if (process.env.REQUIRE_CONTENT === '1') assert(contentReady, 'Source copy is still missing; publication is not ready.');
} catch (error) {
  failures.push(error.stack);
  console.error(failures.join('\n'));
  process.exitCode = 1;
} finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
