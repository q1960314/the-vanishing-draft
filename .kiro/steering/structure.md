# Structure — The Vanishing Draft

```
.
├── OPENING-CARD.md          # opening card: real problem, success standard, full scope, execution log
├── SPEC.md                  # spec: mechanism numbers, surfaces, acceptance tests T1–T10
├── .kiro/
│   ├── steering/
│   │   ├── product.md       # product context and design stance
│   │   ├── tech.md          # stack and rules
│   │   └── structure.md     # this file
│   ├── specs/vanishing-draft/
│   │   ├── requirements.md  # EARS-style requirements
│   │   ├── design.md        # design notes
│   │   └── tasks.md         # implementation task list
│   └── hooks/
│       ├── on-save-test.json       # run the test suite on save of app files
│       └── on-save-banned-words.json  # check saved docs for banned hedging words
├── app/
│   ├── index.html           # single page: desk, manuscript, meter, shelf
│   ├── styles.css           # dark desk theme (default) + light parchment theme
│   └── app.js               # fade engine + persistence + export + rendering
└── tests/
    └── run-tests.js         # Node test suite, zero dependencies
```

## Rules
- `/.kiro` sits at the project root and is never gitignored (Devpost requires it at the root).
- The app is static; the repo root is the project root, `app/` is the deployable folder.
- Tests live in `tests/` and run with plain `node tests/run-tests.js`.
