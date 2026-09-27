# The Claude Code CLI is the agent

The app does not implement an agent loop and never calls a model API. It spawns the `claude` CLI headless in the work-tree and streams its events into the editor's own run view and timeline. Tools, reasoning and file editing are the CLI's; the interface and the checkpoints are the app's.

The alternative was using the CLI only as a model endpoint and owning the tool loop in the app, which buys control over each individual step and costs a re-implementation of everything the CLI already does well.

Consequence: the CLI's existing login is the only credential, so there are no API keys, no provider settings and no second auth path — and no fallback either: with the CLI missing or logged out, the app refuses to run a task. What the agent can do, and how well, is bounded by the installed CLI version.
