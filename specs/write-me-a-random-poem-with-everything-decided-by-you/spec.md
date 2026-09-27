# Keeperless lighthouse sonnet

## Outcome

One Markdown file at the repo root holding **a Shakespearean sonnet about a lighthouse that no longer has a keeper** — the lamp still turning on a timer, the keeper's house empty. Every choice of form, subject and tone was left to Claude.

## Requirements

### The file

- R1: **One file**, `poem.md` at the repo root — the poem and nothing else: no front matter, no notes, no author line.
- R2: A `#` title heading, then the fourteen verse lines.
- R3: A blank line after each quatrain, so the poem reads as three quatrains and a couplet.
- R4: Plain verse lines — no Markdown beyond the title and the blank lines; no bold, italics, lists or quotes.

### The form

- R5: **Exactly fourteen verse lines**: three quatrains then a couplet.
- R6: Rhymes **ABAB CDCD EFEF GG** — full rhymes, no rhyme sound reused between groups.
- R7: Iambic pentameter throughout: ten syllables a line, with at most an occasional feminine ending.
- R8: The **volta** falls at verse line 9 — the first two quatrains the empty station and its lamp, the third turning to what the light still does for ships that never know no one is there.
- R9: The couplet closes the thought rather than restating it.

### The voice

- R10: Quiet and elegiac, not sentimental; concrete images — salt, glass, the lamp's rotation, the stairs — over abstractions.
- R11: Present tense, no speaker named, no "I".

<!-- perbo:requirement-ids through R11 -->

## No-Gos

- Naming a real lighthouse, place or person.
- Archaic diction — "thee", "thou", "doth", "o'er".
- Forced rhymes by inverted word order ("the sea so wide the waves did ride").
- Anything beyond the poem — HTML, an explanation, a second poem, alternates.

## Rabbit holes

- A generator that makes a new random poem each time.
- Scansion markup or a commentary on the metre.
- Illustrations or typesetting beyond plain Markdown.

## Notes

- Not a **single-file app**; @docs/adr/0001-single-file-html-apps.md does not reach it.
- Sits beside `resignation-letter.md` as the repo's other written document.
