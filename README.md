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

`script/tools/screenplay-lint.mjs` parses the screenplay and reports format
violations, length, universe coverage and the points at which the film jumps
backwards in a world's own chronology. It has no dependencies beyond Node's
built-ins.

```sh
node script/tools/screenplay-lint.mjs script/the-atlas-of-severed-hours.txt
node --test script/tools/screenplay.test.mjs
```

The test suite in `script/tools/screenplay.test.mjs` asserts all of the above
against the file on disk: that it opens on `FADE IN:` and closes on
`FADE OUT.` / `THE END`, that it carries no placeholder text, that this README
links to it, that every scene opens on an `INT.`/`EXT.` slugline and every
dialogue block is introduced by an all-caps character cue, that it runs to
feature length, and that the worlds are interleaved rather than told one after
another.
