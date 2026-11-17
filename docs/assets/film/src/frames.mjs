import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [page_, out, mode, ...times] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await p.goto('file://' + page_, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
const dur = await p.evaluate(() => window.DURATION);
const FPS = 30;
let list = mode === 'all' ? Array.from({ length: Math.ceil(dur * FPS) }, (_, i) => i / FPS) : times.map(Number);
let n = 0;
if (mode === 'range') { const [a, b] = times.map(Number); n = a; list = Array.from({ length: b - a }, (_, i) => (a + i) / FPS); } const t0 = Date.now();
for (const t of list) {
  await p.evaluate(x => window.render(x), t);
  await p.screenshot({ path: `${out}/f${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
  n++;
  if (mode === 'all' && n % 300 === 0) console.log(n, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
console.log('done', n, 'frames, duration', dur);
await b.close();
