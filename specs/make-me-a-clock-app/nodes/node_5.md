# Day and night colouring

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R19: Each dial is **coloured light for day and dark for night** in its own city, where day runs 06:00–18:00 there.

## Criteria

- ac_10: Each dial is coloured light when it is day in its own city and dark when it is night, with day running 06:00–18:00 there.
  - proven by (test): With the clock driven to instants that put the three cities on different sides of 06:00 and 18:00 local, each dial carries the light or dark styling matching its own city's local hour.
  - drafted from R19

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

