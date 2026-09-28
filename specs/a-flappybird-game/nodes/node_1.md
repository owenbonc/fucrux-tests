# Page shell, rendering and scaling

Generated from `spec.md` and the plan's graph. Everything above Notes is rewritten whenever either changes; Notes is yours and is kept.

## Requirements

- R1: **One `.html` file**, `flappy.html` at the repo root — markup, styles and script inline, no build, no dependencies, no network at runtime, opened straight from disk over `file://`.
- R14: **Simple shapes drawn in code** — round yellow bird, green pipes, ground, blue sky; no image files.
- R15: The play area scales to the window and keeps its proportions.

## Criteria

- ac_1: flappy.html at the repo root is the whole game, with markup, styles and script inline and no external resources, and it runs from file://.
  - proven by (test): The file has no src/href pointing at external or relative resources and makes no network requests when loaded over file://, and a canvas game renders without console errors.
  - drafted from R1
- ac_14: All graphics are simple shapes drawn in code — round yellow bird, green pipes, ground and blue sky — with no image files.
  - proven by (test): The file contains no img elements, image URLs or data-URI images, and a rendered frame has yellow pixels at the bird, green at a pipe, and blue in the sky.
  - drafted from R14
- ac_15: The play area scales to fill the window while keeping its aspect ratio.
  - proven by (test): At two different viewport sizes the play area's displayed width/height ratio is the same and it fits within the window on at least one full dimension.
  - drafted from R15

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

