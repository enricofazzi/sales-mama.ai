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

const CLIPS = {
  async today(b) {
    const p = await page(b);
    await go(p, MEI + '/calendar', 800);
    await record(p, 'today', async () => { await wait(400); await p.click('nav >> text=Today'); await wait(3800); });
    await still(p, 'today');
    await p.mouse.wheel(0, 700); await wait(900); await still(p, 'today-needs');
  },
  async chatday(b) {
    const p = await page(b);
    await go(p, MEI + '/', 600);
    await record(p, 'chatday', async () => {
      await p.click('nav >> text=Chat'); await wait(500);
      await p.goto(MEI + '/chat?replay=film-day&speed=0.55', { waitUntil: 'commit' });
      await p.waitForSelector('.turn2.running', { timeout: 15000 }).catch(() => console.log('no running turn')); await p.waitForFunction(() => !document.querySelector('.turn2.running'), null, { timeout: 60000, polling: 200 }).catch(() => {});
      await wait(1200);
    });
    await still(p, 'chatday-end');
  },
  async brief(b) {
    const p = await page(b);
    await record(p, 'brief', async () => {
      await p.goto(MEI + '/chat?replay=film-brief&speed=0.6', { waitUntil: 'commit' });
      await wait(1500);
      await p.waitForSelector('.turn2.running', { timeout: 15000 }).catch(() => console.log('no running turn')); await p.waitForFunction(() => !document.querySelector('.turn2.running'), null, { timeout: 60000, polling: 200 }).catch(() => {});
      await wait(1000);
    });
    await still(p, 'brief-end');
  },
  async send(b) {
    const p = await page(b, { time: new Date('2026-11-17T09:05:00+08:00') });
    await record(p, 'send', async () => {
      await p.goto(MEI + '/chat?replay=film-send&speed=0.5', { waitUntil: 'commit' });
      await wait(1500);
      await p.waitForSelector('.turn2.running', { timeout: 15000 }).catch(() => console.log('no running turn')); await p.waitForFunction(() => !document.querySelector('.turn2.running'), null, { timeout: 60000, polling: 200 }).catch(() => {});
      await wait(1000);
    });
    await still(p, 'send-end');
  },
  async weekchat(b) {
    const p = await page(b);
    await record(p, 'weekchat', async () => {
      await p.goto(MEI + '/chat?replay=film-week&speed=0.5', { waitUntil: 'commit' });
      await wait(1500);
      await p.waitForSelector('.turn2.running', { timeout: 15000 }).catch(() => console.log('no running turn')); await p.waitForFunction(() => !document.querySelector('.turn2.running'), null, { timeout: 60000, polling: 200 }).catch(() => {});
      await wait(1000);
    });
    await still(p, 'weekchat-end');
  },
  async manager(b) {
    const p = await page(b);
    await record(p, 'manager', async () => {
      await p.goto(GRACE + '/chat?replay=film-manager&speed=0.5', { waitUntil: 'commit' });
      await wait(1500);
      await p.waitForSelector('.turn2.running', { timeout: 15000 }).catch(() => console.log('no running turn')); await p.waitForFunction(() => !document.querySelector('.turn2.running'), null, { timeout: 60000, polling: 200 }).catch(() => {});
      await wait(1000);
    });
    await still(p, 'manager-end');
  },
  async palette(b) {
    const p = await page(b);
    await go(p, MEI + '/', 1500);
    await record(p, 'palette', async () => {
      await wait(500); await p.keyboard.press('Meta+k'); await wait(700);
      for (const ch of 'harb') { await p.keyboard.type(ch); await wait(160); }
      await wait(900); await p.keyboard.press('ArrowDown'); await wait(500); await p.keyboard.press('ArrowUp'); await wait(900);
    });
    await still(p, 'palette');
  },
  async slash(b) {
    const p = await page(b);
    await go(p, MEI + '/chat', 1200);
    await record(p, 'slash', async () => {
      await p.click('textarea'); await wait(300);
      await p.keyboard.type('/'); await wait(700);
      for (const ch of 'sch') { await p.keyboard.type(ch); await wait(170); }
      await wait(800); await p.keyboard.press('Enter'); await wait(500);
      for (const ch of 'book ') { await p.keyboard.type(ch); await wait(110); }
      await p.keyboard.type('@'); await wait(600);
      for (const ch of 'kes') { await p.keyboard.type(ch); await wait(170); }
      await wait(900); await p.keyboard.press('Enter'); await wait(400);
      for (const ch of ' Tue 2pm') { await p.keyboard.type(ch); await wait(90); }
      await wait(1000);
    });
    await still(p, 'slash');
  },
  async calendar(b) {
    const p = await page(b);
    await go(p, MEI + '/calendar?view=week&d=2026-11-16', 1500);
    await still(p, 'cal-week');
    await record(p, 'calendar', async () => {
      await wait(500);
      await p.click('.cal-body >> text=Harbourli', { timeout: 5000 }).catch(e => console.log('click', e.message));
      await wait(1800);
      await p.keyboard.press('Escape'); await wait(500);
      const ev = p.locator('.cal-body >> text=Qu').first(); const bb = await ev.boundingBox();
      if (bb) {
        await p.mouse.move(bb.x + bb.width / 2, bb.y + 8); await p.mouse.down(); await wait(150);
        for (let i = 1; i <= 24; i++) { await p.mouse.move(bb.x + bb.width / 2, bb.y + 8 + i * 8.6); await wait(30); }
        await p.mouse.up();
      }
      await wait(1800);
    });
    await still(p, 'cal-drag');
    await p.keyboard.press('Escape');
    await p.click('.cal-body >> text=Busy').catch(() => {}); await wait(900); await still(p, 'cal-busy');
    await p.keyboard.press('Escape'); await p.keyboard.press('m'); await wait(1200); await still(p, 'cal-month');
    await p.keyboard.press('d'); await wait(1200); await still(p, 'cal-day');
  },
  async team(b) {
    const p = await page(b);
    await go(p, GRACE + '/calendar?view=team&d=2026-11-16', 1500); await still(p, 'cal-team');
    await go(p, GRACE + '/', 1500); await still(p, 'mgr-today');
    await go(p, GRACE + '/book', 1500); await still(p, 'mgr-book');
  },
  async reports(b) {
    const p = await page(b, { who: 'grace' });
    await go(p, GRACE + '/reports', 1200);
    await still(p, 'reports');
    await record(p, 'reports', async () => {
      await wait(400);
      await p.click('.rp-card >> text=Weekly', { timeout: 5000 }).catch(e => console.log('rp', e.message)); await wait(2600);
    });
    await still(p, 'canvas-weekly');
    await p.goto(GRACE + '/reports', { waitUntil: 'networkidle' }); await wait(800);
    await p.click('.rp-card >> text=llocation', { timeout: 5000 }).catch(e => console.log('rp', e.message)); await wait(2000); await still(p, 'canvas-alloc');
    await p.goto(GRACE + '/reports', { waitUntil: 'networkidle' }); await wait(800);
    await p.click('.rp-card >> text=linic', { timeout: 5000 }).catch(e => console.log('rp', e.message)); await wait(2400); await still(p, 'canvas-insights');
  },
  async book(b) {
    const p = await page(b);
    await go(p, MEI + '/book', 1500); await still(p, 'book');
  },
  async dark(b) {
    const p = await page(b, { theme: 'light' });
    await go(p, MEI + '/', 1800);
    await record(p, 'dark', async () => { await wait(500); await p.click('button[aria-label*="Switch theme"]').catch(e => console.log('dark', e.message)); await wait(1800); });
    await still(p, 'today-dark');
    await p.close(); const q = await page(b, { theme: 'dark' }); const p2 = q;
    await go(p2, MEI + '/calendar?view=week&d=2026-11-16', 1500); await still(p2, 'cal-week-dark');
    await go(p2, MEI + '/chat?replay=film-day', 2500); await still(p2, 'chat-dark');
    await go(p2, GRACE + '/reports', 1000); await p2.click('.rp-card >> text=linic'); await wait(2400); await still(p2, 'canvas-insights-dark');
    return;
    await go(p, MEI + '/calendar?view=week&d=2026-11-16', 1500); await still(p, 'cal-week-dark');
    await go(p, MEI + '/chat?replay=film-day', 2500); await still(p, 'chat-dark');
  },
  async phone(b) {
    const p = await page(b, { w: 390, h: 844, dpr: 3 });
    await go(p, MEI + '/', 1800); await still(p, 'phone-today');
    await go(p, MEI + '/chat?replay=film-brief', 2500); await still(p, 'phone-brief');
    await go(p, MEI + '/calendar?view=day&d=2026-11-17', 1800); await still(p, 'phone-cal');
  },
  async company(b) {
    const p = await page(b);
    await go(p, MEI + '/chat?result=company-check/reports/2026-11-05-197200078R.cards.md&ask=' + encodeURIComponent('/company-check 197200078R'), 2500);
    await p.evaluate(() => document.querySelectorAll('*').forEach(e => { if (e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY.match(/auto|scroll/)) e.scrollTop = 0; })); await wait(600);
    await still(p, 'company');
  },
};
(async () => {
  const b = await chromium.launch();
  const which = process.argv[2] === 'all' ? Object.keys(CLIPS) : process.argv.slice(2);
  for (const k of which) { try { await CLIPS[k](b); } catch (e) { console.log('FAIL', k, e.message.slice(0, 300)); } }
  await b.close();
})();
