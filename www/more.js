/* رها — امکانات پیش از انتشار:
 * آشنایی اول کار، آزمون وابستگی به نیکوتین (فاگرستروم)، حالت تیره، قفل اپ،
 * درخواست امتیاز در فروشگاه و فرم بازخورد.
 */
window.RAHA_MORE = function (A) {
  'use strict';
  var S = A.S, esc = A.esc, num = A.num, fa = A.fa, $ = A.$, I = A.I;
  var V = A.VIEWS, AF = A.AFTER;

  function native() {
    if (!A.IS_NATIVE) return null;
    try { return window.Capacitor.Plugins.RahaApp || (window.Capacitor.registerPlugin && window.Capacitor.registerPlugin('RahaApp')); } catch (e) { return null; }
  }
  function store() { return (A.APP_VERSION() || {}).store || ''; }
  function storeName() { return store() === 'myket' ? 'مایکت' : 'کافه‌بازار'; }

  // ======================================================================
  // ۱) آشنایی اول کار
  // ======================================================================
  var SLIDES = [
    ['رها، همراه شما برای ترک سیگار', 'هر ثانیه‌ی بدون سیگار شمرده می‌شود: پولی که پس‌انداز می‌کنید، نخ‌هایی که نکشیدید و قدم‌به‌قدم بهتر شدن بدنتان.', '🌿'],
    ['وقتی هوس می‌آید، تنها نیستید', 'تمرین تنفس، بازی یک‌دقیقه‌ای، پیام صوتی عزیزانتان و دوستانی که با هم ترک می‌کنید؛ همه با یک دکمه.', '🫁'],
    ['اطلاعات شما مال خودتان است', 'بدون ثبت‌نام و بدون شماره تلفن. همه‌چیز روی همین گوشی می‌ماند و می‌توانید با رمز قفلش کنید.', '🔒']
  ];
  var slide = 0;
  V.welcome = function () {
    var s = SLIDES[slide], last = slide === SLIDES.length - 1;
    return '<div class="screen no-nav welcome">' +
      '<div class="row"><div></div>' + (last ? '' : '<button class="ghost" data-mo="wl-skip" style="padding:0;min-height:36px">رد شدن</button>') + '</div>' +
      '<div class="wl-art">' + s[2] + '</div>' +
      '<div class="col" style="gap:12px;text-align:center"><div style="font-size:24px;font-weight:800;line-height:1.6">' + s[0] + '</div>' +
      '<div class="muted" style="font-size:15px;line-height:2">' + s[1] + '</div></div>' +
      '<div class="wl-dots">' + SLIDES.map(function (x, i) { return '<i class="' + (i === slide ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      (last
        ? '<button class="primary" data-mo="wl-ftnd">آزمون وابستگی به نیکوتین (یک دقیقه)</button><button class="chip" data-mo="wl-done" style="min-height:50px">مستقیم برو به ساخت برنامه</button>'
        : '<button class="primary" data-mo="wl-next">بعدی</button>') +
      '</div>';
  };
  AF.welcome = function () {
    var sx = null, el = document.querySelector('.welcome');
    el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) < 50) return;
      if (dx > 0 && slide < SLIDES.length - 1) { slide++; A.render(); } else if (dx < 0 && slide > 0) { slide--; A.render(); }
    });
  };
  function welcomeDone(next) { S.onboarded = true; A.save(); A.go(next || 'setup'); }

  // ======================================================================
  // ۲) آزمون وابستگی به نیکوتین (Fagerström Test for Nicotine Dependence)
  // ======================================================================
  var FTND = [
    ['چقدر بعد از بیدار شدن، اولین سیگار را می‌کشید؟', [['۵ دقیقه یا کمتر', 3], ['۶ تا ۳۰ دقیقه', 2], ['۳۱ تا ۶۰ دقیقه', 1], ['بیشتر از یک ساعت', 0]]],
    ['سیگار نکشیدن در جاهای ممنوع (مثل مترو یا اداره) برایتان سخت است؟', [['بله', 1], ['نه', 0]]],
    ['ترک کدام سیگار برایتان سخت‌تر است؟', [['اولین سیگار صبح', 1], ['هر سیگار دیگری', 0]]],
    ['روزی چند نخ سیگار می‌کشید؟', [['۱۰ نخ یا کمتر', 0], ['۱۱ تا ۲۰ نخ', 1], ['۲۱ تا ۳۰ نخ', 2], ['۳۱ نخ یا بیشتر', 3]]],
    ['ساعت‌های اول بعد از بیدار شدن بیشتر از بقیه‌ی روز سیگار می‌کشید؟', [['بله', 1], ['نه', 0]]],
    ['وقتی آن‌قدر بیمارید که بیشتر روز در رختخواب هستید هم سیگار می‌کشید؟', [['بله', 1], ['نه', 0]]]
  ];
  var LEVELS = [
    [2, 'خیلی کم', 'وابستگی جسمی شما به نیکوتین کم است. بیشتر با عادت‌ها و موقعیت‌ها سروکار دارید؛ برنامه‌ی اگر-آنگاه و تمرین تنفس بیشترین کمک را می‌کنند.'],
    [4, 'کم', 'وابستگی شما کم است. با برنامه‌ی ۳۰ روزه و شناختن موقعیت‌های هوس، شانس خوبی برای ترک دارید.'],
    [5, 'متوسط', 'وابستگی شما متوسط است. علائم ترک در چند روز اول محسوس است. مشورت با پزشک درباره‌ی جایگزین نیکوتین (چسب یا آدامس) می‌تواند ترک را آسان‌تر کند.'],
    [7, 'زیاد', 'وابستگی شما زیاد است. پیشنهاد جدی ما: با پزشک یا مرکز خدمات جامع سلامت درباره‌ی جایگزین نیکوتین یا داروهای ترک مشورت کنید. ترکیب دارو و برنامه‌ی رفتاری شانس موفقیت را چند برابر می‌کند.'],
    [10, 'خیلی زیاد', 'وابستگی شما خیلی زیاد است. حتماً با پزشک مشورت کنید؛ جایگزین نیکوتین یا داروهای ترک زیر نظر پزشک، و مشاوره (مثلاً تماس با ۴۰۳۰)، علائم ترک را بسیار کمتر می‌کنند.']
  ];
  function ftndLevel(score) { for (var i = 0; i < LEVELS.length; i++) if (score <= LEVELS[i][0]) return LEVELS[i]; return LEVELS[LEVELS.length - 1]; }
  A.ftndLevel = ftndLevel;
  var ans = [];
  V.ftnd = function () {
    var done = FTND.every(function (q, i) { return typeof ans[i] === 'number'; });
    var noNav = !S.ready;
    var head = '<div class="title-bar"><a class="icon-btn" href="#' + (S.ready ? 'home' : 'welcome') + '" aria-label="بازگشت">' + I.back + '</a><div class="h1">آزمون وابستگی به نیکوتین</div></div>';
    if (done) {
      var score = ans.reduce(function (a, b) { return a + b; }, 0), L = ftndLevel(score);
      return '<div class="screen' + (noNav ? ' no-nav' : '') + '">' + head +
        '<div class="card" style="align-items:center;text-align:center;gap:10px">' +
        '<div class="ftnd-score">' + fa(score) + '<span>از ۱۰</span></div><div class="h2">وابستگی ' + L[1] + '</div>' +
        '<div class="ftnd-bar"><div style="width:' + score * 10 + '%"></div></div>' +
        '<div style="line-height:2;font-size:14px;text-align:right">' + L[2] + '</div></div>' +
        (score >= 5 ? '<a class="card" href="#help" style="flex-direction:row;align-items:center;gap:12px;background:var(--green-tint)"><div class="col" style="flex:1"><div class="h2" style="color:var(--green-dark)">کمک تخصصی رایگان</div><div class="small">خط مشاوره‌ی ۴۰۳۰ و مراکز خدمات جامع سلامت</div></div>' + I.chev + '</a>' : '') +
        '<div class="muted small" style="line-height:1.9">این پرسشنامه‌ی شش‌سؤالی، آزمون استاندارد فاگرستروم برای سنجش وابستگی به نیکوتین است و جای معاینه‌ی پزشک را نمی‌گیرد.</div>' +
        '<button class="primary" data-mo="ftnd-ok">' + (S.ready ? 'ذخیره' : 'ادامه: ساخت برنامه‌ی ترک') + '</button>' +
        '<button class="ghost" data-mo="ftnd-again">دوباره پاسخ می‌دهم</button>' +
        '</div>' + (noNav ? '' : A.nav('home'));
    }
    return '<div class="screen' + (noNav ? ' no-nav' : '') + '">' + head +
      '<div class="muted" style="line-height:1.9">شش سؤال کوتاه درباره‌ی زمانی که هنوز سیگار می‌کشیدید (یا می‌کشید). جواب درست و غلط ندارد.</div>' +
      FTND.map(function (q, qi) {
        return '<div class="card" style="gap:10px"><div style="font-size:15px;font-weight:700;line-height:1.8">' + fa(qi + 1) + '. ' + q[0] + '</div><div class="col" style="gap:8px">' +
          q[1].map(function (o) { return '<button class="ftnd-opt' + (ans[qi] === o[1] && ans['s' + qi] === o[0] ? ' on' : '') + '" data-fq="' + qi + '" data-fv="' + o[1] + '" data-fl="' + esc(o[0]) + '">' + o[0] + '</button>'; }).join('') +
          '</div></div>';
      }).join('') +
      '<div class="muted small" id="ftnd-left">' + fa(FTND.length - ans.filter(function (x) { return typeof x === 'number'; }).length) + ' سؤال مانده</div>' +
      '</div>' + (noNav ? '' : A.nav('home'));
  };

  // ======================================================================
  // ۳) حالت تیره
  // ======================================================================
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() {
    var t = S.set.theme || 'auto';
    if (t === 'auto') return mq && mq.matches ? 'dark' : 'light';
    return t;
  }
  function applyTheme() {
    var t = resolvedTheme();
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', A.route() === 'sos' ? (t === 'dark' ? '#09100C' : '#14211B') : (t === 'dark' ? '#0E1612' : '#F3F5F1'));
  }
  A.applyTheme = applyTheme;
  if (mq) { try { mq.addEventListener('change', function () { if ((S.set.theme || 'auto') === 'auto') applyTheme(); }); } catch (e) {} }
  applyTheme();

  // ======================================================================
  // ۴) قفل اپ
  // ======================================================================
  if (!S.lock || typeof S.lock !== 'object') S.lock = { on: false };
  var locked = !!S.lock.on, hiddenAt = 0, pinBuf = '', bioTried = false;
  var GRACE = { 0: 0, 1: 60000, 5: 300000 };
  function sha(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 2166136261; for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return Promise.resolve('f' + h.toString(16));
  }
  function setSecure(on) { var N = native(); if (N) { try { N.setSecure({ on: !!on }).catch(function () {}); } catch (e) {} } }
  if (S.lock.on && S.lock.hide) setSecure(true);
  document.addEventListener('visibilitychange', function () {
    if (!S.lock.on) return;
    if (document.hidden) { hiddenAt = Date.now(); return; }
    var g = GRACE[S.lock.delay || 0] || 0;
    if (hiddenAt && Date.now() - hiddenAt >= g && !locked) { locked = true; pinBuf = ''; bioTried = false; A.render(); }
  });
  function keypad(dots, sub, extra) {
    var k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];
    return '<div class="lock-dots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < dots ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="muted" id="lock-msg" style="text-align:center;min-height:24px">' + (sub || '') + '</div>' +
      '<div class="keypad">' + k.map(function (x) {
        if (x === 'del') return '<button data-key="del" aria-label="پاک کردن">⌫</button>';
        if (x === 'bio') return extra ? '<button data-key="bio" aria-label="اثر انگشت">' + FP + '</button>' : '<span></span>';
        return '<button data-key="' + x + '">' + fa(x) + '</button>';
      }).join('') + '</div>';
  }
  var FP = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 11v2c0 3-1 5-2 6.5M8.6 6.9A6 6 0 0 1 18 12v1c0 2-.3 4-1 5.5M6.2 9.6A6 6 0 0 0 6 11v2c0 1.6-.4 3-1 4.2M12 7a4 4 0 0 1 4 4v1.5M8 11a4 4 0 0 1 .3-1.5M12 15c0 1.8-.5 3.5-1.5 5"/></svg>';
  A.lockView = function () {
    if (!locked || !S.lock.on) return null;
    return '<div class="screen no-nav lock-screen"><div class="col" style="align-items:center;gap:8px;padding-top:30px">' +
      '<div class="lock-ic">' + I.lock + '</div><div class="h1">رها قفل است</div></div>' +
      keypad(pinBuf.length, 'رمز چهاررقمی را وارد کنید', !!S.lock.bio) +
      '<button class="ghost" data-mo="lock-forgot" style="align-self:center">رمز را فراموش کرده‌ام</button></div>';
  };
  A.lockAfter = function () {
    if (S.lock.bio && !bioTried) { bioTried = true; setTimeout(tryBio, 300); }
  };
  function tryBio() {
    var N = native(); if (!N) return;
    N.biometricAuth({ title: 'باز کردن رها', cancel: 'استفاده از رمز' }).then(function () { unlock(); }).catch(function () {});
  }
  function unlock() { locked = false; pinBuf = ''; A.render(); }
  function lockKey(k) {
    if (k === 'bio') { tryBio(); return; }
    if (k === 'del') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 4) pinBuf += k;
    var dots = document.querySelectorAll('.lock-dots i');
    dots.forEach(function (d, i) { d.classList.toggle('on', i < pinBuf.length); });
    if (pinBuf.length === 4) {
      var tried = pinBuf;
      sha(S.lock.salt + ':' + tried).then(function (h) {
        if (h === S.lock.hash) { unlock(); return; }
        pinBuf = '';
        var box = document.querySelector('.lock-dots'); if (box) { box.classList.add('shake'); setTimeout(function () { box.classList.remove('shake'); dots.forEach(function (d) { d.classList.remove('on'); }); }, 400); }
        var m = $('#lock-msg'); if (m) m.textContent = 'رمز درست نیست';
        if (S.set.vibrate && navigator.vibrate) { try { navigator.vibrate([40, 60, 40]); } catch (e) {} }
      });
    }
  }
  // تنظیم رمز تازه (دو بار)
  function pinSetup(done) {
    var first = null, buf = '';
    var bg = A.sheet('<div class="h2" style="text-align:center" id="ps-t">یک رمز چهاررقمی انتخاب کنید</div>' + keypad(0, '', false) +
      '<button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelectorAll('[data-key]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var k = b.getAttribute('data-key');
          if (k === 'del') buf = buf.slice(0, -1); else if (buf.length < 4) buf += k;
          bg.querySelectorAll('.lock-dots i').forEach(function (d, i) { d.classList.toggle('on', i < buf.length); });
          if (buf.length < 4) return;
          if (first === null) { first = buf; buf = ''; bg.querySelector('#ps-t').textContent = 'رمز را دوباره وارد کنید'; bg.querySelectorAll('.lock-dots i').forEach(function (d) { d.classList.remove('on'); }); return; }
          if (buf !== first) { first = null; buf = ''; bg.querySelector('#ps-t').textContent = 'دو رمز یکی نبود؛ دوباره انتخاب کنید'; bg.querySelectorAll('.lock-dots i').forEach(function (d) { d.classList.remove('on'); }); return; }
          var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
          sha(salt + ':' + buf).then(function (h) { bg.remove(); done(salt, h); });
        };
      });
    });
    return bg;
  }

  // ======================================================================
  // ۵) امتیاز در فروشگاه و بازخورد
  // ======================================================================
  if (!S.rate || typeof S.rate !== 'object') S.rate = { asked: 0, count: 0, done: false };
  function openRate() {
    var N = native();
    S.rate.done = true; A.save();
    if (N) { N.rate({ store: store() || 'bazaar' }).catch(function () { A.toast('فروشگاه باز نشد'); }); return; }
    window.open(store() === 'myket' ? 'https://myket.ir/app/com.rha.quitsmoking' : 'https://cafebazaar.ir/app/com.rha.quitsmoking', '_blank');
  }
  function maybeAskRate() {
    var st = A.stats();
    if (!S.ready || S.rate.done || st.days < 7 || S.rate.count >= 3) return;
    if (S.rate.asked && Date.now() - S.rate.asked < 21 * 86400000) return;
    if (document.querySelector('.sheet-bg') || !store()) return;
    S.rate.asked = Date.now(); S.rate.count = (S.rate.count || 0) + 1; A.save();
    A.sheet('<div class="wl-art" style="font-size:48px;margin:0">🌿</div><div class="h2" style="text-align:center">' + num(Math.floor(st.days)) + ' روز است که با رها همراهید</div>' +
      '<div class="muted" style="text-align:center;line-height:2">از رها راضی هستید؟</div>' +
      '<button class="primary" data-mo="rate-yes">بله، عالی است</button>' +
      '<button class="chip" data-mo="rate-no" style="min-height:48px">می‌تواند بهتر باشد</button>' +
      '<button class="ghost" data-close>بعداً</button>');
  }
  A.homeHooks = (A.homeHooks || []).concat([function () { setTimeout(maybeAskRate, 1500); }]);
  function feedbackSheet() {
    A.sheet('<div class="h2">نظر شما درباره‌ی رها</div><div class="muted small" style="line-height:1.9">چه چیزی را دوست ندارید یا دوست دارید اضافه شود؟ نظر شما مستقیم به سازنده‌ی رها می‌رسد.</div>' +
      '<textarea class="input" id="fb-t" rows="5" maxlength="2000" style="padding:10px 14px;min-height:120px;resize:vertical"></textarea>' +
      '<div class="field"><label for="fb-c">راه تماس (اختیاری، اگر می‌خواهید جواب بگیرید)</label><input class="input" id="fb-c" maxlength="80" placeholder="ایمیل یا شماره"></div>' +
      '<button class="primary" id="fb-send">فرستادن</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelector('#fb-send').onclick = function () {
        var text = bg.querySelector('#fb-t').value.trim(), contact = bg.querySelector('#fb-c').value.trim();
        if (text.length < 3) { A.toast('چند کلمه بنویسید'); return; }
        var body = { text: text, contact: contact, version: (A.APP_VERSION() || {}).name || '', store: store(), days: Math.floor(A.stats().days) };
        var srv = A.friendsServer ? A.friendsServer() : '';
        if (srv) {
          this.disabled = true; var btn = this;
          fetch(srv + '/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { if (!r.ok) throw new Error(); bg.remove(); A.toast('ممنون! نظر شما رسید'); })
            .catch(function () { btn.disabled = false; shareFallback(text); });
          return;
        }
        shareFallback(text);
        bg.remove();
      };
    });
  }
  function shareFallback(text) {
    var msg = 'نظر درباره‌ی اپ رها:\n' + text;
    var SH = A.plugin('Share');
    if (A.IS_NATIVE && SH) { SH.share({ title: 'نظر درباره‌ی رها', text: msg, dialogTitle: 'فرستادن نظر' }).catch(function () {}); return; }
    A.copy(msg);
  }

  // ======================================================================
  // تنظیمات تازه
  // ======================================================================
  A.settingsTheme = function () {
    var t = S.set.theme || 'auto';
    return A.setRow('ظاهر', '', '<div class="seg">' + [['auto', 'خودکار'], ['light', 'روشن'], ['dark', 'تیره']].map(function (x) {
      return '<button class="' + (t === x[0] ? 'on' : '') + '" data-theme-set="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>');
  };
  A.settingsExtra = function () {
    var L = S.lock, delay = L.delay || 0;
    var sec = '<div class="sec">امنیت</div><div class="card sgroup">' +
      A.setRow('قفل رها با رمز', 'دفترچه و اطلاعات شما فقط با رمز باز می‌شود', A.sw2('lock-on', L.on)) +
      (L.on ? '<div id="bio-row"></div>' +
        A.setRow('قفل شدن بعد از', '', '<div class="seg">' + [[0, 'فوراً'], [1, '۱ دقیقه'], [5, '۵ دقیقه']].map(function (x) { return '<button class="' + (delay === x[0] ? 'on' : '') + '" data-lock-delay="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>') +
        A.setRow('پنهان در برنامه‌های اخیر', 'محتوای رها در فهرست برنامه‌های باز و عکس صفحه دیده نمی‌شود', A.sw2('lock-hide', !!L.hide)) +
        '<div class="srow"><button class="chip" data-mo="lock-change" style="width:100%">تغییر رمز</button></div>' : '') +
      '</div>';
    var about = '<div class="sec">رها</div><div class="card sgroup">' +
      '<a class="srow" href="#ftnd"><div class="col" style="flex:1"><div class="st">آزمون وابستگی به نیکوتین</div><div class="muted small">' +
      (S.ftnd ? 'نتیجه‌ی شما: ' + fa(S.ftnd.score) + ' از ۱۰ (' + ftndLevel(S.ftnd.score)[1] + ')' : 'شش سؤال، یک دقیقه') + '</div></div>' + I.chev + '</a>' +
      (store() ? '<div class="srow"><button class="chip on" data-mo="rate-yes" style="width:100%">امتیاز به رها در ' + storeName() + '</button></div>' : '') +
      '<div class="srow"><button class="chip" data-mo="feedback" style="width:100%">فرستادن نظر و پیشنهاد</button></div>' +
      '</div>';
    return sec + about;
  };
  A.AFTER_SETTINGS = function () {
    var row = $('#bio-row'), N = native();
    if (!row || !N) return;
    N.biometricAvailable().then(function (r) {
      if (r && r.available && row.isConnected) row.innerHTML = A.setRow('باز کردن با اثر انگشت یا چهره', '', A.sw2('lock-bio', !!S.lock.bio));
    }).catch(function () {});
  };

  // ======================================================================
  // رویدادها
  // ======================================================================
  document.addEventListener('click', function (e) {
    var key = e.target.closest('[data-key]');
    if (key && !key.closest('.sheet')) { lockKey(key.getAttribute('data-key')); return; }
    var th = e.target.closest('[data-theme-set]');
    if (th) { S.set.theme = th.getAttribute('data-theme-set'); A.save(); applyTheme(); A.render(); return; }
    var ld = e.target.closest('[data-lock-delay]');
    if (ld) { S.lock.delay = +ld.getAttribute('data-lock-delay'); A.save(); A.render(); return; }
    var fq = e.target.closest('[data-fq]');
    if (fq) {
      var qi = +fq.getAttribute('data-fq');
      ans[qi] = +fq.getAttribute('data-fv'); ans['s' + qi] = fq.getAttribute('data-fl');
      var card = fq.closest('.card'); card.querySelectorAll('[data-fq]').forEach(function (b) { b.classList.toggle('on', b === fq); });
      var left = FTND.length - FTND.filter(function (q, i) { return typeof ans[i] === 'number'; }).length;
      var lf = $('#ftnd-left'); if (lf) lf.textContent = left ? fa(left) + ' سؤال مانده' : '';
      if (!left) setTimeout(function () { A.render(); window.scrollTo(0, 0); }, 250);
      else { var nx = card.nextElementSibling; if (nx && nx.classList.contains('card')) setTimeout(function () { nx.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150); }
      return;
    }
    var t = e.target.closest('[data-mo]'); if (!t) return;
    var k = t.getAttribute('data-mo');
    if (k === 'wl-next') { slide = Math.min(SLIDES.length - 1, slide + 1); A.render(); }
    else if (k === 'wl-skip') { slide = SLIDES.length - 1; A.render(); }
    else if (k === 'wl-done') welcomeDone('setup');
    else if (k === 'wl-ftnd') welcomeDone('ftnd');
    else if (k === 'ftnd-again') { ans = []; A.render(); }
    else if (k === 'ftnd-ok') {
      var score = FTND.reduce(function (a, q, i) { return a + (ans[i] || 0); }, 0);
      S.ftnd = { score: score, at: Date.now(), a: FTND.map(function (q, i) { return ans[i]; }) };
      // پیشنهاد تعداد نخ روزانه برای فرم برنامه
      if (!S.ready && typeof ans[3] === 'number') S.cpd = [8, 15, 25, 35][ans[3]];
      ans = []; A.save();
      A.go(S.ready ? 'home' : 'setup');
    }
    else if (k === 'lock-forgot') {
      A.sheet('<div class="h2">رمز را فراموش کرده‌اید؟</div><div class="muted" style="line-height:2">رمز روی هیچ سروری نیست و قابل بازیابی نیست. تنها راه، پاک کردن همه‌ی اطلاعات رها روی این گوشی است. اگر قبلاً پشتیبان گرفته‌اید، بعد از پاک کردن می‌توانید آن را برگردانید (رمز پشتیبان همان رمز قبلی است).</div>' +
        '<button class="primary" id="lf-go" style="background:#9B2C2C">پاک کردن همه‌ی اطلاعات</button><button class="ghost" data-close>انصراف</button>', function (bg) {
        bg.querySelector('#lf-go').onclick = function () { if (A.onReset) A.onReset(); try { localStorage.removeItem(A.KEY); } catch (x) {} setSecure(false); location.hash = '#welcome'; location.reload(); };
      });
    }
    else if (k === 'lock-change') pinSetup(function (salt, h) { S.lock.salt = salt; S.lock.hash = h; A.save(); A.toast('رمز تازه ذخیره شد'); });
    else if (k === 'rate-yes') { var bg0 = t.closest('.sheet-bg'); if (bg0) bg0.remove(); openRate(); }
    else if (k === 'rate-no') { var bg1 = t.closest('.sheet-bg'); if (bg1) bg1.remove(); feedbackSheet(); }
    else if (k === 'feedback') feedbackSheet();
  });
  // کلیدهای سوییچ امنیت (جدا از سوییچ‌های تنظیمات عمومی)
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sw2]'); if (!t) return;
    var k = t.getAttribute('data-sw2');
    if (k === 'lock-on') {
      if (S.lock.on) { S.lock = { on: false }; setSecure(false); A.save(); A.toast('قفل خاموش شد'); A.render(); }
      else pinSetup(function (salt, h) { S.lock = { on: true, salt: salt, hash: h, delay: 0, bio: false, hide: false }; locked = false; A.save(); A.toast('قفل روشن شد'); A.render(); });
    } else if (k === 'lock-bio') {
      if (S.lock.bio) { S.lock.bio = false; A.save(); A.render(); return; }
      var N = native(); if (!N) return;
      N.biometricAuth({ title: 'تأیید اثر انگشت', cancel: 'انصراف' }).then(function () { S.lock.bio = true; A.save(); A.render(); }).catch(function () { A.toast('تأیید نشد'); });
    } else if (k === 'lock-hide') { S.lock.hide = !S.lock.hide; setSecure(S.lock.hide); A.save(); A.render(); }
  });
};
