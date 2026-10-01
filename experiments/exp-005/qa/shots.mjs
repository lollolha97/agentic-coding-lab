// Key-timestamp screenshots of the real component (inspectTransition -> frozen state -> Page.captureScreenshot). Usage: node qa/shots.mjs <outDir> [scene] [view]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const out = process.argv[2] || '/tmp/liquid-qa/shots', scene = process.argv[3] || 'reference', view = process.argv[4] || 'glass';
const sets = process.argv[5] ? JSON.parse(process.argv[5]) : [['pay', 'open', [0, 100, 200, 300, 350, 400, 450, 900]], ['pay', 'close', [0, 100, 200, 300, 450, 900]], ['request', 'open', [100, 300, 350, 450, 900]], ['request', 'close', [100, 200, 300, 900]]];
fs.mkdirSync(out, { recursive: true });
const { server, port } = await serve(root);
const b = await launch({ width: 960, height: 640, dpr: 1 });
await b.goto(`http://127.0.0.1:${port}/experiments/exp-005/qa/harness.html?scene=${scene}&view=${view}`);
const files = [];
for (const [branch, dir, list] of sets) for (const ms of list) {
  await b.evaluate(`bar.inspectTransition(${JSON.stringify(branch)}, ${ms}/900, ${JSON.stringify(dir)}), 1`);
  await new Promise(r => setTimeout(r, 120));
  const f = path.join(out, `${branch}-${dir}-${String(ms).padStart(3, '0')}.png`);
  await b.shot(f, { x: 0, y: 160, width: 960, height: 320 }); files.push(f);
}
console.log(files.length, 'screenshots ->', out, JSON.stringify(b.state.exceptions));
await b.close(); server.close();
