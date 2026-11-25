# Design — The Vanishing Draft

## Architecture
Single-page static app. Three layers:
- **State**: one plain object — `words` (array of {text, opacity, ghost}), `saved` flag, `books`, `stats`, `theme`.
- **Fade engine**: pure function `createFadeEngine(config)`. It owns the word list and the transitions (tick → next word one opacity step; keystroke → restore one ghost word; save → restore all; bind → split live words from ghost words). No DOM inside. Node tests drive it directly.
- **View**: `render()` rebuilds the manuscript spans from state. The textarea is the input surface; the manuscript is the visible surface where fading shows. Splitting input from display removes caret fights entirely.

## Data
- `vd.draft`: `{ text, savedAt }`.
- `vd.books`: array of `{ id, title, createdAt, body, lostWords }`.
- `vd.stats`: `{ wordsWritten, wordsLost, booksBound, longestRunSec }`.
- Word tokenization: split on whitespace, keep the separator attached to the preceding word for faithful reassembly.

## Timing
- Idle threshold: 5000 ms. Fade tick: 1200 ms per word. Timer: single `setInterval` at 100 ms driving idle countdown and fade ticks; the fade itself steps on the 1200 ms grid.

## Themes
- Dark desk (default): bg #171a17, paper #1f241f, ink #e8e2d4, accent candle-amber #d9a441, ghost #7d8a7d.
- Light parchment: bg #ece5d3, paper #f7f2e4, ink #2b2620, accent #8a5a17, ghost #8a938a.
- Contrast is computed in the test suite from the CSS variables and asserted ≥ 4.5:1 for body ink on paper in both themes.

## Error handling
- localStorage unavailable → in-memory mode + banner. No crash.
- Empty draft + Bind → button disabled, no empty book is created.
- Export uses a Blob + temporary anchor; no server involved.
