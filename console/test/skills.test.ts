// Every a2ui example in the skills is what agents copy, so each must pass the console's own validator.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitParts } from '../shared/a2ui';

const skills = join(__dirname, '..', '..', '.agents', 'skills');
const examples = readdirSync(skills).flatMap(dir => {
  let text = '';
  try { text = readFileSync(join(skills, dir, 'SKILL.md'), 'utf8'); } catch { return []; }
  return [...text.matchAll(/```a2ui\n[\s\S]*?```/g)].map((m, i) => ({ where: `${dir} #${i + 1}`, text: m[0] }));
});

describe('skill a2ui examples', () => {
  it('there are examples, and no skill still emits mama-card', () => {
    expect(examples.length).toBeGreaterThan(15);
    for (const dir of readdirSync(skills)) {
      let text = '';
      try { text = readFileSync(join(skills, dir, 'SKILL.md'), 'utf8'); } catch { continue; }
      expect(text, dir).not.toMatch(/```mama-card/);
    }
  });
  it.each(examples)('$where validates cleanly', ({ text }) => {
    const parts = splitParts(text);
    expect(parts.map(p => p.kind)).toEqual(['surface']);
    expect((parts[0] as any).issues).toEqual([]);
  });
});
