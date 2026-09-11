// Acceptance tests for the screenplay in script/.
//
// These run against the real file on disk. Nothing here is stubbed: every
// assertion below reads script/the-atlas-of-severed-hours.txt (and README.md)
// and measures the artifact itself.
//
//   npm test --prefix script
//
// The last two blocks are deliberately separate. "parser" pins the
// classifier's behaviour against tiny literal fixtures so that a broken parser
// cannot silently report a clean script above; "cli" runs the checker as the
// repository's own entry point runs it — as a child process, on real files,
// with the exit code as the verdict — including a known-bad fixture that must
// fail, so a checker that passes everything cannot pass this suite.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  classify,
  cueName,
  looksLikeSlugline,
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
  DIALOGUE_INDENT,
  PARENTHETICAL_INDENT,
  CUE_INDENT,
} from './screenplay-lint.mjs';
import {
  CHARS_PER_INCH,
  LINES_PER_INCH,
  PAGE,
  ELEMENTS,
  TEXT_WIDTH,
  column,
  indentFor,
  widthFor,
  layout,
} from './screenplay-format.mjs';
import { parseFountain, isUpperCase, isSceneHeadingText } from './fountain.mjs';

const at = (indent, text) => ' '.repeat(indent) + text;

const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SCRIPT_DIR = path.join(REPO, 'script');
const SCREENPLAY = path.join(SCRIPT_DIR, 'the-atlas-of-severed-hours.txt');
const README = path.join(REPO, 'README.md');
const LINT = path.join(SCRIPT_DIR, 'tools', 'screenplay-lint.mjs');
const FIXTURES = path.join(SCRIPT_DIR, 'tools', 'fixtures');
const PACKAGE_JSON = path.join(SCRIPT_DIR, 'package.json');

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

  // One file, not a folder of drafts: script/ itself holds a single script.
  // (Fixtures for the checker live a level down, in script/tools/fixtures/.)
  const drafts = readdirSync(SCRIPT_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(txt|fountain|fdx)$/i.test(e.name))
    .map((e) => e.name);
  assert.deepEqual(drafts, ['the-atlas-of-severed-hours.txt']);
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
// ac_2, again, without taking this repository's word for what the format is.
//
// Three things are checked here. First, that the columns the checker enforces
// are arithmetic on the published page geometry rather than numbers somebody
// liked. Second, that the screenplay is byte-identical to the layout those
// margins put its own content at — a generative check, which a permissive
// checker cannot pass. Third, that a second reading of the file by Fountain's
// syntax rules, which never look at indentation, finds exactly the same scene
// headings, cues, parentheticals and dialogue as the column reading does.
// ---------------------------------------------------------------------------

test('format: the columns are the published page geometry, not chosen numbers', () => {
  // 12pt Courier on US Letter: 10 characters to the inch, 6 lines to the inch.
  assert.equal(CHARS_PER_INCH, 10);
  assert.equal(LINES_PER_INCH, 6);
  assert.deepEqual(
    [PAGE.widthInches, PAGE.heightInches],
    [8.5, 11],
    'the page is US Letter'
  );
  assert.deepEqual(
    [PAGE.marginLeftInches, PAGE.marginRightInches, PAGE.marginTopInches, PAGE.marginBottomInches],
    [1.5, 1.0, 1.0, 1.0],
    'the margins are the standard 1.5" left, 1" elsewhere'
  );

  // The text block: 8.5" - 1.5" - 1.0" = 6.0" = 60 characters, and
  // 11" - 1" - 1" = 9" = 54 lines.
  assert.equal(TEXT_WIDTH, 60);
  assert.equal(LINES_PER_PAGE, 54);

  // Each element sits where its published margin puts it, counted from the
  // 1.5" left margin that column zero of a plain-text script stands for.
  assert.equal(column(1.5), 0); // action, scene heading
  assert.equal(column(2.5), 10); // dialogue
  assert.equal(column(3.1), 16); // parenthetical
  assert.equal(column(3.7), 22); // character cue

  assert.equal(ELEMENTS.action.indent, 0);
  assert.equal(ELEMENTS.dialogue.indent, 10);
  assert.equal(ELEMENTS.parenthetical.indent, 16);
  assert.equal(ELEMENTS.character.indent, 22);
  assert.equal(DIALOGUE_INDENT, ELEMENTS.dialogue.indent);
  assert.equal(PARENTHETICAL_INDENT, ELEMENTS.parenthetical.indent);
  assert.equal(CUE_INDENT, ELEMENTS.character.indent);

  // Widths are the same subtraction: dialogue 2.5"-6.0" is 35 characters.
  assert.equal(widthFor('dialogue'), 35);
  assert.equal(widthFor('action'), 60);
  assert.equal(widthFor('character'), 38);
  assert.equal(widthFor('parenthetical'), 24);

  // A transition is set flush to the right margin; the bookends are not.
  assert.equal(indentFor('transition', 'CUT TO:'), TEXT_WIDTH - 'CUT TO:'.length);
  assert.equal(indentFor('transition', 'FADE IN:'), 0);
  assert.equal(indentFor('transition', 'THE END'), 0);
  assert.throws(() => indentFor('haiku', 'x'), TypeError);
});

