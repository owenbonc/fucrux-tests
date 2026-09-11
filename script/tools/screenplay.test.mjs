// Acceptance tests for the screenplay in script/.
//
// These run against the real file on disk. Nothing here is stubbed: every
// assertion below reads script/the-atlas-of-severed-hours.txt (and README.md)
// and measures the artifact itself.
//
//   node --test script/tools/
//
// The last block ("parser") is the exception, and is deliberately separate:
// it pins the classifier's behaviour against tiny literal fixtures so that a
// broken parser cannot silently report a clean script above.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  classify,
  cueName,
  parseSluglineLabel,
  compareTime,
  parseScreenplay,
  universeCounts,
  characterUniverses,
  chronologyInversions,
  placeholders,
  PLACEHOLDER_RE,
  LINES_PER_PAGE,
  WORDS_PER_PAGE,
} from './screenplay-lint.mjs';

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SCREENPLAY = path.join(REPO, 'script', 'the-atlas-of-severed-hours.txt');
const README = path.join(REPO, 'README.md');

const source = readFileSync(SCREENPLAY, 'utf8');
const report = parseScreenplay(source);
const readme = readFileSync(README, 'utf8');

/** Every link target in a markdown document: inline, reference and bare href. */
function markdownLinkTargets(markdown) {
  const targets = [];
  for (const m of markdown.matchAll(/\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)[^)]*\)/g)) {
    targets.push(m[1].replace(/^<|>$/g, ''));
  }
  for (const m of markdown.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)) {
    targets.push(m[1]);
  }
  for (const m of markdown.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    targets.push(m[1]);
  }
  return targets;
}

/** Resolve a markdown link target to an absolute path, or null if it is external. */
function resolveTarget(target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null; // http:, mailto: etc.
  const withoutFragment = target.split('#')[0].split('?')[0];
  if (!withoutFragment) return null;
  return path.resolve(path.dirname(README), decodeURIComponent(withoutFragment));
}

// ---------------------------------------------------------------------------
// ac_1  A single complete screenplay, no placeholders, linked from the README.
// ---------------------------------------------------------------------------

test('ac_1: exactly one screenplay file lives under script/', () => {
  assert.ok(statSync(SCREENPLAY).isFile(), 'the screenplay is a file');
  assert.ok(report.words > 0, 'the screenplay is not empty');
});

test('ac_1: the screenplay opens with FADE IN:', () => {
  assert.equal(report.firstLine, 'FADE IN:');
});

test('ac_1: the screenplay closes with FADE OUT. and THE END', () => {
  assert.equal(report.lastContentLine, 'THE END');
  const tail = report.lines.filter((l) => l.trim() !== '').slice(-2);
  assert.deepEqual(tail, ['FADE OUT.', 'THE END']);
});

test('ac_1: the screenplay contains no placeholder or bracketed markers', () => {
  const hits = placeholders(report.lines);
  assert.deepEqual(
    hits.map((h) => `${h.line}: ${h.text.trim()}`),
    [],
    'expected no TODO/TBD/FIXME/bracketed placeholder lines'
  );
});

test('ac_1: README links to the screenplay and the link resolves to it', () => {
  const resolved = markdownLinkTargets(readme)
    .map(resolveTarget)
    .filter((p) => p !== null);

  assert.ok(resolved.length > 0, 'README contains at least one relative link');

  const hits = resolved.filter((p) => p === SCREENPLAY);
  assert.ok(
    hits.length > 0,
    `README has no link resolving to ${SCREENPLAY}; saw ${JSON.stringify(resolved)}`
  );
  for (const p of resolved) {
    assert.ok(existsSync(p), `README link target does not exist on disk: ${p}`);
  }
});

// ---------------------------------------------------------------------------
// ac_2  Standard screenplay format throughout.
// ---------------------------------------------------------------------------

test('ac_2: every scene begins with an INT./EXT. slugline', () => {
  // The parser raises 'scene-heading' for any action, cue or dialogue that
  // appears before a slugline has opened a scene.
  const stray = report.violations.filter((v) => v.rule === 'scene-heading');
  assert.deepEqual(stray, [], 'content appears outside any INT./EXT. scene');

  assert.ok(report.scenes.length > 0);
  for (const scene of report.scenes) {
    assert.match(scene.heading, /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s+\S/);
  }

  // Cross-check independently of the parser: the set of scene headings equals
  // the set of column-zero lines starting with an INT./EXT. prefix.
  const rawHeadings = report.lines.filter((l) => /^(INT\.|EXT\.|I\/E\.)/.test(l));
  assert.equal(rawHeadings.length, report.scenes.length);
});

