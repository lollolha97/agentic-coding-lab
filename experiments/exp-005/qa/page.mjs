// Page-level screenshots/console/network check. Usage: node qa/page.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const out = process.argv[2] || '/tmp/liquid-qa/page'; fs.mkdirSync(out, { recursive: true });
const { server, port, log } = await serve(root);
const b = await launch({ width: 1440, height: 900, dpr: 1 });
const results = [];
for (const [w, h] of [[1440, 900], [960, 800], [390, 844], [320, 700]]) {
  await b.setViewport(w, h, 1, w < 500);
  await b.goto(`http://127.0.0.1:${port}/experiments/exp-005/index.html`);
  await b.evaluate('liquidBarDemo.setAutoplay(false), 1');
  await new Promise(r => setTimeout(r, 400));
  const m = await b.evaluate(`JSON.stringify({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, lay: liquidBarDemo.getDiagnostics().layout, webgl: liquidBarDemo.getDiagnostics().webgl.ok})`);
  results.push({ w, h, ...JSON.parse(m) });
  await b.evaluate(`document.querySelector('#exp5-stage').scrollIntoView({block:'center'}), 1`);
  await b.shot(path.join(out, `page-${w}.png`));
  await b.evaluate(`liquidBarDemo.setMode('pay', {instant:true}), 1`);
  await new Promise(r => setTimeout(r, 250));
  await b.shot(path.join(out, `page-${w}-pay.png`));
}
console.log(JSON.stringify(results));
console.log('console', JSON.stringify(b.state.console), 'exc', JSON.stringify(b.state.exceptions));
console.log('external requests', JSON.stringify(b.state.requests.filter(u => !u.startsWith(`http://127.0.0.1:${port}/`) && !u.startsWith('data:') && !u.startsWith('blob:'))));
console.log('served', [...new Set(log)].join(' '));
await b.close(); server.close();
