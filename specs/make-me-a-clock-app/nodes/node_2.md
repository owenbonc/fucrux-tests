# Three dials: faces, labels and layout

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R17: **Three dials**, equal in size and weight, in the order London, Hong Kong, New York; none of them leads.
- R18: Each dial is labelled with its city's name.
- R4: Each dial is round and carries the **numerals 1 to 12** set upright around it.
- R5: Sixty minute marks, with the twelve hour positions marked more heavily than the rest.
- R6: Three hands — hour, minute and second — pivoting from the centre, each told apart from the others by length and weight.
- R7: The three stay round and legible, sized to the window and stacking rather than shrinking away at phone width.

## Criteria

- ac_4: Exactly three dials are shown, equal in size and visual weight, in the order London, Hong Kong, New York, with none given prominence.
  - proven by (test): The page contains exactly three dial elements whose measured bounding boxes are equal, ordered London, Hong Kong, New York in document order.
  - drafted from R17
- ac_5: Each dial carries its city's name as a label.
  - proven by (test): The rendered text of the three dials includes exactly the labels "London", "Hong Kong" and "New York", one per dial.
  - drafted from R18
- ac_6: Each dial is round and carries the numerals 1 to 12 set upright around it.
  - proven by (test): Each dial renders twelve numeral elements reading 1..12 positioned at the twelve hour angles, each with no rotation applied.
  - drafted from R4
- ac_7: Each dial carries sixty minute marks with the twelve hour positions drawn more heavily than the other forty-eight.
  - proven by (test): Each dial renders sixty tick elements and the twelve at hour positions measure greater thickness or length than every non-hour tick.
  - drafted from R5
- ac_8: Each dial has hour, minute and second hands pivoting from the centre and distinguishable from one another by length and weight.
  - proven by (test): Each dial has three hand elements sharing the dial centre as their rotation origin, with strictly increasing length and strictly decreasing thickness from hour to second.
  - drafted from R6
- ac_9: The three dials stay round and legible across window sizes, stacking at phone width rather than shrinking away.
  - proven by (test): At a 1200px-wide viewport the dials sit side by side and at a 375px-wide viewport they stack, with each dial's width equal to its height and its diameter above a legible minimum in both cases.
  - drafted from R7

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