test('ac_2: every dialogue block is introduced by an all-caps character cue', () => {
  const orphans = report.violations.filter((v) => v.rule === 'dialogue-cue');
  assert.deepEqual(orphans, [], 'dialogue appears without a character cue');

  const badCase = report.violations.filter((v) => v.rule === 'cue-case');
  assert.deepEqual(badCase, [], 'a character cue is not in all caps');

  // Walk the file directly: every dialogue line must be preceded, since the
  // last blank line, by a cue line, and that cue must be all caps.
  let cue = null;
  let blocks = 0;
  report.lines.forEach((raw, i) => {
    const node = classify(raw);
    if (node.type === 'blank') cue = null;
    else if (node.type === 'cue') {
      assert.equal(node.text, node.text.toUpperCase(), `line ${i + 1} cue not all caps`);
      cue = node.text;
      blocks++;
    } else if (node.type === 'dialogue') {
      assert.ok(cue, `line ${i + 1}: dialogue with no cue above it`);
    } else if (node.type !== 'parenthetical') cue = null;
  });
  assert.ok(blocks > 500, `expected a feature's worth of dialogue blocks, got ${blocks}`);
});

test('ac_2: the format check reports zero violations of any rule', () => {
  assert.deepEqual(
    report.violations.map((v) => `${v.line} ${v.rule}: ${v.message}`),
    []
  );
});

// ---------------------------------------------------------------------------
// ac_3  Feature length.
// ---------------------------------------------------------------------------

test('ac_3: the screenplay is at least 90 formatted pages', () => {
  const byWords = report.words / WORDS_PER_PAGE;
  const byLines = report.lines.length / LINES_PER_PAGE;
  assert.ok(
    byWords >= 90,
    `${report.words} words is ${byWords.toFixed(1)} pages at ${WORDS_PER_PAGE} w/page`
  );
  assert.ok(
    byLines >= 90,
    `${report.lines.length} lines is ${byLines.toFixed(1)} pages at ${LINES_PER_PAGE} l/page`
  );
});

test('ac_3: the screenplay contains at least 60 distinct scene headings', () => {
  assert.ok(report.scenes.length >= 60, `only ${report.scenes.length} scene headings`);
  const distinct = new Set(report.scenes.map((s) => s.heading));
  assert.ok(distinct.size >= 60, `only ${distinct.size} distinct scene headings`);
});

// ---------------------------------------------------------------------------
// ac_4  Interlocking, non-linear, multiversal structure.
// ---------------------------------------------------------------------------

test('ac_4: at least three named universes each appear in 3+ scene headings', () => {
  const counts = universeCounts(report.scenes);
  const qualifying = [...counts.entries()].filter(([, n]) => n >= 3);
  assert.ok(
    qualifying.length >= 3,
    `universes with 3+ scenes: ${JSON.stringify(Object.fromEntries(counts))}`
  );
  // Every scene declares which universe and clock it belongs to.
  for (const scene of report.scenes) {
    assert.ok(scene.universe, `scene at line ${scene.line} has no universe label`);
    assert.ok(scene.time.length > 0, `scene at line ${scene.line} has no clock in its label`);
  }
});

test('ac_4: at least one character appears in two or more universes', () => {
  const chars = characterUniverses(report.scenes);
  const crossers = [...chars.entries()].filter(([, set]) => set.size >= 2);
  assert.ok(crossers.length >= 1, 'no character speaks in more than one universe');

  const iris = chars.get('IRIS');
  assert.ok(iris, 'IRIS speaks somewhere');
  assert.ok(iris.size >= 3, `IRIS speaks in ${[...iris].join(', ')}`);
});

test('ac_4: the scene order is non-chronological by the script\'s own labels', () => {
  const inversions = chronologyInversions(report.scenes);
  assert.ok(
    inversions.length >= 3,
    'the script never presents a scene earlier than one already shown'
  );

  // The jumping back is spread across worlds, not one flashback in one strand.
  const universes = new Set(inversions.map((i) => i.universe));
  assert.ok(
    universes.size >= 2,
    `non-chronology confined to ${[...universes].join(', ')}`
  );

  // And the cutting genuinely crosses realities scene to scene.
  let crossings = 0;
  for (let i = 1; i < report.scenes.length; i++) {
    if (report.scenes[i].universe !== report.scenes[i - 1].universe) crossings++;
  }
  assert.ok(
    crossings > report.scenes.length / 2,
    `only ${crossings} of ${report.scenes.length - 1} cuts change universe`
  );
});

test('ac_4: no universe is told as one unbroken run of consecutive scenes', () => {
  const runs = new Map();
  let previous = null;
  for (const scene of report.scenes) {
    if (scene.universe !== previous) runs.set(scene.universe, (runs.get(scene.universe) ?? 0) + 1);
    previous = scene.universe;
  }
  for (const [universe, n] of runs) {
    assert.ok(n >= 3, `${universe} is interleaved in only ${n} separate runs`);
  }
});

