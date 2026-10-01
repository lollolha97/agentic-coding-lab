// Minimal Chrome DevTools Protocol driver (no Playwright available in this environment). Node >= 22 (global WebSocket/fetch).
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const CHROME = process.env.BROWSER_EXECUTABLE || '/home/hatch/vm/browsers/chrome-linux64/chrome';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };

export function serve(root) {
  const log = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x'); let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    log.push(url.pathname);
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port, log })));
}

export async function launch({ width = 960, height = 640, dpr = 1, args = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lb-chrome-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--force-color-profile=srgb',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`, '--no-first-run', '--disable-extensions', '--disable-background-networking', ...args, 'about:blank'], { stdio: 'ignore' });
  let ws; for (let i = 0; i < 80; i++) { try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) { ws = pg.webSocketDebuggerUrl; break; } } catch (e) { /* retry */ } await new Promise(r => setTimeout(r, 150)); }
  if (!ws) throw new Error('chrome did not start');
  const sock = new WebSocket(ws); await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  let id = 0; const pending = new Map(), handlers = new Map();
  sock.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } else if (d.method) (handlers.get(d.method) || []).forEach(f => f(d.params)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); sock.send(JSON.stringify({ id: i, method, params })); });
  const on = (ev, fn) => { handlers.set(ev, [...(handlers.get(ev) || []), fn]); };
  const state = { console: [], requests: [], exceptions: [] };
  on('Runtime.consoleAPICalled', p => state.console.push({ type: p.type, text: (p.args || []).map(a => a.value ?? a.description ?? '').join(' ') }));
  on('Runtime.exceptionThrown', p => state.exceptions.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text));
  on('Log.entryAdded', p => { if (p.entry.level === 'error') state.console.push({ type: 'log-error', text: p.entry.text + ' ' + (p.entry.url || '') }); });
  on('Network.requestWillBeSent', p => state.requests.push(p.request.url));
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
  const setViewport = (w, h, d = dpr, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: d, mobile });
  await setViewport(width, height, dpr);
  const goto = async url => { const loaded = new Promise(r => on('Page.loadEventFired', r)); await send('Page.navigate', { url }); await loaded; await new Promise(r => setTimeout(r, 150)); };
  const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const shot = async (file, clip) => { const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; };
  const close = async () => { try { sock.close(); } catch (e) { /* */ } proc.kill('SIGKILL'); fs.rmSync(dir, { recursive: true, force: true }); };
  return { send, on, goto, evaluate, shot, setViewport, close, state, proc };
}
