/* رها — کتابخانه: نمایش PDF و EPUB، پخش کتاب صوتی، نشانه‌گذاری و کپی */
window.RAHA_LIB = function (A) {
  'use strict';
  var S = A.S, esc = A.esc, num = A.num, fa = A.fa, $ = A.$;
  var VIEWS = A.VIEWS, AFTER = A.AFTER;

  // ---------- داده‌ها ----------
  if (!S.lib) S.lib = {};
  function rec(id) {
    if (!S.lib[id]) S.lib[id] = { pdf: null, epub: null, audio: null, marks: [] };
    if (!S.lib[id].marks) S.lib[id].marks = [];
    return S.lib[id];
  }
  if (!S.readerPrefs) S.readerPrefs = { theme: 'light', font: 100, vazir: true, pdfZoom: 1, pdfNight: false, speed: 1 };

  var BOOKS = null, booksPromise = null;
  function loadBooks() {
    if (BOOKS) return Promise.resolve(BOOKS);
    if (!booksPromise) {
      booksPromise = fetch('books/books.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; })
        .then(function (b) { BOOKS = b || []; return BOOKS; });
    }
    return booksPromise;
  }
  function findBook(id) { return (BOOKS || []).filter(function (b) { return b.id === id; })[0] || null; }
  loadBooks();

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? fa(h) + ':' + A.pad(m) : fa(m)) + ':' + A.pad(s);
  }
  function copyText(text) {
    text = String(text || '').trim();
    if (!text) { A.toast('متنی برای کپی نیست'); return; }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); A.toast('کپی شد'); } catch (e) { A.toast('کپی ممکن نشد'); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { A.toast('کپی شد'); }, fallback);
    else fallback();
  }
  function cover(b, size) {
    if (b.cover) return '<img src="' + esc(b.cover) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">';
    var palette = ['#1C7A52', '#1F5F8B', '#8A5A0E', '#5B3E96', '#14211B', '#9B4A2C'];
    var h = 0; for (var i = 0; i < b.id.length; i++) h = (h * 31 + b.id.charCodeAt(i)) >>> 0;
    return '<div style="width:100%;height:100%;background:' + palette[h % palette.length] + ';color:#fff;display:flex;flex-direction:column;justify-content:flex-end;padding:' + (size === 'big' ? '22px' : '12px') + ';box-sizing:border-box">' +
      '<div style="font-weight:800;font-size:' + (size === 'big' ? '22px' : '14px') + ';line-height:1.5">' + esc(b.title) + '</div>' +
      (b.author ? '<div style="font-size:' + (size === 'big' ? '13px' : '11px') + ';opacity:.85">' + esc(b.author) + '</div>' : '') + '</div>';
  }
  function progressLabel(b) {
    var r = S.lib[b.id];
    if (!r) return '';
    if (b.doc && b.doc.type === 'pdf' && r.pdf && r.pdf.total) return 'صفحه‌ی ' + num(r.pdf.page) + ' از ' + num(r.pdf.total);
    if (b.doc && b.doc.type === 'epub' && r.epub && typeof r.epub.pct === 'number') return num(Math.round(r.epub.pct * 100)) + '٪ خوانده شده';
    if (b.tracks.length && r.audio) return 'فصل ' + num(r.audio.t + 1) + ' از ' + num(b.tracks.length);
    return '';
  }
  function kinds(b) {
    var k = [];
    if (b.doc) k.push(b.doc.type === 'pdf' ? 'PDF' : 'EPUB');
    if (b.tracks.length) k.push('صوتی');
    return k;
  }

  // ---------- ویدیو، پادکست و مقاله‌ی فارسی (www/media.json) ----------
  var MEDIA = null;
  function loadMedia() {
    if (MEDIA) return Promise.resolve(MEDIA);
    return fetch('media.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { items: [] }; })
      .catch(function () { return { items: [] }; }).then(function (m) { MEDIA = (m && m.items) || []; return MEDIA; });
  }
  var libTab = 'books';
  var TABS_L = [['books', 'کتاب‌ها'], ['video', 'ویدیو'], ['podcast', 'پادکست'], ['article', 'مقاله']];
  function mediaList(type) {
    if (!MEDIA) { loadMedia().then(function () { if (A.route() === 'library') A.render(); }); return '<div class="muted">در حال بارگذاری…</div>'; }
    var list = MEDIA.filter(function (m) { return m.type === type || (type === 'podcast' && m.type === 'audiobook'); });
    if (!list.length) return '<div class="muted">هنوز موردی اضافه نشده است.</div>';
    var icon = type === 'video' ? A.I.play : type === 'podcast' ? A.I.headphones : A.I.bookOpen;
    return list.map(function (m) {
      return '<div class="card media-item"><div class="row" style="align-items:flex-start"><div class="media-ic">' + icon + '</div>' +
        '<div class="col" style="flex:1;gap:4px"><div style="font-size:15px;font-weight:700;line-height:1.7">' + esc(m.title) + '</div>' +
        '<div class="muted small">' + esc(m.source || '') + '</div>' +
        (m.note ? '<div class="small" style="line-height:1.8">' + esc(m.note) + '</div>' : '') + '</div></div>' +
        '<div class="row"><div class="lib-tags"><span>' + esc(m.platform || '') + '</span>' + (m.type === 'audiobook' ? '<span style="background:var(--amber-tint);color:var(--amber-ink)">کتاب صوتی</span>' : '') + '</div>' +
        '<button class="chip on" data-url="' + esc(m.url) + '">' + (type === 'article' ? 'خواندن' : type === 'video' ? 'تماشا' : 'شنیدن') + '</button></div></div>';
    }).join('') + '<div class="muted small" style="line-height:1.9">این محتواها در سایت سازندگانشان باز می‌شوند و ممکن است به اینترنت نیاز داشته باشند. مسئولیت محتوا با سازنده‌ی آن است.</div>';
  }

  // ---------- صفحه‌ی کتابخانه ----------
  VIEWS.library = function () {
    if (libTab !== 'books') {
      return '<div class="screen"><div class="h1">کتابخانه</div>' + libTabs() + mediaList(libTab) + '</div>' + A.nav('library');
    }
    if (!BOOKS) { loadBooks().then(function () { if (A.route() === 'library') A.render(); }); return '<div class="screen"><div class="h1">کتابخانه</div><div class="muted">در حال بارگذاری…</div></div>' + A.nav('library'); }
    var list = BOOKS;
    var body = !list.length
      ? '<div class="card" style="align-items:center;text-align:center;padding:32px 20px">' + A.I.book +
        '<div class="h2">هنوز کتابی اضافه نشده</div><div class="muted" style="line-height:1.9">کتاب‌های صوتی، PDF و EPUB مربوط به ترک سیگار به‌زودی اینجا قرار می‌گیرند.</div></div>'
      : '<div class="lib-grid">' + list.map(function (b) {
          var pl = progressLabel(b);
          return '<a class="lib-item" href="#book/' + encodeURIComponent(b.id) + '"><div class="lib-cover">' + cover(b) + '</div>' +
            '<div class="lib-title">' + esc(b.title) + '</div>' +
            '<div class="lib-tags">' + kinds(b).map(function (k) { return '<span>' + k + '</span>'; }).join('') + '</div>' +
            (pl ? '<div class="muted small">' + pl + '</div>' : '') + '</a>';
        }).join('') + '</div>';
    return '<div class="screen"><div class="h1">کتابخانه</div>' + libTabs() +
      '<div class="muted">کتاب‌ها و کتاب‌های صوتی برای همراهی در مسیر ترک</div>' + body + '</div>' + A.nav('library');
  };
  function libTabs() {
    return '<div class="seg">' + TABS_L.map(function (t) { return '<button style="flex:1" data-ltab="' + t[0] + '" class="' + (libTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ltab]'); if (!t) return;
    libTab = t.getAttribute('data-ltab'); A.render();
  });

  // ---------- صفحه‌ی هر کتاب ----------
  function markLine(b, m, i) {
    var icon = m.kind === 'hl' ? '<span class="mk mk-hl"></span>' : m.kind === 'audio' ? A.I.headphones : A.I.bookmark;
    var where = m.kind === 'audio' ? 'فصل ' + num(m.t + 1) + '، دقیقه‌ی <bdi dir="ltr">' + fmtTime(m.time) + '</bdi>' : esc(m.label || '');
    return '<div class="mark-row"><button class="mark-go" data-mark-go="' + i + '">' + icon +
      '<div class="col" style="flex:1;min-width:0;text-align:right"><div style="font-size:14px;font-weight:700">' + where + '</div>' +
      (m.text ? '<div class="mark-quote">«' + esc(m.text) + '»</div>' : '') +
      (m.note ? '<div class="muted small" style="line-height:1.8">' + esc(m.note) + '</div>' : '') + '</div></button>' +
      '<button class="icon-btn" style="width:40px;height:40px;background:transparent" data-mark-del="' + i + '" aria-label="حذف">' + A.I.trash + '</button></div>';
  }
  VIEWS.book = function (id) {
    if (!BOOKS) { loadBooks().then(function () { A.render(); }); return '<div class="screen"></div>'; }
    var b = findBook(id);
    if (!b) return '<div class="screen"><div class="h1">کتاب پیدا نشد</div><a class="chip" href="#library" style="align-self:flex-start;display:flex;align-items:center">بازگشت به کتابخانه</a></div>' + A.nav('library');
    var r = rec(b.id), pl = progressLabel(b);
    var marks = r.marks.map(function (m, i) { return { m: m, i: i }; }).reverse();
    return '<div class="screen">' +
      '<div class="title-bar"><a class="icon-btn" href="#library" aria-label="بازگشت">' + A.I.back + '</a><div class="muted">کتابخانه</div></div>' +
      '<div style="display:flex;gap:16px;align-items:flex-end"><div class="lib-cover" style="width:132px;flex-shrink:0">' + cover(b, 'big') + '</div>' +
      '<div class="col" style="gap:6px"><div style="font-size:20px;font-weight:800;line-height:1.6">' + esc(b.title) + '</div>' +
      (b.author ? '<div class="muted">' + esc(b.author) + '</div>' : '') +
      '<div class="lib-tags">' + kinds(b).map(function (k) { return '<span>' + k + '</span>'; }).join('') + '</div>' +
      (pl ? '<div class="muted small">' + pl + '</div>' : '') + '</div></div>' +
      (b.description ? '<div class="muted" style="line-height:2">' + esc(b.description) + '</div>' : '') +
      '<div class="grid2">' +
      (b.doc ? '<a class="primary" style="display:flex;align-items:center;justify-content:center;gap:8px" href="#read/' + encodeURIComponent(b.id) + '">' + A.I.bookOpen + (r[b.doc.type] ? 'ادامه‌ی خواندن' : 'خواندن') + '</a>' : '') +
      (b.tracks.length ? '<a class="primary" style="display:flex;align-items:center;justify-content:center;gap:8px;background:var(--night)" href="#listen/' + encodeURIComponent(b.id) + '">' + A.I.headphones + (r.audio ? 'ادامه‌ی گوش دادن' : 'گوش دادن') + '</a>' : '') +
      '</div>' +
      '<div class="row"><div class="h2">نشانه‌ها و یادداشت‌ها</div><div class="muted small">' + num(r.marks.length) + '</div></div>' +
      (marks.length ? '<div class="card" style="padding:4px 14px;gap:0">' + marks.map(function (x) { return markLine(b, x.m, x.i); }).join('') + '</div>'
        : '<div class="muted small" style="line-height:1.9">هنگام خواندن یا گوش دادن، با دکمه‌ی نشانه یا انتخاب متن، جاهای مهم را اینجا نگه دارید.</div>') +
      '</div>' + A.nav('library');
  };
  AFTER.book = function (id) {
    var b = findBook(id); if (!b) return;
    var r = rec(b.id);
    document.querySelectorAll('[data-mark-go]').forEach(function (el) {
      el.onclick = function () {
        var m = r.marks[+el.getAttribute('data-mark-go')]; if (!m) return;
        if (m.kind === 'audio') { r.audio = { t: m.t, time: m.time }; A.save(); A.go('listen/' + encodeURIComponent(b.id)); return; }
        if (b.doc.type === 'pdf') { r.pdf = Object.assign({}, r.pdf || {}, { page: m.page }); }
        else { r.epub = Object.assign({}, r.epub || {}, { cfi: m.cfi }); }
        A.save(); A.go('read/' + encodeURIComponent(b.id));
      };
    });
    document.querySelectorAll('[data-mark-del]').forEach(function (el) {
      el.onclick = function () { r.marks.splice(+el.getAttribute('data-mark-del'), 1); A.save(); A.render(); };
    });
  };

  function addMark(bookId, m, askNote) {
    var r = rec(bookId);
    m.created = Date.now();
    function done(note) { if (note) m.note = note; r.marks.push(m); A.save(); A.toast(m.kind === 'hl' ? 'هایلایت ذخیره شد' : 'نشانه ذخیره شد'); }
    if (!askNote) { done(''); return; }
    var bg = A.sheet('<div class="h2">' + (m.text ? 'یادداشت برای این بخش' : 'نشانه‌گذاری') + '</div>' +
      (m.text ? '<div class="mark-quote" style="max-height:120px;overflow:auto">«' + esc(m.text) + '»</div>' : '<div class="muted">' + esc(m.label || '') + '</div>') +
      '<div class="field"><label for="mk-note">یادداشت (اختیاری)</label><textarea class="input" id="mk-note" rows="3" style="padding:10px 14px;min-height:90px;resize:none"></textarea></div>' +
      '<button class="primary" id="mk-save">ذخیره</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelector('#mk-save').onclick = function () { done(bg.querySelector('#mk-note').value.trim()); bg.remove(); };
    });
    return bg;
  }

  // ---------- نوار انتخاب متن ----------
  function selectionBar(onCopy, onMark, onHighlight) {
    var bar = document.createElement('div');
    bar.className = 'sel-bar';
    bar.innerHTML = '<button data-s="copy">' + A.I.copy + 'کپی</button>' +
      (onHighlight ? '<button data-s="hl"><span class="mk mk-hl"></span>هایلایت</button>' : '') +
      '<button data-s="note">' + A.I.bookmark + 'یادداشت</button>';
    bar.addEventListener('mousedown', function (e) { e.preventDefault(); });
    bar.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    bar.onclick = function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var k = t.getAttribute('data-s');
      if (k === 'copy') onCopy(); else if (k === 'hl') onHighlight(); else onMark();
      hide();
    };
    function show() { if (!bar.isConnected) document.body.appendChild(bar); }
    function hide() { bar.remove(); }
    return { show: show, hide: hide };
  }

  // ---------- خواندن (PDF یا EPUB) ----------
  VIEWS.read = function (id) {
    if (!BOOKS) { loadBooks().then(function () { A.render(); }); return '<div class="screen"></div>'; }
    var b = findBook(id);
    if (!b || !b.doc) { setTimeout(function () { A.go('library'); }, 0); return '<div class="screen"></div>'; }
    var P = S.readerPrefs;
    var isPdf = b.doc.type === 'pdf';
    return '<div class="reader theme-' + (isPdf ? (P.pdfNight ? 'dark' : 'light') : P.theme) + '" id="reader">' +
      '<div class="rd-top"><a class="icon-btn" href="#book/' + encodeURIComponent(b.id) + '" aria-label="بازگشت">' + A.I.back + '</a>' +
      '<div class="rd-title">' + esc(b.title) + '</div>' +
      (!isPdf ? '<button class="icon-btn" data-r="toc" aria-label="فهرست">' + A.I.list + '</button>' : '') +
      '<button class="icon-btn" data-r="mark" aria-label="نشانه‌گذاری این صفحه" id="rd-mark">' + A.I.bookmark + '</button>' +
      '<button class="icon-btn" data-r="opts" aria-label="تنظیمات نمایش">' + A.I.type + '</button></div>' +
      '<div class="rd-body" id="rd-body"><div class="rd-loading">در حال باز کردن کتاب…</div></div>' +
      '<div class="rd-bottom">' +
      (isPdf ? '<button class="icon-btn" data-r="zoomout" aria-label="کوچک‌نمایی">−</button><div class="rd-pos" id="rd-pos"></div><button class="icon-btn" data-r="zoomin" aria-label="بزرگ‌نمایی">+</button>'
        : '<button class="icon-btn" data-r="prev" aria-label="صفحه‌ی قبل">' + A.I.back + '</button><div class="rd-pos" id="rd-pos"></div><button class="icon-btn" data-r="next" aria-label="صفحه‌ی بعد">' + A.I.chev + '</button>') +
      '</div></div>';
  };
  AFTER.read = function (id) {
    var b = findBook(id); if (!b || !b.doc) return;
    if (b.doc.type === 'pdf') openPdf(b); else openEpub(b);
  };

  // ----- PDF -----
  var pdfjsP = null;
  function getPdfjs() {
    if (!pdfjsP) pdfjsP = import('./lib/pdfjs/pdf.min.mjs').then(function (m) {
      m.GlobalWorkerOptions.workerSrc = 'lib/pdfjs/pdf.worker.min.mjs';
      return m;
    });
    return pdfjsP;
  }
  function openPdf(b) {
    var r = rec(b.id), P = S.readerPrefs, body = $('#rd-body'), posEl = $('#rd-pos');
    var alive = true, doc = null, pages = [], current = (r.pdf && r.pdf.page) || 1, ratio = 1.414;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var observer = null, saveT = null;
    A.onLeave(function () {
      alive = false; if (observer) observer.disconnect(); bar.hide();
      document.removeEventListener('selectionchange', onSel);
      if (doc) { try { doc.destroy(); } catch (e) {} }
    });

    function setPos() {
      if (posEl && doc) posEl.textContent = 'صفحه‌ی ' + num(current) + ' از ' + num(doc.numPages);
      var marked = r.marks.some(function (m) { return m.kind === 'bm' && m.page === current; });
      var mb = $('#rd-mark'); if (mb) mb.classList.toggle('on', marked);
      clearTimeout(saveT);
      saveT = setTimeout(function () { r.pdf = { page: current, total: doc ? doc.numPages : 0 }; A.save(); }, 400);
    }
    function pageWidth() { return Math.round(body.clientWidth * P.pdfZoom); }

    function build() {
      body.innerHTML = '';
      body.classList.add('pdf-scroll');
      var w = pageWidth();
      pages = [];
      for (var i = 1; i <= doc.numPages; i++) {
        var d = document.createElement('div');
        d.className = 'pdf-page'; d.setAttribute('data-p', i);
        d.style.width = w + 'px'; d.style.height = Math.round(w * ratio) + 'px';
        d.innerHTML = '<div class="pdf-num">' + fa(i) + '</div>';
        body.appendChild(d);
        pages.push({ el: d, done: false, busy: false });
      }
      if (observer) observer.disconnect();
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) renderPage(+en.target.getAttribute('data-p')); });
      }, { root: body, rootMargin: '600px 0px' });
      pages.forEach(function (p) { observer.observe(p.el); });
    }
    function renderPage(n) {
      var p = pages[n - 1]; if (!p || p.done || p.busy) return;
      p.busy = true;
      doc.getPage(n).then(function (page) {
        if (!alive) return;
        var w = pageWidth();
        var base = page.getViewport({ scale: 1 });
        var scale = w / base.width;
        var vp = page.getViewport({ scale: scale });
        p.el.style.height = Math.round(vp.height) + 'px';
        var canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = Math.floor(vp.width) + 'px'; canvas.style.height = Math.floor(vp.height) + 'px';
        var ctx = canvas.getContext('2d');
        return page.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise.then(function () {
          if (!alive) return;
          p.el.innerHTML = '';
          p.el.appendChild(canvas);
          var tl = document.createElement('div'); tl.className = 'textLayer';
          tl.style.setProperty('--total-scale-factor', scale); tl.style.setProperty('--scale-factor', scale);
          tl.style.setProperty('--scale-round-x', '1px'); tl.style.setProperty('--scale-round-y', '1px');
          p.el.appendChild(tl);
          return getPdfjs().then(function (pdfjs) {
            var layer = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: tl, viewport: vp });
            tl.style.width = Math.floor(vp.width) + 'px'; tl.style.height = Math.floor(vp.height) + 'px';
            return layer.render();
          }).then(function () { p.done = true; p.busy = false; });
        });
      }).catch(function () { p.busy = false; });
    }
    function goPage(n, smooth) {
      n = Math.max(1, Math.min(doc.numPages, n));
      var el = pages[n - 1] && pages[n - 1].el; if (!el) return;
      body.scrollTo({ top: el.offsetTop - 8, behavior: smooth ? 'smooth' : 'auto' });
      current = n; setPos();
    }
    function onScroll() {
      var mid = body.scrollTop + body.clientHeight * 0.35, best = current;
      for (var i = 0; i < pages.length; i++) {
        var el = pages[i].el;
        if (el.offsetTop <= mid && el.offsetTop + el.offsetHeight > mid) { best = i + 1; break; }
      }
      if (best !== current) { current = best; setPos(); }
    }
    function rezoom(f) {
      var keep = current;
      P.pdfZoom = Math.max(1, Math.min(3, Math.round((P.pdfZoom + f) * 4) / 4)); A.save();
      build(); goPage(keep);
      A.toast('بزرگ‌نمایی ' + num(Math.round(P.pdfZoom * 100)) + '٪');
    }

    // انتخاب متن
    var selText = '';
    var bar = selectionBar(
      function () { copyText(selText); clearSel(); },
      function () { addMark(b.id, { kind: 'hl', page: current, label: 'صفحه‌ی ' + num(current), text: selText.slice(0, 600) }, true); clearSel(); },
      null);
    function clearSel() { try { window.getSelection().removeAllRanges(); } catch (e) {} }
    function onSel() {
      var s = window.getSelection(), t = s ? String(s).trim() : '';
      if (t && s.anchorNode && body.contains(s.anchorNode)) { selText = t; bar.show(); } else bar.hide();
    }
    document.addEventListener('selectionchange', onSel);

    $('#reader').onclick = function (e) {
      var t = e.target.closest('[data-r]'); if (!t) return;
      var k = t.getAttribute('data-r');
      if (!doc) return;
      if (k === 'zoomin') rezoom(0.25);
      else if (k === 'zoomout') rezoom(-0.25);
      else if (k === 'mark') {
        var at = -1;
        r.marks.forEach(function (m, i) { if (m.kind === 'bm' && m.page === current) at = i; });
        if (at >= 0) { r.marks.splice(at, 1); A.save(); A.toast('نشانه برداشته شد'); setPos(); }
        else { addMark(b.id, { kind: 'bm', page: current, label: 'صفحه‌ی ' + num(current) }, false); setPos(); }
      } else if (k === 'opts') {
        A.sheet('<div class="h2">نمایش</div>' +
          '<div class="srow">' + '<div class="st" style="flex:1">حالت شب</div><button class="switch' + (P.pdfNight ? ' on' : '') + '" id="o-night" role="switch" aria-checked="' + P.pdfNight + '"><span></span></button></div>' +
          '<div class="field"><label for="o-go">رفتن به صفحه</label><div style="display:flex;gap:8px"><input class="input" id="o-go" inputmode="numeric" placeholder="' + fa(current) + '"><button class="chip on" id="o-go-btn">برو</button></div></div>' +
          '<button class="chip" id="o-copy" style="width:100%">کپی متن کامل این صفحه</button>' +
          '<div class="muted small" style="line-height:1.9">برای کپی بخشی از متن، روی آن انگشت را نگه دارید و انتخاب کنید.</div>' +
          '<button class="ghost" data-close>بستن</button>', function (bg) {
          bg.querySelector('#o-night').onclick = function () { P.pdfNight = !P.pdfNight; A.save(); $('#reader').className = 'reader theme-' + (P.pdfNight ? 'dark' : 'light'); this.classList.toggle('on', P.pdfNight); };
          bg.querySelector('#o-go-btn').onclick = function () { var n = parseInt(A.toEn(bg.querySelector('#o-go').value), 10); if (n) { bg.remove(); goPage(n); } };
          bg.querySelector('#o-copy').onclick = function () {
            doc.getPage(current).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
              var out = '', lastY = null;
              tc.items.forEach(function (it) { if (it.str === undefined) return; var y = it.transform ? it.transform[5] : null; if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) out += '\n'; else if (out && !/\s$/.test(out)) out += ' '; out += it.str; lastY = y; });
              copyText(out); bg.remove();
            });
          };
        });
      }
    };

    getPdfjs().then(function (pdfjs) {
      return pdfjs.getDocument({
        url: b.doc.file, cMapUrl: 'lib/pdfjs/cmaps/', cMapPacked: true,
        standardFontDataUrl: 'lib/pdfjs/standard_fonts/', wasmUrl: 'lib/pdfjs/wasm/', iccUrl: 'lib/pdfjs/iccs/'
      }).promise;
    }).then(function (d) {
      if (!alive) { d.destroy(); return; }
      doc = d;
      return doc.getPage(1).then(function (p1) {
        var v = p1.getViewport({ scale: 1 }); ratio = v.height / v.width;
        build();
        body.addEventListener('scroll', function () { if (alive) onScroll(); }, { passive: true });
        goPage(Math.min(current, doc.numPages));
      });
    }).catch(function (e) {
      body.innerHTML = '<div class="rd-loading">باز کردن این فایل ممکن نشد.<br><span class="small">' + esc(e && e.message || '') + '</span></div>';
    });
  }

  // ----- EPUB -----
  function openEpub(b) {
    var r = rec(b.id), P = S.readerPrefs, body = $('#rd-body'), posEl = $('#rd-pos');
    if (!window.ePub) { body.innerHTML = '<div class="rd-loading">نمایشگر EPUB بارگذاری نشد.</div>'; return; }
    body.innerHTML = '<div id="epub-view" style="position:absolute;inset:0"></div>';
    var book = window.ePub(b.doc.file, { openAs: 'epub' });
    var rendition = book.renderTo('epub-view', { width: '100%', height: '100%', flow: 'paginated', spread: 'none', allowScriptedContent: false });
    var alive = true, curCfi = null, curLabel = '', rtl = true, toc = [];
    var selCfi = null, selText = '';
    A.onLeave(function () { alive = false; bar.hide(); try { book.destroy(); } catch (e) {} });

    rendition.themes.register('light', { body: { background: '#FFFFFF', color: '#14211B' } });
    rendition.themes.register('sepia', { body: { background: '#F6EEDC', color: '#3B2F1E' } });
    rendition.themes.register('dark', { body: { background: '#14211B', color: '#E3EAE6' }, a: { color: '#5FC996' } });
    function applyPrefs() {
      rendition.themes.select(P.theme);
      rendition.themes.fontSize(P.font + '%');
      $('#reader').className = 'reader theme-' + P.theme;
    }
    var fontCss = new URL('reader-font.css', location.href).href;
    rendition.hooks.content.register(function (contents) {
      if (P.vazir) contents.addStylesheet(fontCss);
    });
    applyPrefs();

    book.loaded.metadata.then(function (meta) {
      var dir = (book.packaging && book.packaging.metadata && book.packaging.metadata.direction) || '';
      var lang = (meta && meta.language) || '';
      rtl = dir ? dir === 'rtl' : (lang ? /^(fa|ar|he|ur|ps|ku)/i.test(lang) : true);
    }).catch(function () {});
    book.loaded.navigation.then(function (nav) { toc = nav.toc || []; }).catch(function () {});

    var startAt = r.epub && r.epub.cfi ? r.epub.cfi : undefined;
    rendition.display(startAt).catch(function () { return rendition.display(); }).catch(function (e) {
      body.innerHTML = '<div class="rd-loading">باز کردن این فایل ممکن نشد.</div>';
    });

    // هایلایت‌های قبلی
    rendition.on('rendered', function () {});
    book.ready.then(function () {
      r.marks.forEach(function (m) { if (m.kind === 'hl' && m.cfi) { try { rendition.annotations.highlight(m.cfi, {}, null, 'rh-hl', { fill: '#F6C343', 'fill-opacity': '0.35' }); } catch (e) {} } });
      // درصد پیشرفت
      var key = 'raha-loc-' + b.id, cached = null;
      try { cached = localStorage.getItem(key); } catch (e) {}
      if (cached) { try { book.locations.load(cached); updatePos(); } catch (e) {} }
      else book.locations.generate(1200).then(function () { try { localStorage.setItem(key, book.locations.save()); } catch (e) {} if (alive) updatePos(); });
    });

    function chapterOf(href) {
      var label = '';
      (function walk(items) { items.forEach(function (it) { if (href && it.href && href.indexOf(it.href.split('#')[0]) >= 0) label = it.label.trim(); if (it.subitems) walk(it.subitems); }); })(toc);
      return label;
    }
    var lastLoc = null;
    function updatePos() {
      if (!lastLoc || !alive) return;
      var pct = null;
      try { if (book.locations.length()) pct = book.locations.percentageFromCfi(lastLoc.start.cfi); } catch (e) {}
      curLabel = chapterOf(lastLoc.start.href);
      posEl.textContent = (curLabel ? curLabel + ' · ' : '') + (pct !== null ? num(Math.round(pct * 100)) + '٪' : '');
      r.epub = { cfi: lastLoc.start.cfi, pct: pct !== null ? pct : (r.epub && r.epub.pct) };
      A.save();
      var marked = r.marks.some(function (m) { return m.kind === 'bm' && m.cfi === lastLoc.start.cfi; });
      var mb = $('#rd-mark'); if (mb) mb.classList.toggle('on', marked);
    }
    rendition.on('relocated', function (loc) { lastLoc = loc; curCfi = loc.start.cfi; updatePos(); });

    function next() { rendition.next(); }
    function prev() { rendition.prev(); }
    // کشیدن انگشت برای ورق زدن
    var sx = null, sy = null;
    rendition.on('touchstart', function (e) { var t = e.changedTouches && e.changedTouches[0]; if (t) { sx = t.screenX; sy = t.screenY; } });
    rendition.on('touchend', function (e) {
      var t = e.changedTouches && e.changedTouches[0]; if (!t || sx === null) return;
      var dx = t.screenX - sx, dy = t.screenY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) { rtl ? next() : prev(); } else { rtl ? prev() : next(); }
      }
    });
    rendition.on('keyup', function (e) { if (e.key === 'ArrowLeft') rtl ? next() : prev(); if (e.key === 'ArrowRight') rtl ? prev() : next(); });

    // انتخاب متن
    var bar = selectionBar(
      function () { copyText(selText); clearSel(); },
      function () { addMark(b.id, { kind: 'hl', cfi: selCfi, label: curLabel || 'بخش انتخاب‌شده', text: selText.slice(0, 600) }, true); hl(selCfi); clearSel(); },
      function () { addMark(b.id, { kind: 'hl', cfi: selCfi, label: curLabel || 'بخش انتخاب‌شده', text: selText.slice(0, 600) }, false); hl(selCfi); clearSel(); });
    function hl(cfi) { try { rendition.annotations.highlight(cfi, {}, null, 'rh-hl', { fill: '#F6C343', 'fill-opacity': '0.35' }); } catch (e) {} }
    function clearSel() {
      try { rendition.getContents().forEach(function (c) { c.window.getSelection().removeAllRanges(); }); } catch (e) {}
    }
    rendition.on('selected', function (cfiRange, contents) {
      selCfi = cfiRange;
      book.getRange(cfiRange).then(function (range) { selText = range ? range.toString().trim() : ''; if (selText) bar.show(); });
    });
    rendition.on('click', function () { setTimeout(function () {
      var any = false;
      try { rendition.getContents().forEach(function (c) { if (String(c.window.getSelection()).trim()) any = true; }); } catch (e) {}
      if (!any) bar.hide();
    }, 50); });

    $('#reader').onclick = function (e) {
      var t = e.target.closest('[data-r]'); if (!t) return;
      var k = t.getAttribute('data-r');
      if (k === 'next') next();
      else if (k === 'prev') prev();
      else if (k === 'mark') {
        if (!curCfi) return;
        var at = -1;
        r.marks.forEach(function (m, i) { if (m.kind === 'bm' && m.cfi === curCfi) at = i; });
        if (at >= 0) { r.marks.splice(at, 1); A.save(); A.toast('نشانه برداشته شد'); }
        else addMark(b.id, { kind: 'bm', cfi: curCfi, label: (curLabel || 'نشانه') + (r.epub && typeof r.epub.pct === 'number' ? ' · ' + num(Math.round(r.epub.pct * 100)) + '٪' : '') }, false);
        updatePos();
      } else if (k === 'toc') {
        var items = [];
        (function walk(list, depth) { list.forEach(function (it) { items.push({ label: it.label.trim(), href: it.href, depth: depth }); if (it.subitems) walk(it.subitems, depth + 1); }); })(toc, 0);
        A.sheet('<div class="h2">فهرست</div><div style="max-height:60vh;overflow:auto;display:flex;flex-direction:column">' +
          (items.length ? items.map(function (it, i) { return '<button class="toc-item" data-toc="' + i + '" style="padding-right:' + (12 + it.depth * 16) + 'px">' + esc(it.label) + '</button>'; }).join('') : '<div class="muted">این کتاب فهرست ندارد.</div>') +
          '</div><button class="ghost" data-close>بستن</button>', function (bg) {
          bg.querySelectorAll('[data-toc]').forEach(function (el) { el.onclick = function () { rendition.display(items[+el.getAttribute('data-toc')].href); bg.remove(); }; });
        });
      } else if (k === 'opts') {
        A.sheet('<div class="h2">نمایش</div>' +
          '<div class="srow"><div class="st" style="flex:1">اندازه‌ی متن</div><div class="stepper"><button id="f-inc" aria-label="بزرگ‌تر">+</button><div class="v" id="f-v" style="font-size:16px;min-width:56px">' + num(P.font) + '٪</div><button id="f-dec" aria-label="کوچک‌تر">−</button></div></div>' +
          '<div class="srow"><div class="st" style="flex:1">رنگ صفحه</div><div class="seg"><button data-th="light" class="' + (P.theme === 'light' ? 'on' : '') + '">روشن</button><button data-th="sepia" class="' + (P.theme === 'sepia' ? 'on' : '') + '">کاغذی</button><button data-th="dark" class="' + (P.theme === 'dark' ? 'on' : '') + '">شب</button></div></div>' +
          '<div class="srow"><div class="col" style="flex:1"><div class="st">فونت وزیرمتن</div><div class="muted small">به‌جای فونت خود کتاب</div></div><button class="switch' + (P.vazir ? ' on' : '') + '" id="f-vz" role="switch" aria-checked="' + P.vazir + '"><span></span></button></div>' +
          '<div class="muted small" style="line-height:1.9">برای کپی یا هایلایت، روی متن انگشت را نگه دارید و انتخاب کنید. برای ورق زدن، صفحه را به چپ یا راست بکشید.</div>' +
          '<button class="ghost" data-close>بستن</button>', function (bg) {
          function setFont(d) { P.font = Math.max(70, Math.min(200, P.font + d)); A.save(); applyPrefs(); bg.querySelector('#f-v').textContent = num(P.font) + '٪'; }
          bg.querySelector('#f-inc').onclick = function () { setFont(10); };
          bg.querySelector('#f-dec').onclick = function () { setFont(-10); };
          bg.querySelectorAll('[data-th]').forEach(function (el) { el.onclick = function () { P.theme = el.getAttribute('data-th'); A.save(); applyPrefs(); bg.querySelectorAll('[data-th]').forEach(function (x) { x.classList.toggle('on', x === el); }); }; });
          bg.querySelector('#f-vz').onclick = function () { P.vazir = !P.vazir; A.save(); this.classList.toggle('on', P.vazir); var at = curCfi; bg.remove(); A.render(); };
        });
      }
    };
  }

  // ---------- پخش‌کننده‌ی کتاب صوتی ----------
  var audio = new Audio();
  audio.preload = 'metadata';
  var AU = { bookId: null, t: 0, sleepAt: 0, sleepEnd: false };
  var lastSave = 0;
  function saveAudioPos(force) {
    if (!AU.bookId) return;
    var now = Date.now();
    if (!force && now - lastSave < 4000) return;
    lastSave = now;
    rec(AU.bookId).audio = { t: AU.t, time: audio.currentTime || 0 };
    A.save();
  }
  function loadTrack(b, t, time, autoplay) {
    AU.bookId = b.id; AU.t = t;
    var tr = b.tracks[t];
    audio.src = tr.file;
    audio.playbackRate = S.readerPrefs.speed || 1;
    var seekTo = time || 0;
    audio.onloadedmetadata = function () { if (seekTo) { try { audio.currentTime = Math.min(seekTo, Math.max(0, audio.duration - 1)); } catch (e) {} } audio.playbackRate = S.readerPrefs.speed || 1; };
    if (autoplay) audio.play().catch(function () {});
    setMediaSession(b);
    saveAudioPos(true);
    refreshPlayer();
  }
  function setMediaSession(b) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: b.tracks[AU.t].title, artist: b.author || '', album: b.title });
      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('seekbackward', function () { skip(-15); });
      navigator.mediaSession.setActionHandler('seekforward', function () { skip(15); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { track(-1); });
      navigator.mediaSession.setActionHandler('nexttrack', function () { track(1); });
    } catch (e) {}
  }
  function curBook() { return AU.bookId ? findBook(AU.bookId) : null; }
  function skip(sec) { try { audio.currentTime = Math.max(0, Math.min((audio.duration || 0) - 0.5, audio.currentTime + sec)); } catch (e) {} saveAudioPos(true); }
  function track(d) {
    var b = curBook(); if (!b) return;
    var n = AU.t + d;
    if (n < 0) { audio.currentTime = 0; return; }
    if (n >= b.tracks.length) return;
    loadTrack(b, n, 0, !audio.paused || d > 0);
  }
  audio.addEventListener('timeupdate', function () {
    saveAudioPos(false);
    if (AU.sleepAt && Date.now() >= AU.sleepAt) { audio.pause(); AU.sleepAt = 0; A.toast('تایمر خواب: پخش متوقف شد'); refreshPlayer(); }
    tickPlayer();
  });
  audio.addEventListener('play', function () { refreshPlayer(); });
  audio.addEventListener('pause', function () { saveAudioPos(true); refreshPlayer(); });
  audio.addEventListener('ended', function () {
    var b = curBook(); if (!b) return;
    if (AU.sleepEnd) { AU.sleepEnd = false; A.toast('تایمر خواب: پایان فصل'); saveAudioPos(true); refreshPlayer(); return; }
    if (AU.t + 1 < b.tracks.length) loadTrack(b, AU.t + 1, 0, true);
    else { rec(b.id).audio = { t: AU.t, time: 0, finished: true }; A.save(); refreshPlayer(); }
  });
  audio.addEventListener('error', function () { if (AU.bookId) A.toast('پخش این فایل صوتی ممکن نشد'); });

  // نوار کوچک پخش بالای منوی پایین
  A.miniPlayer = function () {
    var b = curBook();
    if (!b || !audio.src || A.route().indexOf('listen/') === 0) return '';
    return '<div class="mini-player"><a href="#listen/' + encodeURIComponent(b.id) + '" class="mini-info"><div class="mini-cover">' + cover(b) + '</div>' +
      '<div class="col" style="min-width:0"><div class="mini-t">' + esc(b.tracks[AU.t].title) + '</div><div class="muted small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(b.title) + '</div></div></a>' +
      '<button class="icon-btn" data-au="toggle" aria-label="' + (audio.paused ? 'پخش' : 'توقف') + '">' + (audio.paused ? A.I.play : A.I.pause) + '</button>' +
      '<div class="mini-bar"><div id="mini-prog"></div></div></div>';
  };

  VIEWS.listen = function (id) {
    if (!BOOKS) { loadBooks().then(function () { A.render(); }); return '<div class="screen"></div>'; }
    var b = findBook(id);
    if (!b || !b.tracks.length) { setTimeout(function () { A.go('library'); }, 0); return '<div class="screen"></div>'; }
    if (AU.bookId !== b.id) {
      var pos = rec(b.id).audio || { t: 0, time: 0 };
      if (pos.finished) pos = { t: 0, time: 0 };
      loadTrack(b, Math.min(pos.t, b.tracks.length - 1), pos.time, false);
    }
    return '<div class="screen player" id="player">' +
      '<div class="title-bar"><a class="icon-btn" href="#book/' + encodeURIComponent(b.id) + '" aria-label="بازگشت">' + A.I.back + '</a><div class="muted" style="flex:1">در حال پخش</div>' +
      '<button class="icon-btn" data-au="mark" aria-label="نشانه‌گذاری این لحظه">' + A.I.bookmark + '</button></div>' +
      '<div class="pl-cover">' + cover(b, 'big') + '</div>' +
      '<div class="col" style="align-items:center;text-align:center;gap:4px"><div style="font-size:19px;font-weight:800" id="pl-track"></div><div class="muted">' + esc(b.title) + '</div></div>' +
      '<div class="col" style="gap:6px"><input type="range" id="pl-seek" min="0" max="1000" value="0" aria-label="جابه‌جایی در فایل">' +
      '<div class="row muted small" style="direction:ltr"><span id="pl-cur">0:00</span><span id="pl-dur">0:00</span></div></div>' +
      '<div class="pl-ctrl">' +
      '<button class="icon-btn" data-au="prev" aria-label="فصل قبل">' + A.I.skipPrev + '</button>' +
      '<button class="icon-btn pl-15" data-au="back" aria-label="۱۵ ثانیه عقب">' + A.I.rew + '</button>' +
      '<button class="pl-play" data-au="toggle" id="pl-play" aria-label="پخش"></button>' +
      '<button class="icon-btn pl-15" data-au="fwd" aria-label="۱۵ ثانیه جلو">' + A.I.fwd + '</button>' +
      '<button class="icon-btn" data-au="next" aria-label="فصل بعد">' + A.I.skipNext + '</button></div>' +
      '<div class="row" style="justify-content:center;gap:10px"><button class="chip" data-au="speed" id="pl-speed"></button><button class="chip" data-au="sleep" id="pl-sleep"></button></div>' +
      '<div class="h2">فصل‌ها</div><div class="card" style="padding:4px 8px;gap:0" id="pl-tracks">' +
      b.tracks.map(function (tr, i) { return '<button class="track" data-track="' + i + '"><span class="tn">' + fa(i + 1) + '</span><span style="flex:1;text-align:right">' + esc(tr.title) + '</span></button>'; }).join('') +
      '</div></div>' + A.nav('library');
  };
  AFTER.listen = function () {
    var seek = $('#pl-seek'), dragging = false;
    seek.addEventListener('input', function () { dragging = true; var d = audio.duration || 0; $('#pl-cur').textContent = fmtTime(d * seek.value / 1000); });
    seek.addEventListener('change', function () { var d = audio.duration || 0; if (d) audio.currentTime = d * seek.value / 1000; dragging = false; saveAudioPos(true); });
    seek._dragging = function () { return dragging; };
    document.querySelectorAll('[data-track]').forEach(function (el) {
      el.onclick = function () { var b = curBook(); if (b) loadTrack(b, +el.getAttribute('data-track'), 0, true); };
    });
    refreshPlayer();
  };

  function tickPlayer() {
    var d = audio.duration || 0, c = audio.currentTime || 0;
    var mp = document.getElementById('mini-prog'); if (mp) mp.style.width = (d ? c / d * 100 : 0) + '%';
    var seek = document.getElementById('pl-seek');
    if (seek && !(seek._dragging && seek._dragging())) {
      seek.value = d ? Math.round(c / d * 1000) : 0;
      document.getElementById('pl-cur').textContent = fmtTime(c);
      document.getElementById('pl-dur').textContent = fmtTime(d);
    }
  }
  function refreshPlayer() {
    var b = curBook();
    // نوار کوچک
    var mini = document.querySelector('.mini-player');
    if (mini) { var btn = mini.querySelector('[data-au="toggle"]'); if (btn) btn.innerHTML = audio.paused ? A.I.play : A.I.pause; }
    if (!document.getElementById('player') || !b) { tickPlayer(); return; }
    document.getElementById('pl-track').textContent = b.tracks[AU.t].title;
    var pb = document.getElementById('pl-play'); pb.innerHTML = audio.paused ? A.I.playBig : A.I.pauseBig; pb.setAttribute('aria-label', audio.paused ? 'پخش' : 'توقف');
    document.getElementById('pl-speed').textContent = 'سرعت ' + num(S.readerPrefs.speed || 1, 2) + '×';
    var sl = 'تایمر خواب';
    if (AU.sleepEnd) sl = 'خواب: پایان فصل';
    else if (AU.sleepAt) sl = 'خواب: ' + num(Math.max(1, Math.round((AU.sleepAt - Date.now()) / 60000))) + ' دقیقه';
    var se = document.getElementById('pl-sleep'); se.textContent = sl; se.classList.toggle('on', !!(AU.sleepAt || AU.sleepEnd));
    document.querySelectorAll('[data-track]').forEach(function (el) { el.classList.toggle('on', +el.getAttribute('data-track') === AU.t); });
    tickPlayer();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-au]'); if (!t) return;
    var k = t.getAttribute('data-au'), b = curBook();
    if (!b) return;
    if (k === 'toggle') { if (audio.paused) audio.play().catch(function () { A.toast('پخش ممکن نشد'); }); else audio.pause(); }
    else if (k === 'fwd') skip(15);
    else if (k === 'back') skip(-15);
    else if (k === 'next') track(1);
    else if (k === 'prev') track(audio.currentTime > 5 ? 0 : -1);
    else if (k === 'speed') {
      var sp = [0.75, 1, 1.25, 1.5, 1.75, 2], i = sp.indexOf(S.readerPrefs.speed || 1);
      S.readerPrefs.speed = sp[(i + 1) % sp.length]; audio.playbackRate = S.readerPrefs.speed; A.save(); refreshPlayer();
    } else if (k === 'sleep') {
      var opts = [[0, 'خاموش'], [15, '۱۵ دقیقه'], [30, '۳۰ دقیقه'], [45, '۴۵ دقیقه'], [60, '۱ ساعت'], [-1, 'پایان همین فصل']];
      A.sheet('<div class="h2">تایمر خواب</div><div class="chips">' + opts.map(function (o) { return '<button class="chip" data-sl="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div><button class="ghost" data-close>بستن</button>', function (bg) {
        bg.querySelectorAll('[data-sl]').forEach(function (el) {
          el.onclick = function () {
            var v = +el.getAttribute('data-sl');
            AU.sleepEnd = v === -1; AU.sleepAt = v > 0 ? Date.now() + v * 60000 : 0;
            bg.remove(); refreshPlayer(); A.toast(v === 0 ? 'تایمر خواب خاموش شد' : 'تایمر خواب تنظیم شد');
          };
        });
      });
    } else if (k === 'mark') {
      addMark(b.id, { kind: 'audio', t: AU.t, time: Math.floor(audio.currentTime || 0), label: b.tracks[AU.t].title }, true);
    }
  });
  setInterval(function () { if (AU.sleepAt && document.getElementById('pl-sleep')) refreshPlayer(); }, 30000);
  window.addEventListener('pagehide', function () { saveAudioPos(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveAudioPos(true); });

  // مسیر دکمه‌ی برگشت اندروید برای صفحه‌های کتابخانه
  A.backFor = function (r) {
    var p = r.split('/');
    if (p[0] === 'read' || p[0] === 'listen') return 'book/' + p[1];
    if (p[0] === 'book') return 'library';
    return null;
  };
};
