// The page geometry of a US spec script, and the monospace grid it implies.
//
// Nothing here is invented for this repository. The numbers below are the
// element margins of a standard US screenplay page, quoted in inches from the
// left edge of the paper, as they appear in the sources the trade treats as
// settled:
//
//   * US Letter, 8.5" x 11", 12pt Courier — which is a 10-pitch (10 characters
//     per inch) face set on 6 lines per inch. Every column figure below is a
//     consequence of that pitch, not a choice.
//   * Page margins 1.5" left, 1.0" right, 1.0" top and bottom — the Academy /
//     WGA page setup that gives the familiar 6.0"-wide body of text.
//   * Element margins: Scene Heading and Action 1.5"-7.5"; Dialogue 2.5"-6.0";
//     Parenthetical 3.1"-5.5"; Character 3.7"-7.5"; Transition flush to the
//     right margin at 7.5". These are the default element margins of Final
//     Draft and of every Fountain renderer that follows it, and they are the
//     table printed in Riley, THE HOLLYWOOD STANDARD.
//
// A plain-text screenplay carries no page margins of its own: the left margin
// *is* column zero. So the column an element sits at in the file is its
// distance from the 1.5" left margin, in characters:
//
//     column(inches) = round((inches - 1.5) * 10)
//
// which yields 0 for Action, 10 for Dialogue, 16 for Parenthetical and 22 for
// Character. Those four numbers are the format; they are derived here rather
// than written down, so that the checker cannot drift from the standard it
// claims to enforce.

/** 12pt Courier is a 10-pitch face: ten characters to the inch. */
export const CHARS_PER_INCH = 10;
/** Typewriter leading: six lines to the inch. */
export const LINES_PER_INCH = 6;

export const PAGE = {
  widthInches: 8.5,
  heightInches: 11,
  marginLeftInches: 1.5,
  marginRightInches: 1.0,
  marginTopInches: 1.0,
  marginBottomInches: 1.0,
};

/** The right edge of the text block, in inches from the left edge of the page. */
export const TEXT_RIGHT_INCHES = PAGE.widthInches - PAGE.marginRightInches; // 7.5

/** A position in inches from the page edge, as a column in the text block. */
export function column(inches) {
  return Math.round((inches - PAGE.marginLeftInches) * CHARS_PER_INCH);
}

/** A span in inches, as a count of characters. */
export function characters(inches) {
  return Math.round(inches * CHARS_PER_INCH);
}

/** The full text width of the page: 8.5" less 1.5" and 1.0" of margin. */
export const TEXT_WIDTH = column(TEXT_RIGHT_INCHES); // 60

/**
 * The body of a page: 11" less 1" top and 1" bottom margin, at six lines to
 * the inch. The page number lives in the top margin, not in this count.
 */
export const LINES_PER_PAGE = Math.round(
  (PAGE.heightInches - PAGE.marginTopInches - PAGE.marginBottomInches) * LINES_PER_INCH
); // 54

/**
 * The conventional estimate of one formatted page of screenplay in words. It
 * is a rule of thumb rather than geometry, and is used only as a second
 * opinion on length beside the line count.
 */
export const WORDS_PER_PAGE = 190;

/**
 * Every element of a screenplay page, by its margins in inches, with the
 * column and width those margins come to on the grid. `align: 'right'` means
 * the element is set flush to the right margin rather than indented from the
 * left — the standard treatment of a transition.
 */
export const ELEMENTS = {
  'scene-heading': { leftInches: 1.5, rightInches: 7.5 },
  action: { leftInches: 1.5, rightInches: 7.5 },
  character: { leftInches: 3.7, rightInches: 7.5 },
  parenthetical: { leftInches: 3.1, rightInches: 5.5 },
  dialogue: { leftInches: 2.5, rightInches: 6.0 },
  transition: { leftInches: 1.5, rightInches: 7.5, align: 'right' },
};

for (const spec of Object.values(ELEMENTS)) {
  spec.indent = column(spec.leftInches);
  spec.width = characters(spec.rightInches - spec.leftInches);
}

/**
 * The transitions that convention keeps at the left margin instead of flush
 * right: the one that opens a script and the ones that close it. Every other
 * transition is set to the right margin.
 */
export const LEFT_MARGIN_TRANSITIONS = new Set([
  'FADE IN:',
  'FADE OUT.',
  'FADE TO BLACK.',
  'THE END',
]);

/** The column an element's text starts at, given the text itself. */
export function indentFor(type, text) {
  const spec = ELEMENTS[type];
  if (!spec) throw new TypeError(`unknown screenplay element: ${type}`);
  if (spec.align === 'right' && !LEFT_MARGIN_TRANSITIONS.has(text)) {
    return Math.max(0, TEXT_WIDTH - text.length);
  }
  return spec.indent;
}

/** The widest an element's text may be before it has to wrap. */
export function widthFor(type) {
  const spec = ELEMENTS[type];
  if (!spec) throw new TypeError(`unknown screenplay element: ${type}`);
  return spec.width;
}

/** One line of an element, laid out on the grid. */
export function layoutLine(type, text) {
  if (type === 'blank' || text === '') return '';
  return ' '.repeat(indentFor(type, text)) + text;
}

/**
 * Lay a parsed screenplay back out as plain text: one output line per input
 * line, each put at the column its element belongs at. Line breaks inside a
 * speech or a paragraph are the writer's; where the *left edge* falls is the
 * format's, and that is what this decides.
 */
export function layout(elements) {
  return elements.map((e) => layoutLine(e.type, e.text)).join('\n');
}