// ---------------------------------------------------------------------------
// The parser itself, against literal fixtures, so the results above mean
// something.
// ---------------------------------------------------------------------------

test('parser: classify recognises each line type by column', () => {
  assert.equal(classify('').type, 'blank');
  assert.equal(classify('INT. RIG VAULT - NIGHT (HOLLOWAY - YEAR 60 - 18:20)').type, 'slugline');
  assert.equal(classify('CUT TO:').type, 'transition');
  assert.equal(classify('FADE OUT.').type, 'transition');
  assert.equal(classify('THE END').type, 'transition');
  assert.equal(classify('She wades between the tables.').type, 'action');
  assert.equal(classify(' '.repeat(25) + 'IRIS (V.O.)').type, 'cue');
  assert.equal(classify(' '.repeat(25) + 'MERCY-OF-CINDER (CONT\'D)').type, 'cue');
  assert.equal(classify(' '.repeat(25) + '(whisper)').type, 'parenthetical');
  assert.equal(classify(' '.repeat(20) + 'It is an hour.').type, 'dialogue');
  assert.equal(classify(' '.repeat(7) + 'adrift').type, 'unknown');
  assert.equal(classify(' '.repeat(25) + 'lower case').type, 'unknown');
});

test('parser: cueName strips speech extensions', () => {
  assert.equal(cueName('IRIS'), 'IRIS');
  assert.equal(cueName('IRIS (V.O.)'), 'IRIS');
  assert.equal(cueName("IRIS (V.O.) (CONT'D)"), 'IRIS');
  assert.equal(cueName('MERCY (19)'), 'MERCY');
});

test('parser: parseSluglineLabel reads universe and clock', () => {
  assert.deepEqual(
    parseSluglineLabel('INT. RIG VAULT - NIGHT (HOLLOWAY - YEAR 60 - 18:20)'),
    { universe: 'HOLLOWAY', time: [60, 18, 20], label: 'HOLLOWAY - YEAR 60 - 18:20' }
  );
  assert.equal(parseSluglineLabel('INT. A ROOM - NIGHT'), null);
  assert.equal(compareTime([60, 18, 20], [60, 19, 10]), -1);
  assert.equal(compareTime([4, 2, 14], [1, 9, 30]), 1);
  assert.equal(compareTime([1, 1], [1, 1]), 0);
});

test('parser: a malformed script is reported, not passed', () => {
  const bad = [
    'Action with no scene heading.',
    '',
    ' '.repeat(20) + 'Dialogue with no cue.',
    '',
    'INT. A ROOM - NIGHT',
    '',
    ' '.repeat(25) + '(orphan parenthetical)',
    '',
    ' '.repeat(3) + 'wrongly indented',
    '',
  ].join('\n');
  const rules = new Set(parseScreenplay(bad).violations.map((v) => v.rule));
  assert.ok(rules.has('scene-heading'));
  assert.ok(rules.has('dialogue-cue'));
  assert.ok(rules.has('slugline-label'));
  assert.ok(rules.has('orphan-parenthetical'));
  assert.ok(rules.has('indent'));
  assert.ok(rules.has('fade-in'));
});

test('parser: chronologyInversions is silent on a chronological script', () => {
  const ordered = [
    { universe: 'A', time: [1], label: 'A 1' },
    { universe: 'B', time: [1], label: 'B 1' },
    { universe: 'A', time: [2], label: 'A 2' },
  ];
  assert.deepEqual(chronologyInversions(ordered), []);

  const jumbled = [
    { universe: 'A', time: [4], label: 'A 4' },
    { universe: 'A', time: [1], label: 'A 1' },
  ];
  assert.equal(chronologyInversions(jumbled).length, 1);
});

test('parser: the placeholder pattern catches the usual markers', () => {
  for (const s of ['TODO: fix', 'TBD', 'FIXME later', 'XXX', 'a [PLACEHOLDER] here', '<NAME>']) {
    assert.match(s, PLACEHOLDER_RE, `${s} should read as a placeholder`);
  }
  assert.doesNotMatch('She reaches the far table.', PLACEHOLDER_RE);
});

test('parser: markdown link extraction handles the shapes a README uses', () => {
  const md = [
    '[inline](script/a.txt)',
    '[angle](<script/b.txt>)',
    '[titled](script/c.txt "The Title")',
    '[ref]: script/d.txt',
    '<a href="script/e.txt">html</a>',
    '[external](https://example.com/f.txt)',
  ].join('\n');
  assert.deepEqual(markdownLinkTargets(md), [
    'script/a.txt',
    'script/b.txt',
    'script/c.txt',
    'https://example.com/f.txt',
    'script/d.txt',
    'script/e.txt',
  ]);
  assert.equal(resolveTarget('https://example.com/f.txt'), null);
  assert.equal(resolveTarget('script/a.txt'), path.join(REPO, 'script', 'a.txt'));
});
