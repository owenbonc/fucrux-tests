# Three-dial analogue world clock

## Outcome

One self-contained HTML file that, opened in a browser, shows **three analogue dials side by side — London, Hong Kong and New York** — each labelled with its city, each coloured light or dark for day or night there, and each with a second hand that ticks once a second. It tells those three times and does nothing else.

## Requirements

### The file

- R1: The whole clock is **one `.html` file**, `clock.html` at the repo root — markup, styles and script inline.
- R2: The page needs **no build step**, has **no dependencies**, and makes **no network request** at runtime.
- R3: Opening it straight from disk over `file://` works; no server.

### The dials

- R17: **Three dials**, equal in size and weight, in the order London, Hong Kong, New York; none of them leads.
- R18: Each dial is labelled with its city's name.
- R4: Each dial is round and carries the **numerals 1 to 12** set upright around it.
- R5: Sixty minute marks, with the twelve hour positions marked more heavily than the rest.
- R6: Three hands — hour, minute and second — pivoting from the centre, each told apart from the others by length and weight.
- R19: Each dial is **coloured light for day and dark for night** in its own city, where day runs 06:00–18:00 there.
- R7: The three stay round and legible, sized to the window and stacking rather than shrinking away at phone width.

### Telling the time

- R20: Each dial shows the **current time in its own city** — `Europe/London`, `Asia/Hong_Kong`, `America/New_York` — and is right whatever time zone the device is set to.
- R21: Daylight saving follows each city: London and New York shift, **Hong Kong never does**.
- R8: The hands are driven by the system clock, not counted up internally.
- R9: The second hands **jump once a second**, all three together, and are never drawn between two positions.
- R10: The hour and minute hands advance continuously — at half past eight the hour hand sits **midway between 8 and 9**.
- R11: Every dial is correct within a second from the moment the page opens.
- R12: After the page has been hidden or the machine asleep, the hands show the current time on return, not the time they left off.

## No-Gos

- A digital readout of the time, anywhere on the page.
- Any city beyond the three, or a way to add, remove or reorder them.
- Date, weekday, or a marker for a city being on a different date.
- Alarm, timer or stopwatch.
- AM/PM or 24-hour indication — day or night is the dial's colouring alone.
- Any setting: theme, hand style, size.
- Sound of any kind — no tick, no chime.
- State that outlives the page.
- External fonts, stylesheets, scripts or images.

## Rabbit holes

- Real sunrise and sunset times, or daylight that varies with season and latitude.
- Zone abbreviations, UTC offsets, or the hours between cities.
- Reproducing a particular real clock — station clock, Braun, Apple.
- Sub-second animation: easing, overshoot or bounce on the tick.
- Keyboard play and screen-reader support.
- Skeuomorphic shading, glass glare, drop shadows or a maker's name on the dial.
- Correcting for drift beyond re-reading the system clock.

## Notes

- Zones come from the browser's own zone database, so daylight saving needs no table and no network.
- The mix is deliberate: a quartz tick on the second hands, a mechanical creep on the hour and minute hands.
- Same shape as @specs/football-game and @specs/tic-tac-toe-game: one file, no build, opened from disk.
