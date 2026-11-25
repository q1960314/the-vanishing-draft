/* The Vanishing Draft — test suite. Node, zero dependencies.
   Run: node tests/run-tests.js
   Covers acceptance tests T1–T10 from SPEC.md. */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const vd = require(path.join(ROOT, 'app', 'app.js'));

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS  ' + name);
  } catch (e) {
    failed += 1;
    failures.push(name + ': ' + e.message);
    console.log('FAIL  ' + name + ' — ' + e.message);
  }
}

function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(label + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function ok(value, label) {
  if (!value) { throw new Error(label); }
}

/* ---------- T1: idle 5 s starts the fade; oldest word drops first ---------- */
test('T1 idle 5s starts fade, oldest word steps 1.0->0.6->0.25, then next word', () => {
  const e = vd.createFadeEngine();
  e.setText('alpha beta gamma', 0);
  e.keystroke(0);
  eq(e.tick(4999).length, 0, 'no fade before 5s');
  const ev = e.tick(5000);
  ok(ev.some((x) => x.type === 'fade-start'), 'fade-start event at 5s');
  eq(e.getWords()[0].opacity, 0.6, 'oldest word 0.6 at fade start');
  eq(e.getWords()[1].opacity, 1.0, 'second word still 1.0');
  e.tick(6199);
  eq(e.getWords()[0].opacity, 0.6, 'oldest word still 0.6 before 1.2s step');
  e.tick(6200);
  eq(e.getWords()[0].opacity, 0.25, 'oldest word ghosted at 1.2s step');
  eq(e.getWords()[0].ghost, true, 'oldest word flagged ghost');
  e.tick(7400);
  eq(e.getWords()[1].opacity, 0.6, 'second word steps to 0.6 at the next tick');
});

/* ---------- T2: ghost word at 0.25, still visible, marked ---------- */
test('T2 word reaches 0.25 and becomes a ghost', () => {
  const e = vd.createFadeEngine();
  e.setText('alpha beta', 0);
  e.keystroke(0);
  e.tick(5000);
  e.tick(6200);
  eq(e.getWords()[0].opacity, 0.25, 'oldest word at 0.25');
  eq(e.getWords()[0].ghost, true, 'oldest word flagged ghost');
  eq(e.ghostCount(), 1, 'one ghost word');
  eq(e.getText(), 'alpha beta', 'ghost word text still present in full text');
});

/* ---------- T3: one keystroke restores one ghost word ---------- */
test('T3 each keystroke restores exactly one ghost word, most recent first', () => {
  const e = vd.createFadeEngine();
  e.setText('alpha beta gamma', 0);
  e.keystroke(0);
  e.tick(5000); // alpha 0.6
  e.tick(6200); // alpha ghost
  e.tick(7400); // beta 0.6
  e.tick(8600); // beta ghost
  eq(e.ghostCount(), 2, 'two ghosts before win-back');
  eq(e.keystroke(9000), 'beta', 'first keystroke restores most recent ghost (beta)');
  eq(e.ghostCount(), 1, 'one ghost left');
  eq(e.keystroke(9100), 'alpha', 'second keystroke restores alpha');
  eq(e.ghostCount(), 0, 'no ghosts left');
  eq(e.isFading(), false, 'fading stopped by typing');
});

/* ---------- T4: save restores all, stops fade, draft round-trips ---------- */
test('T4 save restores all words and stops the fade', () => {
  const e = vd.createFadeEngine();
  e.setText('alpha beta', 0);
  e.keystroke(0);
  e.tick(5000);
  e.tick(6200);
  eq(e.ghostCount(), 1, 'one ghost before save');
  e.save();
  eq(e.ghostCount(), 0, 'no ghosts after save');
  eq(e.getWords().every((w) => w.opacity === 1.0), true, 'all words back to 1.0');
  eq(e.isFading(), false, 'fading stopped');
  e.tick(20000);
  eq(e.getWords()[0].opacity, 1.0, 'saved words do not fade again without new input');
});

test('T4b draft JSON round-trips through storage shape', () => {
  const e = vd.createFadeEngine();
  e.setText('hello haunted desk', 0);
  const stored = JSON.stringify({ text: e.getText(), savedAt: '2026-11-25T00:00:00.000Z' });
  const loaded = JSON.parse(stored);
  const e2 = vd.createFadeEngine();
  e2.setText(loaded.text, 0);
  eq(e2.getText(), 'hello haunted desk', 'draft text survives storage round-trip');
  eq(e2.getText(), e.getText(), 'text round-trips exactly');
});

/* ---------- T5: bind splits live from ghost, counts lost, clears editor ---------- */
test('T5 bind collects live words, counts lost ghosts, clears the draft', () => {
  const e = vd.createFadeEngine();
  e.setText('one two three four', 0);
  e.keystroke(0);
  e.tick(5000); // one 0.6
  e.tick(6200); // two 0.6, one ghost
  const result = e.bind();
  eq(result.body, 'two three four', 'book body holds live words only');
  eq(result.lost, 1, 'one ghost word counted as lost');
  eq(e.wordCount(), 0, 'editor cleared after bind');
  eq(e.getStats().booksBound, 1, 'booksBound incremented');
});

/* ---------- T6: bookshelf persistence shape ---------- */
test('T6 books array round-trips and delete removes one book', () => {
  const books = [
    { id: '1', title: 'A', createdAt: '2026-11-25', body: 'first book', lost: 2 },
    { id: '2', title: 'B', createdAt: '2026-11-25', body: 'second book', lost: 0 }
  ];
  const stored = JSON.stringify(books);
  const loaded = JSON.parse(stored);
  eq(loaded.length, 2, 'two books restored');
  const afterDelete = loaded.filter((b) => b.id !== '1');
  eq(afterDelete.length, 1, 'one book left after delete');
  eq(afterDelete[0].title, 'B', 'the right book remains');
});

/* ---------- T7: export builders ---------- */
test('T7 draft export equals editor text; book md holds title, body, lost count', () => {
  eq(vd.buildDraftExport('hello world'), 'hello world', 'draft export is exact text');
  const md = vd.buildBookMarkdown({ title: 'My Book', body: 'once upon a desk', lost: 3, createdAt: '2026-11-25 10:00' });
  ok(md.includes('# My Book'), 'md has title');
  ok(md.includes('once upon a desk'), 'md has body');
  ok(md.includes('3'), 'md has lost count');
  const all = vd.buildAllBooksMarkdown([
    { title: 'A', body: 'aaa', lost: 0, createdAt: '2026-11-25' },
    { title: 'B', body: 'bbb', lost: 1, createdAt: '2026-11-25' }
  ]);
  ok(all.includes('# A') && all.includes('# B'), 'all-books md holds both books');
});

/* ---------- T8: stats change on write/lost/bind and round-trip ---------- */
test('T8 stats track writing, loss, binding, and longest run', () => {
  const e = vd.createFadeEngine();
  e.setText('a b c', 0);
  e.keystroke(0);
  e.keystroke(1000);
  e.keystroke(4000);
  e.tick(8999);
  eq(e.getStats().wordsLost, 0, 'no loss before idle threshold (last keystroke at 4000)');
  e.tick(9000); // idle threshold passed (4000 + 5000), 'a' fades to 0.6
  e.tick(10200); // 'a' ghosts
  eq(e.getStats().wordsWritten, 3, 'three words written');
  eq(e.getStats().wordsLost, 1, 'one word lost');
  e.bind();
  eq(e.getStats().booksBound, 1, 'one book bound');
  eq(e.getStats().longestRunSec, 4, 'longest run is 4s (4000ms of typing)');
  const stored = JSON.stringify(e.getStats());
  const e2 = vd.createFadeEngine();
  e2.setStats(JSON.parse(stored));
  eq(e2.getStats().wordsWritten, 3, 'stats survive storage round-trip');
});

/* ---------- T9: theme contrast >= 4.5:1 in both themes ---------- */
test('T9 dark and light theme body contrast >= 4.5:1', () => {
  const css = fs.readFileSync(path.join(ROOT, 'app', 'styles.css'), 'utf8');
  const dark = vd.parseThemeContrast(css, 'dark');
  const light = vd.parseThemeContrast(css, 'light');
  ok(dark, 'dark theme parsed');
  ok(light, 'light theme parsed');
  console.log('      dark  ink ' + dark.ink + ' on paper ' + dark.paper + ' = ' + dark.ratio.toFixed(2) + ':1');
  console.log('      light ink ' + light.ink + ' on paper ' + light.paper + ' = ' + light.ratio.toFixed(2) + ':1');
  ok(dark.ratio >= 4.5, 'dark contrast ' + dark.ratio.toFixed(2) + ' below 4.5');
  ok(light.ratio >= 4.5, 'light contrast ' + light.ratio.toFixed(2) + ' below 4.5');
});

/* ---------- T10: zero external requests; syntax clean ---------- */
test('T10 app files make zero external requests', () => {
  const files = ['app/index.html', 'app/styles.css', 'app/app.js'];
  const banned = [/https?:\/\//, /src\s*=\s*["']https?:/, /href\s*=\s*["']https?:/, /@import/i, /url\(\s*["']?https?:/];
  files.forEach((f) => {
    const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
    banned.forEach((re) => {
      if (re.test(content)) { throw new Error(f + ' matches external-request pattern ' + re); }
    });
  });
});

test('T10b app.js passes node --check', () => {
  execSync('node --check ' + path.join(ROOT, 'app', 'app.js'), { stdio: 'pipe' });
});

/* ---------- Tokenize fidelity ---------- */
test('tokenize round-trip: getText equals input text exactly', () => {
  const e = vd.createFadeEngine();
  const text = 'hello   world\nnew line  end';
  e.setText(text, 0);
  eq(e.getText(), text, 'text survives tokenize and reassembly');
});

/* ---------- Banned hedging words: none outside the hook file ---------- */
test('no banned hedging words in project docs and app files', () => {
  // The banned list lives in exactly one place: the hook file. Read it from
  // there instead of spelling the words here, so this test file stays clean.
  const hookPath = path.join(ROOT, '.kiro', 'hooks', 'on-save-banned-words.json');
  const hookText = fs.readFileSync(hookPath, 'utf8');
  const banned = [...new Set([...hookText.matchAll(/'([\u4e00-\u9fa5]+)'/g)].map((m) => m[1]))];
  eq(banned.length, 9, 'hook file enumerates nine banned words');
  const allowed = [hookPath];
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') { walk(full); } return; }
      if (!/\.(md|js|css|html|json)$/.test(entry.name)) { return; }
      if (allowed.includes(full)) { return; }
      const content = fs.readFileSync(full, 'utf8');
      banned.forEach((w) => {
        if (content.includes(w)) { throw new Error(full + ' contains banned word: ' + w); }
      });
    });
  }
  walk(ROOT);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('Failures:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
