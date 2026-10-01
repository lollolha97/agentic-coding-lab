// Connectivity validation from actual rendered pixels (spec 14/15). Usage: node qa/conn.mjs [outFile.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const { server, port } = await serve(root);
const b = await launch({ width: 960, height: 640, dpr: 1 });
await b.goto(`http://127.0.0.1:${port}/experiments/exp-005/qa/harness.html`);
await b.evaluate(fs.readFileSync(path.join(here, 'analyze.js'), 'utf8') + ';1');
const rows = [];
for (const [branch, direction] of [['pay', 'open'], ['request', 'open'], ['pay', 'close'], ['request', 'close']]) {
  for (const ms of [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 800, 900]) rows.push(await b.evaluate(`window.__analyze(${JSON.stringify(branch)}, ${JSON.stringify(direction)}, ${ms})`));
}
for (const r of rows) console.log(`${r.branch.padEnd(7)} ${r.direction.padEnd(5)} ${String(r.ms).padStart(3)}ms comps=${r.major} neck=${r.neckPx} T=${r.tension} K=${r.unionK} saddle=${r.saddle} conn=${r.pairConnected} childW=${r.childW} unrelSep=${r.unrelatedSeparate} recoil=${r.recoil}`);
// ---- spec 14 acceptance, evaluated on the rendered pixels
const R = (branch, dir, ms) => rows.find(r => r.branch === branch && r.direction === dir && r.ms === ms);
const out = []; const chk = (name, ok, detail = '') => { out.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
console.log('\nSpec 14 acceptance (960x640, DPR 1, speed 1, liquidity 1, no hover/press):');
for (const br of ['pay', 'request']) {
  for (const ms of [200, 300, 350]) chk(`${br} OPEN ${ms}ms: 2 major components (1 independent + 1 connected pair)`, R(br, 'open', ms).major === 2);
  const n300 = R(br, 'open', 300).neckPx, n350 = R(br, 'open', 350).neckPx;
  chk(`${br} OPEN neck thickness decreases 300->350ms and does not vanish`, n350 < n300 && n350 > 10, `${n300}px -> ${n350}px (reference baseline ~68 -> 44)`);
  for (const ms of [450, 500, 800, 900]) chk(`${br} OPEN ${ms}ms: 3 independent surfaces`, R(br, 'open', ms).major === 3);
  chk(`${br} MERGE-BACK 0ms: 3 independent surfaces`, R(br, 'close', 0).major === 3);
  chk(`${br} MERGE-BACK 100ms: related pair already connected (2 components)`, R(br, 'close', 100).major === 2 && R(br, 'close', 100).pairConnected);
  const refW = br === 'pay' ? 364 : 336;
  chk(`${br} MERGE-BACK 200ms: child connected but still full reference width (${refW})`, R(br, 'close', 200).major === 2 && Math.abs(R(br, 'close', 200).childW - refW) < 1, 'childW ' + R(br, 'close', 200).childW);
  chk(`${br} MERGE-BACK: unrelated button independent at every sampled time`, rows.filter(r => r.branch === br && r.direction === 'close').every(r => r.unrelatedSeparate));
  chk(`${br} OPEN: unrelated button independent at every sampled time`, rows.filter(r => r.branch === br && r.direction === 'open' && r.ms >= 100).every(r => r.unrelatedSeparate));
  chk(`${br} MERGE-BACK 900ms: original 2-button home (2 components)`, R(br, 'close', 900).major === 2 && R(br, 'close', 900).shapes[0][1] === 284 + 0 && Math.abs(R(br, 'close', 900).shapes[1][1] - 384) < 0.5);
  chk(`${br} OPEN: recoil fired exactly once after the pair separated`, R(br, 'open', 900).recoil === 1 && R(br, 'open', 350).recoil === 0);
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ rows, acceptance: out }, null, 1));
await b.close(); server.close();
console.log(`\n${out.filter(o => o.ok).length}/${out.length} acceptance checks passed`);
process.exit(out.every(o => o.ok) ? 0 : 1);
