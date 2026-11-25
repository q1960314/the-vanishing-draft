/* Headless browser verification for The Vanishing Draft.
   Drives chromium headless_shell over CDP with Node's built-in WebSocket.
   Zero dependencies. Usage:
     node tests/cdp-verify.js <http-port> <cdp-port> <out-dir>
   The HTTP server and the headless shell must already be running. */
'use strict';

const fs = require('fs');
const path = require('path');

const HTTP_PORT = process.argv[2] || '8901';
const CDP_PORT = process.argv[3] || '9222';
const OUT_DIR = process.argv[4] || path.join(__dirname, '..', 'verification');
const BASE_URL = 'http://127.0.0.1:' + HTTP_PORT + '/index.html';

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let consoleErrors = [];
let networkUrls = [];

function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (detail ? ' — ' + detail : ''));
}

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function main() {
  const targets = await getJson('http://127.0.0.1:' + CDP_PORT + '/json/list');
  const page = targets.find((t) => t.type === 'page');
  if (!page) { throw new Error('no page target found on CDP port ' + CDP_PORT); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 1;
  const pending = new Map();
  const loadWaiters = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) { reject(new Error(msg.error.message)); } else { resolve(msg.result); }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrors.push('exception: ' + (d.exception && d.exception.description ? d.exception.description : d.text));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push('console.error: ' + JSON.stringify(msg.params.args.map((a) => a.value || a.description || '')));
    }
    if (msg.method === 'Network.requestWillBeSent') {
      networkUrls.push(msg.params.request.url);
    }
    if (msg.method === 'Page.loadEventFired') {
      const w = loadWaiters.splice(0);
      w.forEach((r) => r());
    }
  };

  function send(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  function waitLoad() {
    return new Promise((resolve) => loadWaiters.push(resolve));
  }
  async function evalJs(expression) {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error('evaluate failed: ' + JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: BASE_URL });
  await waitLoad();
  await sleep(500);

  check('page loads with title', await evalJs('document.title.includes("Vanishing Draft")'), await evalJs('document.title'));
  check('editor present', await evalJs('!!document.getElementById("editor")'));
  check('manuscript present', await evalJs('!!document.getElementById("manuscript")'));

  // Type 8 words.
  await evalJs(`(function(){var ed=document.getElementById("editor");ed.value="the old desk remembers every unwritten word";ed.dispatchEvent(new Event("input",{bubbles:true}));return ed.value;})()`);
  await sleep(300);
  check('manuscript renders 7 word spans', (await evalJs('document.querySelectorAll("#manuscript .w").length')) === 7);
  check('all words start at full opacity', await evalJs('![...document.querySelectorAll("#manuscript .w")].some((s)=>s.classList.contains("fading")||s.classList.contains("ghost"))'));

  // Wait past the 5 s idle threshold: first word must fade.
  await sleep(5600);
  check('first word fading after 5s idle', await evalJs('document.querySelector("#manuscript .w").classList.contains("fading")'));
  check('status shows haunting', await evalJs('document.getElementById("status").textContent.includes("幽灵")'));

  // Wait one more step: first word becomes a ghost.
  await sleep(1500);
  check('first word is a ghost', await evalJs('document.querySelector("#manuscript .w").classList.contains("ghost")'));
  check('ghost counter reads 1', (await evalJs('window.__vd.engine.ghostCount()')) === 1);

  // One keystroke wins one ghost word back.
  await evalJs(`(function(){var ed=document.getElementById("editor");ed.value+="x";ed.dispatchEvent(new Event("input",{bubbles:true}));return ed.value;})()`);
  await sleep(300);
  check('one keystroke restores the ghost word', (await evalJs('window.__vd.engine.ghostCount()')) === 0);
  check('first word back at full opacity', await evalJs('!document.querySelector("#manuscript .w").classList.contains("ghost")'));

  // Save draft, reload, draft survives.
  await evalJs('document.getElementById("save-draft").click()');
  await sleep(300);
  check('draft persisted to localStorage', await evalJs('!!localStorage.getItem("vd.draft")'));
  await send('Page.reload', { ignoreCache: true });
  await waitLoad();
  await sleep(500);
  check('draft restored after reload', (await evalJs('document.getElementById("editor").value')).includes('the old desk remembers'));

  // Bind the book, shelf and storage follow.
  await evalJs('document.getElementById("bind-book").click()');
  await sleep(400);
  check('shelf shows 1 book', (await evalJs('document.querySelectorAll("#shelf li").length')) === 1);
  check('localStorage holds 1 book', (await evalJs('JSON.parse(localStorage.getItem("vd.books")).length')) === 1);
  check('editor cleared after bind', (await evalJs('document.getElementById("editor").value')) === '');
  check('stats count 1 book bound', (await evalJs('document.getElementById("stat-books").textContent')) === '1');
  check('shelf book opens', await evalJs('(function(){document.querySelector("#shelf .book-actions button").click();return !!document.querySelector("#shelf .book-body");})()'));

  // Theme toggle flips theme and persists across reload.
  await evalJs('document.getElementById("theme-toggle").click()');
  await sleep(200);
  check('theme switches to light', (await evalJs('document.documentElement.getAttribute("data-theme")')) === 'light');
  await send('Page.reload', { ignoreCache: true });
  await waitLoad();
  await sleep(400);
  check('light theme persists after reload', (await evalJs('document.documentElement.getAttribute("data-theme")')) === 'light');
  const shotLight = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'app-light.png'), Buffer.from(shotLight.data, 'base64'));
  await evalJs('document.getElementById("theme-toggle").click()');
  await sleep(200);

  // Screenshot for the record.
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'app-dark.png'), Buffer.from(shot.data, 'base64'));

  // Console errors and network requests.
  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | ') || 'none');
  const external = networkUrls.filter((u) => !u.startsWith('http://127.0.0.1:' + HTTP_PORT) && !u.startsWith('data:') && u !== 'about:blank');
  check('zero external network requests', external.length === 0, external.join(', ') || 'only local requests: ' + networkUrls.length);

  fs.writeFileSync(path.join(OUT_DIR, 'cdp-result.json'), JSON.stringify({ checks: results, consoleErrors, networkUrls }, null, 2));
  ws.close();

  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' browser checks passed');
  if (failed.length > 0) { process.exit(1); }
}

main().catch((e) => {
  console.error('CDP verify crashed: ' + e.message);
  process.exit(2);
});
