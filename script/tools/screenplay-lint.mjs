// Screenplay parser + format checker for the plain-text (Courier-style)
// scripts in script/. No dependencies: node: builtins only.
//
// Layout conventions this file understands, which are the standard
// US spec-script columns expressed in a 12pt Courier monospace grid:
//
//   col 0   scene headings, action, transitions
//   col 20  dialogue            (35 characters wide)
//   col 25  character cues and parentheticals
//
// Run as a CLI for a human-readable report:
//   node script/tools/screenplay-lint.mjs script/the-atlas-of-severed-hours.txt

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const DIALOGUE_INDENT = 20;
export const CUE_INDENT = 25;
export const MAX_LINE_WIDTH = 61; // 61 characters fit a 1.5"/1" margined page
export const LINES_PER_PAGE = 55;
export const WORDS_PER_PAGE = 190;

const SLUGLINE_RE = /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s+\S/;
// Transitions sit at column 0 in this file and are all-caps slugs that either
// end in a colon (FADE IN:, CUT TO:, MATCH CUT TO:) or are one of the
// conventional terminal forms.
const TRANSITION_RE = /^(?:[A-Z0-9 '’.\-\/]+:|FADE OUT\.|FADE TO BLACK\.|THE END)$/;
// A cue is all-caps, may carry a variant suffix (MERCY-OF-CINDER), an age or
// year in parentheses, and the usual extensions: (V.O.), (O.S.), (CONT'D).
const CUE_RE = /^[A-Z][A-Z0-9'’.\-\/ ]*(?: \((?:[A-Z0-9'’.\- ]+|\d+)\))*$/;
// The same shape ignoring case, so a cue typed in lower case is still read as
// a cue and reported as one — rather than disappearing into 'unknown', which
// would leave the "all-caps character cue" rule with nothing to fire on.
const CUE_ANY_CASE_RE = new RegExp(CUE_RE.source.replace(/A-Z/g, 'A-Za-z'), 'i');

// A scene heading that forgot to be one. A column-zero, all-caps line that
// carries a heading's shape — a near-miss INT/EXT prefix, or a "- NIGHT"
// time-of-day tail — but fails SLUGLINE_RE would otherwise be filed as action,
// and a scene opened that way would never be checked at all.
const TIME_OF_DAY =
  'DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|NOON|MIDNIGHT|' +
  'CONTINUOUS|LATER|MOMENTS LATER|SAME|SAME TIME|SUNSET|SUNRISE|NO TIME';
const NEAR_SLUGLINE_PREFIX_RE =
  /^(?:INT|EXT|INTERIOR|EXTERIOR|INT\/EXT|EXT\/INT|I\/E|E\/I)\b/;
const SCENE_TIME_TAIL_RE = new RegExp(`\\s[-–—]\\s(?:${TIME_OF_DAY})\\.?$`);

/**
 * Does this column-zero line read as a scene heading without being a valid
 * one? Used to catch headings that drop the INT./EXT. prefix or its period.
 */
export function looksLikeSlugline(text) {
  if (SLUGLINE_RE.test(text)) return false; // it is a real slugline
  if (/[a-z]/.test(text)) return false; // prose, not a heading
  const bare = text.replace(/\s*\([^()]*\)\s*$/, '').trim();
  if (!bare) return false;
  return NEAR_SLUGLINE_PREFIX_RE.test(bare) || SCENE_TIME_TAIL_RE.test(bare);
}

/** Classify a single raw line of a plain-text screenplay. */
export function classify(line) {
  if (line.trim() === '') return { type: 'blank' };
  const indent = line.length - line.trimStart().length;
  const text = line.trim();

  if (indent === 0) {
    if (SLUGLINE_RE.test(text)) return { type: 'slugline', indent, text };
    if (TRANSITION_RE.test(text)) return { type: 'transition', indent, text };
    return { type: 'action', indent, text };
  }
  if (indent === CUE_INDENT) {
    if (text.startsWith('(')) return { type: 'parenthetical', indent, text };
    if (CUE_ANY_CASE_RE.test(text)) return { type: 'cue', indent, text };
    return { type: 'unknown', indent, text };
  }
  if (indent === DIALOGUE_INDENT) return { type: 'dialogue', indent, text };
  return { type: 'unknown', indent, text };
}

