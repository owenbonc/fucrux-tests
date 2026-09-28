# Pipes, ground and scoring

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R6: Pipe pairs enter from the right at a fixed spacing and scroll left at a **fixed speed**.
- R7: Each pair's **gap** is the same height every time, at a random height within bounds.
- R8: The ground scrolls at the pipes' speed.
- R9: Passing a pair's gap scores one point, once per pair.
- R10: The **best** score of this page visit is shown beside the score, and resets when the page is closed.

## Criteria

- ac_6: Pipe pairs enter from the right at a fixed spacing and move left at a fixed speed.
  - proven by (test): New pairs spawn beyond the right edge, consecutive pairs are always the same horizontal distance apart, and each pair's x drops by the same amount every step throughout a long run.
  - drafted from R6
- ac_7: Every pipe pair has a gap of the same height, placed at a random height within bounds.
  - proven by (test): Across many spawned pairs the gap height is constant, gap positions vary, and every gap lies within the configured top and bottom bounds.
  - drafted from R7
- ac_8: The ground scrolls at the same speed as the pipes.
  - proven by (test): Per step, the ground offset changes by the same amount as each pipe's x.
  - drafted from R8
- ac_9: Passing a pair's gap scores exactly one point per pair.
  - proven by (test): Flying the bird through one gap raises the score by one, and further steps with that pair behind the bird do not raise it again.
  - drafted from R9
- ac_10: The best score of the page visit is shown beside the score and is not persisted beyond the page.
  - proven by (test): After a game scoring 3 and then one scoring 1, the displayed best is 3; no localStorage, sessionStorage or cookie is written, and a fresh load shows best 0.
  - drafted from R10

## Paths

- flappy.html
- tests/**

## No-Gos

- A best score that outlives the page.
- Pipes that speed up, narrower gaps, or any rising difficulty.
- Sound or image files, external fonts or scripts.
- A second player or a computer player.
- A mute button or volume setting.

## Notes

