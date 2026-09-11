# Test Project

## Screenplay

**[THE LONG COLD TOW](script/the-long-cold-tow.fountain)** — a feature-format space
adventure in fourteen scenes. A salvage tug crew races a dying star to reach a
derelict colony ship carrying four thousand and eleven sleepers, and finds a
corporate cutter already waiting for the last watchstander to die.

The script is written in [Fountain](https://fountain.io), the plain-text
screenplay markup, so it reads as-is in any editor and imports into standard
screenwriting software.

### Checking the script

Format and story checks run on the committed file with the Node test runner
(no dependencies):

```sh
node --test "script/*.test.mjs"
```
