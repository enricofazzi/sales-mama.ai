const { chromium } = require('/Users/praveengovindaraj/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'clips'); fs.mkdirSync(OUT, { recursive: true });
const U = 'http://localhost:4173';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function record(p, name, fn) {
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await p.context().newCDPSession(p); const frames = []; let n = 0; const start = Date.now();
  cdp.on('Page.screencastFrame', f => { const file = `f${String(n++).padStart(5, '0')}.jpg`; fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64')); frames.push({ t: (Date.now() - start) / 1000, file }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88 });
  await fn(); await wait(300); await cdp.send('Page.stopScreencast');
  fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ duration: (Date.now() - start) / 1000, frames }));
  console.log(name, frames.length, 'frames');
}
const still = (p, n) => p.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 92 });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await record(p, 'first-open', async () => { await p.goto(U + '/', { waitUntil: 'networkidle' }); await wait(3500); });
  await still(p, 'fresh-today');
  await record(p, 'first-tour', async () => {
    await p.click('nav >> text=Chat'); await wait(1600);
    await p.click('textarea'); await p.keyboard.type('/'); await wait(1400); await p.keyboard.press('Escape'); await wait(400);
    await p.click('nav >> text=Calendar'); await wait(1800);
    await p.click('nav >> text=Book'); await wait(1600);
  });
  await p.goto(U + '/chat', { waitUntil: 'networkidle' }); await wait(1200); await still(p, 'fresh-chat');
  await p.goto(U + '/calendar', { waitUntil: 'networkidle' }); await wait(1200); await still(p, 'fresh-calendar');
  await p.goto(U + '/book', { waitUntil: 'networkidle' }); await wait(1200); await still(p, 'fresh-book');
  await b.close();
})();
