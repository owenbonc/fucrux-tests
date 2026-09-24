# The agent's tool use is auto-approved in full

The app never prompts for permission. The agent writes files, runs shell commands and reaches paths outside the work-tree unasked. Rewind is the only safety net, and approval prompts were judged to buy nothing on the edits it already covers while making the timeline pointless.

The narrower option — free rein inside the work-tree, a prompt for shell commands and anything outside it — was weighed and rejected in favour of speed.

Consequence: rewind covers file state inside the work-tree, and that is all. A deleted database, a pushed branch, an outbound network call, a write above the folder: none of these are checkpointed and none come back. Anything ignored by the work-tree's `.gitignore` is equally beyond rewind. Open a folder in this app only where that is acceptable.
