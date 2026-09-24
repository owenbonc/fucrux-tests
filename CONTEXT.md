# Test Project

A collection of small, self-contained browser toys — one HTML file each, opened straight from disk — one desktop agent editor, and the odd written document.

## Language

**Single-file app**:
One `.html` file holding its own markup, styles and script, runnable by opening it in a browser.
_Avoid_: page, bundle, build

**Hot-seat**:
Two people playing on one device, taking turns at the same screen.
_Avoid_: local multiplayer, two-player mode

**Match**:
One whole game, from the opening move to a decided result.
_Avoid_: round, session, game (ambiguous with the toy itself)

### Ultimate tic-tac-toe

**Square**:
One of the nine cells of a small board; empty, or marked X or O.
_Avoid_: cell, tile, box

**Small board**:
One ordinary nine-square tic-tac-toe board, occupying a square of the big grid.
_Avoid_: mini board, sub-game, subboard

**Big grid**:
The 3×3 arrangement of the nine small boards.
_Avoid_: meta board, outer board, super grid

**Line**:
Three in a row, column or diagonal — of squares within a small board, or of small boards on the big grid.
_Avoid_: win condition, triple

**Closed**:
A small board that can take no more moves, because a mark won it or it filled with no line.
_Avoid_: finished, dead, completed

**Owned**:
A closed small board that a mark won. A board closed as drawn is owned by neither.
_Avoid_: captured, claimed, scored

**Send**:
A move fixing which small board the opponent must play in — the one at the position the move took within its own board.
_Avoid_: forced move, redirect

### Wall clock

**Dial**:
The round marked surface the hands are read against; one per city.
_Avoid_: face, clock face

**City**:
One of the three places a dial keeps time for — London, Hong Kong, New York.
_Avoid_: zone, location, region

**Daylight**:
Whether the sun is up in a dial's city, said by the dial being coloured light or dark.
_Avoid_: AM/PM, day mode, night mode

**Hand**:
One of the three pointers turning about the centre of the dial — hour, minute or second.
_Avoid_: pointer, needle, arm

**Tick**:
The second hand's once-a-second jump from one position to the next.
_Avoid_: step, beat, pulse

**Mark**:
One of the sixty divisions printed on the dial; the twelve at the hours are drawn heavier.
_Avoid_: tick mark (ambiguous with Tick), graduation, notch

### Table football

**Rod**:
A row of figures belonging to one side, spanning the pitch and sliding as one piece.
_Avoid_: bar, row, spindle

**Figure**:
One of the little men fixed to a rod. Never the person playing.
_Avoid_: player, man, peg

**Slide**:
Moving one rod along its own axis — a player's whole defence.
_Avoid_: shift, nudge

**Strike**:
Playing the ball by dragging on it, direction and speed in one gesture.
_Avoid_: kick, shot, hit

**Turn**:
One slide and one strike by one player, ending when the ball comes to rest.
_Avoid_: move, go, play

### Pong

**Court**:
The walled rectangle the ball travels in, with a paddle at each end and an open scoring end behind each paddle.
_Avoid_: board, field, table, arena

**Paddle**:
The bar one player moves up and down at their own end of the court.
_Avoid_: bat, racket, slider

**Rally**:
The ball in play, from one serve until it passes a paddle.
_Avoid_: volley, exchange, point (ambiguous with the score)

**Serve**:
Putting the ball back into play from the centre after a point, towards the side that conceded.
_Avoid_: kickoff, launch, restart

**Same-keyboard**:
Two people playing at one device at the same time, each on their own keys. Not Hot-seat, which is turn-taking.
_Avoid_: hot-seat, local multiplayer, couch co-op

### Agent editor

**Work-tree**:
The one folder on disk opened for a session — everything the file tree shows and everything a checkpoint covers.
_Avoid_: project, workspace, repo, directory

**Shadow repo**:
The git repository the app keeps for itself, its git-dir outside the work-tree, holding the checkpoints. Never the person's own repository.
_Avoid_: history, backup, snapshot store

**Run**:
One task given to the agent, from the prompt until the agent stops or is stopped.
_Avoid_: session, conversation, job, task

**Agent turn**:
One message from the agent and every tool call under it. The unit a checkpoint covers.
_Avoid_: step, message, turn (ambiguous with table football's Turn)

**Checkpoint**:
One commit in the shadow repo: the work-tree as it stood after an agent turn, or after a hand-edit.
_Avoid_: snapshot, save point, commit, restore point

**Baseline**:
The checkpoint taken when a folder is opened, before the agent has done anything.
_Avoid_: initial commit, zero state, clean state

**Rewind**:
Restoring the work-tree to a chosen checkpoint, discarding every checkpoint after it.
_Avoid_: revert, undo, roll back, restore

**Hand-edit**:
A change the person types and saves in the editor, as opposed to one the agent makes.
_Avoid_: manual edit, user edit, local change

### Resignation letter

**Placeholder**:
Bracketed text standing in for a detail only the writer knows — a name, a job title, a date — left for them to replace by hand.
_Avoid_: blank, field, variable, token

**Last working day**:
The named date the writer stops work, two weeks after the letter is dated. Not the date the letter is written.
_Avoid_: end date, leaving date, effective date
