# Single-player Flappy Bird

## Outcome

One self-contained HTML file that, opened in a browser, is **single-player Flappy Bird**: each flap lifts the bird against gravity, pipe pairs scroll in from the right, every gap passed scores a point, and touching a pipe or the ground ends the game.

## Requirements

### The file

- R1: **One `.html` file**, `flappy.html` at the repo root — markup, styles and script inline, no build, no dependencies, no network at runtime, opened straight from disk over `file://`.

### Flying

- R2: Gravity pulls the bird down constantly; a **flap** sets its upward speed to a fixed kick, not an added one.
- R3: Space, a mouse click or a tap on the play area each flap; Space does not scroll the page.
- R4: The top of the play area stops the bird without ending the game.
- R5: The bird tilts nose-up after a flap and nose-down as it falls.

### Pipes

- R6: Pipe pairs enter from the right at a fixed spacing and scroll left at a **fixed speed**.
- R7: Each pair's **gap** is the same height every time, at a random height within bounds.
- R8: The ground scrolls at the pipes' speed.

### Scoring

- R9: Passing a pair's gap scores one point, once per pair.
- R10: The **best** score of this page visit is shown beside the score, and resets when the page is closed.

### Game flow

- R11: A get-ready screen with the bird hovering in place; the first flap starts play.
- R12: Touching a pipe or the ground is a **crash**: play stops, the bird drops to the ground, and a game-over panel shows the score and the best.
- R13: A flap after a short pause on the game-over panel returns to the get-ready screen, score at nil.

### Look and sound

- R14: **Simple shapes drawn in code** — round yellow bird, green pipes, ground, blue sky; no image files.
- R15: The play area scales to the window and keeps its proportions.
- R16: Short beeps generated in the page — on a flap, on a point, on a crash.

<!-- perbo:requirement-ids through R16 -->

## No-Gos

- A best score that outlives the page.
- Pipes that speed up, narrower gaps, or any rising difficulty.
- Sound or image files, external fonts or scripts.
- A second player or a computer player.
- A mute button or volume setting.

## Rabbit holes

- Pixel-art sprites in the original's style.
- Medals, a day/night sky, or choosing a bird colour.
- Pause and resume.
- A settings screen: gravity, gap size, speed.
- Frame-rate independence beyond a fixed-step update.
- Pixel-perfect hit-testing; boxes around bird and pipes are enough.
- Music.

## Notes

- Same shape as the other toys here — see @docs/adr/0001-single-file-html-apps.md.
- Browsers hold back sound until the first click or key press, so the first flap may play no beep.
