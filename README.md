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
| Length | 5,266 lines / 19,265 words — about 96–101 pages |
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

## Checking the script

The script is a package of its own, `script/`, with no dependencies beyond
Node's built-ins (Node 20 or newer). Run its checks with:

```sh
npm run check --prefix script     # lint, then the test suite
npm run lint  --prefix script     # the report below, exit 1 on any fault
npm test      --prefix script     # node:test, over script/tools/*.test.mjs
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
worlds. It also runs the linter as a child process over two checked-in
fixtures in `script/tools/fixtures/` — one well-formed, one deliberately
broken — so the checker has to be able to fail before its verdict on the
screenplay counts for anything. Both commands are reproducible from a clean
checkout; the numbers in the table above are whatever they print today.
