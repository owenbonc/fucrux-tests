# Each app is one self-contained HTML file

Every app in this repository (the wall clock, the tic-tac-toe game) ships as a single `.html` file with inline styles and script, opened over `file://` with no build step, no dependencies and no runtime network requests.

The alternative was a real front-end project — npm, a bundler, a dev server — which buys components, modules and a test runner at the cost of a toolchain between the reader and the running thing. These apps are small enough that the toolchain would outweigh them, and being double-clickable from disk is the point.

Consequence: apps stay small and independent; there is no shared code between them, and duplication across files is accepted rather than factored out.
