# The idea box fetches its daily prompt from Claude

The startup idea box is the one single-file app allowed a runtime network request: its daily prompt is written by Claude through the Messages API, called from the page with the person's own API key kept in `localStorage`. This is an exception to 0001's no-network rule, chosen because a fresh prompt each day was the point, and a fixed list written into the file was weighed and rejected.

## Consequences

- The key lives in the browser, which is acceptable only because the file is personal and opened on the person's own machine.
- The page must stay usable without the network: when the fetch can't happen, it falls back to a small built-in list of prompts.
- The exception covers this one request; ideas never leave the browser.
