# Test Project

## The Atlas of Severed Hours

A feature-length multiverse adventure screenplay, told out of order across
four worlds and the room between them.

**Read it here: [script/the-atlas-of-severed-hours.txt](script/the-atlas-of-severed-hours.txt)**

A cartographer opens a hole in an hour and loses her sister into it. The hour
was never hers alone: it is shared by four worlds, each of which keeps its
quarter of it somewhere — a room of sixteen clocks in Meridian, a brass
ministry in Vesper, a drowned tower under Holloway, six repeating minutes of a
public square in Cinder. The film cuts between all four and the Seam that joins
them, in the order the story is understood rather than the order it happened.

| | |
|---|---|
| Format | Plain-text US spec script (12pt Courier columns) |
| Length | 5,266 lines / 19,262 words — 98 pages by line count, 101.4 by word count |
| Scenes | 72 scene headings |
| Universes | MERIDIAN, HOLLOWAY, VESPER, CINDER, THE SEAM |

Every scene heading carries the universe and that universe's own clock in
parentheses, so the nonlinear structure can be read — and checked — straight
off the page:

```
INT. OBSERVATORY MAP ROOM - NIGHT (MERIDIAN - DAY 4 - 02:14)
EXT. RIG CATWALK - DUSK (HOLLOWAY - YEAR 60 - 17:40)
INT. CLOCK HALL - DAY (VESPER - YEAR 41 - DAY 2 - 11:20)
EXT. THE STOPPED SQUARE - DAY (CINDER - YEAR 61 - 06:05)
INT. FERRY HOUSE - NO TIME (THE SEAM - MOMENT 1)
```

## The page

The layout is the standard US spec-script page, on the monospace grid 12pt
Courier gives it: US Letter, ten characters to the inch, six lines to the
inch, margins 1.5" left and 1" elsewhere. Column zero of the file *is* the
1.5" left margin, so every element sits at its published margin less 1.5",
times ten:

| Element | Margin | Column | Width |
|---|---|---|---|
| Scene heading, action | 1.5" | 0 | 60 |
| Dialogue | 2.5" | 10 | 35 |
| Parenthetical | 3.1" | 16 | 24 |
| Character cue | 3.7" | 22 | 38 |
| Transition | flush right to 7.5" | — | — |

`script/tools/screenplay-format.mjs` does that arithmetic; nothing downstream
of it hard-codes a column. A page is 54 lines: 11" less an inch of margin top
and bottom, at six lines to the inch.

## Checking the script

The script is a package of its own, `script/`, with no dependencies beyond
Node's built-ins (Node 20 or newer). Run its checks with:

```sh
npm run check --prefix script     # lint, then the test suite
npm run lint  --prefix script     # the report below, exit 1 on any fault
npm test      --prefix script     # node:test, over script/tools/*.test.mjs
```

There is nothing to install, so the same two checks run straight from the
repository root without npm:

```sh
node script/tools/screenplay-lint.mjs script/the-atlas-of-severed-hours.txt
node --test script/tools/screenplay.test.mjs
```

`npm run lint` prints a report — line and word counts, page estimates, scene
headings, per-universe scene counts, which characters cross worlds, every point
at which the film jumps backwards in a world's own chronology, and every format
violation — and exits non-zero if there is a violation or a placeholder marker
anywhere in the file.

`npm test` runs `script/tools/screenplay.test.mjs`, which measures the file on
disk: the first and last lines, the absence of placeholder text, whether this
README holds a link that resolves to the screenplay, whether every scene opens
on an `INT.`/`EXT.` slugline and every dialogue block is introduced by an
all-caps character cue, the page and scene counts, and the interleaving of the
worlds.

Three of those tests exist because a checker agreeing with itself proves
nothing:

* **The geometry is derived, not chosen.** The columns above are asserted to
  be the arithmetic on the published inch margins, so a column can only change
  by changing what the page is.
* **The screenplay is regenerated, not inspected.** `script/tools/fountain.mjs`
  reads the file a second time by [Fountain](https://fountain.io/syntax)'s
  syntax rules, which ignore indentation entirely, and the layout is rebuilt
  from that reading. The test requires the result to be byte-identical to the
  file, and requires the two readings to name the same scene headings, cues,
  parentheticals and dialogue line for line. Moving any single line off its
  column breaks it, which a further test demonstrates by moving one.
* **The checker has to be able to fail.** The linter runs as a child process
  over two checked-in fixtures in `script/tools/fixtures/` — one well-formed,
  one deliberately broken — and the broken one has to be rejected by name,
  rule by rule, before the verdict on the screenplay counts for anything.

Both commands are reproducible from a clean checkout; the numbers in the table
above are whatever they print today.
