# Self-contained page shell

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R1: The whole clock is **one `.html` file**, `clock.html` at the repo root — markup, styles and script inline.
- R2: The page needs **no build step**, has **no dependencies**, and makes **no network request** at runtime.
- R3: Opening it straight from disk over `file://` works; no server.

## Criteria

- ac_1: The clock is a single file clock.html at the repository root containing its markup, styles and script inline.
  - proven by (artifact): clock.html exists at the repo root and contains inline <style> and <script> with no stylesheet link and no external script src.
  - drafted from R1
- ac_2: The page has no dependencies and issues no network request at runtime.
  - proven by (test): Loading the page with every network request intercepted records zero outbound requests while the dials still render and run.
  - drafted from R2
- ac_3: The page works when opened straight from disk over file:// with no server and no build step.
  - proven by (test): Loading the file via a file:// URL renders three running dials with no console errors and without any build artefact being produced first.
  - drafted from R3

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

