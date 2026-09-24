# Checkpoints live in a shadow git repo the app owns

Checkpoints are commits in a git repository the app keeps for itself: its own git-dir under app data, its work-tree pointed at the opened folder. One commit per agent turn, plus one per hand-edit the person saves. The person's own `.git` is never written — no commits, no branches, no stashes, no index changes.

Committing to the user's repo would have made checkpoints visible to their normal git tools, but writes to their history, fights their index, and needs the folder to be a clean repo in the first place. Hand-rolled file snapshots avoid git entirely and then need diffs, renames and deletes built from scratch. The shadow repo gets real diffs for free and works on a folder that was never a repo.

Consequence: checkpoints are invisible outside the app, and are not a backup — they live in app data, keyed to the folder, and persist across relaunches. The shadow repo honours the work-tree's `.gitignore`, so anything ignored is outside the reach of rewind.