test('format: the README documents the columns the format module derives', () => {
  // The table in the README is read back and compared, so the page it
  // describes cannot drift from the page the checker enforces.
  const documented = new Map();
  for (const row of readme.matchAll(/^\|\s*([^|]+?)\s*\|\s*([\d.]+)"\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm)) {
    documented.set(row[1], { inches: Number(row[2]), indent: Number(row[3]), width: Number(row[4]) });
  }
  assert.ok(documented.size >= 4, `README documents only ${documented.size} elements`);

  const named = {
    'Scene heading, action': 'action',
    Dialogue: 'dialogue',
    Parenthetical: 'parenthetical',
    'Character cue': 'character',
  };
  for (const [label, element] of Object.entries(named)) {
    const row = documented.get(label);
    assert.ok(row, `README does not document ${label}`);
    assert.equal(row.inches, ELEMENTS[element].leftInches, `${label}: margin`);
    assert.equal(row.indent, column(row.inches), `${label}: column`);
    assert.equal(row.indent, ELEMENTS[element].indent, `${label}: column`);
    assert.equal(row.width, widthFor(element), `${label}: width`);
  }
});

test('format: the screenplay is exactly the layout its own content implies', () => {
  // parseFountain decides what every line *is* without looking at how far it
  // is indented; layout() puts each element where the margins above put it.
  // Equality means every one of the 5,000-odd lines is already at the column
  // the standard gives it — checked by regenerating the file, not by asking
  // whether anything looked wrong.
  const relaid = layout(parseFountain(source));
  if (relaid !== source) {
    const a = relaid.split('\n');
    const b = source.split('\n');
    const first = b.findIndex((line, i) => a[i] !== line);
    assert.fail(
      `line ${first + 1} is not at its standard column:\n` +
        `  is:     ${JSON.stringify(b[first])}\n  should: ${JSON.stringify(a[first])}`
    );
  }
  assert.equal(relaid, source);
});

test('format: the layout check fails when a single line is moved', () => {
  // The generative check above is only worth something if it can fail, so
  // each of these moves one line off its column and must be caught — both by
  // the regenerated layout and by the linter.
  const lines = source.split('\n');
  const move = (predicate, shift) => {
    const i = lines.findIndex(predicate);
    assert.ok(i > 0, 'the screenplay has a line of this kind to move');
    const copy = [...lines];
    copy[i] = shift(copy[i]);
    assert.notEqual(copy[i], lines[i]);
    return { text: copy.join('\n'), line: i + 1 };
  };

  const mutations = [
    move((l) => classify(l).type === 'dialogue', (l) => ' ' + l),
    move((l) => classify(l).type === 'cue', (l) => '   ' + l),
    move((l) => classify(l).type === 'parenthetical', (l) => l.trimStart()),
    move((l) => classify(l).type === 'transition' && /TO:$/.test(l.trim()), (l) => l.trimStart()),
  ];

  for (const mutation of mutations) {
    assert.notEqual(
      layout(parseFountain(mutation.text)),
      mutation.text,
      `moving line ${mutation.line} went unnoticed by the layout check`
    );
    const rules = parseScreenplay(mutation.text).violations.map((v) => v.rule);
    assert.ok(
      rules.includes('indent'),
      `moving line ${mutation.line} went unnoticed by the linter: ${rules}`
    );
  }
});

/** lint's line types, in the vocabulary of a screenplay page. */
const LINT_TO_ELEMENT = {
  slugline: 'scene-heading',
  cue: 'character',
  parenthetical: 'parenthetical',
  dialogue: 'dialogue',
};

test('format: a Fountain reading of the file agrees with the column reading', () => {
  const fountain = parseFountain(source);
  const lines = source.split('\n');
  assert.equal(fountain.length, lines.length);

  const tally = new Map();
  lines.forEach((line, i) => {
    const mine = classify(line).type;
    const theirs = fountain[i].type;
    tally.set(theirs, (tally.get(theirs) ?? 0) + 1);

    if (mine === 'blank' || theirs === 'blank') {
      assert.equal(mine === 'blank', theirs === 'blank', `line ${i + 1}: blank or not?`);
      return;
    }
    const expected = LINT_TO_ELEMENT[mine];
    if (expected) {
      assert.equal(theirs, expected, `line ${i + 1} ${JSON.stringify(line)}: two readings disagree`);
    } else {
      // Action and transition are the two the column reading cannot tell
      // apart from shape alone; Fountain must agree it is one of them.
      assert.ok(
        theirs === 'action' || theirs === 'transition',
        `line ${i + 1} ${JSON.stringify(line)}: read as ${mine} here, ${theirs} by Fountain`
      );
    }
    assert.ok(!fountain[i].forced, `line ${i + 1} relies on a Fountain force character`);
  });

  // And the agreement is over a whole feature, not a handful of lines.
  assert.equal(tally.get('scene-heading'), report.scenes.length);
  assert.ok(tally.get('character') > 500, `only ${tally.get('character')} cues`);
  assert.ok(tally.get('dialogue') > 1000, `only ${tally.get('dialogue')} dialogue lines`);
  assert.ok(tally.get('parenthetical') > 0);
  assert.ok(tally.get('transition') > 0);
});

test('format: the two readings disagree about the malformed fixture', () => {
  // The agreement above means something only if disagreement is possible.
  const bad = readFileSync(path.join(FIXTURES, 'malformed.txt'), 'utf8');
  const fountain = parseFountain(bad);
  const lines = bad.split(/\r?\n/);
  const disagreements = lines.filter((line, i) => {
    const mine = classify(line).type;
    const expected = LINT_TO_ELEMENT[mine];
    if (!expected) return false;
    return fountain[i].type !== expected;
  });
  assert.ok(disagreements.length > 0, 'the two readings agree about a malformed script');
  assert.notEqual(layout(fountain), bad, 'the malformed fixture is already canonical');
});

test('fountain: the syntax rules are Fountain\'s, not this file\'s columns', () => {
  const script = [
    'FADE IN:', // upper case, blank line after: action, by Fountain's rules
    '',
    'INT. A ROOM - NIGHT', // blank before and after, INT prefix
    '',
    'IRIS sits. She does not look up.', // mixed case: action
    '',
    'IRIS (V.O.)', // upper case, dialogue under it
    '(quietly)',
    'The hour was never mine.',
    'It was only ever borrowed.',
    '',
    'CUT TO:', // upper case, ends in TO:, alone between blanks
    '',
    'THE CLOCKS STRIKE.', // upper case, blank after: action, not a cue
    '',
  ].join('\n');

  // Indentation is irrelevant to this reading: the same script laid out at
  // random columns must parse identically.
  const shuffled = script
    .split('\n')
    .map((l, i) => (l === '' ? '' : ' '.repeat((i * 7) % 30) + l))
    .join('\n');

  for (const text of [script, shuffled]) {
    assert.deepEqual(
      parseFountain(text).map((e) => e.type),
      [
        'action',
        'blank',
        'scene-heading',
        'blank',
        'action',
        'blank',
        'character',
        'parenthetical',
        'dialogue',
        'dialogue',
        'blank',
        'transition',
        'blank',
        'action',
        'blank',
      ]
    );
  }

  assert.equal(isUpperCase('IRIS (V.O.)'), true);
  assert.equal(isUpperCase('Iris'), false);
  assert.equal(isUpperCase('02:14'), false, 'a line with no letters is not a cue');
  assert.equal(isSceneHeadingText('EXT. THE PIER - DAWN'), true);
  assert.equal(isSceneHeadingText('I/E. A CAR - NIGHT'), true);
  assert.equal(isSceneHeadingText('INTERIOR MONOLOGUE'), false);

  // Fountain's forcing characters, which the screenplay must not need.
  assert.deepEqual(
    parseFountain(['.A PLACE', '', '@mcclane', 'Yes.', '', '!UPPER ACTION', '', '> RIGHT:'].join('\n'))
      .map((e) => e.type),
    ['scene-heading', 'blank', 'character', 'dialogue', 'blank', 'action', 'blank', 'transition']
  );
});

// ---------------------------------------------------------------------------
// The parser itself, against literal fixtures, so the results above mean
// something.
// ---------------------------------------------------------------------------

test('parser: classify recognises each line type by column', () => {
  assert.equal(classify('').type, 'blank');
  assert.equal(classify('INT. RIG VAULT - NIGHT (HOLLOWAY - YEAR 60 - 18:20)').type, 'slugline');
  assert.equal(classify('CUT TO:').type, 'transition');
  assert.equal(classify(at(TEXT_WIDTH - 'CUT TO:'.length, 'CUT TO:')).type, 'transition');
  assert.equal(classify('FADE OUT.').type, 'transition');
  assert.equal(classify('THE END').type, 'transition');
  assert.equal(classify('She wades between the tables.').type, 'action');
  assert.equal(classify(at(CUE_INDENT, 'IRIS (V.O.)')).type, 'cue');
  assert.equal(classify(at(CUE_INDENT, "MERCY-OF-CINDER (CONT'D)")).type, 'cue');
  assert.equal(classify(at(PARENTHETICAL_INDENT, '(whisper)')).type, 'parenthetical');
  assert.equal(classify(at(DIALOGUE_INDENT, 'It is an hour.')).type, 'dialogue');
  assert.equal(classify(at(7, 'adrift')).type, 'unknown');
  // A cue typed in lower case is still read as a cue, so that the all-caps
  // rule has something to fire on rather than losing it to 'unknown'.
  assert.equal(classify(at(CUE_INDENT, 'lower case')).type, 'cue');
  assert.equal(classify(at(CUE_INDENT, '!!!')).type, 'unknown');
});

test('parser: a well-shaped line at the wrong column is reported as misplaced', () => {
  // Shape and placement are judged separately: these lines are recognisable,
  // so the fault named is where they sit, not what they are.
  const misplaced = [
    at(CUE_INDENT + 3, 'IRIS'),
    at(DIALOGUE_INDENT + 2, 'It is an hour.'),
    at(CUE_INDENT, '(whisper)'),
    'CUT TO:',
  ];
  for (const line of misplaced) {
    const script = ['FADE IN:', '', 'INT. A ROOM - NIGHT (ALPHA - DAY 1 - 09:00)', '', line, ''];
    const rules = parseScreenplay(script.join('\n')).violations.map((v) => v.rule);
    assert.ok(rules.includes('indent'), `no indent violation for ${JSON.stringify(line)}: ${rules}`);
  }

  // And a line that is too wide for its element is reported as too wide.
  const wide = ['FADE IN:', '', 'INT. A ROOM - NIGHT (ALPHA - DAY 1 - 09:00)', '', 'x'.repeat(TEXT_WIDTH + 1), ''];
  const wideRules = parseScreenplay(wide.join('\n')).violations.map((v) => v.rule);
  assert.deepEqual(wideRules, ['line-width']);
});

test('parser: a lower-case character cue is reported as one', () => {
  const bad = [
    'FADE IN:',
    '',
    'INT. A ROOM - NIGHT (ALPHA - DAY 1 - 09:00)',
    '',
    at(CUE_INDENT, 'anna'),
    at(DIALOGUE_INDENT, 'Her cue is not in capitals.'),
    '',
  ].join('\n');
  const rules = parseScreenplay(bad).violations.map((v) => v.rule);
  assert.deepEqual(rules, ['cue-case']);
});

test('parser: a scene heading without INT./EXT. does not pass as action', () => {
  // The near-miss shapes: a dropped period, a dropped prefix, a labelled one.
  assert.equal(looksLikeSlugline('INT A ROOM - NIGHT'), true);
  assert.equal(looksLikeSlugline('A ROOF - NIGHT'), true);
  assert.equal(looksLikeSlugline('EXTERIOR THE PIER - DAWN'), true);
  assert.equal(looksLikeSlugline('THE STOPPED SQUARE - DAY (CINDER - 06:05)'), true);

  // And the shapes a real script keeps at column zero, which must not trip it.
  assert.equal(looksLikeSlugline('INT. A ROOM - NIGHT (ALPHA - DAY 1 - 09:00)'), false);
  assert.equal(looksLikeSlugline('TITLE CARD: THE ATLAS OF SEVERED HOURS'), false);
  assert.equal(looksLikeSlugline('VESPER. CINDER.'), false);
  assert.equal(looksLikeSlugline('THE EVENT.'), false);
  assert.equal(looksLikeSlugline('INTO THE WATER SHE GOES.'), false);
  assert.equal(looksLikeSlugline('She wades between the tables.'), false);

  const bad = ['FADE IN:', '', 'A ROOF THAT FORGOT ITS PREFIX - NIGHT', ''].join('\n');
  const v = parseScreenplay(bad).violations;
  assert.equal(v.length, 2, JSON.stringify(v));
  assert.deepEqual(new Set(v.map((x) => x.rule)), new Set(['scene-heading']));
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
    at(DIALOGUE_INDENT, 'Dialogue with no cue.'),
    '',
    'INT. A ROOM - NIGHT',
    '',
    at(PARENTHETICAL_INDENT, '(orphan parenthetical)'),
    '',
    at(3, 'wrongly indented'),
    '',
    at(CUE_INDENT, 'anna'),
    at(DIALOGUE_INDENT, 'Her cue is not in capitals.'),
    '',
    at(CUE_INDENT, 'BORIS'),
    '',
    'A ROOF THAT FORGOT ITS PREFIX - NIGHT',
    '',
  ].join('\n');
  const rules = new Set(parseScreenplay(bad).violations.map((v) => v.rule));
  assert.ok(rules.has('scene-heading'));
  assert.ok(rules.has('dialogue-cue'));
  assert.ok(rules.has('cue-case'));
  assert.ok(rules.has('cue-block'));
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

// ---------------------------------------------------------------------------
// The checker as an entry point: run the way `npm run lint` runs it, in its
// own process, judged by its exit code. A checker that cannot fail proves
// nothing, so the known-bad fixture is checked first.
// ---------------------------------------------------------------------------

/** Run the lint CLI on a file exactly as the npm script does. */
function runLint(file) {
  const r = spawnSync(process.execPath, [LINT, file], {
    cwd: REPO,
    encoding: 'utf8',
  });
  assert.equal(r.error, undefined, `could not spawn the linter: ${r.error}`);
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

test('cli: the checker fails a deliberately malformed script', () => {
  const bad = path.join(FIXTURES, 'malformed.txt');
  assert.ok(existsSync(bad), 'the known-bad fixture is checked in');

  const r = runLint(bad);
  assert.notEqual(r.status, 0, `the linter passed a malformed script:\n${r.stdout}`);

  // It is not merely exiting non-zero: it names each fault it was given.
  for (const rule of [
    'scene-heading',
    'dialogue-cue',
    'cue-case',
    'cue-block',
    'slugline-label',
    'orphan-parenthetical',
    'indent',
    'line-width',
    'fade-in',
  ]) {
    assert.match(r.stdout, new RegExp(`\\b${rule}:`), `no ${rule} violation reported`);
  }
});

test('cli: the checker passes a deliberately well-formed script', () => {
  const good = path.join(FIXTURES, 'well-formed.txt');
  assert.ok(existsSync(good), 'the known-good fixture is checked in');

  const r = runLint(good);
  assert.equal(r.status, 0, `the linter failed a well-formed script:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /format violations: 0/);
});

test('cli: the checker passes the screenplay itself, with zero violations', () => {
  const r = runLint(SCREENPLAY);
  assert.equal(r.status, 0, `the linter rejected the screenplay:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /format violations: 0/);
  assert.match(r.stdout, /placeholder markers: 0/);

  // The headline numbers a reader would quote come out of this process, not
  // out of the in-process parse above; the two must agree.
  const scenes = Number(r.stdout.match(/scene headings:\s+(\d+)/)[1]);
  const words = Number(r.stdout.match(/words:\s+(\d+)/)[1]);
  assert.equal(scenes, report.scenes.length);
  assert.equal(words, report.words);
  assert.ok(scenes >= 60 && words / WORDS_PER_PAGE >= 90);
});

test('cli: script/package.json runs both checks as its own npm scripts', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));

  // `npm test --prefix script` must reach this very file, so the acceptance
  // checks are the package's own test command rather than a step to remember.
  assert.match(pkg.scripts.test, /^node --test\b/);
  assert.match(path.basename(fileURLToPath(import.meta.url)), /\.test\.mjs$/);

  // `npm run lint --prefix script` must point at a file that exists.
  const [, ...args] = pkg.scripts.lint.split(/\s+/);
  for (const arg of args) {
    if (arg.startsWith('-')) continue;
    assert.ok(
      existsSync(path.join(SCRIPT_DIR, arg)),
      `lint script references a missing path: ${arg}`
    );
  }
  assert.equal(pkg.type, 'module');
});
