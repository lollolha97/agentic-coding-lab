// Page-side analysis of the REAL rendered silhouette (solid-colour mode of the same WebGL field). Injected into the page by run-qa.mjs.
window.__analyze = function (branch, direction, ms) {
  const bar = window.bar;
  bar.inspectTransition(branch, ms / 900, direction);
  const diag = bar.getDiagnostics();
  const sil = bar.readSilhouette();
  const W = sil.width, H = sil.height, a = sil.alpha, T = 128;
  const label = new Int32Array(W * H).fill(0); const comps = [];
  let next = 0; const stack = [];
  for (let i = 0; i < W * H; i++) {
    if (a[i] < T || label[i]) continue;
    next++; let area = 0, x0 = W, x1 = 0, y0 = H, y1 = 0; stack.push(i); label[i] = next;
    while (stack.length) {
      const p = stack.pop(); area++; const x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && a[p - 1] >= T && !label[p - 1]) { label[p - 1] = next; stack.push(p - 1); }
      if (x < W - 1 && a[p + 1] >= T && !label[p + 1]) { label[p + 1] = next; stack.push(p + 1); }
      if (y > 0 && a[p - W] >= T && !label[p - W]) { label[p - W] = next; stack.push(p - W); }
      if (y < H - 1 && a[p + W] >= T && !label[p + W]) { label[p + W] = next; stack.push(p + W); }
    }
    comps.push({ id: next, area, x0, x1, y0, y1 });
  }
  const px = sil.pxPerUnit, major = comps.filter(c => c.area >= 400);       // ignore AA noise / specks
  const toD = c => ({ area: c.area, x: [+((c.x0 - sil.originX) / px).toFixed(1), +((c.x1 + 1 - sil.originX) / px).toFixed(1)], y: [+((c.y0 - sil.originY) / px).toFixed(1), +((c.y1 + 1 - sil.originY) / px).toFixed(1)] });
  // neck: columns between the two liquid-pair centres; thickness = foreground pixels of the pair's component in that column
  const pairIdx = diag.pairIndex, A = diag.shapes[pairIdx], B = diag.shapes[2];
  const xa = Math.min(A.render.x, B.render.x), xb = Math.max(A.render.x, B.render.x);
  const cy = Math.round(sil.originY + ((A.render.y + B.render.y) / 2) * px);
  let neck = Infinity, neckX = null, comp = 0;
  for (let c = 0; c < W; c++) { const y = cy; if (label[y * W + Math.round(sil.originX + A.render.x * px)]) { comp = label[y * W + Math.round(sil.originX + A.render.x * px)]; break; } }
  for (let x = Math.round(sil.originX + xa * px); x <= Math.round(sil.originX + xb * px); x++) {
    let n = 0; for (let y = 0; y < H; y++) if (label[y * W + x] === comp && comp) n++;
    if (n < neck) { neck = n; neckX = (x - sil.originX) / px; }
  }
  const lab = (sx, sy) => label[Math.round(sil.originY + sy * px) * W + Math.round(sil.originX + sx * px)] || 0;
  const un = diag.shapes[branch === 'pay' ? 0 : 1], pr = diag.shapes[branch === 'pay' ? 1 : 0];
  const unrelatedSeparate = lab(un.render.x, un.render.y) !== 0 && lab(un.render.x, un.render.y) !== lab(pr.render.x, pr.render.y) && lab(un.render.x, un.render.y) !== lab(B.render.x, B.render.y);
  return { ms, branch, direction, unrelatedSeparate, major: major.length, comps: major.map(toD), neckPx: neck === Infinity ? null : +(neck / px).toFixed(1), neckAtX: neckX == null ? null : +neckX.toFixed(1),
    tension: +diag.tension.toFixed(1), unionK: +diag.unionK.toFixed(1), saddle: +diag.saddleDistance.toFixed(1), pairConnected: diag.pairConnected, recoil: diag.recoilCount, childW: +diag.shapes[2].w.toFixed(1),
    shapes: diag.shapes.map(s => [+s.x.toFixed(1), +s.w.toFixed(1)]) };
};
