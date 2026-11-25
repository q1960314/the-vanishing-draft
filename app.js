/* The Vanishing Draft — app.js
   Static single-page app. No dependencies, no network requests.
   The fade engine is a pure function (no DOM) and is exported for Node tests. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.VanishingDraft = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var IDLE_MS = 5000;
  var STEP_MS = 1200;
  var OPACITY_STEPS = [1.0, 0.6, 0.25];

  /* Split text into word tokens, keeping each word's trailing whitespace. */
  function tokenize(text) {
    var out = [];
    var re = /(\S+)(\s*)/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      out.push({ text: m[1], sep: m[2] });
    }
    return out;
  }

  function createFadeEngine(config) {
    var cfg = config || {};
    var idleMs = cfg.idleMs || IDLE_MS;
    var stepMs = cfg.stepMs || STEP_MS;
    var words = [];
    var lastInputAt = null;
    var nextFadeAt = null;
    var fading = false;
    var runStart = null;
    var stats = { wordsWritten: 0, wordsLost: 0, booksBound: 0, longestRunSec: 0 };

    function setText(text, now) {
      var tokens = tokenize(text);
      var next = [];
      for (var i = 0; i < tokens.length; i++) {
        var old = words[i];
        if (old && old.text === tokens[i].text) {
          next.push({ text: old.text, sep: tokens[i].sep, opacity: old.opacity, ghost: old.ghost });
        } else {
          next.push({ text: tokens[i].text, sep: tokens[i].sep, opacity: 1.0, ghost: false });
          stats.wordsWritten += 1;
        }
      }
      words = next;
      if (text.length > 0) { fading = false; nextFadeAt = null; }
      return words;
    }

    function keystroke(now) {
      lastInputAt = now;
      if (runStart === null) { runStart = now; }
      fading = false;
      nextFadeAt = null;
      var restored = null;
      for (var i = words.length - 1; i >= 0; i--) {
        if (words[i].ghost) {
          words[i].ghost = false;
          words[i].opacity = 1.0;
          restored = words[i].text;
          break;
        }
      }
      return restored;
    }

    function endRun(now) {
      if (runStart !== null && lastInputAt !== null) {
        var runSec = Math.floor((lastInputAt - runStart) / 1000);
        if (runSec > stats.longestRunSec) { stats.longestRunSec = runSec; }
      }
      runStart = null;
    }

    /* Advance time. Returns a list of events that happened in this tick. */
    function tick(now) {
      var events = [];
      if (lastInputAt === null || words.length === 0) { return events; }
      if (!fading && now - lastInputAt >= idleMs) {
        endRun(now);
        fading = true;
        nextFadeAt = now;
        events.push({ type: 'fade-start' });
      }
      if (fading && now >= nextFadeAt) {
        var target = -1;
        for (var i = 0; i < words.length; i++) {
          if (words[i].opacity > 0.25) { target = i; break; }
        }
        if (target >= 0) {
          var w = words[target];
          var step = OPACITY_STEPS.indexOf(w.opacity);
          w.opacity = OPACITY_STEPS[Math.min(step + 1, OPACITY_STEPS.length - 1)];
          if (w.opacity === 0.25) {
            w.ghost = true;
            stats.wordsLost += 1;
            events.push({ type: 'ghost', word: w.text });
          } else {
            events.push({ type: 'fade', word: w.text, opacity: w.opacity });
          }
          nextFadeAt = now + stepMs;
        }
      }
      return events;
    }

    function save() {
      for (var i = 0; i < words.length; i++) {
        words[i].opacity = 1.0;
        words[i].ghost = false;
      }
      fading = false;
      nextFadeAt = null;
      lastInputAt = null;
      runStart = null;
      return words;
    }

    /* Bind live words into a book. Ghost words stay behind and are counted. */
    function bind() {
      var live = [];
      var lost = 0;
      for (var i = 0; i < words.length; i++) {
        if (words[i].ghost) { lost += 1; }
        else { live.push(words[i].text + words[i].sep); }
      }
      var body = live.join('').replace(/\s+$/, '');
      words = [];
      fading = false;
      nextFadeAt = null;
      lastInputAt = null;
      runStart = null;
      stats.booksBound += 1;
      return { body: body, lost: lost };
    }

    function ghostCount() {
      var n = 0;
      for (var i = 0; i < words.length; i++) { if (words[i].ghost) { n += 1; } }
      return n;
    }

    function safeMsRemaining(now) {
      if (lastInputAt === null) { return idleMs; }
      if (fading) { return 0; }
      return Math.max(0, idleMs - (now - lastInputAt));
    }

    function getText() {
      var out = [];
      for (var i = 0; i < words.length; i++) { out.push(words[i].text + words[i].sep); }
      return out.join('');
    }

    function getWords() {
      return words.map(function (w) {
        return { text: w.text, sep: w.sep, opacity: w.opacity, ghost: w.ghost };
      });
    }

    function getStats() {
      return {
        wordsWritten: stats.wordsWritten,
        wordsLost: stats.wordsLost,
        booksBound: stats.booksBound,
        longestRunSec: stats.longestRunSec
      };
    }

    function setStats(s) {
      if (!s) { return; }
      stats.wordsWritten = s.wordsWritten || 0;
      stats.wordsLost = s.wordsLost || 0;
      stats.booksBound = s.booksBound || 0;
      stats.longestRunSec = s.longestRunSec || 0;
    }

    return {
      setText: setText,
      keystroke: keystroke,
      tick: tick,
      save: save,
      bind: bind,
      ghostCount: ghostCount,
      safeMsRemaining: safeMsRemaining,
      getText: getText,
      getWords: getWords,
      getStats: getStats,
      setStats: setStats,
      isFading: function () { return fading; },
      wordCount: function () { return words.length; }
    };
  }

  /* ---- Export builders (pure) ---- */

  function buildDraftExport(text) {
    return text;
  }

  function buildBookMarkdown(book) {
    var lines = [];
    lines.push('# ' + book.title);
    lines.push('');
    lines.push(book.body);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('被幽灵带走的词：' + book.lost + ' 个');
    lines.push('装订时间：' + book.createdAt);
    return lines.join('\n');
  }

  function buildAllBooksMarkdown(books) {
    return books.map(buildBookMarkdown).join('\n\n---\n\n');
  }

  function autoTitle(body) {
    var head = tokenize(body).slice(0, 6).map(function (t) { return t.text; }).join(' ');
    var d = new Date();
    var date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return head ? head + ' · ' + date : '无题 · ' + date;
  }

  /* ---- Contrast helpers (pure, used by tests) ---- */

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function luminance(rgb) {
    function ch(c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * ch(rgb[0]) + 0.7152 * ch(rgb[1]) + 0.0722 * ch(rgb[2]);
  }

  function contrastRatio(hexA, hexB) {
    var l1 = luminance(hexToRgb(hexA));
    var l2 = luminance(hexToRgb(hexB));
    var hi = Math.max(l1, l2);
    var lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  /* Read --paper and --ink out of a [data-theme="..."] block in styles.css. */
  function parseThemeContrast(cssText, theme) {
    var blockRe = new RegExp('\\[data-theme="' + theme + '"\\]\\s*\\{([^}]*)\\}', 'm');
    var block = blockRe.exec(cssText);
    if (!block) { return null; }
    function varValue(name) {
      var re = new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{3,6})', 'm');
      var m = re.exec(block[1]);
      return m ? m[1] : null;
    }
    var paper = varValue('paper');
    var ink = varValue('ink');
    if (!paper || !ink) { return null; }
    return { paper: paper, ink: ink, ratio: contrastRatio(paper, ink) };
  }

  /* ---- Browser wiring (only runs where document exists) ---- */

  function initBrowser() {
    var $ = function (id) { return document.getElementById(id); };
    var editor = $('editor');
    var manuscript = $('manuscript');
    var manuscriptEmpty = $('manuscript-empty');
    var statusEl = $('status');
    var meterSafe = $('meter-safe');
    var meterGhosts = $('meter-ghosts');
    var meterLost = $('meter-lost');
    var shelfEl = $('shelf');
    var shelfEmpty = $('shelf-empty');
    var bookTitleInput = $('book-title');
    var storageBanner = $('storage-banner');

    var storageOK = true;
    var memoryStore = {};
    function storeGet(key) {
      try {
        if (!storageOK) { return memoryStore[key] || null; }
        return window.localStorage.getItem(key);
      } catch (e) {
        storageOK = false;
        storageBanner.hidden = false;
        return memoryStore[key] || null;
      }
    }
    function storeSet(key, value) {
      try {
        if (!storageOK) { memoryStore[key] = value; return; }
        window.localStorage.setItem(key, value);
      } catch (e) {
        storageOK = false;
        storageBanner.hidden = false;
        memoryStore[key] = value;
      }
    }
    function storeRemove(key) {
      try {
        if (!storageOK) { delete memoryStore[key]; return; }
        window.localStorage.removeItem(key);
      } catch (e) {
        storageOK = false;
        storageBanner.hidden = false;
        delete memoryStore[key];
      }
    }
    try {
      window.localStorage.setItem('__vd_probe__', '1');
      window.localStorage.removeItem('__vd_probe__');
    } catch (e) {
      storageOK = false;
      storageBanner.hidden = false;
    }

    var engine = createFadeEngine();
    var books = [];
    var expandedBookId = null;

    try {
      var savedStats = JSON.parse(storeGet('vd.stats') || 'null');
      if (savedStats) { engine.setStats(savedStats); }
    } catch (e) { /* corrupted stats start at zero */ }
    try {
      var savedBooks = JSON.parse(storeGet('vd.books') || 'null');
      if (Array.isArray(savedBooks)) { books = savedBooks; }
    } catch (e) { books = []; }
    try {
      var savedDraft = JSON.parse(storeGet('vd.draft') || 'null');
      if (savedDraft && savedDraft.text) {
        editor.value = savedDraft.text;
        engine.setText(savedDraft.text, Date.now());
        engine.save();
      }
    } catch (e) { /* corrupted draft starts empty */ }

    var theme = storeGet('vd.theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    function persistAll() {
      storeSet('vd.stats', JSON.stringify(engine.getStats()));
      storeSet('vd.books', JSON.stringify(books));
    }

    function renderManuscript() {
      var words = engine.getWords();
      manuscriptEmpty.hidden = words.length > 0;
      manuscript.textContent = '';
      for (var i = 0; i < words.length; i++) {
        var span = document.createElement('span');
        span.className = 'w' + (words[i].ghost ? ' ghost' : (words[i].opacity < 1.0 ? ' fading' : ''));
        span.textContent = words[i].text + words[i].sep;
        manuscript.appendChild(span);
      }
    }

    function renderShelf() {
      shelfEmpty.hidden = books.length > 0;
      shelfEl.textContent = '';
      books.forEach(function (book) {
        var li = document.createElement('li');
        var head = document.createElement('div');
        head.className = 'book-head';
        var title = document.createElement('span');
        title.className = 'book-title';
        title.textContent = book.title;
        var meta = document.createElement('span');
        meta.className = 'book-meta';
        meta.textContent = book.createdAt + ' · 被带走 ' + book.lost + ' 个词';
        var actions = document.createElement('div');
        actions.className = 'book-actions';
        var openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.textContent = expandedBookId === book.id ? '收起' : '打开';
        openBtn.addEventListener('click', function () {
          expandedBookId = expandedBookId === book.id ? null : book.id;
          renderShelf();
        });
        var exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.textContent = '导出 .md';
        exportBtn.addEventListener('click', function () { download(book.title + '.md', buildBookMarkdown(book), 'text/markdown'); });
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = '删除';
        delBtn.addEventListener('click', function () {
          books = books.filter(function (b) { return b.id !== book.id; });
          if (expandedBookId === book.id) { expandedBookId = null; }
          persistAll();
          renderShelf();
          renderStats();
        });
        actions.appendChild(openBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(delBtn);
        head.appendChild(title);
        head.appendChild(meta);
        head.appendChild(actions);
        li.appendChild(head);
        if (expandedBookId === book.id) {
          var body = document.createElement('p');
          body.className = 'book-body';
          body.textContent = book.body;
          li.appendChild(body);
        }
        shelfEl.appendChild(li);
      });
    }

    function renderStats() {
      var s = engine.getStats();
      $('stat-written').textContent = String(s.wordsWritten);
      $('stat-lost').textContent = String(s.wordsLost);
      $('stat-books').textContent = String(books.length);
      $('stat-run').textContent = String(s.longestRunSec) + ' 秒';
      meterGhosts.textContent = String(engine.ghostCount());
      meterLost.textContent = String(s.wordsLost);
    }

    function renderStatus(now) {
      var words = engine.wordCount();
      var ghosts = engine.ghostCount();
      statusEl.classList.remove('haunting');
      if (words === 0) {
        statusEl.textContent = '写点什么——停下 5 秒，幽灵就开始动手。';
        meterSafe.textContent = '—';
        return;
      }
      if (engine.isFading()) {
        statusEl.classList.add('haunting');
        statusEl.textContent = ghosts === words
          ? '整页都成了幽灵——敲字一个一个抢回来，或点保存草稿。'
          : '幽灵正在带走你的字——敲字抢回来。';
        meterSafe.textContent = '0.0 秒（渐隐中）';
        return;
      }
      var remain = engine.safeMsRemaining(now);
      meterSafe.textContent = (remain / 1000).toFixed(1) + ' 秒';
      statusEl.textContent = remain > 2000 ? '写作中——幽灵在 ' + (remain / 1000).toFixed(1) + ' 秒后开始。' : '幽灵逼近中——继续写，别停。';
    }

    function renderButtons() {
      var hasText = engine.wordCount() > 0;
      var hasLive = engine.getWords().some(function (w) { return !w.ghost; });
      $('save-draft').disabled = !hasText;
      $('bind-book').disabled = !hasLive;
      $('export-draft').disabled = !hasText;
      $('export-all').disabled = books.length === 0;
    }

    function renderAll() {
      var now = Date.now();
      renderManuscript();
      renderShelf();
      renderStats();
      renderStatus(now);
      renderButtons();
    }

    function download(filename, text, mime) {
      var blob = new Blob([text], { type: mime + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    editor.addEventListener('input', function () {
      var now = Date.now();
      engine.setText(editor.value, now);
      engine.keystroke(now);
      renderManuscript();
      renderStats();
      renderStatus(now);
      renderButtons();
    });

    $('save-draft').addEventListener('click', function () {
      engine.save();
      storeSet('vd.draft', JSON.stringify({ text: engine.getText(), savedAt: new Date().toISOString() }));
      persistAll();
      renderAll();
      statusEl.textContent = '已保存——字是安全的，再写会重新开始计时。';
    });

    $('bind-book').addEventListener('click', function () {
      var result = engine.bind();
      if (!result.body) { return; }
      var title = bookTitleInput.value.trim() || autoTitle(result.body);
      var now = new Date();
      var book = {
        id: String(now.getTime()) + '-' + Math.floor(Math.random() * 10000),
        title: title,
        createdAt: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
        body: result.body,
        lost: result.lost
      };
      books.unshift(book);
      bookTitleInput.value = '';
      editor.value = '';
      storeRemove('vd.draft');
      persistAll();
      renderAll();
    });

    $('export-draft').addEventListener('click', function () {
      download('草稿.txt', buildDraftExport(engine.getText()), 'text/plain');
    });

    $('export-all').addEventListener('click', function () {
      download('全部书.md', buildAllBooksMarkdown(books), 'text/markdown');
    });

    $('theme-toggle').addEventListener('click', function () {
      theme = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      storeSet('vd.theme', theme);
      this.textContent = theme === 'dark' ? '切换到浅色羊皮纸' : '切换到深色书桌';
    });
    $('theme-toggle').textContent = theme === 'dark' ? '切换到浅色羊皮纸' : '切换到深色书桌';

    var lastSignature = '';
    setInterval(function () {
      var now = Date.now();
      var events = engine.tick(now);
      var words = engine.getWords();
      var signature = words.map(function (w) { return w.text + ':' + w.opacity; }).join('|');
      if (signature !== lastSignature) {
        lastSignature = signature;
        renderManuscript();
        renderStats();
        renderButtons();
      }
      renderStatus(now);
      if (events.length > 0) { persistAll(); }
    }, 100);

    /* Test hook for headless verification: engine state, nothing else. */
    window.__vd = {
      engine: engine,
      books: function () { return books; }
    };

    renderAll();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBrowser);
    } else {
      initBrowser();
    }
  }

  return {
    createFadeEngine: createFadeEngine,
    tokenize: tokenize,
    buildDraftExport: buildDraftExport,
    buildBookMarkdown: buildBookMarkdown,
    buildAllBooksMarkdown: buildAllBooksMarkdown,
    autoTitle: autoTitle,
    hexToRgb: hexToRgb,
    contrastRatio: contrastRatio,
    parseThemeContrast: parseThemeContrast,
    IDLE_MS: IDLE_MS,
    STEP_MS: STEP_MS
  };
});
