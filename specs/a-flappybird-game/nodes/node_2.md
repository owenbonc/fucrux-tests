# Bird physics and input

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R2: Gravity pulls the bird down constantly; a **flap** sets its upward speed to a fixed kick, not an added one.
- R3: Space, a mouse click or a tap on the play area each flap; Space does not scroll the page.
- R4: The top of the play area stops the bird without ending the game.
- R5: The bird tilts nose-up after a flap and nose-down as it falls.

## Criteria

- ac_2: Gravity pulls the bird down every step, and a flap sets its vertical speed to a fixed upward kick instead of adding to it.
  - proven by (test): After several falling steps the downward speed has grown, and one flap from any prior speed leaves exactly the same fixed upward speed.
  - drafted from R2
- ac_3: Space, a mouse click or a tap on the play area each flap, and Space does not scroll the page.
  - proven by (test): Dispatching a Space keydown, a click and a touch/pointer event on the play area each set the flap velocity, and the Space keydown has defaultPrevented true.
  - drafted from R3
- ac_4: The top of the play area stops the bird and does not end the game.
  - proven by (test): Flapping repeatedly until the bird reaches the top keeps its y at or below the top bound, and the game state stays in play.
  - drafted from R4
- ac_5: The bird tilts nose-up after a flap and nose-down as it falls.
  - proven by (test): The bird's rotation angle is negative (nose-up) just after a flap and positive (nose-down) once its vertical speed is downward for some time.
  - drafted from R5

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

