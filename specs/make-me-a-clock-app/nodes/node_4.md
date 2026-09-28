# Hand movement and clock reading

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R8: The hands are driven by the system clock, not counted up internally.
- R9: The second hands **jump once a second**, all three together, and are never drawn between two positions.
- R10: The hour and minute hands advance continuously — at half past eight the hour hand sits **midway between 8 and 9**.
- R11: Every dial is correct within a second from the moment the page opens.
- R12: After the page has been hidden or the machine asleep, the hands show the current time on return, not the time they left off.

## Criteria

- ac_13: The hands are derived from the system clock on each update rather than from an internally counted elapsed time.
  - proven by (test): Advancing the mocked system clock by an arbitrary jump between two updates makes the hands reflect the jumped-to time rather than one tick's worth of movement.
  - drafted from R8
- ac_14: The second hands jump once a second, all three together, and are never drawn between two second positions.
  - proven by (test): Sampled across many updates, every second-hand angle is an exact multiple of six degrees and the three dials' second-hand angles are always equal to each other.
  - drafted from R9
- ac_15: The hour and minute hands advance continuously, so at half past eight the hour hand sits midway between 8 and 9.
  - proven by (test): With the clock set to 08:30:00 the hour-hand angle is 255 degrees, and the minute-hand angle at 08:30:30 lies strictly between its values at 08:30:00 and 08:31:00.
  - drafted from R10
- ac_16: Every dial is correct within one second from the moment the page opens, before any tick has elapsed.
  - proven by (test): Immediately after load, each dial's hand angles match the angles computed for the current instant in its city to within one second's worth of rotation.
  - drafted from R11
- ac_17: After the page has been hidden or the machine asleep, the hands show the current time on return rather than resuming where they stopped.
  - proven by (test): Hiding the page, advancing the mocked clock by an hour, and firing visibilitychange leaves all three dials showing the advanced time.
  - drafted from R12

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

