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
const EXPECTED = { 'exp-001': 21, 'exp-002': 8, 'exp-003': 13, 'exp-004': 1 };
const ORDER = Object.keys(EXPECTED);
assert.deepEqual(data.experiments.map(item => item.slug), ORDER, 'data.js must list the four categories in order');
assert.deepEqual(data.categories, ['모션', '카메라', '웹 디자인', '웹사이트']);
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
          firstStageY: Math.round(document.querySelector('.card-preview, .stage, .site-preview').getBoundingClientRect().top),
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
          await page.locator('#search').fill('accordion');
          assert.equal(await page.locator('.experiment-card .experiment-code').textContent(), 'EXP-003');
          await page.locator('#search').fill('GPU');
          assert.equal(await page.locator('.experiment-card').count(), 0, 'the removed GPU experiment must stay gone from search');
          await page.locator('#search').fill('@arman._.uiux');
          assert.equal(await page.locator('.experiment-card .experiment-code').allTextContents().then(codes => codes.join()), 'EXP-003,EXP-004', 'source account search finds both categories that credit it');
          await page.locator('#search').fill('focus your time');
          assert.equal(await page.locator('.experiment-card .experiment-code').textContent(), 'EXP-004', 'search finds the site by name');
          await page.locator('#search').fill('no-such-experiment');
          assert.equal(await page.locator('.experiment-card').count(), 0);
          assert(await page.locator('#empty-state').isVisible());
          await page.locator('#search').fill('');
          await page.locator('#search').blur();
          await page.keyboard.press('/');
          assert(await page.locator('#search').evaluate(element => element === document.activeElement));
          await page.locator('#search').blur();
        } else if (slug === 'exp-004') {
          // The gallery is static: one card per site, the card is the link into the site, and the Instagram source is shown on the card.
          const demo = entry.demos[0];
          const info = await page.evaluate(() => {
            const card = document.querySelector('.demo-card');
            const link = card.querySelector('.site-link');
            const source = card.querySelector('a[href^="https://www.instagram.com/"]');
            const centre = element => { const r = element.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); };
            return {
              id: card.id, title: card.querySelector('h3 a').childNodes[0].textContent.trim(), description: card.querySelector('.demo-description').textContent.trim(),
              count: document.querySelector('.demo-toolbar .count').textContent, siteHref: link.getAttribute('href'),
              sourceHref: source.href, sourceText: source.textContent.replace(/\s+/g, ' ').trim(), sourceTarget: `${source.target}|${source.rel}`,
              sourceOnTop: centre(source) === source || source.contains(centre(source)),
              cardCoveredByLink: [...card.querySelectorAll('.site-preview, .demo-description')].every(element => { const hit = centre(element); return hit && (hit === link || link.contains(hit) || hit.closest('a') === link); }),
              prev: document.querySelector('.experiment-pagination a[rel="prev"]')?.getAttribute('href') ?? null,
              next: document.querySelector('.experiment-pagination a[rel="next"]')?.getAttribute('href') ?? null
            };
          });
          assert.equal(info.id, demo.key); assert.equal(info.title, demo.name, `${path}: card title differs from data.js`);
          assert.equal(info.description, demo.description, `${path}: card description differs from data.js`);
          assert.equal(info.count, '01'); assert.equal(info.siteHref, `sites/${demo.key}/`);
          assert.equal(info.sourceHref, 'https://www.instagram.com/p/DdySvZ4m8Zh/', 'gallery card must link the original post');
          assert.equal(info.sourceHref, demo.sources[0].url); assert.equal(demo.sources[0].account, '@arman._.uiux');
          assert(info.sourceText.includes('원본: @arman._.uiux'), `gallery card source label: ${info.sourceText}`);
          assert.equal(info.sourceTarget, '_blank|noopener noreferrer');
          assert(info.sourceOnTop, 'source link must stay clickable above the stretched card link');
          assert(info.cardCoveredByLink, 'the whole card (preview and text) must hit the site link');
          assert.deepEqual([info.prev, info.next], ['../exp-003/', null], `${path}: previous/next links must follow EXP-003 ← 004`);
          assert.equal(await page.locator('.demo-card').first().evaluate(card => card.querySelector('.site-link').getBoundingClientRect().height >= 24), true);
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
  // EXP-004: the card enters the demo site, and the ORDI site itself is a working page that is operated like a user would.
  const SOURCE = 'https://www.instagram.com/p/DdySvZ4m8Zh/';
  const SITE = '/experiments/exp-004/sites/ordi/';
  const open = async (width, colorScheme, extra = {}) => {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme, ...extra });
    await page.route(`${base}/**`, async route => {
      const response = await fetch(route.request().url());
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    const watch = { errors: [], external: [], broken: [] };
    page.on('pageerror', error => watch.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') watch.errors.push(message.text()); });
    page.on('request', request => { if (!request.url().startsWith(base)) watch.external.push(request.url()); });
    page.on('response', response => { if (response.status() >= 400) watch.broken.push(`${response.status()} ${response.url()}`); });
    return { page, watch };
  };
  {
    // Gallery → site (mouse on the preview, keyboard on the title link) and back.
    const { page: gallery, watch } = await open(1440, 'light');
    await gallery.goto(`${base}/experiments/exp-004/`);
    // Real mouse clicks at the centre of the preview / description: the stretched title link must catch them (locator.click refuses because the link "intercepts" them).
    const clickCentre = async selector => { const box = await gallery.locator(selector).boundingBox(); await gallery.mouse.click(box.x + box.width / 2, box.y + box.height / 2); };
    await clickCentre('.site-preview');
    await gallery.waitForURL(`${base}${SITE}`);
    assert.match(await gallery.title(), /ORDI/);
    await gallery.locator('a[data-back]').click();
    await gallery.waitForURL(`${base}/experiments/exp-004/`);
    await gallery.locator('.site-link').focus();
    await gallery.keyboard.press('Enter');
    await gallery.waitForURL(`${base}${SITE}`);
    await gallery.goBack();
    await clickCentre('.demo-description');
    await gallery.waitForURL(`${base}${SITE}`);
    // EXP-003 links forward to the gallery; the landing card opens it.
    await gallery.goto(`${base}/experiments/exp-003/`);
    await gallery.locator('.experiment-pagination a[rel="next"]').click();
    await gallery.waitForURL(`${base}/experiments/exp-004/`);
    await gallery.goto(`${base}/`);
    await gallery.locator('.experiment-card', { hasText: 'EXP-004' }).click();
    await gallery.waitForURL(`${base}/experiments/exp-004/`);
    assert.deepEqual([watch.errors, watch.external, watch.broken], [[], [], []], 'gallery navigation: errors / external / broken');
    await gallery.close();
  }

  async function exerciseSite(width, colorScheme) {
    const tag = `ordi ${width}px ${colorScheme}`;
    const { page, watch } = await open(width, colorScheme);
    await page.goto(`${base}${SITE}`);
    await page.waitForSelector('#hero-title');
    const mobile = width < 1040;
    const sleep = ms => page.waitForTimeout(ms);
    const scrollTop = () => page.evaluate(() => Math.round(scrollY));
    const sectionTop = id => page.evaluate(sectionId => Math.round(document.getElementById(sectionId).getBoundingClientRect().top), id);
    const settle = async () => { let last = -1; for (let i = 0; i < 40; i++) { const now = await scrollTop(); if (now === last) return; last = now; await sleep(80); } };
    const geometry = () => page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth, viewport: innerWidth, bg: getComputedStyle(document.body).backgroundColor,
      // Clipped containers hide real overflow, so the headline and every heading are measured directly.
      clipped: [...document.querySelectorAll('.headline .line > *, h1, h2, h3, .title, .stat b, .price b, .plan, .feature, .quote, .mock, .chart-card, .signup input, .btn')]
        .filter(element => { const r = element.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1 || element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).display !== 'inline'); })
        .map(element => `${element.tagName}.${element.className} ${Math.round(element.getBoundingClientRect().right)}`),
      headlineRight: Math.max(...[...document.querySelectorAll('.headline .line > *')].map(element => Math.round(element.getBoundingClientRect().right)))
    }));

    // Layout, theme, document basics.
    assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
    let g = await geometry();
    assert.equal(g.scroll, width, `${tag}: horizontal overflow on load`);
    assert.deepEqual(g.clipped, [], `${tag}: content overflows its box`);
    assert(g.headlineRight <= width - 10, `${tag}: headline reaches the viewport edge (${g.headlineRight})`);
    assert.equal(g.bg, colorScheme === 'light' ? 'rgb(239, 236, 228)' : 'rgb(15, 15, 13)', `${tag}: page background`);
    assert.equal(await page.locator('#hero-title').getAttribute('aria-label'), 'FOCUS YOUR TIME');
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal((await page.locator('#hero-title').innerText()).replace(/\s+/g, ' ').trim().startsWith('FOCUS YOUR TIME'), true, 'hero headline text');
    const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map(element => element.id));
    assert.equal(new Set(ids).size, ids.length, `${tag}: duplicate ids`);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => a.getAttribute('href').length > 1 && !document.querySelector(a.getAttribute('href'))).length), 0, 'every anchor must have a target');
    assert.equal(await page.evaluate(() => /gradient|backdrop-filter|box-shadow:[^;]*blur/i.test([...document.styleSheets].flatMap(sheet => [...sheet.cssRules]).map(rule => rule.cssText).join('\n'))), false, 'no gradients, blur or glow in the stylesheet');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('*')].some(element => getComputedStyle(element).boxShadow.split('rgb').slice(1).some(part => /\)\s+-?\d+px\s+-?\d+px\s+[1-9]\d*px/.test(part)))), false, 'no blurred (glow) shadows');

    // Source credit: top bar and footer, both pointing at the original post.
    const credit = await page.evaluate(() => [...document.querySelectorAll('a[href^="https://www.instagram.com/"]')].map(a => ({ href: a.href, text: a.textContent.replace(/\s+/g, ' ').trim(), where: a.closest('.bar, .provenance, footer')?.className || '', target: `${a.target}|${a.rel}` })));
    assert(credit.length >= 2 && credit.every(item => item.href === SOURCE && item.target === '_blank|noopener noreferrer'), `${tag}: Instagram links ${JSON.stringify(credit)}`);
    assert(credit.some(item => item.where.includes('bar') && item.text.includes('원본: @arman._.uiux')), 'top bar credit');
    assert(credit.some(item => item.where.includes('provenance') && item.text.includes('원본: @arman._.uiux')), 'footer credit');
    assert((await page.locator('.provenance').innerText()).includes('이 페이지는 @arman._.uiux의 디자인을 재현한 데모입니다'), 'provenance sentence');
    assert.equal(await page.locator('a[data-back]').getAttribute('href'), '../../');

    // Navigation: desktop links scroll to their section; below 1040px they live in the hamburger menu.
    const burger = page.locator('#burger'), menu = page.locator('#menu');
    if (mobile) {
      assert(await burger.isVisible() && !(await menu.isVisible()), 'mobile: menu closed, hamburger shown');
      assert(await burger.evaluate(element => element.offsetWidth >= 44 && element.offsetHeight >= 44), 'burger touch target');
      await burger.click();
      assert.equal(await burger.getAttribute('aria-expanded'), 'true'); await sleep(350);
      assert(await menu.isVisible()); assert.equal(await page.evaluate(() => document.documentElement.classList.contains('menu-open')), true);
      await page.screenshot({ path: `${output}/ordi-${width}-${colorScheme}-menu.png` });
      await page.keyboard.press('Escape');
      assert.equal(await burger.getAttribute('aria-expanded'), 'false'); assert.equal(await burger.evaluate(element => element === document.activeElement), true, 'Esc returns focus to the burger');
      await sleep(350); assert(!(await menu.isVisible()));
      await burger.click(); await sleep(350);
      await menu.getByRole('link', { name: '요금제' }).click();
    } else {
      assert(!(await burger.isVisible()), 'desktop: no hamburger'); assert(await menu.isVisible());
      await menu.getByRole('link', { name: '요금제' }).click();
    }
    await page.waitForFunction(() => location.hash === '#pricing'); await settle();
    assert(Math.abs(await sectionTop('pricing') - 64) <= 3, `${tag}: smooth anchor lands under the sticky header (${await sectionTop('pricing')})`);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('menu-open')), false, 'menu closed after choosing a link');
    assert.equal(await page.locator('a.nav[aria-current="true"]').evaluateAll(links => links.map(link => link.textContent.trim())).then(list => list.join()), '요금제', 'current section is marked in the nav');
    const headerBox = await page.locator('#header').boundingBox();
    assert(headerBox.y <= 1 && headerBox.height >= 60, 'header sticks to the top');
    await page.locator('a.logo').first().click(); await settle();
    assert(await scrollTop() < 5, 'logo returns to the top');

    // Hero: live timer.
    const time = () => page.locator('#time').innerText();
    assert.equal(await time(), '25:00');
    await page.locator('#start').click();
    assert.equal(await page.locator('#start').innerText(), '일시정지');
    await sleep(1400);
    const running = await time(); assert(running !== '25:00' && /^24:5\d$/.test(running), `timer counts down (${running})`);
    assert.equal(await page.locator('#chip-time').innerText(), running, 'headline chip mirrors the timer');
    await page.locator('#start').click(); const frozen = await time();
    assert.equal(await page.locator('#start').innerText(), '이어서 시작'); await sleep(700);
    assert.equal(await time(), frozen, 'timer stays paused');
    await page.locator('#reset').click(); assert.equal(await time(), '25:00');
    await page.getByRole('button', { name: '휴식 5분' }).click(); assert.equal(await time(), '05:00');
    assert.equal(await page.getByRole('button', { name: '휴식 5분' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: '집중 25분' }).click(); assert.equal(await time(), '25:00');
    const tasks = page.locator('.task');
    for (let i = 0; i < 3; i++) await tasks.nth(i).click();
    assert.equal(await page.locator('#task-count').innerText(), '모두 끝냈어요 ✓');
    await tasks.nth(1).click(); assert.equal(await page.locator('#task-count').innerText(), '2 / 3 완료');
    assert.equal(await tasks.nth(0).locator('input').isChecked(), true);

    // Scroll reveal: below-the-fold blocks start hidden and appear when scrolled in.
    const revealed = selector => page.locator(selector).first().evaluate(element => element.classList.contains('is-in'));
    assert.equal(await revealed('#faq-list'), false, 'far section is not revealed before it is scrolled to');
    assert.equal(await page.locator('#faq-list').evaluate(element => getComputedStyle(element).opacity), '0');
    await page.locator('#faq-list').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('#faq-list').classList.contains('is-in'));
    await sleep(800); assert.equal(await page.locator('#faq-list').evaluate(element => getComputedStyle(element).opacity), '1');

    // Features: hover state.
    const feature = page.locator('.feature').first();
    await feature.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(900);
    const before = await feature.evaluate(element => getComputedStyle(element).backgroundColor);
    if (!mobile) { await feature.hover(); await sleep(350); assert.equal(await feature.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(216, 242, 74)', 'feature hover turns accent'); await page.mouse.move(2, 2); await sleep(350); assert.equal(await feature.evaluate(element => getComputedStyle(element).backgroundColor), before); }
    assert.equal(await page.locator('.feature').count(), 6);

    // How it works: tabs (click + arrow keys).
    await page.locator('#how').evaluate(element => element.scrollIntoView({ behavior: 'instant' })); await sleep(300);
    assert(await page.locator('#panel-1').isVisible() && !(await page.locator('#panel-2').isVisible()));
    await page.locator('#tab-2').click();
    assert(await page.locator('#panel-2').isVisible() && !(await page.locator('#panel-1').isVisible()), 'tab click switches panel');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#tab-3').getAttribute('aria-selected'), 'true'); assert(await page.locator('#panel-3').isVisible());
    await page.keyboard.press('ArrowDown'); assert.equal(await page.locator('#tab-1').getAttribute('aria-selected'), 'true', 'tabs wrap');
    await page.keyboard.press('End'); assert.equal(await page.locator('#tab-3').getAttribute('aria-selected'), 'true');

    // Weekly report.
    await page.locator('#report').evaluate(element => element.scrollIntoView({ behavior: 'instant' })); await sleep(300);
    await page.waitForFunction(() => document.querySelector('#chart').classList.contains('is-in')); await sleep(1100);
    const sums = () => page.evaluate(() => ['#sum-total', '#sum-avg', '#sum-best'].map(id => document.querySelector(id).textContent));
    assert.deepEqual(await sums(), ['21.0', '3.0', '목']); assert.equal(await page.locator('#chart .col').count(), 7);
    const heights = await page.locator('#chart .col i').evaluateAll(list => list.map(element => Math.round(element.getBoundingClientRect().height)));
    assert(heights.every(height => height > 0) && heights[3] > heights[6], `bars have grown to their values (${heights})`);
    await page.getByRole('button', { name: '지난 주' }).click(); assert.deepEqual(await sums(), ['19.0', '2.7', '금']);
    assert.equal(await page.getByRole('button', { name: '지난 주' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: '이번 주' }).click(); assert.deepEqual(await sums(), ['21.0', '3.0', '목']);

    // Pricing: monthly ⇄ yearly.
    const billing = page.getByRole('switch');
    await page.locator('#pricing').evaluate(element => element.scrollIntoView({ behavior: 'instant' })); await sleep(300);
    const prices = () => page.locator('.price b').allInnerTexts();
    assert.deepEqual(await prices(), ['0', '6,900', '12,000']);
    await billing.click(); assert.equal(await billing.getAttribute('aria-checked'), 'true');
    assert.deepEqual(await prices(), ['0', '5,500', '9,600']);
    assert((await page.locator('.price-sub').allInnerTexts()).join('|').includes('66,000'), 'yearly total shown');
    await billing.focus(); await page.keyboard.press('Space'); assert.deepEqual(await prices(), ['0', '6,900', '12,000'], 'switch works from the keyboard');

    // FAQ accordion.
    await page.locator('#faq').evaluate(element => element.scrollIntoView({ behavior: 'instant' })); await sleep(300);
    const faqOpen = () => page.locator('.faq-q').evaluateAll(list => list.map(button => button.getAttribute('aria-expanded') === 'true'));
    assert.deepEqual(await faqOpen(), [true, false, false, false, false, false]);
    assert(await page.locator('#a1').isVisible() && !(await page.locator('#a3').isVisible()));
    await page.locator('#q3').click(); await sleep(500);
    assert.deepEqual(await faqOpen(), [false, false, true, false, false, false], 'opening one closes the others');
    assert(await page.locator('#a3').isVisible() && !(await page.locator('#a1').isVisible()), 'answer shows/hides');
    await page.locator('#q3').click(); await sleep(500);
    assert.deepEqual(await faqOpen(), [false, false, false, false, false, false]); assert(!(await page.locator('#a3').isVisible()));
    await page.locator('#q5').focus(); await page.keyboard.press('Enter'); await sleep(500);
    assert(await page.locator('#a5').isVisible(), 'keyboard opens an answer');

    // Signup: plan buttons preselect, validation, success, retry.
    await page.locator('#pricing').evaluate(element => element.scrollIntoView({ behavior: 'instant' })); await sleep(300);
    await page.getByRole('link', { name: '프로로 시작' }).click(); await page.waitForFunction(() => location.hash === '#cta'); await settle();
    assert.equal(await page.locator('#plan-note').innerText(), '선택한 요금제: 프로');
    await page.getByRole('button', { name: /무료로 시작하기/ }).last().click();
    assert.match(await page.locator('#email-msg').innerText(), /이메일 주소를 입력/); assert.equal(await page.locator('#email').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#email').evaluate(element => element === document.activeElement), true, 'focus moves to the invalid field');
    await page.locator('#email').fill('abc'); assert.equal(await page.locator('#email').getAttribute('aria-invalid'), null, 'typing clears the error');
    await page.locator('#email').press('Enter'); assert.match(await page.locator('#email-msg').innerText(), /형식이 올바르지/);
    await page.locator('#email').fill('hello@mail.com'); await page.locator('#email').press('Enter');
    assert(await page.locator('#done').isVisible() && !(await page.locator('#signup').isVisible())); assert.match(await page.locator('#done-text').innerText(), /hello@mail\.com.*프로/);
    await page.getByRole('button', { name: '다른 주소로 다시 입력' }).click();
    assert(await page.locator('#signup').isVisible()); assert.equal(await page.locator('#email').inputValue(), '');

    // Footer credit is reachable and visible; theme toggle flips and persists.
    await page.locator('.provenance').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    assert(await page.locator('.provenance a[data-source]').isVisible(), 'footer source link visible');
    const bgBefore = (await geometry()).bg;
    await page.locator('#theme-btn').click();
    const bgAfter = (await geometry()).bg;
    assert.equal(bgAfter, colorScheme === 'light' ? 'rgb(15, 15, 13)' : 'rgb(239, 236, 228)', `${tag}: theme toggle flips the palette`);
    assert.notEqual(bgBefore, bgAfter); assert.equal(await page.evaluate(() => localStorage.getItem('acl-theme')), colorScheme === 'light' ? 'dark' : 'light');
    await page.reload(); await page.waitForSelector('#hero-title');
    assert.equal((await geometry()).bg, bgAfter, 'saved theme survives a reload');
    await page.locator('#theme-btn').click();

    // Full scroll-through: everything revealed, still no overflow, then screenshots.
    for (let y = 0; y <= (await page.evaluate(() => document.documentElement.scrollHeight)); y += 500) { await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), y); await sleep(60); }
    await sleep(900);
    assert.equal(await page.evaluate(() => document.querySelectorAll('.reveal:not(.is-in)').length), 0, `${tag}: every .reveal block shows once scrolled past`);
    g = await geometry();
    assert.equal(g.scroll, width, `${tag}: horizontal overflow after scrolling`); assert.deepEqual(g.clipped, [], `${tag}: content overflows its box after scrolling`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await sleep(200);
    await page.screenshot({ path: `${output}/ordi-${width}-${colorScheme}.png`, fullPage: true });
    await page.screenshot({ path: `${output}/ordi-${width}-${colorScheme}-viewport.png` });

    // Reduced motion: no scroll-in hiding, no looping animation.
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload(); await page.waitForSelector('#hero-title');
    assert.equal(await page.locator('#faq-list').evaluate(element => getComputedStyle(element).opacity), '1', 'reduced motion shows content immediately');
    assert.equal(await page.locator('.marquee .track').evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0, `${tag}: nothing animates under reduced motion`);

    assert.deepEqual(watch.errors, [], `${tag}: browser errors`);
    assert.deepEqual(watch.external, [], `${tag}: external requests`);
    assert.deepEqual(watch.broken, [], `${tag}: failed responses`);
    reports.push({ path: SITE, width, height: width === 390 ? 844 : 1000, colorScheme, errors: 0, externalRequests: 0, overflow: false, sourceLinks: credit.length, interactions: 'passed', reducedMotion: 'passed' });
    process.stderr.write(`Verified ${SITE} ${width}px ${colorScheme}\n`);
    await page.close();
  }
  for (const width of (process.env.QA_WIDTHS || '390,1440').split(',').map(Number)) {
    for (const colorScheme of (process.env.QA_COLOR_SCHEMES || 'light,dark').split(',')) await exerciseSite(width, colorScheme);
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