/** Strip the speech extensions from a cue: "IRIS (V.O.)" -> "IRIS". */
export function cueName(text) {
  return text.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

/**
 * Parse the label a slugline carries in trailing parentheses, e.g.
 *   INT. RIG HOLLOWAY - THE VAULT - NIGHT (HOLLOWAY - HOUR 08 - 18:20)
 * -> { universe: 'HOLLOWAY', time: [8, 18, 20], label: 'HOLLOWAY - HOUR 08 - 18:20' }
 * The numbers, in the order the script itself prints them, are that
 * universe's own clock and sort chronologically within the universe.
 */
export function parseSluglineLabel(text) {
  const m = text.match(/\(([^()]*)\)\s*$/);
  if (!m) return null;
  const label = m[1].trim();
  const parts = label.split(/\s+-\s+/);
  const universe = parts[0].trim();
  if (!universe) return null;
  const time = (label.match(/\d+/g) || []).map(Number);
  return { universe, time, label };
}

function compareTime(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? -Infinity;
    const y = b[i] ?? -Infinity;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
export { compareTime };

/**
 * Parse a screenplay into scenes, dialogue blocks and format violations.
 */
export function parseScreenplay(source) {
  const lines = source.split(/\r?\n/);
  const scenes = [];
  const violations = [];
  let scene = null;
  let pendingCue = null; // cue seen since the last blank line
  let sawFadeIn = false;

  const violation = (i, rule, message) =>
    violations.push({ line: i + 1, rule, message, text: lines[i] });

  lines.forEach((raw, i) => {
    if (raw.length > MAX_LINE_WIDTH) {
      violation(i, 'line-width', `line is ${raw.length} characters (max ${MAX_LINE_WIDTH})`);
    }
    if (/\s$/.test(raw)) {
      violation(i, 'trailing-space', 'line has trailing whitespace');
    }

    const node = classify(raw);
    switch (node.type) {
      case 'blank':
        pendingCue = null;
        return;

      case 'slugline': {
        const parsed = parseSluglineLabel(node.text);
        if (!parsed) {
          violation(i, 'slugline-label', 'scene heading carries no (UNIVERSE - TIME) label');
        }
        scene = {
          heading: node.text,
          line: i + 1,
          universe: parsed?.universe ?? null,
          time: parsed?.time ?? [],
          label: parsed?.label ?? null,
          cues: [],
          dialogueBlocks: 0,
          words: 0,
        };
        scenes.push(scene);
        pendingCue = null;
        return;
      }

      case 'transition':
        if (node.text === 'FADE IN:') sawFadeIn = true;
        pendingCue = null;
        return;

      case 'action':
        if (looksLikeSlugline(node.text)) {
          violation(
            i,
            'scene-heading',
            'line reads as a scene heading but does not open with an INT./EXT. slugline'
          );
        }
        if (!scene) {
          violation(i, 'scene-heading', 'action appears before any INT./EXT. scene heading');
        } else {
          scene.words += node.text.split(/\s+/).length;
        }
        pendingCue = null;
        return;

      case 'cue':
        if (!scene) {
          violation(i, 'scene-heading', 'character cue appears before any INT./EXT. scene heading');
        }
        if (node.text !== node.text.toUpperCase()) {
          violation(i, 'cue-case', 'character cue is not in all caps');
        }
        pendingCue = { name: cueName(node.text), line: i + 1, used: false };
        if (scene) scene.cues.push(pendingCue.name);
        return;

      case 'parenthetical':
        if (!pendingCue) {
          violation(i, 'orphan-parenthetical', 'parenthetical is not attached to a character cue');
        }
        return;

      case 'dialogue':
        if (!scene) {
          violation(i, 'scene-heading', 'dialogue appears before any INT./EXT. scene heading');
        }
        if (!pendingCue) {
          violation(i, 'dialogue-cue', 'dialogue block is not introduced by an all-caps character cue');
        } else {
          if (!pendingCue.used) {
            pendingCue.used = true;
            if (scene) scene.dialogueBlocks += 1;
          }
          if (scene) scene.words += node.text.split(/\s+/).length;
        }
        return;

      default:
        violation(
          i,
          'indent',
          `line sits at column ${node.indent}; expected 0 (action), ${DIALOGUE_INDENT} (dialogue) or ${CUE_INDENT} (cue)`
        );
    }
  });

  if (!sawFadeIn) {
    violations.push({ line: 0, rule: 'fade-in', message: 'script never says FADE IN:', text: '' });
  }

  const words = source.split(/\s+/).filter(Boolean).length;
  return {
    lines,
    scenes,
    violations,
    words,
    firstLine: lines[0],
    lastContentLine: [...lines].reverse().find((l) => l.trim() !== ''),
    pagesByLines: Math.ceil(lines.length / LINES_PER_PAGE),
    pagesByWords: words / WORDS_PER_PAGE,
  };
}

/** Universe -> scene count, in order of first appearance. */
export function universeCounts(scenes) {
  const counts = new Map();
  for (const s of scenes) {
    if (!s.universe) continue;
    counts.set(s.universe, (counts.get(s.universe) ?? 0) + 1);
  }
  return counts;
}

/** Character name -> Set of universes that character speaks in. */
export function characterUniverses(scenes) {
  const map = new Map();
  for (const s of scenes) {
    for (const cue of s.cues) {
      if (!map.has(cue)) map.set(cue, new Set());
      if (s.universe) map.get(cue).add(s.universe);
    }
  }
  return map;
}

/**
 * Places where the script presents a scene earlier than one it has already
 * shown, according to the universe's own clock. Non-empty means the
 * narrative is told out of chronological order.
 */
export function chronologyInversions(scenes) {
  const inversions = [];
  const lastSeen = new Map();
  scenes.forEach((s, idx) => {
    if (!s.universe || s.time.length === 0) return;
    const prev = lastSeen.get(s.universe);
    if (prev && compareTime(s.time, prev.time) < 0) {
      inversions.push({ universe: s.universe, from: prev.label, to: s.label, sceneIndex: idx });
    }
    lastSeen.set(s.universe, s);
  });
  return inversions;
}

/** Scenes whose universe changes from the preceding scene. */
export function universeCrossings(scenes) {
  let crossings = 0;
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].universe && scenes[i].universe !== scenes[i - 1].universe) crossings++;
  }
  return crossings;
}

