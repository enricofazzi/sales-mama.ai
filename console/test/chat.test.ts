// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { partition, sourcesOf } from '../src/chat/Turn';
import { followUpsFor } from '../src/chat/followups';
import { fuzzy, tokenAt } from '../src/chat/Composer';
import { splitParts } from '../shared/a2ui';
import type { Item } from '../shared/stream';

const text = (id: string, t: string): Item => ({ kind: 'text', id, text: t, done: true });
const tool = (id: string, name: string, input: Record<string, unknown> = {}): Item => ({ kind: 'tool', id, name, input, status: 'ok' });

describe('turn anatomy', () => {
  it('text before the last tool is narration; text after it is the answer', () => {
    const p = partition([text('a', 'Checking your book.'), tool('t1', 'Read', { file_path: '/repo/wiki/books/p.md' }), text('b', 'Step 2.'),
      tool('t2', 'Bash', { command: 'python3 scripts/find.py' }), text('c', 'You have 3 accounts.')]);
    expect(p.narration.map(n => n.id)).toEqual(['a', 'b']);
    expect(p.answer.map(n => n.id)).toEqual(['c']);
    expect(p.tools).toHaveLength(2);
  });

  it('a turn with no tools is all answer', () => {
    expect(partition([text('a', 'Hello')]).answer).toHaveLength(1);
  });

  it('sources merge surface data, refs, card refs and files read, deduped and in repo folders only', () => {
    const parts = splitParts('```a2ui\n' + JSON.stringify({ surfaceId: 's', dataRef: 'log/weekly/2026-W46.json', refs: ['wiki/books/p.md'],
      components: [{ id: 'root', component: 'Column', children: ['d'] }, { id: 'd', component: 'DraftCard', title: 'x', account: 'a', channel: 'email', body: 'b', passed: [], refs: ['wiki/accounts/a.md', 'wiki/books/p.md'] }] }) + '\n```');
    const tools = [tool('r1', 'Read', { file_path: '/Users/x/sales-mama.ai/wiki/accounts/b.md' }), tool('r2', 'Read', { file_path: '/etc/hosts' })] as any;
    expect(sourcesOf(parts, tools)).toEqual(['log/weekly/2026-W46.json', 'wiki/books/p.md', 'wiki/accounts/a.md', 'wiki/accounts/b.md']);
  });
});

describe('follow-ups', () => {
  const turn = (prompt: string, t: string, running = false) => ({ id: 'x', prompt, text: t, running, turn: {} as any });
  it('collects the answer buttons, never a send, then a default per skill', () => {
    const t = '```a2ui\n' + JSON.stringify({ surfaceId: 's', components: [{ id: 'root', component: 'ActionBar', actions: [
      { label: 'Approve all', prompt: 'approve all' }, { label: 'Send now', prompt: '/mama-send' }] }] }) + '\n```';
    expect(followUpsFor(turn('/mama-manager', t))).toEqual([
      { label: 'Approve all', prompt: 'approve all' }, { label: 'Review the allocation', prompt: '/mama-allocate' }, { label: 'Weekly review', prompt: '/mama-weekly' }]);
  });
  it('nothing while running', () => {
    expect(followUpsFor(turn('/mama-day', 'x', true))).toEqual([]);
  });
});

describe('composer menus', () => {
  it('finds the / token only at the start and the @ token anywhere', () => {
    expect(tokenAt('/mama-d', 7)).toEqual({ kind: '/', query: 'mama-d', start: 0 });
    expect(tokenAt('brief me on @kes', 16)).toEqual({ kind: '@', query: 'kes', start: 12 });
    expect(tokenAt('a/b', 3)).toBeNull();
    expect(tokenAt('hello there', 11)).toBeNull();
  });
  it('fuzzy ranks prefix over substring over subsequence', () => {
    expect(fuzzy('mama', 'mama-day')).toBeGreaterThan(fuzzy('day', 'mama-day'));
    expect(fuzzy('day', 'mama-day')).toBeGreaterThan(fuzzy('mmd', 'mama-day'));
    expect(fuzzy('xyz', 'mama-day')).toBe(0);
  });
});
