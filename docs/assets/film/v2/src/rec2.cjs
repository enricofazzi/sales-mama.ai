// Record UI clips with CDP screencast (real-time CSS + JS), plus stills. Usage: node rec.cjs <clip|all>
const { chromium } = require('/Users/praveengovindaraj/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'clips'); fs.mkdirSync(OUT, { recursive: true });
const MEI = 'http://localhost:4180', GRACE = 'http://localhost:4190';
const T0 = new Date('2026-11-16T08:40:00+08:00');
const W = 1440, H = 900, DPR = 2;
const wait = ms => new Promise(r => setTimeout(r, ms));

async function page(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: opts.w || W, height: opts.h || H }, deviceScaleFactor: opts.dpr || DPR, colorScheme: opts.dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('pageerror', String(e).slice(0, 200)));
  await p.clock.install({ time: opts.time || T0 });
  if (opts.theme) await ctx.addInitScript(t => { try { localStorage.setItem('mama.theme', t); } catch {} }, opts.theme);
  return p;
}
async function record(p, name, fn) {
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await p.context().newCDPSession(p);
  const frames = []; let n = 0; const start = Date.now();
  cdp.on('Page.screencastFrame', async f => {
    const t = (Date.now() - start) / 1000;
    const file = `f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'));
    frames.push({ t, file });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1, maxWidth: 2880, maxHeight: 1800 });
  await fn();
  await wait(300);
  await cdp.send('Page.stopScreencast');
  const dur = (Date.now() - start) / 1000;
  fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ duration: dur, frames }));
  console.log(name, frames.length, 'frames', dur.toFixed(1) + 's', (frames.length / dur).toFixed(1), 'fps');
}
async function still(p, name) { await p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 92 }); console.log('still', name); }
async function go(p, url, ms = 1200) { await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await wait(ms); }


const MEI_ = MEI, GR = GRACE, AR = 'http://localhost:4200';
const R = (name, base, speed, time) => async b => {
  const p = await page(b, time ? { time } : {});
  await record(p, name, async () => {
    await p.goto(base + `/chat?replay=${name}&speed=${speed}`, { waitUntil: 'commit' });
    await p.waitForSelector('.turn2.running', { timeout: 15000 }).catch(() => console.log('no running turn'));
    await p.waitForFunction(() => !document.querySelector('.turn2.running'), null, { timeout: 90000, polling: 200 }).catch(() => {});
    await wait(1200);
  });
  await still(p, name + '-end');
  await p.close();
};
const CLIPS = {
  'ep1-day': R('ep1-day', MEI_, .55), 'ep1-risk': R('ep1-risk', MEI_, .45), 'ep1-brief': R('ep1-brief', MEI_, .5), 'ep1-send': R('ep1-send', MEI_, .45, new Date('2026-11-16T09:05:00+08:00')),
  'ep2-overnight': R('ep2-overnight', MEI_, .45, new Date('2026-11-16T07:55:00+08:00')), 'ep2-hot': R('ep2-hot', MEI_, .45), 'ep2-check': R('ep2-check', MEI_, .5), 'ep2-segment': R('ep2-segment', MEI_, .45), 'ep2-target': R('ep2-target', MEI_, .45),
  'ep3-research': R('ep3-research', MEI_, .5), 'ep3-pitch': R('ep3-pitch', MEI_, .45), 'ep3-draft': R('ep3-draft', MEI_, .45), 'ep3-wa': R('ep3-wa', AR, .45), 'ep3-replies': R('ep3-replies', MEI_, .45),
  'ep4-book': R('ep4-book', MEI_, .45), 'ep4-move': R('ep4-move', MEI_, .45), 'ep4-handover': R('ep4-handover', MEI_, .45, new Date('2026-11-16T16:05:00+08:00')),
  'ep5-allocate': R('ep5-allocate', GR, .45),
  async calfix(b) {
    const p = await page(b);
    await go(p, MEI + '/calendar?view=week&d=2026-11-16', 1500);
    await record(p, 'calfix', async () => {
      await wait(500);
      await p.locator('.cal-body >> text=Harbourlight Foods Pte Ltd').last().click({ timeout: 5000 }).catch(e => console.log('click', e.message));
      await wait(2200); await p.keyboard.press('Escape'); await wait(600);
      await p.locator('.cal-body >> text=Renewal window').first().click({ timeout: 5000 }).catch(e => console.log('click2', e.message));
      await wait(2200);
    });
    await still(p, 'cal-renewal');
  },
  async arun(b) {
    const p = await page(b); await go(p, AR + '/', 1800); await still(p, 'arun-today');
  },
};
(async () => {
  const b = await chromium.launch();
  const which = process.argv[2] === 'all' ? Object.keys(CLIPS) : process.argv.slice(2);
  for (const k of which) { try { await CLIPS[k](b); } catch (e) { console.log('FAIL', k, e.message.slice(0, 300)); } }
  await b.close();
})();
