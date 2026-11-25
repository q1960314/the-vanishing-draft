# Tech — The Vanishing Draft

## Stack
- Static files only: `app/index.html`, `app/styles.css`, `app/app.js`. No build step, no dependencies, no framework.
- `app.js` holds all logic. The fade engine is a pure function (`createFadeEngine`) with no DOM dependency, so it is unit-testable in Node.
- Persistence: localStorage keys `vd.draft`, `vd.books`, `vd.stats`. If localStorage is unavailable, the app runs in memory and shows a banner.
- Verification: `tests/run-tests.js` (Node, zero dependencies). It covers the fade state machine, persistence shapes, export builders, and contrast ratios parsed from `styles.css`.

## Rules
- Never add a dependency to fix something a plain function solves.
- Never fetch anything from the network at runtime. Zero external requests (verified in tests).
- Every number in the mechanism is fixed in `SPEC.md`: idle 5 s, fade step 1.2 s per word, opacity 1.0 → 0.6 → 0.25 (ghost). Change a number only by changing the spec first.
- No hedging words in any user-facing text or documentation. The nine banned words are enumerated in `.kiro/hooks/on-save-banned-words.json`; the hook blocks any write that contains one. A claim is either definite with evidence, or written as "未证实 + 缺什么证据 + 下一步怎么验".
- Keep the app runnable by opening `app/index.html` directly or serving `app/` on any static host.
