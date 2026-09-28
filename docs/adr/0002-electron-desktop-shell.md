# The agent editor is an Electron desktop app, not a single-file browser toy

@docs/adr/0001-single-file-html-apps.md says every app here is one `.html` file opened from disk. The rewindable agent editor breaks that: it needs to read and write a real folder, spawn the `claude` CLI, and run git — none of which a `file://` page can do.

Electron over Tauri because the main process is Node: file access, process spawning and git are all first-party, and the whole app is one language. Tauri's smaller installs are worth nothing here, as nothing is packaged — the app runs from source on macOS, with no signing, notarisation or auto-update.

Consequence: this repository now holds both single-file toys and one project with a toolchain. ADR 0001 still governs the toys.
