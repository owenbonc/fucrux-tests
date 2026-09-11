// Verifies the committed screenplay against the format and story criteria.
// Everything here reads the real files on disk; nothing is stubbed.
//
//   node --test "script/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'script', 'the-long-cold-tow.fountain');

const source = readFileSync(SCRIPT_PATH, 'utf8').replace(/\r\n/g, '\n');
const readme = readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').replace(/\r\n/g, '\n');

// --- Fountain parsing -------------------------------------------------------

const SCENE_HEADING = /^(INT\.\/EXT\.|INT\/EXT\.|I\/E\.|INT\.|EXT\.|EST\.)\s+\S/;
const TRANSITION = /^(FADE IN:|FADE OUT\.|FADE TO BLACK\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:|THE END)$/;
// A character cue is an all-caps name, optionally followed by an extension such
// as (V.O.), (O.S.) or (CONT'D).
const CHARACTER_CUE = /^([A-Z][A-Z0-9 .'\-]*[A-Z0-9.])((?:\s*\([^)]+\))*)$/;
const PARENTHETICAL = /^\(.+\)$/;

/** Split the body (everything after the title page) into blank-line separated blocks. */
function parseBlocks(text) {
  const titleEnd = text.indexOf('\n\n');
  const body = text.slice(titleEnd + 2);
  return body
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').filter((line) => line.trim() !== ''))
    .filter((lines) => lines.length > 0);
}

const blocks = parseBlocks(source).map((lines) => {
  const first = lines[0].trim();
  if (SCENE_HEADING.test(first)) return { kind: 'scene', lines, heading: first };
  if (TRANSITION.test(first)) return { kind: 'transition', lines, text: first };
  const cue = first.match(CHARACTER_CUE);
  if (cue && lines.length > 1) {
    return {
      kind: 'dialogue',
      lines,
      cue: first,
      character: cue[1].replace(/\s*\(CONT'D\)$/, '').trim(),
      speech: lines.slice(1).map((l) => l.trim()).filter((l) => !PARENTHETICAL.test(l)),
    };
  }
  return { kind: 'action', lines, text: lines.join(' ') };
});

/** Group the blocks into scenes: a scene owns every block until the next heading. */
const scenes = [];
for (const block of blocks) {
  if (block.kind === 'scene') {
    scenes.push({ heading: block.heading, blocks: [] });
  } else if (scenes.length > 0) {
    scenes.at(-1).blocks.push(block);
  }
}

const fullText = source.toUpperCase();

const NUMBER_WORDS = new Map([
  ['ten', 10], ['eleven', 11], ['twelve', 12], ['thirteen', 13], ['fourteen', 14],
  ['fifteen', 15], ['sixteen', 16], ['seventeen', 17], ['eighteen', 18],
  ['nineteen', 19], ['twenty', 20],
]);

// --- ac_1: a titled space-adventure screenplay of at least ten scenes -------

test('ac_1: the screenplay exists as committed Fountain text with a title', () => {
  assert.ok(existsSync(SCRIPT_PATH), `missing screenplay at ${SCRIPT_PATH}`);
  const title = source.match(/^Title:\s*(.+)$/m);
  assert.ok(title, 'title page has no Title: field');
  assert.equal(title[1].trim(), 'THE LONG COLD TOW');
});

test('ac_1: it runs at least ten scenes from opening slug line to final fade-out', () => {
  assert.ok(scenes.length >= 10, `expected >= 10 scenes, found ${scenes.length}`);

  assert.equal(blocks[0].kind, 'transition');
  assert.equal(blocks[0].text, 'FADE IN:');
  assert.equal(blocks[1].kind, 'scene', 'the script does not open on a slug line');

  // The README advertises a scene count; a slug line that goes missing silently
  // merges two scenes, so hold the file to the number the README promises.
  const advertised = readme.match(/in (\w+) scenes/);
  assert.ok(advertised, 'README does not state a scene count');
  assert.equal(
    scenes.length,
    NUMBER_WORDS.get(advertised[1].toLowerCase()),
    `README promises ${advertised[1]} scenes, file has ${scenes.length}`,
  );

  const closers = blocks.filter((b) => b.kind === 'transition').map((b) => b.text);
  assert.ok(closers.includes('FADE OUT.'), `script never fades out (saw ${closers.join(', ')})`);
  assert.equal(blocks.at(-1).kind, 'transition');
});

test('ac_1: the setting is a space adventure', () => {
  for (const word of ['STAR', 'SHIP', 'DEEP SPACE', 'CRYO|COLD SLEEP']) {
    assert.match(fullText, new RegExp(word), `no sign of "${word}" in the script`);
  }
  assert.ok(
    scenes.some((s) => /DEEP SPACE|CORMORANT|PERIHELION/.test(s.heading)),
    'no scene is set aboard a ship or in space',
  );
});

// --- ac_2: conventional script formatting throughout ------------------------

test('ac_2: every scene opens with an INT./EXT. slug line', () => {
  assert.ok(scenes.length > 0, 'no scenes parsed');
  for (const scene of scenes) {
    assert.match(scene.heading, SCENE_HEADING, `not a slug line: "${scene.heading}"`);
    assert.equal(scene.heading, scene.heading.toUpperCase(), `slug not capitalised: "${scene.heading}"`);
  }
});

test('ac_2: every line of dialogue is preceded by a capitalised character cue', () => {
  const cast = new Set([
    'ADAIR', 'TESSA', 'RIKU', 'MOTH', 'STRAND', 'SERRIN', 'BEACON VOICE',
  ]);
  const dialogue = blocks.filter((b) => b.kind === 'dialogue');
  assert.ok(dialogue.length >= 40, `expected a substantial script, found ${dialogue.length} speeches`);

  for (const block of dialogue) {
    assert.equal(block.cue, block.cue.toUpperCase(), `cue not capitalised: "${block.cue}"`);
    assert.ok(cast.has(block.character), `unknown or malformed character cue: "${block.cue}"`);
    assert.ok(block.speech.length > 0, `cue "${block.cue}" has no dialogue under it`);
    // An extension, when present, is one of the conventional ones.
    for (const ext of block.lines[0].match(/\([^)]+\)/g) ?? []) {
      assert.match(
        ext,
        /^\((V\.O\.|O\.S\.|O\.C\.|CONT'D|ON SCREEN)\)$/,
        `odd cue extension: ${ext}`,
      );
    }
  }
});

test('ac_2: no dialogue is stranded in an action block by a malformed cue', () => {
  // A speech whose cue lost its capitalisation parses as action, so the
  // give-away is an action block that opens on a bare name and runs on.
  const BARE_NAME = /^[A-Za-z][A-Za-z'\-]*(\s+[A-Za-z][A-Za-z'\-]*){0,3}(\s*\([^)]+\))?$/;
  const action = blocks.filter((b) => b.kind === 'action');
  assert.ok(action.length > 0, 'no action blocks parsed');

  for (const block of action) {
    const first = block.lines[0].trim();
    assert.ok(
      !(block.lines.length > 1 && BARE_NAME.test(first)),
      `action block opens on the bare name "${first}" and runs on; ` +
        'that is a character cue that lost its capitalisation',
    );
    for (const line of block.lines) {
      const trimmed = line.trim();
      assert.ok(
        !(trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length < 40),
        `all-caps line "${trimmed}" sits in an action block; it reads as a cue that lost its dialogue`,
      );
    }
  }
});

test('ac_2: every line in the body is classified as a screenplay element', () => {
  const bodyLines = source.slice(source.indexOf('\n\n') + 2).split('\n').filter((l) => l.trim() !== '');
  const accounted = blocks.reduce((n, b) => n + b.lines.length, 0);
  assert.equal(accounted, bodyLines.length, 'the parser dropped or duplicated lines');

  const speechLines = blocks
    .filter((b) => b.kind === 'dialogue')
    .reduce((n, b) => n + b.speech.length, 0);
  assert.ok(speechLines >= 40, `only ${speechLines} lines of dialogue are under a cue`);
});

test('ac_2: no scene is missing either element', () => {
  for (const scene of scenes) {
    const spoken = scene.blocks.filter((b) => b.kind === 'dialogue');
    assert.ok(spoken.length > 0, `scene "${scene.heading}" contains no cued dialogue`);
    assert.ok(
      scene.blocks.some((b) => b.kind === 'action'),
      `scene "${scene.heading}" contains no action lines`,
    );
  }
});

// --- ac_3: a self-contained arc --------------------------------------------

test('ac_3: the protagonist and supporting cast are named in the text', () => {
  assert.match(source, /CAPTAIN ADAIR NWOSU/, 'the protagonist is never named in full');
  for (const name of ['TESSA VANE', 'RIKU OYELARAN', 'DR. IMOGEN STRAND', 'COMMANDER HALE SERRIN']) {
    assert.ok(source.includes(name), `supporting character "${name}" is never introduced`);
  }
  const speakers = new Set(blocks.filter((b) => b.kind === 'dialogue').map((b) => b.character));
  assert.ok(speakers.size >= 5, `only ${speakers.size} characters ever speak`);
  assert.ok(speakers.has('ADAIR'), 'the protagonist never speaks');
});

test('ac_3: the mission goal is stated in the opening scenes', () => {
  const opening = scenes.slice(0, 2).flatMap((s) => s.blocks).map((b) => b.lines.join(' ')).join(' ');
  assert.match(opening, /four thousand and eleven/i, 'the stakes are never counted out loud');
  assert.match(opening, /hook on|pull them out of the cone/i, 'the mission is never stated');
  assert.match(opening, /thirty-nine hours/i, 'the deadline is never stated');
});

test('ac_3: a crisis is reached before the resolution', () => {
  const crisis = scenes.findIndex((s) =>
    s.blocks.some((b) => /fuel for six|Two out of three|Take four hundred/.test(b.lines.join(' '))),
  );
  assert.ok(crisis > 0, 'no scene poses the central crisis');
  assert.ok(crisis < scenes.length - 1, 'the crisis lands in the final scene, leaving no resolution');
});

test('ac_3: the final scene resolves the arc', () => {
  const finale = scenes.at(-1);
  const text = finale.blocks.map((b) => b.lines.join(' ')).join(' ');
  assert.match(finale.heading, /SLEEP DECK/, `unexpected final scene: "${finale.heading}"`);
  assert.match(text, /Four thousand and twelve|nine years|Crew/i, 'the ending states no outcome');
  const spokenByProtagonist = finale.blocks.filter((b) => b.kind === 'dialogue' && b.character === 'ADAIR');
  assert.ok(spokenByProtagonist.length > 0, 'the protagonist is absent from the resolution');
});

// --- ac_4: reachable from the repository entry point ------------------------

test('ac_4: README links to the script and the linked path resolves', () => {
  const links = [...readme.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(([, label, target]) => ({ label, target }));
  assert.ok(links.length > 0, 'README contains no markdown links');

  const link = links.find(({ target }) => target.replace(/^\.\//, '') === 'script/the-long-cold-tow.fountain');
  assert.ok(link, `README has no link to the screenplay (found: ${links.map((l) => l.target).join(', ')})`);

  const resolved = path.resolve(REPO_ROOT, link.target);
  assert.ok(existsSync(resolved), `README link "${link.target}" does not resolve to a file`);
  assert.equal(resolved, SCRIPT_PATH);
  assert.ok(readme.includes('THE LONG COLD TOW'), 'README never names the screenplay');
});
