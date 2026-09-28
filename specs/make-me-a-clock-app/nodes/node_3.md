# Per-city zone time

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R20: Each dial shows the **current time in its own city** — `Europe/London`, `Asia/Hong_Kong`, `America/New_York` — and is right whatever time zone the device is set to.
- R21: Daylight saving follows each city: London and New York shift, **Hong Kong never does**.

## Criteria

- ac_11: Each dial shows the current time in Europe/London, Asia/Hong_Kong and America/New_York respectively, whatever time zone the device is set to.
  - proven by (test): For a fixed instant evaluated with the host zone set to several different zones, each dial's hand angles correspond to that instant rendered in its own named zone.
  - drafted from R20
- ac_12: Daylight saving follows each city: London and New York shift across their DST boundaries and Hong Kong never shifts.
  - proven by (test): Evaluated at instants either side of the London and New York DST transitions those dials' displayed hours shift by one, while the Hong Kong dial's offset from UTC is unchanged at every instant tested.
  - drafted from R21

## Paths

- clock.html
- tests/**

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

## Notes

