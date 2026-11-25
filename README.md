# The Vanishing Draft — 会消失的草稿

A haunted writing desk. Kiroween 2026, Costume Contest.

## The problem

Writers stall because a blank page has no cost: you can stop and rewrite at any time, so delay is free. Existing tools either give a blank whiteboard (no pressure) or punish too hard (delete everything on pause, so people refuse to use them).

## The mechanism

Stop typing for 5 seconds and your unsaved words start to fade, one word every 1.2 seconds, oldest first. Each word steps 1.0 → 0.6 → 0.25 opacity; at 0.25 it becomes a ghost word — grey-green, marked, still visible. Every keystroke wins back one ghost word, most recent first. Nothing is ever deleted without warning.

- **Save draft**: all words return to full opacity, the fade stops, the draft is stored in localStorage (`vd.draft`).
- **Bind into a book**: words at full opacity go into a book; ghost words are counted as lost and do not enter the book. Books live on the shelf in localStorage (`vd.books`).
- **Export**: draft as `.txt`, one book or all books as `.md`.
- **Ledger**: words written, words lost to ghosts, books bound, longest continuous writing run (localStorage `vd.stats`).
- **Themes**: dark desk and light parchment. Both keep body contrast above 4.5:1 (measured: dark 12.22:1, light 13.40:1).

## Run it

Open `app/index.html` in a browser, or serve `app/` on any static host:

```sh
python3 -m http.server 8000 --directory app
```

No build step, no dependencies, no network requests at runtime. Data stays in your browser (localStorage).

## Verify it

```sh
node tests/run-tests.js
```

14 checks: fade state machine (T1–T10), persistence shapes, export builders, contrast ratios parsed from `styles.css`, zero external requests.

A headless-browser run (`tests/cdp-verify.js`, 22 checks, evidence in `verification/cdp-result.json`) drives the real page: type, wait, watch the fade, type again to win words back, save, refresh, bind, check the shelf. Zero console errors, zero external requests.

## Files

- `app/` — the app: `index.html`, `styles.css`, `app.js` (the fade engine is the pure function `createFadeEngine`, unit-tested in Node with no DOM)
- `.kiro/` — Kiro steering (`product`, `tech`, `structure`), spec (`requirements`, `design`, `tasks`), hooks (test run + banned-words check on save)
- `SPEC.md` — the full spec; every number in the mechanism is fixed there
- `tests/` — Node test suite + headless-browser verification
- `verification/` — headless-browser run evidence (JSON)

## Built with Kiro

Built with Kiro CLI (logged in as Builder ID `lymmwang@gmail.com`) plus the steering, spec, and hooks in `/.kiro`. Kiro agent sessions are currently suspended at the account level pending identity verification with AWS Kiro support, so the app code was written directly per the Kiro spec and verified locally (Node 14/14, headless browser 22/22). The suspension is an account matter for the owner to clear with AWS Kiro support; it does not change what the app does.

## License

MIT — see `LICENSE`.
