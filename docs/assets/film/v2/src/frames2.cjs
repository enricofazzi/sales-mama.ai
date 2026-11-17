// node frames2.cjs <page.html> <outdir> all|range a b|at t1 t2 ...
const { chromium } = require('/Users/praveengovindaraj/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [page_, out, mode, ...rest] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('pageerror', String(e)));
  await p.goto('file://' + page_, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.evaluate(() => window.READY);
  const dur = await p.evaluate(() => window.DURATION), FPS = 30;
  let list, n0 = 0;
  if (mode === 'all') list = Array.from({ length: Math.ceil(dur * FPS) }, (_, i) => i);
  else if (mode === 'range') { const [a, c] = rest.map(Number); n0 = a; list = Array.from({ length: Math.min(c, Math.ceil(dur * FPS)) - a }, (_, i) => a + i); }
  else list = rest.map(t => Math.round(Number(t) * FPS));
  const t0 = Date.now(); let k = 0;
  for (const f of list) {
    const name = mode === 'at' ? `t${(f / FPS).toFixed(1)}.jpg` : `f${String(f).padStart(5, '0')}.jpg`;
    if (mode !== 'at' && fs.existsSync(`${out}/${name}`) && fs.statSync(`${out}/${name}`).size > 1000) continue;
    for (let k = 0; ; k++) {
      try { await p.evaluate(x => window.render(x), f / FPS); await p.screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 92, timeout: 60000 }); break; }
      catch (e) { if (k >= 3) throw e; console.log('retry', f, e.message.slice(0, 80)); }
    }
    if (++k % 300 === 0) console.log(out, k, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  console.log('done', k, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's', 'duration', dur);
  await b.close();
})();
