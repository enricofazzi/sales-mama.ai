// Record the Sales Harness Leaderboard (local static build = the published Space) as stills and clips.
// Usage: node rec-bench.cjs   (expects the site served at http://localhost:4300)
const { chromium } = require('/Users/praveengovindaraj/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'clips'); fs.mkdirSync(OUT, { recursive: true });
const SITE = 'http://localhost:4300/';
const W = 1440, H = 900, DPR = 2;
const wait = ms => new Promise(r => setTimeout(r, ms));

async function page(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, colorScheme: opts.dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('pageerror', String(e).slice(0, 200)));
  return p;
}
async function record(p, name, fn) {
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await p.context().newCDPSession(p);
  const frames = []; let n = 0; const start = Date.now();
  cdp.on('Page.screencastFrame', async f => {
    const t = (Date.now() - start) / 1000, file = `f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64')); frames.push({ t, file });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1, maxWidth: 2880, maxHeight: 1800 });
  await fn(); await wait(300);
  await cdp.send('Page.stopScreencast');
  const dur = (Date.now() - start) / 1000;
  fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ duration: dur, frames }));
  console.log(name, frames.length, 'frames', dur.toFixed(1) + 's');
}
async function still(p, name) { await p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 92 }); console.log('still', name); }
async function go(p, url, ms = 1200) { await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await wait(ms); }
async function smoothScroll(p, to, ms) {
  await p.evaluate(async ([to, ms]) => {
    const from = scrollY, t0 = performance.now();
    await new Promise(res => { const step = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      scrollTo(0, from + (to - from) * e); k < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
  }, [to, ms]);
}
const tabTop = p => p.evaluate(() => document.querySelector('#tablist').getBoundingClientRect().top + scrollY - 12);

(async () => {
  const b = await chromium.launch();
  const p = await page(b);
  // ---- stills, light
  await go(p, SITE); await still(p, 'lb-hero');
  const tt = await tabTop(p);
  for (const k of ['leaderboard', 'tracks', 'trust', 'cost', 'method', 'submit', 'refs']) {
    await go(p, SITE + '#' + k, 900); await p.evaluate(y => scrollTo(0, y), tt); await wait(400); await still(p, 'lb-' + k);
  }
  // deeper scrolls inside long panels
  for (const [k, dy, name] of [['tracks', 820, 'lb-tracks-2'], ['trust', 700, 'lb-trust-2'], ['method', 700, 'lb-method-2'], ['method', 1500, 'lb-method-3'],
                               ['method', 2300, 'lb-method-4'], ['submit', 650, 'lb-submit-2'], ['refs', 650, 'lb-refs-2'], ['refs', 1400, 'lb-refs-3']]) {
    await go(p, SITE + '#' + k, 700); await p.evaluate(y => scrollTo(0, y), tt + dy); await wait(400); await still(p, name);
  }
  // submission checker with the example JSON
  await go(p, SITE + '#submit', 900);
  await p.evaluate(() => { const ta = document.querySelector('#subjson'); ta.scrollIntoView({ block: 'center' }); });
  await wait(300);
  await record(p, 'lb-check', async () => {
    await wait(700);
    await p.click('#check'); await wait(1600);
    await p.evaluate(() => document.querySelector('#checkout').scrollIntoView({ block: 'center', behavior: 'smooth' })); await wait(2200);
  });
  await still(p, 'lb-check-end');
  // clips: scroll the leaderboard, then a tab tour
  await go(p, SITE);
  await record(p, 'lb-scroll', async () => { await wait(900); await smoothScroll(p, tt, 2600); await wait(1500); });
  await go(p, SITE); await p.evaluate(y => scrollTo(0, y), tt); await wait(500);
  await record(p, 'lb-tabs', async () => {
    for (const k of ['leaderboard', 'tracks', 'trust', 'cost', 'method', 'submit', 'refs']) { await p.click('#tab-' + k); await wait(1150); }
  });
  await p.close();
  // ---- dark
  const d = await page(b, { dark: true });
  await go(d, SITE); await still(d, 'lb-hero-dark');
  await go(d, SITE + '#tracks', 900); await d.evaluate(y => scrollTo(0, y), tt); await wait(400); await still(d, 'lb-tracks-dark');
  await d.close();
  // ---- the live Hugging Face pages
  for (const [url, name] of [['https://huggingface.co/datasets/praveengovi/sales-harness-bench', 'hf-dataset'],
                             ['https://huggingface.co/spaces/praveengovi/Sales-Harness-Leaderboard', 'hf-space']]) {
    const q = await page(b);
    try { await q.goto(url, { waitUntil: 'networkidle', timeout: 45000 }); await wait(4000); await still(q, name);
          if (name === 'hf-dataset') { await q.evaluate(() => scrollTo(0, 700)); await wait(800); await still(q, name + '-2'); } }
    catch (e) { console.log('skip', name, e.message.slice(0, 120)); }
    await q.close();
  }
  await b.close();
})();
