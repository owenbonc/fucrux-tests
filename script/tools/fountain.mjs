// A second, independent reading of a screenplay: Fountain's syntax rules.
//
// Fountain (fountain.io/syntax) is the plain-text screenplay markup the
// ecosystem settled on, and its defining property is that it decides what
// every line *is* from punctuation and blank lines alone — "leading tabs or
// spaces are ignored". That makes it the natural second opinion on a Courier
// column file: this module never looks at how far a line is indented, so where
// it agrees with the column-based checker in screenplay-lint.mjs, the two have
// agreed for entirely different reasons.
//
// The rules below are Fountain's, in Fountain's own terms:
//
//   Scene Heading  a line with a blank line before and after it that begins
//                  with INT, EXT, EST, INT./EXT., INT/EXT or I/E — or any line
//                  forced with a leading '.'.
//   Character      a line in UPPER CASE with a blank line before it and a
//                  non-blank line after it, containing at least one letter —
//                  or any line forced with a leading '@'.
//   Parenthetical  a line inside a dialogue block wrapped in ( ).
//   Dialogue       any other line inside a dialogue block.
//   Transition     a line in UPPER CASE with a blank line before and after it
//                  that ends in "TO:" — or any line forced with a leading '>'.
//   Action         everything else.
//
// Fountain's own ambiguity is worth naming: an upper-case line of action with
// dialogue-shaped neighbours reads as a Character, which is why the format
// offers '!' to force Action. A script that never relies on that force — as
// the one in this repository does not — is one whose speakers are unambiguous.

/** Is this line blank (or absent, i.e. off either end of the file)? */
const isBlank = (line) => line === undefined || line.trim() === '';

/** Fountain's UPPER CASE test: no lower-case letters, at least one letter. */
export function isUpperCase(text) {
  return /[A-Za-z]/.test(text) && text === text.toUpperCase();
}

const SCENE_HEADING_RE = /^(?:INT|EXT|EST|INT\.?\/EXT|I\/E|E\/I)[.\s/]/i;
const TRANSITION_RE = /\bTO:$/;

/** Does this text open a scene, by Fountain's prefix rule? */
export function isSceneHeadingText(text) {
  return SCENE_HEADING_RE.test(text);
}

/**
 * Parse a screenplay into one element per line: { type, text }, where text is
 * the line with its indentation stripped. Blank lines are kept, as Fountain
 * needs them and as a plain-text page has them.
 *
 * The element types are those of screenplay-format.mjs, plus 'blank'.
 */
export function parseFountain(source) {
  const raw = source.split(/\r?\n/);
  const text = raw.map((line) => line.trim());
  const elements = [];

  // 'character' or 'parenthetical' or 'dialogue' while inside a speech, else null.
  let inDialogue = false;

  for (let i = 0; i < text.length; i++) {
    const line = text[i];
    const before = isBlank(text[i - 1]);
    const after = isBlank(text[i + 1]);

    if (line === '') {
      inDialogue = false;
      elements.push({ type: 'blank', text: '', line: i + 1 });
      continue;
    }

    // Forced elements. Fountain's escape hatches take precedence over every
    // rule below, which is what makes the rules below safe to state plainly.
    if (line.startsWith('.') && !line.startsWith('..')) {
      inDialogue = false;
      elements.push({ type: 'scene-heading', text: line.slice(1).trim(), line: i + 1, forced: true });
      continue;
    }
    if (line.startsWith('>') && !line.endsWith('<')) {
      inDialogue = false;
      elements.push({ type: 'transition', text: line.slice(1).trim(), line: i + 1, forced: true });
      continue;
    }
    if (line.startsWith('!')) {
      inDialogue = false;
      elements.push({ type: 'action', text: line.slice(1).trim(), line: i + 1, forced: true });
      continue;
    }
    if (line.startsWith('@')) {
      inDialogue = true;
      elements.push({ type: 'character', text: line.slice(1).trim(), line: i + 1, forced: true });
      continue;
    }

    // Inside a speech: parentheticals and dialogue run until the blank line.
    if (inDialogue) {
      const type = line.startsWith('(') && line.endsWith(')') ? 'parenthetical' : 'dialogue';
      elements.push({ type, text: line, line: i + 1 });
      continue;
    }

    if (before && after && isSceneHeadingText(line)) {
      elements.push({ type: 'scene-heading', text: line, line: i + 1 });
      continue;
    }
    if (before && after && isUpperCase(line) && TRANSITION_RE.test(line)) {
      elements.push({ type: 'transition', text: line, line: i + 1 });
      continue;
    }
    if (before && !after && isUpperCase(line)) {
      inDialogue = true;
      elements.push({ type: 'character', text: line, line: i + 1 });
      continue;
    }

    elements.push({ type: 'action', text: line, line: i + 1 });
  }

  return elements;
}

/** Line numbers of every element of a given type, in order. */
export function linesOfType(elements, type) {
  return elements.filter((e) => e.type === type).map((e) => e.line);
}
