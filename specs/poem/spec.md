# Poem

## Outcome

One original Shakespearean sonnet, in a new Markdown file, on technology as humanity's
downfall — argued through convenience and atrophy, spoken by a complicit present-tense
"we", and closing on a couplet that refuses to say whether what we lost mattered.

The poem is the whole deliverable. Nothing in the repository gains tooling, tests or
structure to support it.

## Requirements

- R1: The poem lives in a single new file at `poems/downfall.md`.
- R2: The page carries a `# ` heading with the poem's title, then the verse, and nothing else.
- R3: The verse uses Markdown hard line breaks (two trailing spaces), not a fenced block, so every line break survives rendering.
- R4: The verse is exactly 14 lines.
- R5: The poem is a Shakespearean sonnet — three quatrains and a closing couplet — rhyming ABAB CDCD EFEF GG.
- R6: The three quatrains use slant rhyme; the closing couplet uses full rhyme.
- R7: The meter is iambic pentameter, permitting the traditional licences of trochaic first feet and feminine endings.
- R8: Exactly one line departs deliberately from the meter, and it is line 9, the volta, so form and sense turn together.
- R9: The mechanism of downfall is convenience and atrophy: faculties handed over willingly — memory, wayfinding, judgment — and then lost.
- R10: The speaker is a first-person plural "we" in the present tense, complicit; the loss is already underway, not forecast, and not blamed on anyone outside the "we".
- R11: Imagery is concrete but era-neutral — roads, maps, numbers, hands, paths, the dark — naming nothing invented after 1900.
- R12: The closing couplet sustains both lament and shrug as readings and does not resolve whether the loss mattered.
- R13: The verse is original, neither assembled from nor quoting existing poems.

## No-Gos

- No test harness, checker script, prosody tooling, `package.json`, or any change to `.focrux/config.json` — the repository has no checks and gains none here.
- No contemporary technology nouns: no screens, feeds, phones, blue glow, brand names.
- No epigraph, no byline, no dedication, no commentary or explanation beside the poem.
- Not free verse, not a villanelle, not any other form; one poem, not a sequence.
- No second-person accusation, and no machine or AI speaker.
- No edits to `README.md` or any existing file.
- No named villain — not an industry, a company, or a generation.

## Rabbit holes

- Litigating scansion. Regularity is judged by ear within the stated licences; do not
  argue the poem into or out of a foot.
- Hunting an ideal slant-rhyme set. Any three quatrains of consistent slant rhyme
  satisfy the requirement.
- Building or importing anything that mechanically validates rhyme or meter.
- Growing this into a collection, an index of poems, or a repository convention for
  where future poems live.
- Rewriting the ending to deliver a verdict because ambiguity feels unfinished. The
  ambiguity is the requirement, not a gap in it.

## Notes

- How it is judged: your read for whether the poem is any good, plus mechanical
  structural criteria that need no tooling — the file exists at the path, the verse is
  exactly 14 lines, and the rhyme scheme is ABAB CDCD EFEF GG.
- Three choices were defaulted rather than answered: rhyme exactness (slant quatrains,
  full couplet), page furniture (title only, hard breaks, no epigraph), and the volta at
  line 9 with the single metrical break there. They are settled requirements above; any
  change to them is a change to the spec and the ticket, not a matter of taste at
  writing time.
- On ambiguity: you chose ambiguous *verdict* and declined ambiguous *referent*. The
  poem may therefore read plainly as being about technology; what it withholds is
  whether the loss was a loss.
- No ADR was written. No decision here crosses components — the repository holds one
  artifact and no tooling — and every choice is reversible by editing a single file,
  so none of the three ADR tests is met.
- Coined terms (*ambiguous verdict*, *era-neutral imagery*, *metrical break*) are
  defined in `CONTEXT.md`.
