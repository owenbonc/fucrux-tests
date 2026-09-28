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

### Digital clock

**Readout**:
The one line of digits a clock's time is read from — `14:32:08`. In the Digital clock it is the whole of the page.
_Avoid_: display, face, dial, screen

**Advance**:
The readout's once-a-second change to the next second. Not Tick, which is the Wall clock's second hand.
_Avoid_: tick, refresh, update, redraw

### Alarm clock

**Alarm**:
The one time of day set on the clock for it to ring at. Never the ringing itself.
_Avoid_: reminder, timer, wake time

**Armed**:
An alarm is set and waiting for its time to come round.
_Avoid_: enabled, active, on, scheduled

**Ringing**:
The clock announcing the alarm — tone and the page's visible change together.
_Avoid_: going off, firing, alerting, sounding

**Tone**:
The sound made while ringing, generated in the page rather than played from a file.
_Avoid_: sound, alert, buzzer, chime

**Dismiss**:
Stopping the ringing, which also disarms the alarm.
_Avoid_: stop, cancel, silence, acknowledge

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

### Snake

**Board**:
The walled grid of square cells the snake travels in. Not Court, which is Pong's.
_Avoid_: grid, arena, field

**Cell**:
One square of the board — the unit the snake occupies and moves by.
_Avoid_: square (ambiguous with tic-tac-toe's Square), tile, pixel

**Step**:
The snake's move by one cell. The interval between steps shortens as it eats.
_Avoid_: tick, frame, move

**Apple**:
The piece on the board that lengthens the snake by one cell and scores a point when the head reaches it.
_Avoid_: food, pellet, dot

**Sour fruit**:
The piece that takes points away when eaten, put on the board by eating an Apple.
_Avoid_: bad apple, poison, rotten fruit, obstacle

**Cost**:
The number of points a sour fruit takes, rolled when it appears and drawn on it.
_Avoid_: penalty, value, damage

**Mode**:
Normal or Hard — how often eating an Apple puts a sour fruit on the board.
_Avoid_: difficulty, level

**Crash**:
The head entering a wall or a cell of the snake's own body, ending the game.
_Avoid_: death, collision, game over

### Flappy Bird

**Flap**:
The bird's one upward kick, given by Space, a click or a tap.
_Avoid_: jump, hop, tap (the input, not the move)

**Pipe pair**:
One top pipe and one bottom pipe scrolling in together, with the gap between them.
_Avoid_: obstacle, column, wall

**Gap**:
The opening between the two pipes of a pair that the bird must fly through to score.
_Avoid_: hole, opening, window

**Best**:
The highest score reached this page visit; lost when the page closes.
_Avoid_: high score, record

### Penalty shootout

**Kick**:
One penalty taken by one side, ending in a goal or a miss.
_Avoid_: shot, penalty, strike (table football's)

**Zone**:
One of the six parts of the goal mouth — left, centre or right, each high or low.
_Avoid_: area, corner, sector

**Dive**:
The keeper's choice of zone for a kick, made before the ball is struck.
_Avoid_: guess, save attempt, block

**Power bar**:
The swinging gauge the shooter stops to set a kick's strength; its top band sends the ball over the bar.
_Avoid_: meter, strength bar

**Sudden death**:
Kicks taken one each after five apiece leave the sides level, until one scores and the other doesn't.
_Avoid_: overtime, extra time, tiebreak

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

### Idea box

**Idea**:
One startup idea in the notebook — a title, notes, tags and the date it was added.
_Avoid_: entry, note (ambiguous with its notes), card, item

**Tag**:
A free-form word put on an idea, used to show only the ideas that carry it.
_Avoid_: label, category

**Prompt**:
The day's short nudge to think up an idea, written by Claude; inspiration only, never part of an idea.
_Avoid_: quote, tip, suggestion, idea of the day

**Offline prompt**:
A prompt taken from the list built into the page, shown when Claude can't be reached.
_Avoid_: fallback, default prompt

**Scene**:
The drawn coffee-shop counter by a window that the whole page is, with the notebook on the laptop's screen.
_Avoid_: background, theme, wallpaper

**Sky**:
What shows through the scene's window — its colour and a sun or moon — following the local time of day.
_Avoid_: background, day/night mode

### Poem

**Verse line**:
One line of the poem as it is written and read. Never Line, which is tic-tac-toe's three in a row.
_Avoid_: line, row, sentence

**Quatrain**:
A group of four verse lines rhyming ABAB, three of which open the sonnet.
_Avoid_: stanza, verse, block

**Couplet**:
The two rhyming verse lines that close the sonnet.
_Avoid_: ending, final stanza

**Volta**:
The turn in the poem's thought, at the ninth verse line.
_Avoid_: turn (ambiguous with table football's Turn), pivot, shift
