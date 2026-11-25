# Product — The Vanishing Draft

## What it is
A haunted writing desk. Costume Contest entry for Kiroween 2026. A single-page web app: you write, and if you stop typing, your unsaved words fade into ghosts one by one. Keep writing to win them back. Bind a finished piece into a book.

## Real problem
Writers stall because a blank page has no cost — you can stop and rewrite at any time, so delay is free. Existing tools either give a blank whiteboard (no pressure) or punish too hard (delete everything on pause, so people refuse to use them).

## Design stance
- The cost is visible and fair: words fade slowly, one at a time, oldest first, and every keystroke wins one back. Nothing is ever deleted without warning.
- Gothic is a decoration layer only: thin-line borders, serif headings, candle-amber accent. Body text stays clean and high-contrast. Never dark and dirty.
- The demo must be watchable: type a sentence, stop, watch words fade, type again, watch them return, bind the book. The whole loop fits in 60 seconds.

## Scope boundary
- Client-side only. localStorage only. No backend, no network requests, no external assets.
- Out of scope for this build: repo, deployment, video, Devpost submission (handled by the main thread after local verification).
