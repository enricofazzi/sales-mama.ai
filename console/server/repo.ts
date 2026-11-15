// Read-only access to the repo: who the user is, the bento rail, and source chips.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { bookFromJson, teamFromJson } from '../shared/book';
import { dataRefAllowed } from '../shared/a2ui';
import { sendWindow, type MarketWindow } from '../shared/window';
import type { Me, Rail } from '../shared/protocol';

/** Folders a source chip may open. Everything else (e.g. .env, .git) is refused. */
const READABLE = ['wiki/', 'raw/', 'knowledge/', 'log/', 'reps/', 'templates/', 'docs/',
  'company-check/reports/', 'company-check/evidence/', 'company-check/leads/', 'company-check/README.md']; // never company-check/data/
const MAX_BYTES = 256 * 1024;

export function findRepoRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'knowledge'))) return dir;
    const up = resolve(dir, '..');
    if (up === dir) throw new Error(`Not inside the Sales Mama repo: ${start}`);
    dir = up;
  }
}

function frontmatter(text: string): Record<string, any> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  try { return parseYaml(m[1]) ?? {}; } catch { return {}; }
}

export function currentUser(root: string): { email: string; me: Me | null } {
  let email = process.env.MAMA_USER_EMAIL ?? '';
  if (!email) {
    try { email = execFileSync('git', ['config', 'user.email'], { cwd: root, encoding: 'utf8' }).trim(); } catch { /* unset */ }
  }
  const dir = join(root, 'reps');
  if (!email || !existsSync(dir)) return { email, me: null };
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const meta = frontmatter(readFileSync(join(dir, f), 'utf8'));
    if (String(meta.email ?? '').toLowerCase() === email.toLowerCase()) {
      return {
        email,
        me: {
          id: String(meta.id ?? f.replace(/\.md$/, '')), name: String(meta.name ?? ''), email,
          role: String(meta.role ?? 'rep'), markets: (meta.markets ?? []).map(String),
        },
      };
    }
  }
  return { email, me: null };
}

export function readRail(root: string, now = new Date()): Rail {
  const { email, me } = currentUser(root);
  if (!me) {
    return {
      me: null, book: null, team: null, windows: [], bookPath: null,
      problem: email ? `No rep profile for ${email}. Run /mama-setup.` : 'git user.email is not set. Run /mama-setup.',
    };
  }
  const bookPath = `wiki/books/${me.id}.md`;
  const read = (p: string) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : null);
  const json = (p: string) => { try { const t = read(p); return t ? JSON.parse(t) : null; } catch { return null; } };
  const bookJson = json(`wiki/books/${me.id}.json`);
  const teamJson = me.role === 'manager' ? json('wiki/books/team.json') : null;
  let windows: Rail['windows'] = [];
  try {
    const markets = parseYaml(read('knowledge/markets.yaml') ?? '')?.markets ?? {};
    windows = me.markets.filter(m => markets[m]).map(m => sendWindow(m, markets[m] as MarketWindow, now));
  } catch { /* leave the tile out */ }
  return {
    me, bookPath, windows,
    book: bookJson ? bookFromJson(bookJson) : null,
    team: teamJson ? teamFromJson(teamJson) : null,
    problem: bookJson ? undefined : `wiki/books/${me.id}.json isn't built yet. It appears after the next session start or sync.`,
  };
}

/** Resolve a repo-relative path inside `allowed` folders, symlinks included. null when not allowed. */
function safeFile(root: string, rel: string, allowed: string[]): { clean: string; real: string } | null {
  const clean = normalize(rel.replace(/\\/g, '/').replace(/^\/+/, '').replace(/#.*$/, '')).split(sep).join('/');
  if (clean.split('/').includes('..') || !allowed.some(p => clean.startsWith(p))) return null;
  const full = resolve(root, clean);
  if (!existsSync(full)) return null;
  const real = realpathSync(full);
  const realRoot = realpathSync(root) + sep;
  // A symlink must land inside an allowed folder too (e.g. not wiki/x.md → .env).
  if (!real.startsWith(realRoot) || !allowed.some(p => real.slice(realRoot.length).split(sep).join('/').startsWith(p))) return null;
  return statSync(real).isFile() ? { clean, real } : null;
}

/** Read one repo file for a source chip. Returns null when the path is not allowed. */
export function readSource(root: string, rel: string): { path: string; text: string; truncated: boolean } | null {
  const f = safeFile(root, rel, READABLE);
  if (!f) return null;
  const buf = readFileSync(f.real);
  return { path: f.clean, text: buf.subarray(0, MAX_BYTES).toString('utf8'), truncated: buf.length > MAX_BYTES };
}

const MAX_DATA_BYTES = 4 * 1024 * 1024;

/** A surface's dataRef: a script's JSON output, read-only, inside the data folders (ADR-0009). */
export function readData(root: string, rel: string): { ok: true; value: unknown } | { ok: false; status: number; error: string } {
  if (!dataRefAllowed(rel)) return { ok: false, status: 404, error: 'Not a data file the console may read.' };
  const f = safeFile(root, rel, READABLE);
  if (!f) return { ok: false, status: 404, error: `${rel} not found. Run the script that writes it first.` };
  if (statSync(f.real).size > MAX_DATA_BYTES) return { ok: false, status: 413, error: `${rel} is over 4 MB.` };
  try { return { ok: true, value: JSON.parse(readFileSync(f.real, 'utf8')) }; }
  catch (e) { return { ok: false, status: 422, error: `${rel} is not valid JSON: ${(e as Error).message}` }; }
}