export const PLACEHOLDER_RE = /\b(TODO|TBD|FIXME|XXX|LOREM IPSUM|PLACEHOLDER)\b|\[[^\]\n]*\]|<[A-Za-z_][^>\n]*>/;

/** Lines containing placeholder markers of any kind. */
export function placeholders(lines) {
  const hits = [];
  lines.forEach((line, i) => {
    if (PLACEHOLDER_RE.test(line)) hits.push({ line: i + 1, text: line });
  });
  return hits;
}

export function lintFile(path) {
  const source = readFileSync(path, 'utf8');
  const report = parseScreenplay(source);
  return {
    path,
    ...report,
    universes: universeCounts(report.scenes),
    characters: characterUniverses(report.scenes),
    inversions: chronologyInversions(report.scenes),
    crossings: universeCrossings(report.scenes),
    placeholders: placeholders(report.lines),
  };
}

function main(argv) {
  const path = argv[2] ?? 'script/the-atlas-of-severed-hours.txt';
  const r = lintFile(path);
  const multi = [...r.characters.entries()]
    .filter(([, set]) => set.size >= 2)
    .sort((a, b) => b[1].size - a[1].size);

  console.log(`file:              ${r.path}`);
  console.log(`opens with:        ${JSON.stringify(r.firstLine)}`);
  console.log(`closes with:       ${JSON.stringify(r.lastContentLine)}`);
  console.log(`lines:             ${r.lines.length}`);
  console.log(`words:             ${r.words}`);
  console.log(`pages (lines/55):  ${r.pagesByLines}`);
  console.log(`pages (words/190): ${r.pagesByWords.toFixed(1)}`);
  console.log(`scene headings:    ${r.scenes.length}`);
  console.log(`universe crossings:${r.crossings}`);
  console.log('universes:');
  for (const [u, n] of r.universes) console.log(`  ${u.padEnd(12)} ${n} scenes`);
  console.log(`characters in 2+ universes: ${multi.length}`);
  for (const [name, set] of multi.slice(0, 8)) {
    console.log(`  ${name.padEnd(18)} ${[...set].join(', ')}`);
  }
  console.log(`chronology inversions: ${r.inversions.length}`);
  for (const inv of r.inversions.slice(0, 6)) {
    console.log(`  ${inv.universe}: "${inv.from}" is shown before "${inv.to}"`);
  }
  console.log(`placeholder markers: ${r.placeholders.length}`);
  for (const p of r.placeholders.slice(0, 10)) console.log(`  ${p.line}: ${p.text}`);
  console.log(`format violations: ${r.violations.length}`);
  for (const v of r.violations.slice(0, 40)) {
    console.log(`  ${String(v.line).padStart(5)}  ${v.rule}: ${v.message}`);
    console.log(`         ${JSON.stringify(v.text)}`);
  }
  if (r.violations.length > 40) console.log(`  ... and ${r.violations.length - 40} more`);
  return r.violations.length === 0 && r.placeholders.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv);
}
