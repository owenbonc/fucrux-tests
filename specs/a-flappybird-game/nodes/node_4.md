# Game flow and beeps

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R11: A get-ready screen with the bird hovering in place; the first flap starts play.
- R12: Touching a pipe or the ground is a **crash**: play stops, the bird drops to the ground, and a game-over panel shows the score and the best.
- R13: A flap after a short pause on the game-over panel returns to the get-ready screen, score at nil.
- R16: Short beeps generated in the page — on a flap, on a point, on a crash.

## Criteria

- ac_11: The game opens on a get-ready screen with the bird hovering in place, and the first flap starts play.
  - proven by (test): On load the state is get-ready, the bird's y stays within a small hover range over many steps with no pipes spawned, and one flap moves the state to playing.
  - drafted from R11
- ac_12: Touching a pipe or the ground crashes: play stops, the bird drops to the ground, and a game-over panel shows score and best.
  - proven by (test): Placing the bird overlapping a pipe box, and separately at the ground, each switches state to game-over, pipes stop moving, the bird's y ends at ground level, and a visible panel shows the current score and best.
  - drafted from R12
- ac_13: A flap on the game-over panel is ignored for a short pause, and afterwards returns to the get-ready screen with the score at zero.
  - proven by (test): A flap immediately after the crash leaves the state as game-over; a flap after the pause changes the state to get-ready with score 0 and no pipes.
  - drafted from R13
- ac_16: Short beeps generated in the page play on a flap, on a point and on a crash.
  - proven by (test): With a stubbed AudioContext, a flap, a scored point and a crash each start one oscillator, and no audio file is referenced.
  - drafted from R16

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

