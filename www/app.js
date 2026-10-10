/* رها — اپ ترک سیگار (نسخه‌ی اولیه) */
(function () {
  'use strict';

  // ---------- ذخیره‌سازی ----------
  var KEY = 'raha-state-v1';
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) return s; } catch (e) {}
    return null;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var S = load() || {
    ready: false, quitAt: Date.now(), cpd: 20, perPack: 20, packPrice: 0,
    buyType: 'pack', singlePrice: 0, pouchPrice: 0, perPouch: 40, rollExtra: 0,
    method: 0, reasons: [0, 2], goal: { name: '', amount: 0 },
    moods: {}, cravings: [], slips: [], name: ''
  };
  var DEFAULT_SET = { notifMilestones: true, daily: true, dailyTime: '21:00', vibrate: true, currency: 'toman', autoUpdate: true, backupRemind: true };
  S.set = Object.assign({}, DEFAULT_SET, S.set || {});
  if (!Array.isArray(S.slips)) S.slips = [];
  // لغزش‌های قدیمی فقط زمان بودند؛ حالا {t: زمان، n: تعداد نخ، g: موقعیت، note}
  S.slips = S.slips.map(function (x) { return typeof x === 'number' ? { t: x, n: 1, g: -1 } : x; });
  if (typeof S.seenMs !== 'number') S.seenMs = -1; // تعداد مراحلی که جشنشان نمایش داده شده (-۱ یعنی هنوز مقداردهی نشده)
  // چه چیزی ترک می‌شود: cig = سیگار، hookah = قلیان، both = هر دو
  if (!S.product) S.product = 'cig';
  if (typeof S.hkWeek !== 'number') S.hkWeek = 3;   // وعده‌ی قلیان در هفته
  if (typeof S.hkPrice !== 'number') S.hkPrice = 0; // هزینه‌ی هر وعده (تومان)
  // تاریخچه‌ی قیمت: [{t: از این لحظه، c: هزینه‌ی هر نخ، h: هزینه‌ی هر وعده قلیان}]؛ t=0 یعنی از همان اول
  if (!Array.isArray(S.prices) || !S.prices.length) S.prices = S.ready ? [{ t: 0, c: costPerCig(), h: S.hkPrice }] : [];

  // ---------- افزونه‌های بومی (فقط داخل اپ اندروید وجود دارند) ----------
  function plugin(name) { try { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]; } catch (e) { return null; } }
  var IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var UPDATE_REPO = 'kmazraee/rha-quit-smoking';
  var APP_VERSION = { code: 0, name: 'نسخه‌ی توسعه' };
  try {
    fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) { if (v && v.code) APP_VERSION = v; }).catch(function () {});
  } catch (e) {}

  // ---------- ابزارها ----------
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(x) { return String(x).replace(/\d/g, function (d) { return FA[d]; }); }
  function num(n, frac) { return Number(n).toLocaleString('fa-IR', { maximumFractionDigits: frac || 0 }); }
  function pad(n) { return fa(n < 10 ? '0' + n : n); }
  function toEn(str) { return String(str).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[^\d]/g, ''); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function $(sel) { return document.querySelector(sel); }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function cur() { return S.set.currency === 'rial' ? 'ریال' : 'تومان'; }
  function cv(n) { return S.set.currency === 'rial' ? n * 10 : n; } // مبالغ داخلی همیشه به تومان ذخیره می‌شوند
  function shortMoney(n) {
    n = cv(n);
    if (n >= 1e9) return num(n / 1e9, 1) + ' میلیارد';
    if (n >= 1e6) return num(n / 1e6, 1) + ' م';
    if (n >= 1e3) return num(n / 1e3, 0) + ' هزار';
    return num(n);
  }
  var todayFa = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });

  // ---------- محاسبات ----------
  // هزینه‌ی هر نخ، بسته به روش خرید (پاکتی، نخی، سیگار پیچ)
  function costPerCig(o) {
    o = o || S;
    var t = o.buyType || 'pack';
    if (t === 'single') return o.singlePrice || 0;
    if (t === 'roll') return (o.perPouch > 0 ? (o.pouchPrice || 0) / o.perPouch : 0) + (o.rollExtra || 0);
    return o.perPack > 0 ? (o.packPrice || 0) / o.perPack : 0;
  }
  function planSummary() {
    var a = [];
    if (useCig()) a.push('روزی ' + num(S.cpd) + ' نخ · ' + buySummary());
    if (useHk()) a.push('هفته‌ای ' + num(S.hkWeek) + ' وعده قلیان · هر وعده ' + shortMoney(S.hkPrice) + ' ' + cur());
    return a.join(' — ');
  }
  function buySummary() {
    var t = S.buyType || 'pack';
    if (t === 'single') return 'هر نخ ' + shortMoney(S.singlePrice) + ' ' + cur();
    if (t === 'roll') return 'سیگار پیچ · هر نخ حدود ' + shortMoney(Math.round(costPerCig())) + ' ' + cur();
    return 'هر پاکت ' + shortMoney(S.packPrice) + ' ' + cur();
  }
  function elapsedMs() { return Math.max(0, Date.now() - S.quitAt); }
  // لغزش‌ها از لحظه‌ی ترک به بعد
  var HK_MIN = 60; // هر وعده‌ی قلیان معمولاً حدود یک ساعت طول می‌کشد (CDC)
  function useCig() { return S.product !== 'hookah'; }
  function useHk() { return S.product === 'hookah' || S.product === 'both'; }
  function cpdEff() { return useCig() ? S.cpd : 0; }
  function hkPerDay() { return useHk() ? (S.hkWeek || 0) / 7 : 0; }
  function slipsSinceQuit() { return S.slips.filter(function (x) { return x.t >= S.quitAt && x.t <= Date.now(); }); }
  // لغزش سیگار (k خالی) و لغزش قلیان (k = 'h') جدا شمرده می‌شوند
  function slipCigs() { return slipsSinceQuit().reduce(function (a, x) { return a + (x.k === 'h' ? 0 : (x.n || 1)); }, 0); }
  function slipHk() { return slipsSinceQuit().reduce(function (a, x) { return a + (x.k === 'h' ? (x.n || 1) : 0); }, 0); }
  // قیمتی که در یک لحظه‌ی مشخص برقرار بوده
  function priceAt(t) {
    var p = S.prices[0] || { c: costPerCig(), h: S.hkPrice || 0 };
    for (var i = 1; i < S.prices.length; i++) if (S.prices[i].t <= t) p = S.prices[i];
    return p;
  }
  // هزینه‌ی روزانه‌ی مصرف قبلی با قیمت یک لحظه‌ی مشخص (پیش‌فرض: امروز)
  function dailyCost(t) { var p = priceAt(t || Date.now()); return cpdEff() * p.c + hkPerDay() * p.h; }
  // پول پس‌انداز‌شده: هر دوره با قیمت همان دوره حساب می‌شود، و هر لغزش با قیمت روز خودش کم می‌شود
  function moneySaved(now) {
    now = now || Date.now();
    if (now <= S.quitAt) return 0;
    var cuts = [S.quitAt];
    S.prices.forEach(function (p) { if (p.t > S.quitAt && p.t < now) cuts.push(p.t); });
    cuts.push(now);
    var m = 0;
    for (var i = 0; i < cuts.length - 1; i++) m += (cuts[i + 1] - cuts[i]) / 86400000 * dailyCost(cuts[i]);
    slipsSinceQuit().forEach(function (x) { var p = priceAt(x.t); m -= (x.n || 1) * (x.k === 'h' ? p.h : p.c); });
    return Math.max(0, m);
  }
  function lastSlip() { var l = slipsSinceQuit(); return l.length ? l.reduce(function (a, x) { return x.t > a.t ? x : a; }) : null; }
  // زمان از آخرین نخ (برای مراحل کوتاه‌مدت سلامتی)
  function cleanMs() { var l = lastSlip(); return Math.max(0, Date.now() - (l ? l.t : S.quitAt)); }
  function stats() {
    var ms = elapsedMs();
    var days = ms / 86400000;
    var slipped = slipCigs();
    var notSmoked = Math.max(0, Math.floor(days * cpdEff()) - slipped);
    var slippedHk = slipHk();
    var hk = Math.max(0, Math.floor(days * hkPerDay()) - slippedHk);
    var money = moneySaved();
    var lifeMin = notSmoked * 11; // برآورد رایج: حدود ۱۱ دقیقه برای هر نخ
    var freeMin = notSmoked * 6 + hk * HK_MIN;
    return { ms: ms, days: days, notSmoked: notSmoked, money: money, lifeMin: lifeMin, slipped: slipped, slippedHk: slippedHk, hk: hk, freeMin: freeMin, cleanMs: cleanMs() };
  }
  // سه عدد اصلی کارت بالای خانه، بسته به اینکه سیگار ترک شده یا قلیان
  function heroVals(st) {
    if (!useCig()) return [num(st.hk), 'وعده قلیان نکشیده', lifeText(st.freeMin), 'وقت آزادشده'];
    return [num(st.notSmoked), 'نخ نکشیده', lifeText(st.lifeMin), 'عمر برگشته'];
  }
  function slipAmountText(c, h) {
    var a = [];
    if (c) a.push(num(c) + ' نخ');
    if (h) a.push(num(h) + ' وعده قلیان');
    return a.join(' و ');
  }
  function cleanText(ms) {
    var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
    if (d) return num(d) + ' روز' + (h ? ' و ' + num(h) + ' ساعت' : '');
    if (h) return num(h) + ' ساعت و ' + num(m % 60) + ' دقیقه';
    return num(m) + ' دقیقه';
  }
  function lifeText(m) {
    if (m >= 1440) return num(Math.floor(m / 1440)) + ' روز';
    if (m >= 60) return num(Math.floor(m / 60)) + ' ساعت';
    return num(m) + ' دقیقه';
  }

  var MIN = 1, H = 60, D = 1440, W = 10080, MO = 43200, Y = 525600;
  var MILESTONES = [
    { t: 20 * MIN, title: 'ضربان قلب و فشار خون پایین می‌آید', when: '۲۰ دقیقه' },
    { t: 12 * H, title: 'مونوکسید کربن خون به حد طبیعی برمی‌گردد', when: '۱۲ ساعت' },
    { t: 2 * D, title: 'حس بویایی و چشایی بهتر می‌شود', when: '۲ روز' },
    { t: 12 * W, title: 'گردش خون و کار ریه بهتر می‌شود', when: '۲ تا ۱۲ هفته' },
    { t: 9 * MO, title: 'سرفه و تنگی نفس کمتر می‌شود', when: '۱ تا ۹ ماه' },
    { t: 1 * Y, title: 'خطر بیماری قلبی نصف می‌شود', when: '۱ سال' },
    { t: 5 * Y, title: 'خطر سکته کاهش چشمگیر دارد', when: '۵ سال' },
    { t: 10 * Y, title: 'خطر سرطان ریه حدوداً نصف می‌شود', when: '۱۰ سال' }
  ];
  // مراحل تا ۲ روز به آخرین نخ بستگی دارند و بعد از لغزش دوباره شمرده می‌شوند؛ مراحل بلندمدت از روز ترک
  function milestoneState() {
    var mAll = elapsedMs() / 60000, mClean = cleanMs() / 60000;
    var list = MILESTONES.map(function (x) { var m = x.t <= 2 * D ? mClean : mAll; return { title: x.title, when: x.when, t: x.t, p: Math.min(100, m / x.t * 100), m: m }; });
    var done = list.filter(function (x) { return x.p >= 100; }).length;
    var next = list.filter(function (x) { return x.p < 100; })[0] || null;
    if (next) next.left = Math.max(0, next.t - next.m);
    return { list: list, done: done, next: next };
  }
  function leftText(min) {
    if (min >= 2 * MO) return 'حدود ' + num(Math.round(min / MO)) + ' ماه دیگر';
    if (min >= 2 * W) return 'حدود ' + num(Math.round(min / W)) + ' هفته دیگر';
    if (min >= 2 * D) return 'حدود ' + num(Math.round(min / D)) + ' روز دیگر';
    if (min >= 2 * H) return 'حدود ' + num(Math.round(min / H)) + ' ساعت دیگر';
    return 'حدود ' + num(Math.max(1, Math.round(min))) + ' دقیقه دیگر';
  }

  // ---------- اعلان‌ها ----------
  var LN = plugin('LocalNotifications');
  var LANG = window.RAHA_I18N ? window.RAHA_I18N.lang : 'fa';
  // در حالت انگلیسی، متن اعلان‌ها هم ترجمه می‌شود
  if (LN && LANG === 'en' && typeof Proxy !== 'undefined') {
    LN = new Proxy(LN, { get: function (t, k) {
      if (k === 'schedule') return function (o) {
        (o && o.notifications || []).forEach(function (x) { x.title = window.RAHA_I18N.tr(x.title || ''); x.body = window.RAHA_I18N.tr(x.body || ''); });
        return t.schedule(o);
      };
      var v = t[k]; return typeof v === 'function' ? v.bind(t) : v;
    } });
  }
  var MS_ID = 100, DAILY_ID = 200, BACKUP_ID = 300;
  var MS_BODY = [
    '۲۰ دقیقه گذشت؛ ضربان قلب و فشار خون شما پایین آمده است.',
    '۱۲ ساعت شد! مونوکسید کربن خون شما به حد طبیعی برگشته است.',
    '۲ روز بدون سیگار؛ حس بویایی و چشایی شما دارد بهتر می‌شود.',
    '۱۲ هفته شد! گردش خون و کار ریه‌های شما بهتر شده است.',
    '۹ ماه! سرفه و تنگی نفس شما باید خیلی کمتر شده باشد.',
    'یک سال کامل! خطر بیماری قلبی شما حدوداً نصف شده است.',
    '۵ سال! خطر سکته برای شما کاهش چشمگیری داشته است.',
    '۱۰ سال! خطر سرطان ریه حدوداً نصف شده است. بی‌نظیرید.'
  ];
  var DAILY_MSG = ['امروز چطور گذشت؟ حالتان را ثبت کنید.', 'هر روز بدون سیگار یک پیروزی است. سری به رها بزنید.', 'هوس داشتید؟ تمرین تنفس فقط چند دقیقه طول می‌کشد.'];

  function notifPermission(ask) {
    if (!LN) return Promise.resolve(false);
    return LN.checkPermissions().then(function (p) {
      if (p.display === 'granted') return true;
      if (!ask) return false;
      return LN.requestPermissions().then(function (r) { return r.display === 'granted'; });
    }).catch(function () { return false; });
  }
  var channelReady = null;
  function ensureChannel() {
    if (!LN || !LN.createChannel) return Promise.resolve();
    if (!channelReady) channelReady = LN.createChannel({ id: 'raha', name: 'یادآورها و مراحل سلامتی', importance: 4, vibration: true }).catch(function () {});
    return channelReady;
  }
  // همه‌ی اعلان‌های آینده را از نو تنظیم می‌کند
  function reschedule(askPermission) {
    if (!LN || !S.ready) return Promise.resolve();
    var ids = [{ id: DAILY_ID }, { id: BACKUP_ID }];
    for (var i = 0; i < MILESTONES.length; i++) ids.push({ id: MS_ID + i });
    return LN.cancel({ notifications: ids }).catch(function () {}).then(function () {
      if (!S.set.notifMilestones && !S.set.daily && !S.set.backupRemind) return;
      return notifPermission(askPermission).then(function (ok) {
        if (!ok) return;
        return ensureChannel().then(function () {
          var list = [], now = Date.now();
          if (S.set.notifMilestones) {
            MILESTONES.forEach(function (m, i) {
              var ls = lastSlip(), at = (m.t <= 2 * D && ls ? ls.t : S.quitAt) + m.t * 60000;
              if (at > now + 5000) list.push({ id: MS_ID + i, channelId: 'raha', title: 'یک قدم دیگر برای سلامتی شما', body: MS_BODY[i], schedule: { at: new Date(at), allowWhileIdle: true }, extra: { go: 'health' } });
            });
          }
          if (S.set.daily) {
            var hm = S.set.dailyTime.split(':');
            list.push({ id: DAILY_ID, channelId: 'raha', title: 'رها', body: DAILY_MSG[Math.floor(Math.random() * DAILY_MSG.length)], schedule: { on: { hour: +hm[0], minute: +hm[1] }, allowWhileIdle: true }, extra: { go: 'home' } });
          }
          if (S.set.backupRemind) {
            // جمعه‌ها ساعت ۲۰ (در افزونه: ۱ = یکشنبه … ۶ = جمعه)
            list.push({ id: BACKUP_ID, channelId: 'raha', title: 'پشتیبان رها', body: 'یک پشتیبان از اطلاعاتتان در گوگل درایو، دراپ‌باکس یا وان‌درایو بگیرید تا چیزی از دست نرود.', schedule: { on: { weekday: 6, hour: 20, minute: 0 }, allowWhileIdle: true }, extra: { go: 'settings' } });
          }
          if (list.length) return LN.schedule({ notifications: list });
        });
      });
    }).catch(function () {});
  }
  if (LN) {
    try {
      LN.addListener('localNotificationActionPerformed', function (a) {
        var g = a && a.notification && a.notification.extra && a.notification.extra.go;
        if (g) go(g);
      });
    } catch (e) {}
  }

  // ---------- به‌روزرسانی ----------
  function checkUpdate(silent) {
    if (!silent) toast('در حال بررسی…');
    return fetch('https://api.github.com/repos/' + UPDATE_REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rel) {
        S.lastUpdateCheck = Date.now(); save();
        var m = /(\d+)$/.exec(rel.tag_name || ''), code = m ? +m[1] : 0;
        var apk = (rel.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
        if (code > APP_VERSION.code && apk) {
          sheet('<div class="h2">نسخه‌ی جدید آماده است</div><div class="muted" style="line-height:1.9">نسخه‌ی ' + fa(String(rel.tag_name).replace(/^v/, '')) + ' منتشر شده است. فایل را دانلود و نصب کنید؛ اطلاعات شما حفظ می‌شود.</div>' +
            '<button class="primary" data-url="' + esc(apk.browser_download_url) + '">دانلود نسخه‌ی جدید</button><button class="ghost" data-close>بعداً</button>');
        } else if (!silent) toast('شما آخرین نسخه را دارید');
      })
      .catch(function () { if (!silent) toast('دسترسی به سرور به‌روزرسانی ممکن نشد'); });
  }

  // جشن کوچک وقتی مرحله‌ی تازه‌ای کامل شده
  function celebrateIfNeeded() {
    if (!S.ready) return;
    var done = milestoneState().done;
    if (S.seenMs < 0 || S.seenMs > done) { S.seenMs = done; save(); return; }
    if (done > S.seenMs) {
      var m = MILESTONES[done - 1];
      S.seenMs = done; save();
      if (API.confetti) API.confetti();
      sheet('<div class="ring" style="align-self:center">' + fa(done) + '/' + fa(MILESTONES.length) + '</div>' +
        '<div class="h2" style="text-align:center">یک مرحله‌ی تازه کامل شد!</div><div class="muted" style="text-align:center;line-height:1.9">' + m.title + '</div>' +
        (API.shareCard ? '<button class="chip" data-hx="share-card" data-title="' + esc(m.title) + '" style="min-height:46px">ساختن کارت و اشتراک‌گذاری</button>' : '') +
        '<button class="primary" data-close>عالی</button>');
    }
  }

  // ---------- آیکن‌ها ----------
  var I = {
    bell: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    flame: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-1 4-6 6-6 11a6 6 0 0 0 12 0c0-5-5-7-6-11z"/><path d="M12 21c-2 0-3-1.5-3-3.5S12 13 12 13s3 2.5 3 4.5S14 21 12 21z"/></svg>',
    chev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    heart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    breath: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
    chart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    users: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 20a6.5 6.5 0 0 0-3-5.5"/></svg>',
    user: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    drop: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.3 0z"/></svg>',
    timer: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    book: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    bookOpen: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></svg>',
    headphones: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>',
    bookmark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    type: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
    copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
    playBig: '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pauseBig: '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
    skipPrev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18 5v14L8 12z"/><rect x="4" y="5" width="2.5" height="14" rx="1"/></svg>',
    skipNext: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l10-7z"/><rect x="17.5" y="5" width="2.5" height="14" rx="1"/></svg>',
    fwd: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">15</text></svg>',
    rew: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">15</text></svg>',
    spark: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    walk: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="2"/><path d="M9 21l2-6 3 3v3M7 12l3-4 4 2 3 3"/></svg>'
  };

  // ---------- ناوبری ----------
  var TABS = [['home', 'خانه', I.home], ['health', 'سلامتی', I.heart], ['instead', 'به‌جاش', I.spark], ['library', 'کتابخانه', I.book], ['progress', 'داشبورد', I.chart], ['settings', 'تنظیمات', I.gear]];
  function nav(active) {
    return '<nav class="tabs">' + TABS.map(function (t) {
      return '<a href="#' + t[0] + '" class="' + (t[0] === active ? 'on' : '') + '">' + t[2] + t[1] + '</a>';
    }).join('') + '</nav>' + (API.miniPlayer ? API.miniPlayer() : '');
  }
  function route() { return (location.hash || '#home').slice(1); }
  function go(r) { location.hash = '#' + r; }

  var tick = null, breathTimer = null;
  function clearTimers() { if (tick) clearInterval(tick); tick = null; if (breathTimer) clearTimeout(breathTimer); breathTimer = null; }
  var leaveHooks = [];
  function runLeave() { var h = leaveHooks; leaveHooks = []; h.forEach(function (f) { try { f(); } catch (e) {} }); }

  function render() {
    clearTimers();
    runLeave();
    var full = route();
    if (API.lockView) { var lv = API.lockView(); if (lv) { $('#app').innerHTML = lv; if (API.lockAfter) API.lockAfter(); return; } }
    // حالت «حامی»: کسی که خودش سیگار نمی‌کشد و فقط از بخش «با هم» استفاده می‌کند
    if (!S.ready && S.mode === 'supporter' && !/^(setup|welcome|ftnd|together|privacy|settings|coach)$/.test(full)) { go('together'); return; }
    if (!S.ready && S.mode !== 'supporter' && !/^(setup|welcome|ftnd)$/.test(full)) { go(S.onboarded || !VIEWS.welcome ? 'setup' : 'welcome'); return; }
    if (S.ready && full === 'welcome') { go('home'); return; }
    var parts = full.split('/'), r = parts[0], arg = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')) : undefined;
    if (!VIEWS[r]) r = 'home';
    document.body.classList.toggle('dark', r === 'sos');
    document.body.classList.toggle('has-mini', !!(API.miniPlayer && API.miniPlayer()));
    var html = VIEWS[r](arg);
    $('#app').innerHTML = html;
    window.scrollTo(0, 0);
    if (AFTER[r]) AFTER[r](arg);
    if (r === 'home') celebrateIfNeeded();
    if (API.applyTheme) API.applyTheme();
  }

  // ---------- صفحه‌ها ----------
  var VIEWS = {}, AFTER = {};
  var MOODS = ['عالی', 'خوب', 'معمولی', 'سخت'];
  var REASONS = ['سلامتی', 'خانواده', 'پس‌انداز', 'ورزش', 'بوی بهتر', 'آزادی'];
  // موقعیت‌هایی که هوس سیگار می‌آورند، با یک پیشنهاد برای هرکدام
  var TRIGGERS = [
    ['بعد از بیدار شدن', 'صبح‌ها اول یک لیوان آب بنوشید و ترتیب کارهای صبحتان را کمی عوض کنید.'],
    ['بعد از غذا', 'بعد از غذا زود از سر میز بلند شوید، مسواک بزنید یا چند دقیقه قدم بزنید.'],
    ['با چای یا قهوه', 'مدتی نوشیدنی یا جای همیشگی چای خوردنتان را عوض کنید.'],
    ['استرس یا عصبانیت', 'همان لحظه تمرین تنفس را شروع کنید؛ چند نفس آرام استرس را پایین می‌آورد.'],
    ['بی‌حوصلگی', 'برای لحظه‌های خالی یک کار کوچک آماده داشته باشید: پیام به یک دوست یا چند دقیقه کتاب صوتی.'],
    ['با دوستان یا مهمانی', 'از قبل به دوستانتان بگویید ترک کرده‌اید و کنار کسانی که سیگار می‌کشند نایستید.'],
    ['رانندگی', 'در ماشین آدامس یا تخمه داشته باشید و فندک را از ماشین بردارید.'],
    ['بعد از کار', 'برای پایان روز کاری یک جایگزین بگذارید: دوش، ورزش سبک یا قدم زدن.'],
    ['هنگام کار و تمرکز', 'استراحت‌های کوتاه کاری را با آب، کشش بدن یا قدم زدن پر کنید.']
  ];
  function cTime(c) { return typeof c === 'number' ? c : c.t; }
  function cTrig(c) { return typeof c === 'number' ? -1 : (typeof c.g === 'number' ? c.g : -1); }

  // ---------- کاهش تدریجی ----------
  function taperAllowance() {
    if (S.method !== 1 || !S.taperStart || S.quitAt <= Date.now()) return null;
    var total = S.taperDays || Math.max(1, Math.round((S.quitAt - S.taperStart) / 86400000));
    var d = Math.floor((Date.now() - S.taperStart) / 86400000);
    return Math.max(0, Math.round(S.cpd * (1 - (d + 1) / total)));
  }
  function taperCard() {
    var al = taperAllowance(); if (al === null) return '';
    var used = (S.smoked || {})[dayKey(Date.now())] || 0, over = used > al;
    return '<div class="card" style="gap:10px"><div class="row"><div class="h2">سهم امروز</div><div class="muted small">به‌جای ' + num(S.cpd) + ' نخ</div></div>' +
      '<div class="row" style="justify-content:flex-start;align-items:baseline;gap:8px"><div style="font-size:34px;font-weight:800;color:' + (over ? '#C0533A' : 'var(--green)') + '">' + num(used) + '</div><div class="muted">از ' + num(al) + ' نخ</div></div>' +
      '<div class="bar"><div style="width:' + Math.min(100, al ? used / al * 100 : (used ? 100 : 0)) + '%;' + (over ? 'background:#C0533A' : '') + '"></div></div>' +
      '<div class="grid2"><button class="chip on" data-act="smoked1">یک نخ کشیدم</button><button class="chip" data-act="smoked-undo">اشتباه زدم</button></div></div>';
  }
  // پیام‌های پیگیری بعد از لغزش (۲۴ و ۷۲ ساعت بعد)
  function slipCheckins() {
    if (!LN) return;
    notifPermission(false).then(function (ok) {
      if (!ok) return;
      ensureChannel().then(function () {
        LN.schedule({ notifications: [
          { id: 400, channelId: 'raha', title: 'رها', body: 'یک روز از لغزش گذشت. حالتان چطور است؟ هر ساعت بدون سیگار دوباره به حساب می‌آید.', schedule: { at: new Date(Date.now() + 86400000), allowWhileIdle: true }, extra: { go: 'home' } },
          { id: 401, channelId: 'raha', title: 'رها', body: 'سه روز گذشت. یک برنامه‌ی اگر-آنگاه برای موقعیتی که باعث لغزش شد بنویسید.', schedule: { at: new Date(Date.now() + 3 * 86400000), allowWhileIdle: true }, extra: { go: 'ifthen' } }
        ] }).catch(function () {});
      });
    });
  }

  VIEWS.home = function () {
    var st = stats(), ms = milestoneState(), mood = S.moods[dayKey(Date.now())];
    var nx = ms.next, future = S.quitAt > Date.now(), today = dayKey(Date.now());
    var pledged = S.pledges && S.pledges[today], streak = API.pledgeStreak ? API.pledgeStreak() : 0;
    var hero = future
      ? '<div class="hero"><div style="font-size:14px;font-weight:500;opacity:.9">تا روز ترک</div>' +
        '<div class="units"><div class="unit"><div class="big" id="c-d">۰</div><div class="lbl">روز</div></div>' +
        '<div class="unit"><div class="mid" id="c-h">۰۰</div><div class="lbl">ساعت</div></div>' +
        '<div class="unit"><div class="mid" id="c-m">۰۰</div><div class="lbl">دقیقه</div></div>' +
        '<div class="unit"><div class="mid" id="c-s">۰۰</div><div class="lbl">ثانیه</div></div></div>' +
        '<div class="sep"></div><div style="font-size:14px;line-height:1.9">' + (S.method === 1 ? 'در دوره‌ی کاهش تدریجی هستید. هر روز کمی کمتر، تا روز ترک.' : 'از این فرصت برای آماده شدن استفاده کنید.') + '</div></div>' +
        (S.method === 1 ? taperCard() : '') +
        '<a class="card" href="#prep" style="flex-direction:row;align-items:center;gap:12px"><div class="col" style="flex:1"><div class="h2">آماده‌شدن برای روز ترک</div><div class="muted small">فهرست کارهای پیش از ترک</div></div>' + I.chev + '</a>'
      : null;
    var hv = heroVals(st);
    return '<div class="screen">' +
      '<div class="row"><div class="col"><div class="muted">' + esc(todayFa.format(new Date())) + '</div>' +
      '<div class="h1">سلام' + (S.name ? '، ' + esc(S.name) : '') + '</div></div>' +
      '<div style="display:flex;gap:8px">' + (API.togetherIcon ? API.togetherIcon() : '') + '<a class="icon-btn" href="#settings" aria-label="تنظیمات اعلان‌ها">' + I.bell + '</a></div></div>' +
      (hero ? hero : '<div class="hero"><div style="font-size:14px;font-weight:500;opacity:.9">مدت زمانی که ' + (useCig() ? 'سیگار' : 'قلیان') + ' نکشیده‌اید</div>' +
      '<div class="units"><div class="unit"><div class="big" id="c-d">۰</div><div class="lbl">روز</div></div>' +
      '<div class="unit"><div class="mid" id="c-h">۰۰</div><div class="lbl">ساعت</div></div>' +
      '<div class="unit"><div class="mid" id="c-m">۰۰</div><div class="lbl">دقیقه</div></div>' +
      '<div class="unit"><div class="mid" id="c-s">۰۰</div><div class="lbl">ثانیه</div></div></div>' +
      '<div class="sep"></div><div class="grid3">' +
      '<div class="col"><div class="stat-v" id="s-n">' + hv[0] + '</div><div class="stat-l">' + hv[1] + '</div></div>' +
      '<div class="col"><div class="stat-v" id="s-m">' + shortMoney(st.money) + '</div><div class="stat-l">' + cur() + ' پس‌انداز</div></div>' +
      '<div class="col"><div class="stat-v" id="s-l">' + hv[2] + '</div><div class="stat-l">' + hv[3] + '</div></div>' +
      '</div>' + (S.product === 'both' ? '<div class="hero-slip"><span>قلیان: <b id="s-hk">' + num(st.hk) + '</b> وعده نکشیده</span></div>' : '') +
      (st.slipped || st.slippedHk ? '<div class="hero-slip"><span>' + (useHk() ? 'از آخرین بار' : 'از آخرین نخ') + ': <b id="s-clean">' + cleanText(st.cleanMs) + '</b></span><span>' + slipAmountText(st.slipped, st.slippedHk) + ' در این دوره</span></div>' : '') + '</div>') +
      priceRemindCard() + (API.homeExtra ? API.homeExtra() : '') +
      (!future ? '<div class="card pledge' + (pledged ? ' on' : '') + '" style="flex-direction:row;align-items:center;gap:12px">' +
        '<div class="col" style="flex:1"><div class="h2">' + (pledged ? 'تعهد امروز را دادید' : 'تعهد امروز') + '</div><div class="muted small">' + (pledged ? 'روزهای پیاپی: ' + num(streak) : 'فقط برای همین امروز: «امروز سیگار نمی‌کشم»') + '</div></div>' +
        (pledged ? '<div class="pledge-ok">✓</div>' : '<button class="chip on" data-act="pledge">متعهدم</button>') + '</div>' : '') +
      '<a class="sos" href="#sos"><div class="ic">' + I.flame + '</div><div class="col" style="flex:1"><div style="font-size:17px;font-weight:700">هوس سیگار دارم</div>' +
      '<div style="font-size:13px;color:#C9D3CD">چند دقیقه با من بمان، می‌گذرد</div></div>' + I.chev + '</a>' +
      (API.togetherCard ? API.togetherCard() : '') +
      (nx ? '<a class="card" href="#health"><div class="row"><div class="muted">قدم بعدی بدن شما</div><div style="font-size:13px;font-weight:700;color:var(--green)">' + num(Math.floor(nx.p)) + '٪</div></div>' +
        '<div class="h2">' + nx.title + '</div><div class="bar"><div style="width:' + nx.p + '%"></div></div><div class="muted small">' + leftText(nx.left) + '</div></a>' : '') +
      (S.ready && st.days >= 3 && (!S.lastBackup || Date.now() - S.lastBackup > 14 * 86400000)
        ? '<a class="card" href="#settings" style="flex-direction:row;align-items:center;gap:12px;background:var(--amber-tint);color:var(--amber-ink)"><div class="col" style="flex:1"><div style="font-weight:700">از اطلاعاتتان پشتیبان بگیرید</div><div class="small">در گوگل درایو، دراپ‌باکس یا وان‌درایو، تا با عوض کردن گوشی چیزی از دست نرود</div></div>' + I.chev + '</a>' : '') +
      (API.journeyCard ? API.journeyCard() : '') +
      '<div class="card"><div class="row"><div class="h2">حال امروزت چطوره؟</div><a class="muted small" href="#journal" style="text-decoration:underline">نوشتن در دفترچه</a></div>' +
      '<div class="grid4">' + MOODS.map(function (m, i) { return '<button class="mood' + (mood === i ? ' on' : '') + '" data-mood="' + i + '">' + m + '</button>'; }).join('') + '</div></div>' +
      (API.toolbox ? API.toolbox() : '') +
      '</div>' + nav('home');
  };
  AFTER.home = function () {
    function upd() {
      var ms = S.quitAt > Date.now() ? S.quitAt - Date.now() : elapsedMs(), s = Math.floor(ms / 1000);
      if (S.quitAt <= Date.now() && $('#c-d') && document.querySelector('.hero') && document.querySelector('.hero').textContent.indexOf('تا روز ترک') >= 0) { render(); return; }
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      var e = $('#c-d'); if (!e) return;
      e.textContent = num(d); $('#c-h').textContent = pad(h); $('#c-m').textContent = pad(m); $('#c-s').textContent = pad(sec);
      var st = stats(); if (!$('#s-n')) return;
      var hv = heroVals(st); $('#s-n').textContent = hv[0]; $('#s-m').textContent = shortMoney(st.money); $('#s-l').textContent = hv[2];
      var shk = $('#s-hk'); if (shk) shk.textContent = num(st.hk);
      var sc = $('#s-clean'); if (sc) sc.textContent = cleanText(st.cleanMs);
    }
    upd(); tick = setInterval(upd, 1000);
    (API.homeHooks || []).forEach(function (f) { try { f(); } catch (e) {} });
  };

  VIEWS.sos = function () {
    return '<div class="screen no-nav" style="gap:18px">' +
      '<div class="row"><a class="icon-btn" href="#home" aria-label="بستن">' + I.close + '</a><div class="muted">هوس معمولاً چند دقیقه بیشتر نمی‌ماند</div></div>' +
      (API.sosPhoto ? API.sosPhoto() : '') +
      '<div class="col" style="align-items:center;gap:6px;padding-top:8px"><div style="font-size:26px;font-weight:800">با هم نفس بکشیم</div>' +
      '<div class="muted" style="font-size:15px">دکمه را بزن و با دایره هماهنگ شو</div></div>' +
      '<div class="breath-wrap"><div class="breath-ring"><div class="breath" id="br"><b id="br-l">آماده‌ای؟</b><span id="br-h">تنفس ۴-۴-۶</span></div></div></div>' +
      '<button class="mint-btn" id="br-btn">شروع تمرین تنفس</button>' +
      '<div class="col" style="gap:10px"><div class="muted">یا یکی از این‌ها را امتحان کن</div><div class="grid2">' +
      '<button class="alt" data-act="water">' + I.drop + 'یک لیوان آب</button>' +
      '<button class="alt" data-act="reasons">' + I.heart + 'دلیل‌هایم برای ترک</button>' +
      '<button class="alt" data-act="wait">' + I.timer + 'فقط ۵ دقیقه صبر</button>' +
      '<button class="alt" data-act="walk">' + I.walk + 'یک قدم‌زدن کوتاه</button>' +
      (API.togetherSosButton ? API.togetherSosButton() : '') +
      (API.heartSosButtons ? API.heartSosButtons() : '') +
      (API.careSosButtons ? API.careSosButtons() : '') +
      '<a class="alt" href="#game">' + I.breath + 'بازی یک‌دقیقه‌ای</a>' +
      '<button class="alt" data-act="card">' + I.spark + 'کارت انگیزشی</button>' +
      '<a class="alt" href="#thoughts">' + I.heart + 'این فکر را بررسی کن</a>' +
      '<a class="alt" href="#help">' + I.headphones + 'کمک تخصصی</a>' +
      '</div>' + (API.ifthenHtml ? API.ifthenHtml() : '') + '<a href="#instead" style="color:#C9D3CD;font-size:14px;text-decoration:underline;align-self:center;min-height:36px;display:flex;align-items:center">ایده‌های بیشتر برای جایگزین سیگار</a></div>' +
      '<button class="primary" data-act="beat" style="background:#FFFFFF;color:#14211B">هوس را پشت سر گذاشتم</button>' +
      '<button class="ghost" data-act="slip" style="color:#C9D3CD">لغزش داشتم — بدون سرزنش ثبتش کن</button>' +
      '</div>';
  };
  AFTER.sos = function () {
    var running = false, phase = 0;
    var P = [{ l: 'دم', h: '۴ ثانیه', s: 220, d: 4000 }, { l: 'نگه دار', h: '۴ ثانیه', s: 220, d: 4000 }, { l: 'بازدم', h: '۶ ثانیه', s: 120, d: 6000 }];
    var br = $('#br'), btn = $('#br-btn');
    function step() {
      var p = P[phase];
      br.style.transitionDuration = (p.d / 1000) + 's';
      br.style.width = br.style.height = p.s + 'px';
      $('#br-l').textContent = p.l; $('#br-h').textContent = p.h;
      if (S.set.vibrate && navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
      breathTimer = setTimeout(function () { phase = (phase + 1) % 3; step(); }, p.d);
    }
    btn.onclick = function () {
      if (running) {
        clearTimeout(breathTimer); running = false; btn.textContent = 'شروع تمرین تنفس';
        br.style.width = br.style.height = '150px'; $('#br-l').textContent = 'آماده‌ای؟'; $('#br-h').textContent = 'تنفس ۴-۴-۶';
      } else { running = true; phase = 0; btn.textContent = 'توقف'; step(); }
    };
  };

  VIEWS.health = function () {
    var ms = milestoneState();
    return '<div class="screen">' +
      '<div class="title-bar"><a class="icon-btn" href="#home" aria-label="بازگشت">' + I.back + '</a><div class="h1">بدن شما در حال ترمیم است</div></div>' +
      '<a class="stats-link" href="#stats"><span class="lv-dot"></span><div class="col" style="flex:1"><div style="font-size:15px;font-weight:700">آمار زنده‌ی مرگ‌ومیر دخانیات</div><div class="small" style="opacity:.8">جهان و ایران، لحظه‌به‌لحظه</div></div>' + I.chev + '</a>' +
      '<div class="card" style="flex-direction:row;align-items:center;gap:16px"><div class="ring">' + fa(ms.done) + '/' + fa(ms.list.length) + '</div>' +
      '<div class="col"><div class="h2">' + num(ms.done) + ' مرحله از ' + num(ms.list.length) + ' کامل شد</div>' +
      '<div class="muted small" style="line-height:1.8">هر ساعت بدون سیگار، بدن یک قدم به حالت طبیعی نزدیک‌تر می‌شود.</div></div></div>' +
      ms.list.map(function (x) {
        var done = x.p >= 100, active = !done && ms.next && ms.next.t === x.t;
        return '<div class="ms"><div class="dot' + (done ? ' done' : active ? ' active' : '') + '">' + (done ? I.check : '') + '</div>' +
          '<div class="col" style="flex:1;gap:6px"><div class="row" style="align-items:flex-start"><div style="font-size:14px;font-weight:700">' + x.title + '</div>' +
          '<div class="muted small" style="white-space:nowrap">' + x.when + '</div></div>' +
          (active ? '<div class="bar" style="height:6px"><div style="width:' + x.p + '%"></div></div><div class="muted small">' + num(Math.floor(x.p)) + '٪ — ' + leftText(x.left) + '</div>' : '') +
          '</div></div>';
      }).join('') +
      (useHk() ? '<div class="card" style="background:var(--amber-tint);color:var(--amber-ink);line-height:2;font-size:14px"><b>قلیان هم دود است.</b> طبق مرکز کنترل بیماری‌های آمریکا (CDC)، کسی که یک ساعت قلیان می‌کشد حدود ۱۰۰ تا ۲۰۰ برابر یک نخ سیگار دود وارد ریه‌اش می‌کند. همین مراحل بهبود برای ترک قلیان هم برقرار است.</div>' : '') +
      '<div class="muted small" style="line-height:1.8">این زمان‌بندی‌ها میانگین‌های کلی هستند و برای هر نفر ممکن است فرق کند. برای مشاوره‌ی پزشکی با پزشک صحبت کنید.</div>' +
      '</div>' + nav('health');
  };

  VIEWS.progress = function () {
    var st = stats();
    var goalAmt = S.goal.amount || 0, saved = st.money;
    var pct = goalAmt > 0 ? Math.min(100, saved / goalAmt * 100) : 0;
    var perDay = dailyCost();
    var daysLeft = goalAmt > saved && perDay > 0 ? Math.ceil((goalAmt - saved) / perDay) : 0;
    var DN = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
    var counts = [], labels = [];
    for (var i = 6; i >= 0; i--) {
      var t = Date.now() - i * 86400000, k = dayKey(t);
      counts.push(S.cravings.filter(function (c) { return dayKey(cTime(c)) === k; }).length);
      labels.push(DN[new Date(t).getDay()]);
    }
    var max = Math.max.apply(null, counts.concat([1]));
    var d = st.days, beaten = S.cravings.length;
    var BAD = [['۱ روز', 'روز اول', d >= 1], ['۳ روز', 'سه‌روزه', d >= 3], ['۷ روز', 'یک هفته', d >= 7], ['۱۴ روز', 'دو هفته', d >= 14],
      ['۱ ماه', 'یک ماه', d >= 30], ['۱۰', '۱۰ هوس شکست', beaten >= 10], ['۱ م', 'یک میلیون پس‌انداز', saved >= 1e6], ['۱ سال', 'یک سال', d >= 365]];
    var got = BAD.filter(function (b) { return b[2]; }).length;
    return '<div class="screen">' +
      '<div class="title-bar"><a class="icon-btn" href="#home" aria-label="بازگشت">' + I.back + '</a><div class="h1">داشبورد شما</div></div>' +
      '<div class="goal"><div class="row"><div style="font-size:13px">هدف پس‌انداز</div>' +
      '<button data-act="goal" style="min-height:32px;border-radius:16px;border:none;background:var(--card);color:var(--amber-ink);font-size:12px;font-weight:700;padding:0 12px">' + (goalAmt ? 'ویرایش' : 'تعیین هدف') + '</button></div>' +
      '<div style="font-size:18px;font-weight:800;color:var(--ink)">' + (S.goal.name ? esc(S.goal.name) : 'برای پولی که جمع می‌شود یک هدف بگذارید') + '</div>' +
      '<div class="row" style="justify-content:flex-start;align-items:baseline;gap:6px"><div class="amt">' + num(Math.round(cv(saved))) + '</div>' +
      '<div style="font-size:13px">' + (goalAmt ? 'از ' + num(cv(goalAmt)) + ' ' + cur() : cur()) + '</div></div>' +
      (goalAmt ? '<div class="bar"><div style="width:' + pct + '%"></div></div><div style="font-size:12px">' + (daysLeft ? 'با این روند، حدود ' + num(daysLeft) + ' روز دیگر به هدف می‌رسید' : 'به هدف رسیدید!') + '</div>' : '') +
      '</div>' +
      '<div class="card"><div class="row"><div class="h2">هوس‌های شکست‌خورده در ۷ روز</div><div class="muted small">' + num(beaten) + ' در کل</div></div>' +
      '<div class="chart">' + counts.map(function (c, j) { return '<div class="c">' + num(c) + '<div class="b' + (j === 6 ? ' today' : '') + '" style="height:' + Math.round(c / max * 86) + 'px"></div></div>'; }).join('') + '</div>' +
      '<div class="days">' + labels.map(function (l) { return '<div>' + l + '</div>'; }).join('') + '</div></div>' +
      dashboardCards() +
      '<div class="row"><div class="h2">نشان‌ها</div><a class="muted" href="#badges" style="text-decoration:underline">همه‌ی نشان‌ها' + (API.badgeCount ? ' (' + num(API.badgeCount()[0]) + ' از ' + num(API.badgeCount()[1]) + ')' : '') + '</a></div>' +
      '<div class="grid4">' + BAD.map(function (b) { return '<div class="badge"><div class="m' + (b[2] ? ' on' : '') + '">' + b[0] + '</div>' + b[1] + '</div>'; }).join('') + '</div>' +
      '</div>' + nav('progress');
  };

  // ---------- به‌جاش: جایگزین‌ها و ایده‌ها ----------
  // برای هر موقعیت هوس (به همان ترتیب TRIGGERS) سه کار جایگزین
  var ALTS = [
    ['یک لیوان آب خنک بنوشید', 'چند دقیقه کشش و نرمش صبحگاهی', 'صبحانه را جای دیگری از خانه بخورید'],
    ['بلافاصله مسواک بزنید', 'ده دقیقه قدم بزنید', 'یک میوه یا آدامس بدون قند'],
    ['مدتی چای را با دمنوش عوض کنید', 'جای همیشگی چای خوردن را تغییر دهید', 'با نوشیدنی کتاب یا پادکست بگذارید، نه سیگار'],
    ['تمرین تنفس ۴-۴-۶ را شروع کنید', 'صورتتان را با آب خنک بشویید', 'چیزی که اذیتتان می‌کند را یادداشت کنید'],
    ['به یک دوست پیام بدهید', 'یک فصل کتاب صوتی گوش کنید', 'یک کار کوچک خانه را تمام کنید'],
    ['از قبل بگویید ترک کرده‌اید', 'دستتان را با یک لیوان نوشیدنی مشغول کنید', 'کنار جمع غیرسیگاری بنشینید'],
    ['آدامس یا تخمه در ماشین داشته باشید', 'یک پادکست یا کتاب صوتی پخش کنید', 'مسیر همیشگی را گاهی عوض کنید'],
    ['یک دوش آب گرم بگیرید', 'ورزش سبک یا پیاده‌روی کوتاه', 'برای پایان روز یک نوشیدنی خوش‌طعم آماده کنید'],
    ['هر ساعت دو دقیقه از پشت میز بلند شوید', 'یک بطری آب کنار دستتان بگذارید', 'کشش گردن و شانه در استراحت‌ها']
  ];
  // ایده‌ها برای وقت آزادشده: [عنوان، توضیح، دسته، دقیقه]
  var IDEAS = [
    ['پیاده‌روی سریع', 'یک دور کوتاه دور محله؛ ریه‌های تازه‌نفستان را حس کنید.', 'حرکت', 15],
    ['ده بار بلند شدن و نشستن', 'حرکت سریع، هوس را از ذهن دور می‌کند.', 'حرکت', 5],
    ['دوچرخه‌سواری یا شنا', 'نفس‌تان هر هفته بهتر می‌شود؛ امتحانش کنید.', 'حرکت', 60],
    ['یوگا یا کشش', 'چند حرکت کششی ساده برای آرام شدن بدن.', 'حرکت', 15],
    ['یادگرفتن چند کلمه‌ی تازه', 'هر روز چند کلمه از یک زبان جدید.', 'یادگیری', 15],
    ['یک فصل کتاب', 'از کتابخانه‌ی اپ یک فصل بخوانید یا گوش کنید.', 'یادگیری', 15],
    ['یک دوره‌ی آنلاین', 'مهارتی که همیشه می‌خواستید یاد بگیرید را شروع کنید.', 'یادگیری', 60],
    ['تماس با یک دوست قدیمی', 'حالش را بپرسید؛ لازم نیست درباره‌ی سیگار حرف بزنید.', 'با دیگران', 15],
    ['وقت گذاشتن با خانواده', 'یک بازی، یک چای، یک گپ بی‌دلیل.', 'با دیگران', 60],
    ['پیام تشکر', 'برای کسی که کمکتان کرده یک پیام کوتاه بفرستید.', 'با دیگران', 5],
    ['تنفس عمیق', 'سه دقیقه تمرین تنفس در صفحه‌ی هوس.', 'آرامش', 5],
    ['نوشتن در دفترچه', 'سه چیز خوب امروز را بنویسید.', 'آرامش', 5],
    ['مدیتیشن کوتاه', 'ده دقیقه بی‌حرکت بنشینید و فقط به نفس‌ها دقت کنید.', 'آرامش', 15],
    ['آشپزی یک غذای تازه', 'حالا که طعم‌ها را بهتر حس می‌کنید، وقتش است.', 'خانه و خلاقیت', 60],
    ['مرتب کردن یک کشو', 'یک کار کوچک و تمام‌شدنی؛ حس خوبی می‌دهد.', 'خانه و خلاقیت', 15],
    ['نقاشی یا خوشنویسی', 'دست‌ها که مشغول باشند، کمتر سراغ سیگار می‌روند.', 'خانه و خلاقیت', 15],
    ['رسیدگی به گل و گیاه', 'آب دادن و هرس کردن، آرام و دلپذیر.', 'خانه و خلاقیت', 15],
    ['تمیز کردن جاسیگاری‌ها', 'هر نشانه‌ای از سیگار را از خانه و ماشین بیرون کنید.', 'خانه و خلاقیت', 15],
    ['برنامه‌ی هدف پس‌انداز', 'برای پولی که جمع می‌شود یک هدف بگذارید.', 'یادگیری', 5],
    ['خوردن یک میوه', 'یک پرتقال یا سیب؛ هم دهان مشغول می‌شود هم ویتامین می‌رسد.', 'آرامش', 5]
  ];
  var MIN_PER_CIG = 6; // میانگین زمانی که هر نخ سیگار می‌گیرد (برآورد)
  function minText(m) {
    m = Math.round(m);
    if (m >= 1440) { var d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return num(d) + ' روز' + (h ? ' و ' + num(h) + ' ساعت' : ''); }
    if (m >= 60) { var hh = Math.floor(m / 60), mm = m % 60; return num(hh) + ' ساعت' + (mm ? ' و ' + num(mm) + ' دقیقه' : ''); }
    return num(m) + ' دقیقه';
  }
  var ideaFilter = 0;
  VIEWS.instead = function () {
    var st = stats();
    var perDay = cpdEff() * MIN_PER_CIG + hkPerDay() * HK_MIN, total = st.freeMin;
    // پیشنهاد امروز: هر روز یکی، ثابت در طول روز
    var dayIdx = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    var today = IDEAS[dayIdx % IDEAS.length];
    var doneToday = S.ideaDone && S.ideaDone[dayKey(Date.now())];
    // موقعیت‌های شخصی: ثبت‌شده‌ها اول، بعد گفته‌شده‌ها
    var tc = TRIGGERS.map(function () { return 0; });
    S.cravings.forEach(function (c) { var g = cTrig(c); if (g >= 0) tc[g]++; });
    var mine = tc.map(function (n, j) { return [n, j]; }).filter(function (x) { return x[0] > 0; }).sort(function (a, b) { return b[0] - a[0]; }).map(function (x) { return x[1]; });
    (S.triggers || []).forEach(function (g) { if (mine.indexOf(g) < 0) mine.push(g); });
    var others = TRIGGERS.map(function (x, j) { return j; }).filter(function (j) { return mine.indexOf(j) < 0; });
    function trigCard(g, open) {
      return '<details class="alt-card"' + (open ? ' open' : '') + '><summary><span>' + TRIGGERS[g][0] + '</span>' + I.chev + '</summary>' +
        '<ul>' + ALTS[g].map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>' +
        '<div class="muted small" style="line-height:1.9">' + TRIGGERS[g][1] + '</div></details>';
    }
    var F = [['همه', 0, 999], ['۵ دقیقه', 0, 5], ['۱۵ دقیقه', 6, 15], ['بیشتر', 16, 999]];
    var f = F[ideaFilter];
    var ideas = IDEAS.filter(function (x) { return x[3] >= f[1] && x[3] <= f[2]; });
    return '<div class="screen">' +
      '<div class="h1">به‌جای سیگار</div>' +
      '<div class="hero" style="gap:10px"><div style="font-size:14px;opacity:.9">وقتی که سیگار از شما می‌گرفت، حالا مال خودتان است</div>' +
      '<div style="font-size:28px;font-weight:800;line-height:1.5">' + minText(total) + '</div>' +
      '<div style="font-size:13px;opacity:.9">تا الان آزاد شده · روزی حدود ' + minText(perDay) + '</div></div>' +
      '<div class="card" style="gap:10px"><div class="row"><div class="muted small">پیشنهاد امروز</div><div class="lib-tags"><span>' + today[2] + ' · ' + num(today[3]) + ' دقیقه</span></div></div>' +
      '<div class="h2">' + today[0] + '</div><div class="muted" style="line-height:1.9">' + today[1] + '</div>' +
      (doneToday ? '<div style="color:var(--green);font-weight:700;font-size:14px">انجامش دادید، آفرین!</div>' : '<button class="chip on" data-act="idea-done" style="align-self:flex-start">انجامش دادم</button>') + '</div>' +
      '<div class="h2" style="margin-top:4px">وقتی هوس سیگار می‌آید</div>' +
      (mine.length ? '<div class="muted small" style="margin-top:-8px">موقعیت‌های خودتان</div>' + mine.map(function (g, i) { return trigCard(g, i === 0); }).join('') : '') +
      (mine.length ? '<div class="muted small">موقعیت‌های دیگر</div>' : '') + others.map(function (g) { return trigCard(g, false); }).join('') +
      '<div class="h2" style="margin-top:4px">با وقت آزادشده چه کنم؟</div>' +
      '<div class="seg">' + F.map(function (x, i) { return '<button style="flex:1" data-ifl="' + i + '" class="' + (i === ideaFilter ? 'on' : '') + '">' + x[0] + '</button>'; }).join('') + '</div>' +
      '<div class="idea-grid">' + ideas.map(function (x) {
        return '<div class="idea"><div class="lib-tags"><span>' + x[2] + '</span><span style="background:var(--amber-tint);color:var(--amber-ink)">' + num(x[3]) + ' دقیقه</span></div>' +
          '<div style="font-size:15px;font-weight:700">' + x[0] + '</div><div class="muted small" style="line-height:1.8">' + x[1] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="muted small" style="line-height:1.8">زمان آزادشده بر اساس حدود ' + num(MIN_PER_CIG) + ' دقیقه برای هر نخ برآورد شده است.</div>' +
      '</div>' + nav('instead');
  };

  // ---------- داشبورد حال و هوس‌ها ----------
  var MOOD_COLORS = ['#1C7A52', '#5FC996', '#E8B04B', '#C0533A'];
  // روزهای پاک و روزهای لغزش
  function cleanDaysCard() {
    if (S.quitAt > Date.now()) return '';
    var byDay = {};
    slipsSinceQuit().forEach(function (x) { var k = dayKey(x.t); byDay[k] = (byDay[k] || 0) + (x.n || 1); });
    var totalDays = Math.max(1, Math.ceil((Date.now() - S.quitAt) / 86400000));
    var slipDays = Object.keys(byDay).length;
    var pct = Math.round((totalDays - slipDays) / totalDays * 100);
    // طولانی‌ترین دوره‌ی پاک (روز)
    var times = [S.quitAt].concat(slipsSinceQuit().map(function (x) { return x.t; }).sort(function (a, b) { return a - b; })).concat([Date.now()]);
    var longest = 0; for (var i = 1; i < times.length; i++) longest = Math.max(longest, times[i] - times[i - 1]);
    var cells = '';
    for (var j = 13; j >= 0; j--) {
      var t = Date.now() - j * 86400000, k = dayKey(t), before = t < S.quitAt - 86400000;
      var n = byDay[k] || 0;
      cells += '<div class="cd' + (before ? ' off' : n ? ' slip' : ' ok') + '">' + (n ? fa(n) : '') + '</div>';
    }
    return '<div class="card"><div class="row"><div class="h2">روزهای بدون سیگار</div><div class="muted small">۱۴ روز اخیر</div></div>' +
      '<div class="cdays">' + cells + '</div>' +
      '<div class="mlegend"><span><i style="background:var(--green)"></i>پاک</span><span><i style="background:#C0533A"></i>لغزش (عدد = ' + (useHk() ? 'تعداد' : 'تعداد نخ') + ')</span></div>' +
      '<div class="grid3" style="text-align:center"><div class="col"><b style="font-size:20px;color:var(--green)">' + num(pct) + '٪</b><span class="muted small">روزهای پاک</span></div>' +
      '<div class="col"><b style="font-size:20px">' + num(Math.floor(longest / 86400000)) + '</b><span class="muted small">طولانی‌ترین دوره (روز)</span></div>' +
      '<div class="col"><b style="font-size:20px">' + num(slipCigs() + slipHk()) + '</b><span class="muted small">' + (useHk() ? (useCig() ? 'نخ و وعده‌ی لغزش' : 'وعده‌ی لغزش') : 'نخ در کل این دوره') + '</span></div></div>' +
      (slipDays ? '<div class="muted small" style="line-height:1.9">هر لغزش فقط همان مقدار را از آمار کم می‌کند؛ بقیه‌ی مسیرتان سر جایش است.</div>' : '') + '</div>';
  }
  function dashboardCards() {
    // ۱) حال روزانه در ۱۴ روز گذشته
    var dots = '', logged = 0, mc = [0, 0, 0, 0];
    for (var i = 13; i >= 0; i--) {
      var k = dayKey(Date.now() - i * 86400000), m = S.moods[k];
      if (typeof m === 'number') { logged++; mc[m]++; }
      dots += '<div class="mdot" title="" style="background:' + (typeof m === 'number' ? MOOD_COLORS[m] : 'var(--line)') + '"></div>';
    }
    var topMood = logged ? mc.indexOf(Math.max.apply(null, mc)) : -1;
    var moodCard = '<div class="card"><div class="row"><div class="h2">حال شما در ۱۴ روز گذشته</div><div class="muted small">' + num(logged) + ' روز ثبت شده</div></div>' +
      '<div class="mdots">' + dots + '</div>' +
      '<div class="mlegend">' + MOODS.map(function (n, j) { return '<span><i style="background:' + MOOD_COLORS[j] + '"></i>' + n + '</span>'; }).join('') + '</div>' +
      (topMood >= 0 ? '<div class="muted small">بیشتر روزها حالتان «' + MOODS[topMood] + '» بوده است.' + (mc[3] >= 3 ? ' چند روز سخت داشتید؛ در روزهای سخت تمرین تنفس و کتاب‌های صوتی کمک می‌کنند.' : '') + '</div>'
        : '<div class="muted small">از صفحه‌ی خانه هر روز حالتان را ثبت کنید تا اینجا نمایش داده شود.</div>') + '</div>';

    // ۲) موقعیت‌های هوس
    var tc = TRIGGERS.map(function () { return 0; }), withTrig = 0;
    S.cravings.forEach(function (c) { var g = cTrig(c); if (g >= 0 && g < tc.length) { tc[g]++; withTrig++; } });
    var rows, trigNote;
    if (withTrig) {
      var order = tc.map(function (n, j) { return [n, j]; }).filter(function (x) { return x[0] > 0; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 5);
      var mx = order[0][0];
      rows = order.map(function (x) { return '<div class="hrow"><div class="hl">' + TRIGGERS[x[1]][0] + '</div><div class="hbar"><div style="width:' + Math.max(6, x[0] / mx * 100) + '%"></div></div><div class="hn">' + num(x[0]) + '</div></div>'; }).join('');
      trigNote = 'بر اساس ' + num(withTrig) + ' هوسی که ثبت کرده‌اید';
    } else if ((S.triggers || []).length) {
      rows = '<div class="chips">' + S.triggers.map(function (g) { return '<span class="chip on" style="display:inline-flex;align-items:center">' + TRIGGERS[g][0] + '</span>'; }).join('') + '</div>';
      trigNote = 'موقعیت‌هایی که خودتان گفتید؛ با ثبت هوس‌ها دقیق‌تر می‌شود';
    } else {
      rows = '<div class="muted small" style="line-height:1.9">هر بار در صفحه‌ی هوس دکمه‌ی «هوس را پشت سر گذاشتم» را بزنید و بگویید چه چیزی باعثش شد.</div>';
      trigNote = '';
    }
    var trigCard = '<div class="card"><div class="h2">بیشتر چه موقع‌هایی هوس می‌کنید؟</div>' + (trigNote ? '<div class="muted small" style="margin-top:-6px">' + trigNote + '</div>' : '') + rows + '</div>';

    // ۳) ساعت‌های روز
    var B = [['صبح', 5, 11], ['ظهر', 11, 15], ['عصر', 15, 19], ['شب', 19, 24], ['نیمه‌شب', 0, 5]], bc = [0, 0, 0, 0, 0];
    S.cravings.forEach(function (c) { var h = new Date(cTime(c)).getHours(); for (var j = 0; j < B.length; j++) if (h >= B[j][1] && h < B[j][2]) { bc[j]++; break; } });
    var bm = Math.max.apply(null, bc.concat([1]));
    var timeCard = S.cravings.length ? '<div class="card"><div class="h2">ساعت‌های پرخطر</div>' +
      B.map(function (b, j) { return '<div class="hrow"><div class="hl">' + b[0] + '</div><div class="hbar"><div style="width:' + Math.max(bc[j] ? 6 : 0, bc[j] / bm * 100) + '%;background:var(--amber)"></div></div><div class="hn">' + num(bc[j]) + '</div></div>'; }).join('') + '</div>' : '';

    // ۴) پیشنهاد
    var top = -1;
    if (withTrig) top = tc.indexOf(Math.max.apply(null, tc)); else if ((S.triggers || []).length) top = S.triggers[0];
    var tip = top >= 0 ? '<div class="card" style="background:var(--green-tint)"><div class="h2" style="color:var(--green-dark)">پیشنهاد برای شما</div>' +
      '<div style="line-height:2;font-size:14px">' + TRIGGERS[top][1] + '</div></div>' : '';

    // ۵) خلاصه
    var slipsN = slipCigs() + slipHk();
    var sum = '<div class="grid3"><div class="card" style="padding:12px;gap:2px;align-items:center"><div class="stat-v" style="color:var(--green)">' + num(S.cravings.length) + '</div><div class="muted small">هوس شکست‌خورده</div></div>' +
      '<div class="card" style="padding:12px;gap:2px;align-items:center"><div class="stat-v">' + num(slipsN) + '</div><div class="muted small">' + (useHk() ? 'لغزش' : 'نخ لغزش') + '</div></div>' +
      '<div class="card" style="padding:12px;gap:2px;align-items:center"><div class="stat-v">' + num(logged) + '</div><div class="muted small">ثبت حال</div></div></div>';
    // چه چیزی بیشتر کمک کرده است
    var HL = API.HELPS || [], hc = HL.map(function () { return 0; }), hAny = 0;
    S.cravings.forEach(function (c) { if (c && c.h) c.h.forEach(function (h) { if (h < hc.length) { hc[h]++; hAny++; } }); });
    var helpCard = '';
    if (hAny) {
      var ho = hc.map(function (n, j) { return [n, j]; }).filter(function (x) { return x[0]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 5), hm = ho[0][0];
      helpCard = '<div class="card"><div class="h2">چه چیزی بیشتر کمک کرده؟</div>' + ho.map(function (x) { return '<div class="hrow"><div class="hl">' + HL[x[1]] + '</div><div class="hbar"><div style="width:' + Math.max(6, x[0] / hm * 100) + '%;background:var(--mint)"></div></div><div class="hn">' + num(x[0]) + '</div></div>'; }).join('') + '</div>';
    }
    var histLink = S.cravings.length ? '<a class="chip" href="#cravings" style="display:flex;align-items:center;justify-content:center">تاریخچه‌ی کامل هوس‌ها</a>' : '';
    return sum + cleanDaysCard() + priceCard() + (API.dashExtra ? API.dashExtra() : '') + moodCard + trigCard + timeCard + helpCard + tip + histLink;
  }

  // ---------- قیمت و تورم ----------
  function lastPriceChange() { var l = S.prices[S.prices.length - 1]; return Math.max(l && l.t ? l.t : S.quitAt, S.priceAsk || 0); }
  function priceRemindCard() {
    if (!S.ready || S.quitAt > Date.now() || Date.now() - S.quitAt < 30 * 86400000 || Date.now() - lastPriceChange() < 60 * 86400000) return '';
    return '<div class="card" style="gap:10px"><div class="h2">' + (useCig() ? 'قیمت سیگار' : 'قیمت قلیان') + ' عوض شده؟</div>' +
      '<div class="muted small" style="line-height:1.9">اگر قیمت بالا رفته، قیمت تازه را وارد کنید تا پس‌اندازتان از امروز با قیمت واقعی حساب شود. روزهای قبل با همان قیمت قبلی می‌مانند.</div>' +
      '<div class="grid2"><button class="chip on" data-act="price">به‌روز کردن قیمت</button><button class="chip" data-act="price-later">قیمت همان است</button></div></div>';
  }
  function priceCard() {
    if (!S.ready || !S.prices.length) return '';
    var now = Date.now(), first = S.prices[0], firstDaily = cpdEff() * first.c + hkPerDay() * first.h, nowDaily = dailyCost(now);
    var up = firstDaily > 0 ? Math.round((nowDaily / firstDaily - 1) * 100) : 0;
    var chart = '';
    if (S.prices.length > 1) {
      var t0 = Math.min(S.quitAt, S.prices[1].t), span = Math.max(1, now - t0), W = 300, Hh = 80;
      var vals = S.prices.map(function (p) { return cpdEff() * p.c + hkPerDay() * p.h; }), vmax = Math.max.apply(null, vals) || 1, vmin = Math.min.apply(null, vals);
      var y = function (v) { return Hh - 8 - (vmax === vmin ? 0.5 : (v - vmin) / (vmax - vmin)) * (Hh - 20); };
      // نمودار پله‌ای: از راست (قدیمی) به چپ (امروز)
      var x = function (t) { return W - Math.max(0, t - t0) / span * W; };
      var d = 'M' + W + ',' + y(vals[0]).toFixed(1);
      for (var i = 1; i < S.prices.length; i++) { var xi = x(S.prices[i].t).toFixed(1); d += ' L' + xi + ',' + y(vals[i - 1]).toFixed(1) + ' L' + xi + ',' + y(vals[i]).toFixed(1); }
      d += ' L0,' + y(vals[vals.length - 1]).toFixed(1);
      chart = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" style="width:100%;height:auto" aria-label="نمودار قیمت"><path d="' + d + '" fill="none" stroke="var(--amber)" stroke-width="3" stroke-linejoin="round"/></svg>' +
        '<div class="row muted small"><span>' + faDate.format(new Date(t0)) + '</span><span>امروز</span></div>';
    }
    return '<div class="card"><div class="row"><div class="h2">قیمت و تورم</div><button class="chip" data-act="price" style="min-height:34px;font-size:12px">قیمت تازه</button></div>' +
      '<div class="grid2" style="text-align:center"><div class="col"><b style="font-size:18px">' + shortMoney(nowDaily) + '</b><span class="muted small">هزینه‌ی روزانه با قیمت امروز (' + cur() + ')</span></div>' +
      '<div class="col"><b style="font-size:18px">' + shortMoney(nowDaily * 30) + '</b><span class="muted small">اگر هنوز می‌کشیدید، در ماه</span></div></div>' +
      chart +
      (S.prices.length > 1 ? '<div class="muted small" style="line-height:1.9">' + (up > 0 ? 'از روزی که ثبت کرده‌اید، قیمت ' + num(up) + '٪ بالا رفته است. هر بار که گران‌تر می‌شود، پس‌انداز روزانه‌ی شما هم بیشتر می‌شود.' : 'قیمت‌ها از روز اول تغییری نکرده است.') + '</div>'
        : '<div class="muted small" style="line-height:1.9">هر وقت قیمت عوض شد، «قیمت تازه» را بزنید. پس‌انداز روزهای قبل با قیمت قبلی و روزهای بعد با قیمت تازه حساب می‌شود.</div>') + '</div>';
  }
  function priceSheet() {
    var f = '';
    if (useCig()) {
      var bt = S.buyType || 'pack';
      f += bt === 'pack' ? moneyField('pr-a', 'قیمت تازه‌ی هر پاکت (تومان)', S.packPrice, '') : bt === 'single' ? moneyField('pr-a', 'قیمت تازه‌ی هر نخ (تومان)', S.singlePrice, '') : moneyField('pr-a', 'قیمت تازه‌ی هر بسته توتون (تومان)', S.pouchPrice, '');
    }
    if (useHk()) f += moneyField('pr-h', 'هزینه‌ی تازه‌ی هر وعده قلیان (تومان)', S.hkPrice, '');
    sheet('<div class="h2">قیمت تازه</div><div class="muted small" style="line-height:1.9">قیمت تازه از همین امروز حساب می‌شود؛ پس‌انداز روزهای گذشته تغییر نمی‌کند.</div>' + f +
      '<button class="primary" id="pr-ok">ثبت قیمت از امروز</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelector('#pr-ok').onclick = function () {
        var a = bg.querySelector('#pr-a'), h = bg.querySelector('#pr-h');
        var av = a ? parseInt(toEn(a.value) || '0', 10) : 0, hv = h ? parseInt(toEn(h.value) || '0', 10) : 0;
        if ((a && !av) || (h && !hv)) { toast('قیمت را وارد کنید'); return; }
        if (a) { var bt2 = S.buyType || 'pack'; if (bt2 === 'pack') S.packPrice = av; else if (bt2 === 'single') S.singlePrice = av; else S.pouchPrice = av; }
        if (h) S.hkPrice = hv;
        S.prices.push({ t: Date.now(), c: costPerCig(), h: S.hkPrice || 0 }); S.priceAsk = Date.now();
        save(); syncWidget(); bg.remove(); toast('قیمت تازه ثبت شد'); render();
      };
    });
  }

  // ---------- ویجت صفحه‌ی اصلی گوشی ----------
  // اطلاعات لازم برای ویجت به بخش بومی اندروید فرستاده می‌شود؛ ویجت خودش هر ۳۰ دقیقه
  // روزها، پول و نخ‌های نکشیده را از روی همین اعداد حساب می‌کند.
  var widgetT = null;
  function syncWidget() {
    clearTimeout(widgetT);
    widgetT = setTimeout(function () {
      var W = null;
      try { W = window.Capacitor && (window.Capacitor.Plugins.RahaWidget || (window.Capacitor.registerPlugin && window.Capacitor.registerPlugin('RahaWidget'))); } catch (e) {}
      if (!W || !IS_NATIVE) return;
      var now = Date.now(), ls = lastSlip(), cig = useCig();
      var data = {
        ready: !!S.ready, quitAt: S.quitAt, costPerCig: costPerCig(),
        // واحد شمارش ویجت: نخ سیگار، یا برای ترک فقط قلیان، وعده‌ی قلیان
        cpd: cig ? S.cpd : hkPerDay(), slipCigs: cig ? slipCigs() : slipHk(), unit: cig ? 'نخ نکشیده' : 'وعده قلیان نکشیده',
        // پول: مقدار تا همین لحظه (با تاریخچه‌ی قیمت) + نرخ روزانه با قیمت امروز
        moneyBase: moneySaved(now), moneyAt: now, moneyRate: dailyCost(now) / 86400000,
        lastSlipAt: ls ? ls.t : 0,
        rial: S.set.currency === 'rial',
        milestones: MILESTONES.map(function (m) { return { t: m.t, title: m.title }; })
      };
      try { W.update({ data: JSON.stringify(data) }).catch(function () {}); } catch (e) {}
    }, 300);
  }

  // ---------- پشتیبان‌گیری و بازگردانی ----------
  var faDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });
  function backupStatus() {
    if (!S.lastBackup) return 'هنوز پشتیبانی نگرفته‌اید';
    var d = Math.floor((Date.now() - S.lastBackup) / 86400000);
    return faDate.format(new Date(S.lastBackup)) + (d === 0 ? ' (امروز)' : ' (' + num(d) + ' روز پیش)');
  }
  function backupFileName() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'raha-backup-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.json';
  }
  function makeBackup() {
    S.lastBackupPrev = S.lastBackup;
    S.lastBackup = Date.now();
    var payload = JSON.stringify({ app: 'raha', v: 1, created: S.lastBackup, version: APP_VERSION.code || 0, data: S });
    var name = backupFileName();
    var FS = plugin('Filesystem'), SH = plugin('Share');
    if (IS_NATIVE && FS && SH) {
      FS.writeFile({ path: name, data: payload, directory: 'CACHE', encoding: 'utf8' })
        .then(function (r) { return SH.share({ title: 'پشتیبان رها', text: 'فایل پشتیبان اپ رها', files: [r.uri], dialogTitle: 'کجا ذخیره شود؟' }); })
        .then(function () { save(); toast('پشتیبان آماده شد'); render(); })
        .catch(function (e) {
          var msg = String(e && e.message || '');
          if (/cancel/i.test(msg)) { toast('پشتیبان‌گیری لغو شد'); S.lastBackup = S.lastBackupPrev; return; }
          toast('ساختن پشتیبان ممکن نشد');
        });
      return;
    }
    // نسخه‌ی مرورگر: دانلود فایل
    try {
      var blob = new Blob([payload], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      save(); toast('فایل پشتیبان دانلود شد'); render();
    } catch (e) { toast('ساختن پشتیبان ممکن نشد'); }
  }
  function pickRestore() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json,text/plain,*/*';
    inp.style.display = 'none';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove();
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { restoreFrom(String(rd.result || '')); };
      rd.onerror = function () { toast('خواندن فایل ممکن نشد'); };
      rd.readAsText(f);
    };
    document.body.appendChild(inp); inp.click();
  }
  function restoreFrom(text) {
    var obj = null;
    try { obj = JSON.parse(text); } catch (e) {}
    if (!obj || obj.app !== 'raha' || !obj.data || typeof obj.data !== 'object' || !obj.data.quitAt) { toast('این فایل، پشتیبان رها نیست'); return; }
    var d = obj.data;
    var days = Math.floor(Math.max(0, Date.now() - d.quitAt) / 86400000);
    sheet('<div class="h2">بازگردانی این پشتیبان؟</div>' +
      '<div class="muted" style="line-height:2">تاریخ پشتیبان: ' + faDate.format(new Date(obj.created || Date.now())) + '<br>شروع ترک: ' + faDate.format(new Date(d.quitAt)) + ' (' + num(days) + ' روز)' +
      '<br>هوس‌های ثبت‌شده: ' + num((d.cravings || []).length) + '</div>' +
      '<div class="muted small" style="line-height:1.9">اطلاعات فعلی این گوشی با اطلاعات پشتیبان جایگزین می‌شود.</div>' +
      '<button class="primary" id="rs-ok">بازگردانی</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelector('#rs-ok').onclick = function () {
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { toast('ذخیره ممکن نشد'); return; }
        toast('اطلاعات بازگردانده شد');
        setTimeout(function () { location.hash = '#home'; location.reload(); }, 600);
      };
    });
  }

  // ---------- تنظیمات ----------
  function sw(key, on) {
    return '<button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-toggle="' + key + '"><span></span></button>';
  }
  function sw2(key, on) {
    return '<button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + !!on + '" data-sw2="' + key + '"><span></span></button>';
  }
  function setRow(title, sub, right) {
    return '<div class="srow"><div class="col" style="flex:1"><div class="st">' + title + '</div>' + (sub ? '<div class="muted small" style="line-height:1.7">' + sub + '</div>' : '') + '</div>' + right + '</div>';
  }
  VIEWS.settings = function () {
    var st = S.set;
    return '<div class="screen">' +
      '<div class="h1">تنظیمات</div>' +

      '<div class="sec">برنامه</div><div class="card sgroup">' +
      '<a class="srow" href="#plan"><div class="col" style="flex:1"><div class="st">برنامه‌ی ترک</div><div class="muted small">' +
      planSummary() + '</div></div>' + I.chev + '</a>' +
      '</div>' +

      '<div class="sec">اعلان‌ها</div><div class="card sgroup">' +
      '<div id="perm-box"></div>' +
      setRow('اعلان مراحل سلامتی', 'هر بار که بدنتان یک مرحله از بهبود را پشت سر بگذارد خبرتان می‌کنیم', sw('notifMilestones', st.notifMilestones)) +
      setRow('یادآور روزانه', 'یک پیام کوتاه برای ثبت حال و ادامه‌ی مسیر', sw('daily', st.daily)) +
      (st.daily ? setRow('ساعت یادآور', '', '<input type="time" class="input" id="daily-time" value="' + esc(st.dailyTime) + '" style="width:150px;direction:ltr;min-height:42px;padding:0 10px" aria-label="ساعت یادآور">') : '') +
      (API.settingsNotifExtra ? API.settingsNotifExtra() : '') +
      '<div class="srow"><button class="chip" data-act="test-notif" style="width:100%">ارسال یک اعلان آزمایشی</button></div>' +
      '</div>' +

      '<div class="sec">عمومی</div><div class="card sgroup">' +
      setRow('واحد پول', '', '<div class="seg"><button class="' + (st.currency === 'toman' ? 'on' : '') + '" data-cur="toman">تومان</button><button class="' + (st.currency === 'rial' ? 'on' : '') + '" data-cur="rial">ریال</button></div>') +
      setRow('لرزش در تمرین تنفس', '', sw('vibrate', st.vibrate)) +
      (API.settingsTheme ? API.settingsTheme() : '') +
      setRow('زبان / Language', '', '<div class="seg"><button class="' + (LANG === 'en' ? '' : 'on') + '" data-lang="fa">فارسی</button><button class="' + (LANG === 'en' ? 'on' : '') + '" data-lang="en">English</button></div>') +
      '</div>' +
      (API.settingsExtra ? API.settingsExtra() : '') +

      '<div class="sec">به‌روزرسانی</div><div class="card sgroup">' +
      setRow('نسخه‌ی فعلی', '', '<div class="muted" id="ver">' + (APP_VERSION.code ? fa(APP_VERSION.name) : APP_VERSION.name) + '</div>') +
      (APP_VERSION.store
        ? '<div class="srow"><div class="muted small" style="flex:1;line-height:1.9">نسخه‌های تازه از طریق ' + (APP_VERSION.store === 'myket' ? 'مایکت' : 'کافه‌بازار') + ' می‌رسند.</div><button class="chip on" data-url="' + (APP_VERSION.store === 'myket' ? 'myket' : 'bazaar') + '://details?id=com.rha.quitsmoking">' + (APP_VERSION.store === 'myket' ? 'مایکت' : 'کافه‌بازار') + '</button></div>'
        : setRow('بررسی خودکار', 'روزی یک بار هنگام باز کردن اپ', sw('autoUpdate', st.autoUpdate)) +
          '<div class="srow"><button class="primary" data-act="update" style="min-height:48px;font-size:15px">بررسی به‌روزرسانی</button></div>') +
      '</div>' +

      '<div class="sec">پشتیبان‌گیری</div><div class="card sgroup">' +
      '<div class="srow"><div class="col" style="flex:1"><div class="st">آخرین پشتیبان</div><div class="muted small">' + backupStatus() + '</div></div></div>' +
      '<div class="srow" style="flex-direction:column;align-items:stretch;gap:10px"><button class="primary" data-act="backup" style="min-height:48px;font-size:15px">گرفتن پشتیبان</button>' +
      '<button class="chip" data-act="restore" style="min-height:46px">بازگردانی از فایل پشتیبان</button>' +
      '<div class="muted small" style="line-height:1.9">بعد از زدن «گرفتن پشتیبان»، از فهرستی که باز می‌شود گوگل درایو، دراپ‌باکس، وان‌درایو یا هر جای دیگری را انتخاب کنید. برای بازگردانی هم همان فایل را از همان‌جا انتخاب کنید.</div></div>' +
      setRow('یادآوری هفتگی', 'جمعه‌ها یادتان می‌اندازیم پشتیبان بگیرید', sw('backupRemind', st.backupRemind)) +
      '</div>' +

      '<div class="sec">داده‌ها</div><div class="card sgroup">' +
      '<div class="srow"><button class="ghost" data-act="reset" style="color:#9B2C2C;text-decoration:none;font-weight:700;padding:0">پاک کردن همه‌ی اطلاعات</button></div>' +
      '</div>' +
      '<a class="muted small" href="#privacy" style="text-align:center;text-decoration:underline;padding:4px 0">حریم خصوصی</a>' +
      '<div class="muted small" style="text-align:center;padding:8px 0">رها — همراه شما برای زندگی بدون سیگار' + (APP_VERSION.code ? ' · نسخه‌ی ' + fa(APP_VERSION.name) : '') + '</div>' +
      '</div>' + nav('settings');
  };
  AFTER.settings = function () {
    if (API.AFTER_SETTINGS) API.AFTER_SETTINGS();
    var t = $('#daily-time');
    if (t) t.addEventListener('change', function () { if (t.value) { S.set.dailyTime = t.value; save(); reschedule(false); toast('ساعت یادآور ذخیره شد'); } });
    var box = $('#perm-box');
    if (!IS_NATIVE) { box.innerHTML = '<div class="srow"><div class="muted small">اعلان‌ها فقط در نسخه‌ی نصبی اندروید کار می‌کنند.</div></div>'; return; }
    notifPermission(false).then(function (ok) {
      if (!ok && (S.set.notifMilestones || S.set.daily) && box.isConnected) {
        box.innerHTML = '<div class="srow" style="background:var(--amber-tint);border-radius:14px;padding:12px"><div class="col" style="flex:1"><div class="st" style="color:var(--amber-ink)">اجازه‌ی نمایش اعلان داده نشده</div></div>' +
          '<button class="chip on" data-act="perm">اجازه بده</button></div>';
      }
    });
  };

  // صفحه‌ی برنامه (هم شروع، هم ویرایش)
  var draft = null;
  function freshDraft() {
    return { name: S.name, cpd: S.cpd, perPack: S.perPack, packPrice: S.packPrice, buyType: S.buyType || 'pack', singlePrice: S.singlePrice || 0, pouchPrice: S.pouchPrice || 0, perPouch: S.perPouch || 40, rollExtra: S.rollExtra || 0, product: S.product || 'cig', hkWeek: S.hkWeek || 3, hkPrice: S.hkPrice || 0, method: S.method, reasons: S.reasons.slice(), triggers: (S.triggers || []).slice(), myReasons: (S.myReasons || []).slice(), taperDays: S.ready && S.method === 1 ? 0 : 14, when: S.ready ? 'keep' : 'now' };
  }
  function moneyField(id, label, val, ph) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" inputmode="numeric" data-money placeholder="' + ph + '" value="' + (val ? num(val) : '') + '"></div>';
  }
  function numField(id, label, val) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" inputmode="numeric" data-numf value="' + num(val) + '"></div>';
  }
  function costLine() {
    var c = costPerCig(draft), d = c * draft.cpd;
    return c ? 'هر نخ حدود ' + num(Math.round(c)) + ' تومان · روزی ' + num(Math.round(d)) + ' تومان · ماهی ' + num(Math.round(d * 30)) + ' تومان' : '';
  }
  function hkLine() {
    var m = draft.hkPrice * draft.hkWeek * 30 / 7;
    return draft.hkPrice ? 'هفته‌ای ' + num(draft.hkPrice * draft.hkWeek) + ' تومان · ماهی حدود ' + num(Math.round(m)) + ' تومان' : '';
  }
  function planView(isSetup) {
    if (!draft) draft = freshDraft();
    var M = [['یک‌باره', 'از یک تاریخ مشخص، کامل کنار بگذار'], ['تدریجی', 'هر هفته تعداد را کم کن']];
    return '<div class="screen' + (isSetup ? ' no-nav' : '') + '">' +
      (isSetup ? '<div class="col" style="gap:8px"><div class="muted">به رها خوش آمدید</div><div style="font-size:24px;font-weight:800;line-height:1.5">بیایید برنامه‌ی ترک شما را بسازیم</div></div>'
        : '<div class="title-bar"><a class="icon-btn" href="#settings" aria-label="بازگشت">' + I.back + '</a><div class="h1">برنامه‌ی ترک</div></div>') +
      '<div class="card"><div class="field"><label for="f-name">اسم شما (اختیاری)</label><input class="input" id="f-name" value="' + esc(draft.name) + '" maxlength="30"></div></div>' +
      '<div class="card"><div style="font-size:15px;font-weight:700">چه چیزی را ترک می‌کنید؟</div>' +
      '<div class="seg" style="align-self:stretch">' + [['cig', 'سیگار'], ['hookah', 'قلیان'], ['both', 'هر دو']].map(function (x) { return '<button style="flex:1" data-prod="' + x[0] + '" class="' + (draft.product === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      (draft.product !== 'cig'
        ? '<div class="card"><div class="row"><div class="col"><div style="font-size:15px;font-weight:700">هفته‌ای چند وعده قلیان؟</div><div class="muted small">هر بار نشستن پای قلیان یک وعده است</div></div>' +
          '<div class="stepper"><button data-hstep="1" aria-label="افزایش">+</button><div class="v" id="f-hkw">' + num(draft.hkWeek) + '</div><button data-hstep="-1" aria-label="کاهش">−</button></div></div>' +
          moneyField('f-hk', 'هزینه‌ی هر وعده (تومان؛ در خانه یا قهوه‌خانه)', draft.hkPrice, 'مثلاً ۱۵۰۰۰۰') +
          '<div class="muted small" id="f-hkline">' + hkLine() + '</div></div>'
        : '') +
      (draft.product === 'hookah' ? '' :
      '<div class="card" style="flex-direction:row;align-items:center;justify-content:space-between"><div class="col"><div style="font-size:15px;font-weight:700">روزی چند نخ می‌کشیدید؟</div><div class="muted small">تقریبی هم کافی است</div></div>' +
      '<div class="stepper"><button data-step="1" aria-label="افزایش">+</button><div class="v" id="f-cpd">' + num(draft.cpd) + '</div><button data-step="-1" aria-label="کاهش">−</button></div></div>' +
      '<div class="card"><div style="font-size:15px;font-weight:700">سیگار را چطور تهیه می‌کنید؟</div>' +
      '<div class="seg" style="align-self:stretch"><button style="flex:1" data-buy="pack" class="' + (draft.buyType === 'pack' ? 'on' : '') + '">پاکتی</button>' +
      '<button style="flex:1" data-buy="single" class="' + (draft.buyType === 'single' ? 'on' : '') + '">نخی</button>' +
      '<button style="flex:1" data-buy="roll" class="' + (draft.buyType === 'roll' ? 'on' : '') + '">سیگار پیچ</button></div>' +
      (draft.buyType === 'pack'
        ? moneyField('f-price', 'قیمت هر پاکت (تومان)', draft.packPrice, 'مثلاً ۱۵۰۰۰۰') + numField('f-pack', 'تعداد نخ در هر پاکت', draft.perPack)
        : draft.buyType === 'single'
        ? moneyField('f-single', 'قیمت هر نخ (تومان)', draft.singlePrice, 'مثلاً ۸۰۰۰')
        : moneyField('f-pouch', 'قیمت هر بسته توتون (تومان)', draft.pouchPrice, 'مثلاً ۴۰۰۰۰۰') + numField('f-perpouch', 'با هر بسته توتون چند نخ می‌پیچید؟', draft.perPouch) +
          moneyField('f-extra', 'هزینه‌ی کاغذ و فیلتر برای هر نخ (تومان، اختیاری)', draft.rollExtra, 'مثلاً ۵۰۰')) +
      '<div class="muted small" id="f-costline">' + costLine() + '</div></div>') +
      '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">روش ترک</div><div class="grid2">' +
      M.map(function (m, i) { return '<button class="method' + (draft.method === i ? ' on' : '') + '" data-method="' + i + '"><b>' + m[0] + '</b><span>' + m[1] + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">چرا می‌خواهید ترک کنید؟</div><div class="chips">' +
      REASONS.map(function (r, i) { return '<button class="chip' + (draft.reasons.indexOf(i) >= 0 ? ' on' : '') + '" data-reason="' + i + '">' + r + '</button>'; }).join('') + '</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">بیشتر چه موقع‌هایی سیگار دلتان می‌خواهد؟</div><div class="chips">' +
      TRIGGERS.map(function (x, i) { return '<button class="chip' + (draft.triggers.indexOf(i) >= 0 ? ' on' : '') + '" data-trig="' + i + '">' + x[0] + '</button>'; }).join('') + '</div></div>' +
      '<div class="col" style="gap:8px"><label for="f-myr" style="font-size:15px;font-weight:700">دلیل‌های خودتان (هر خط یک دلیل، اختیاری)</label>' +
      '<textarea class="input" id="f-myr" rows="3" style="padding:10px 14px;min-height:84px;resize:vertical" placeholder="مثلاً: می‌خواهم دخترم بوی سیگار را حس نکند">' + esc((draft.myReasons || []).join('\n')) + '</textarea></div>' +
      (draft.method === 1
        ? '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">طول دوره‌ی کاهش تدریجی</div><div class="chips">' +
          (S.ready && S.method === 1 ? '<button class="chip' + (!draft.taperDays ? ' on' : '') + '" data-taper="0">بدون تغییر</button>' : '') +
          [7, 14, 21, 28].map(function (d) { return '<button class="chip' + (draft.taperDays === d ? ' on' : '') + '" data-taper="' + d + '">' + fa(d) + ' روز</button>'; }).join('') + '</div>' +
          '<div class="muted small" style="line-height:1.9">هر روز سهم مجازتان کمی کمتر می‌شود و در پایان دوره، روز ترک کامل است.</div></div>'
        : '') +
      (draft.method === 1 ? '' : '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">زمان ترک</div><div class="chips">' +
      (S.ready ? '<button class="chip' + (draft.when === 'keep' ? ' on' : '') + '" data-when="keep">بدون تغییر</button>' : '') +
      '<button class="chip' + (draft.when === 'now' ? ' on' : '') + '" data-when="now">' + (S.ready ? 'از همین الان دوباره' : 'از همین الان') + '</button>' +
      '<button class="chip' + (draft.when === 'pick' ? ' on' : '') + '" data-when="pick">انتخاب تاریخ و ساعت</button></div>' +
      (draft.when === 'pick' ? '<input class="input" type="datetime-local" id="f-date" style="direction:ltr" aria-label="تاریخ ترک">' : '') + '</div>') +
      '<button class="primary" data-act="save">' + (isSetup ? 'شروع کنیم' : 'ذخیره') + '</button>' +
      '</div>' + (isSetup ? '' : nav('settings'));
  }
  VIEWS.setup = function () { return planView(!S.ready); };
  VIEWS.plan = function () { return planView(false); };
  function readDraftInputs() {
    var n = $('#f-name'); if (n) draft.name = n.value.trim();
    var mr = $('#f-myr'); if (mr) draft.myReasons = mr.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 12);
    function intOf(id, def) { var e = $('#' + id); return e ? parseInt(toEn(e.value) || String(def), 10) : null; }
    var v;
    if ((v = intOf('f-price', 0)) !== null) draft.packPrice = v;
    if ((v = intOf('f-pack', 20)) !== null) draft.perPack = Math.max(1, v);
    if ((v = intOf('f-single', 0)) !== null) draft.singlePrice = v;
    if ((v = intOf('f-pouch', 0)) !== null) draft.pouchPrice = v;
    if ((v = intOf('f-perpouch', 40)) !== null) draft.perPouch = Math.max(1, v);
    if ((v = intOf('f-extra', 0)) !== null) draft.rollExtra = v;
    if ((v = intOf('f-hk', 0)) !== null) draft.hkPrice = v;
  }

  function commitPlan(when, priceMode) {
    S.name = draft.name; S.cpd = draft.cpd; S.perPack = draft.perPack; S.packPrice = draft.packPrice; S.buyType = draft.buyType; S.singlePrice = draft.singlePrice; S.pouchPrice = draft.pouchPrice; S.perPouch = draft.perPouch; S.rollExtra = draft.rollExtra;
    S.product = draft.product; S.hkWeek = draft.hkWeek; if (draft.product !== 'cig') S.hkPrice = draft.hkPrice;
    S.method = draft.method; S.myReasons = (draft.myReasons || []).slice(); S.reasons = draft.reasons.slice(); S.triggers = draft.triggers.slice(); S.quitAt = when;
    var np = { c: costPerCig(), h: S.hkPrice || 0 };
    if (priceMode === 'fix') S.prices = [{ t: 0, c: np.c, h: np.h }];
    else if (priceMode === 'new') S.prices.push({ t: Date.now(), c: np.c, h: np.h });
    var first = !S.ready; S.ready = true; S.seenMs = -1; if (S.mode === 'supporter') S.mode = null; save(); draft = null;
    reschedule(first); syncWidget();
    if (first) go('home'); else { toast('ذخیره شد'); go('settings'); }
  }

  // ---------- ثبت لغزش ----------
  // لغزش شمارنده را صفر نمی‌کند؛ فقط همان تعداد نخ از آمار کم می‌شود
  function slipSheet() {
    var n = 1, when = 'now', g = -1, k = S.product === 'hookah' ? 'h' : 'c';
    function qText() { return k === 'h' ? 'چند وعده قلیان؟' : 'چند نخ کشیدید؟'; }
    var hh = new Date(); var tv = ('0' + hh.getHours()).slice(-2) + ':' + ('0' + hh.getMinutes()).slice(-2);
    sheet('<div class="h2">اشکالی ندارد؛ ثبتش کنیم و ادامه بدهیم</div>' +
      '<div class="muted small" style="line-height:1.9">یک لغزش مسیرتان را خراب نمی‌کند. شمارنده‌ی ترک ادامه پیدا می‌کند و فقط همین مقدار از آمارتان کم می‌شود.</div>' +
      (S.product === 'both' ? '<div class="seg"><button style="flex:1" data-sk="c" class="on">سیگار</button><button style="flex:1" data-sk="h">قلیان</button></div>' : '') +
      '<div class="row"><div class="st" id="sl-q">' + qText() + '</div><div class="stepper"><button data-sn="1" aria-label="بیشتر">+</button><div class="v" id="sl-n">۱</div><button data-sn="-1" aria-label="کمتر">−</button></div></div>' +
      '<div class="st">کِی؟</div><div class="seg" id="sl-w"><button style="flex:1" data-sw="now" class="on">همین الان</button><button style="flex:1" data-sw="today">امروز، ساعت…</button><button style="flex:1" data-sw="yday">دیروز</button></div>' +
      '<input type="time" class="input" id="sl-time" value="' + tv + '" style="direction:ltr;display:none">' +
      '<div class="st">چه شد؟</div><div class="chips">' + TRIGGERS.map(function (x, j) { return '<button class="chip" data-sg="' + j + '">' + x[0] + '</button>'; }).join('') + '</div>' +
      '<textarea class="input" id="sl-note" rows="2" maxlength="500" placeholder="یادداشت (اختیاری)" style="padding:10px 14px;min-height:60px;resize:none"></textarea>' +
      '<button class="primary" id="sl-save">ثبت و ادامه‌ی مسیر</button>' +
      '<button class="ghost" id="sl-reset" style="font-size:13px">می‌خواهم شمارنده را از صفر شروع کنم</button>', function (bg) {
      bg.querySelectorAll('[data-sk]').forEach(function (b) { b.onclick = function () { k = b.getAttribute('data-sk'); bg.querySelectorAll('[data-sk]').forEach(function (x) { x.classList.toggle('on', x === b); }); bg.querySelector('#sl-q').textContent = qText(); }; });
      bg.querySelectorAll('[data-sn]').forEach(function (b) { b.onclick = function () { n = Math.max(1, Math.min(60, n + +b.getAttribute('data-sn'))); bg.querySelector('#sl-n').textContent = num(n); }; });
      bg.querySelectorAll('[data-sw]').forEach(function (b) { b.onclick = function () { when = b.getAttribute('data-sw'); bg.querySelectorAll('[data-sw]').forEach(function (x) { x.classList.toggle('on', x === b); }); bg.querySelector('#sl-time').style.display = when === 'now' ? 'none' : ''; }; });
      bg.querySelectorAll('[data-sg]').forEach(function (b) { b.onclick = function () { g = g === +b.getAttribute('data-sg') ? -1 : +b.getAttribute('data-sg'); bg.querySelectorAll('[data-sg]').forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-sg') === g); }); }; });
      function when2t() {
        if (when === 'now') return Date.now();
        var p = (bg.querySelector('#sl-time').value || '12:00').split(':'), d = new Date();
        if (when === 'yday') d = new Date(Date.now() - 86400000);
        d.setHours(+p[0], +p[1], 0, 0);
        return Math.min(Date.now(), d.getTime());
      }
      bg.querySelector('#sl-save').onclick = function () {
        var t = when2t();
        if (t < S.quitAt) { toast('این زمان قبل از روز ترک است'); return; }
        var rec = { t: t, n: n, g: g, note: bg.querySelector('#sl-note').value.trim().slice(0, 500) }; if (k === 'h') rec.k = 'h';
        S.slips.push(rec);
        if (API.onSlip) { try { API.onSlip(rec); } catch (x) {} }
        save(); reschedule(false); syncWidget(); slipCheckins(); bg.remove();
        var st = stats();
        if (route() !== 'home') go('home'); else render();
        setTimeout(function () { sheet('<div class="wl-art" style="font-size:44px;margin:0">💚</div><div class="h2" style="text-align:center">ثبت شد. مسیرتان ادامه دارد</div>' +
          '<div class="card" style="background:var(--green-tint);gap:6px;text-align:center"><div><b style="font-size:22px;color:var(--green-dark)">' + num(Math.floor(st.days)) + '</b> روز ترک</div><div><b style="font-size:22px;color:var(--green-dark)">' + heroVals(st)[0] + '</b> ' + heroVals(st)[1] + '</div></div>' +
          '<div class="muted" style="line-height:2;text-align:center">این لغزش ' + (k === 'h' ? slipAmountText(0, n) : slipAmountText(n, 0)) + ' از آمارتان کم کرد، نه همه‌ی آن را. مراحل کوتاه‌مدت سلامتی از همین الان دوباره شمرده می‌شوند.</div>' +
          (API.letterAfterSlip ? API.letterAfterSlip() : '') +
          (g >= 0 ? '<a class="chip on" href="#ifthen" style="display:flex;align-items:center;justify-content:center;min-height:48px">برای «' + TRIGGERS[g][0] + '» یک برنامه‌ی اگر-آنگاه بنویسیم</a>' : '') +
          '<button class="primary" data-close>ادامه</button>'); }, 150);
      };
      bg.querySelector('#sl-reset').onclick = function () {
        bg.remove();
        sheet('<div class="h2">شمارنده از صفر شروع شود؟</div><div class="muted" style="line-height:2">روز ترک به همین الان منتقل می‌شود و روزها، پس‌انداز و نخ‌های نکشیده از صفر شمرده می‌شوند. اگر فقط چند نخ کشیده‌اید، لازم نیست؛ ثبت لغزش کافی است.</div>' +
          '<button class="primary" id="rs-go" style="background:var(--night)">بله، از صفر</button><button class="ghost" data-close>نه، برگرد</button>', function (bg2) {
          bg2.querySelector('#rs-go').onclick = function () { S.slips.push(k === 'h' ? { t: Date.now(), n: n, g: g, k: 'h', reset: true } : { t: Date.now(), n: n, g: g, reset: true }); S.quitAt = Date.now(); S.seenMs = -1; save(); reschedule(false); syncWidget(); slipCheckins(); bg2.remove(); go('home'); render(); };
        });
      };
    });
  }

  // ---------- برگه‌ی پایین (sheet) ----------
  function sheet(inner, onReady) {
    var bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog">' + inner + '</div>';
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
    document.body.appendChild(bg); if (onReady) onReady(bg);
    return bg;
  }

  // ---------- رویدادها ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    var act = t.getAttribute('data-act');

    if (t.hasAttribute('data-mood')) {
      S.moods[dayKey(Date.now())] = +t.getAttribute('data-mood'); save();
      document.querySelectorAll('.mood').forEach(function (b) { b.classList.toggle('on', b === t); });
      return;
    }
    if (t.hasAttribute('data-toggle')) {
      var key = t.getAttribute('data-toggle'), on = !S.set[key];
      S.set[key] = on; save();
      if (key === 'notifMilestones' || key === 'daily' || key === 'backupRemind') {
        reschedule(on).then(function () { render(); });
      } else render();
      return;
    }
    if (t.hasAttribute('data-lang')) { if (t.getAttribute('data-lang') !== LANG && window.RAHA_I18N) window.RAHA_I18N.set(t.getAttribute('data-lang')); return; }
    if (t.hasAttribute('data-cur')) { S.set.currency = t.getAttribute('data-cur'); save(); syncWidget(); render(); return; }
    if (t.hasAttribute('data-url')) {
      var u = t.getAttribute('data-url');
      if (IS_NATIVE) location.href = u; else window.open(u, '_blank');
      return;
    }
    if (t.hasAttribute('data-step')) {
      readDraftInputs();
      draft.cpd = Math.min(80, Math.max(1, draft.cpd + +t.getAttribute('data-step')));
      $('#f-cpd').textContent = num(draft.cpd); var cl0 = $('#f-costline'); if (cl0) cl0.textContent = costLine(); return;
    }
    if (t.hasAttribute('data-prod')) { readDraftInputs(); draft.product = t.getAttribute('data-prod'); render(); return; }
    if (t.hasAttribute('data-hstep')) {
      readDraftInputs();
      draft.hkWeek = Math.min(28, Math.max(1, draft.hkWeek + +t.getAttribute('data-hstep')));
      $('#f-hkw').textContent = num(draft.hkWeek); var hl0 = $('#f-hkline'); if (hl0) hl0.textContent = hkLine(); return;
    }
    if (t.hasAttribute('data-taper')) { readDraftInputs(); draft.taperDays = +t.getAttribute('data-taper'); render(); return; }
    if (t.hasAttribute('data-buy')) { readDraftInputs(); draft.buyType = t.getAttribute('data-buy'); render(); return; }
    if (t.hasAttribute('data-method')) { readDraftInputs(); draft.method = +t.getAttribute('data-method'); render(); return; }
    if (t.hasAttribute('data-ifl')) { ideaFilter = +t.getAttribute('data-ifl'); render(); return; }
    if (t.hasAttribute('data-trig')) {
      readDraftInputs(); var gi = +t.getAttribute('data-trig'), ga = draft.triggers.indexOf(gi);
      if (ga >= 0) draft.triggers.splice(ga, 1); else draft.triggers.push(gi);
      t.classList.toggle('on'); return;
    }
    if (t.hasAttribute('data-reason')) {
      readDraftInputs(); var i = +t.getAttribute('data-reason'), at = draft.reasons.indexOf(i);
      if (at >= 0) draft.reasons.splice(at, 1); else draft.reasons.push(i);
      t.classList.toggle('on'); return;
    }
    if (t.hasAttribute('data-when')) { readDraftInputs(); draft.when = t.getAttribute('data-when'); render(); return; }

    switch (act) {
      case 'save': {
        readDraftInputs();
        var dCig = draft.product !== 'hookah', dHk = draft.product !== 'cig';
        if (dHk && !draft.hkPrice) { toast('لطفاً هزینه‌ی هر وعده قلیان را وارد کنید'); $('#f-hk').focus(); return; }
        if (dCig && draft.buyType === 'pack' && !draft.packPrice) { toast('لطفاً قیمت پاکت را وارد کنید'); $('#f-price').focus(); return; }
        if (dCig && draft.buyType === 'single' && !draft.singlePrice) { toast('لطفاً قیمت هر نخ را وارد کنید'); $('#f-single').focus(); return; }
        if (dCig && draft.buyType === 'roll' && !draft.pouchPrice) { toast('لطفاً قیمت بسته‌ی توتون را وارد کنید'); $('#f-pouch').focus(); return; }
        var when = S.quitAt;
        if (draft.method === 1) {
          if (draft.taperDays) { S.taperStart = Date.now(); S.taperDays = draft.taperDays; when = Date.now() + draft.taperDays * 86400000; }
          else if (S.method !== 1) { S.taperStart = Date.now(); S.taperDays = 14; when = Date.now() + 14 * 86400000; }
          draft.when = 'taper';
        }
        if (draft.when === 'now') when = Date.now();
        if (draft.when === 'pick') {
          var dv = $('#f-date') && $('#f-date').value;
          if (!dv) { toast('تاریخ و ساعت را انتخاب کنید'); return; }
          when = new Date(dv).getTime();
        }
        // اگر قیمت عوض شده: گران شده (از امروز) یا اشتباه قبلی درست می‌شود (از اول)؟
        var lastP = S.prices[S.prices.length - 1];
        var newC = costPerCig(draft), newH = dHk ? draft.hkPrice : (S.hkPrice || 0);
        var priceChanged = S.ready && lastP && (Math.abs(lastP.c - newC) > 0.5 || Math.abs(lastP.h - newH) > 0.5);
        if (priceChanged && when < Date.now() && draft.when !== 'now') {
          var w0 = when;
          sheet('<div class="h2">قیمت تغییر کرده است</div><div class="muted" style="line-height:2">قیمت گران شده، یا قیمت قبلی را اشتباه وارد کرده بودید؟</div>' +
            '<button class="primary" id="pc-new">گران شده؛ از امروز حساب شود</button><button class="chip" id="pc-fix" style="min-height:48px">اشتباه بود؛ از روز اول درست شود</button><button class="ghost" data-close>انصراف</button>', function (bg) {
            bg.querySelector('#pc-new').onclick = function () { bg.remove(); commitPlan(w0, 'new'); };
            bg.querySelector('#pc-fix').onclick = function () { bg.remove(); commitPlan(w0, 'fix'); };
          });
          return;
        }
        commitPlan(when, !S.ready || !S.prices.length || draft.when === 'now' || when >= Date.now() ? 'fix' : null);
        return;
      }
      case 'reset':
        sheet('<div class="h2">همه‌ی اطلاعات پاک شود؟</div><div class="muted">این کار برگشت‌پذیر نیست.</div>' +
          '<button class="primary" id="do-reset" style="background:#9B2C2C">بله، پاک کن</button><button class="ghost" data-close>انصراف</button>', function (bg) {
          bg.querySelector('#do-reset').onclick = function () { if (API.onReset) API.onReset(); S.ready = false; S.set.notifMilestones = S.set.daily = false; reschedule(false); try { localStorage.removeItem(KEY); } catch (x) {} if (LN) { var ids = [{ id: DAILY_ID }, { id: BACKUP_ID }]; for (var q = 0; q < MILESTONES.length; q++) ids.push({ id: MS_ID + q }); LN.cancel({ notifications: ids }).catch(function () {}); } setTimeout(function () { location.hash = '#setup'; location.reload(); }, 300); };
        });
        return;
      case 'idea-done': S.ideaDone = S.ideaDone || {}; S.ideaDone[dayKey(Date.now())] = 1; save(); toast('عالی! همین کارهای کوچک جای سیگار را پر می‌کنند'); render(); return;
      case 'backup': makeBackup(); return;
      case 'restore': pickRestore(); return;
      case 'update': checkUpdate(false); return;
      case 'perm':
        notifPermission(true).then(function (ok) {
          if (ok) { reschedule(false); toast('اعلان‌ها فعال شد'); }
          else toast('اجازه داده نشد. از تنظیمات گوشی، بخش برنامه‌ها › رها › اعلان‌ها، فعالش کنید.');
          render();
        });
        return;
      case 'test-notif':
        if (!LN) { toast('اعلان‌ها فقط در نسخه‌ی نصبی اندروید کار می‌کنند'); return; }
        notifPermission(true).then(function (ok) {
          if (!ok) { toast('ابتدا اجازه‌ی نمایش اعلان را بدهید'); render(); return; }
          ensureChannel().then(function () {
            return LN.schedule({ notifications: [{ id: 999, channelId: 'raha', title: 'رها', body: 'اعلان‌ها درست کار می‌کنند. به مسیرتان ادامه دهید!', schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true } }] });
          }).then(function () { toast('تا ۳ ثانیه‌ی دیگر یک اعلان می‌آید'); }).catch(function () { toast('ارسال اعلان ممکن نشد'); });
        });
        return;
      case 'beat':
        sheet('<div class="h2">آفرین! این هوس را پشت سر گذاشتید</div><div class="muted">چه چیزی باعثش شد؟ (برای داشبورد شما)</div>' +
          '<div class="chips" id="bt-g">' + TRIGGERS.map(function (x, j) { return '<button class="chip" data-g="' + j + '">' + x[0] + '</button>'; }).join('') + '</div>' +
          '<div class="muted">شدتش چقدر بود؟</div><div class="seg" id="bt-i"><button style="flex:1" data-i="1">کم</button><button style="flex:1" data-i="2" class="on">متوسط</button><button style="flex:1" data-i="3">شدید</button></div>' +
          '<div class="muted">چه چیزی کمک کرد؟</div><div class="chips">' + (API.HELPS || []).map(function (x, j) { return '<button class="chip" data-h="' + j + '">' + x + '</button>'; }).join('') + '</div>' +
          '<textarea class="input" id="bt-n" rows="2" placeholder="یادداشت (اختیاری)" style="padding:10px 14px;min-height:64px;resize:none"></textarea>' +
          '<button class="primary" id="bt-save">ثبت</button>', function (bg) {
          var g = -1, inten = 2, helped = [];
          bg.querySelectorAll('[data-h]').forEach(function (el) { el.onclick = function () { var h = +el.getAttribute('data-h'), at = helped.indexOf(h); if (at >= 0) helped.splice(at, 1); else helped.push(h); el.classList.toggle('on'); }; });
          bg.querySelectorAll('[data-g]').forEach(function (el) { el.onclick = function () { g = +el.getAttribute('data-g'); bg.querySelectorAll('[data-g]').forEach(function (x) { x.classList.toggle('on', x === el); }); }; });
          bg.querySelectorAll('[data-i]').forEach(function (el) { el.onclick = function () { inten = +el.getAttribute('data-i'); bg.querySelectorAll('[data-i]').forEach(function (x) { x.classList.toggle('on', x === el); }); }; });
          bg.querySelector('#bt-save').onclick = function () {
            var note = bg.querySelector('#bt-n').value.trim().slice(0, 500);
            S.cravings.push({ t: Date.now(), g: g, i: inten, h: helped, n: note }); save(); bg.remove();
            toast(num(S.cravings.length) + ' هوس را شکست داده‌اید'); setTimeout(function () { go('home'); }, 700);
          };
        });
        return;
      case 'slip': slipSheet(); return;
      case 'price': priceSheet(); return;
      case 'price-later': S.priceAsk = Date.now(); save(); render(); return;
      case 'reasons':
        sheet('<div class="h2">دلیل‌های شما برای ترک</div><div class="chips">' +
          (S.reasons.length ? S.reasons.map(function (r) { return '<span class="chip on" style="display:inline-flex;align-items:center">' + REASONS[r] + '</span>'; }).join('') : '<div class="muted">هنوز دلیلی انتخاب نکرده‌اید. از «برنامه من» اضافه کنید.</div>') +
          '</div>' + ((S.myReasons || []).length ? '<div class="col" style="gap:6px">' + S.myReasons.map(function (r) { return '<div class="mark-quote" style="background:var(--green-tint)">' + esc(r) + '</div>'; }).join('') + '</div>' : '') + '<div class="muted" style="line-height:1.9">تا الان ' + num(stats().notSmoked) + ' نخ نکشیده‌اید. این را خراب نکنید.</div><button class="primary" data-close>باشه</button>');
        return;
      case 'card': sheet('<div class="h2">کارت انگیزشی</div><div class="mcard" style="min-height:160px">' + esc(API.randomCard ? API.randomCard() : '') + '</div><a class="chip" href="#cards" style="display:flex;align-items:center;justify-content:center">کارت‌های بیشتر</a><button class="primary" data-close>باشه</button>'); return;
      case 'pledge': S.pledges = S.pledges || {}; S.pledges[dayKey(Date.now())] = 1; save(); toast('آفرین! فقط برای امروز. همین کافی است.'); render(); return;
      case 'smoked1': { S.smoked = S.smoked || {}; var k1 = dayKey(Date.now()); S.smoked[k1] = (S.smoked[k1] || 0) + 1; save(); var al = taperAllowance(); if (al !== null && S.smoked[k1] > al) toast('از سهم امروز گذشتید؛ اشکالی ندارد، فردا دوباره تلاش کنید'); render(); return; }
      case 'smoked-undo': { var k2 = dayKey(Date.now()); if (S.smoked && S.smoked[k2]) { S.smoked[k2]--; save(); render(); } return; }
      case 'water': toast('آرام و جرعه‌جرعه بنوشید؛ هوس معمولاً تا چند دقیقه کم می‌شود'); return;
      case 'walk': toast('بلند شوید و چند دقیقه راه بروید؛ تغییر مکان کمک می‌کند'); return;
      case 'wait': {
        var left = 300;
        var bg = sheet('<div class="h2">فقط ۵ دقیقه صبر کنید</div><div id="w-t" style="font-size:48px;font-weight:800;text-align:center;color:var(--green)">۰۵:۰۰</div>' +
          '<div class="muted" style="text-align:center">بعد از این، اگر هنوز می‌خواستید، دوباره فکر کنید.</div><button class="primary" data-close>بستن</button>');
        var iv = setInterval(function () {
          if (!document.body.contains(bg)) { clearInterval(iv); return; }
          left--; var el = bg.querySelector('#w-t');
          el.textContent = pad(Math.floor(left / 60)) + ':' + pad(left % 60);
          if (left <= 0) { clearInterval(iv); el.textContent = 'تمام شد!'; }
        }, 1000);
        return;
      }
      case 'goal':
        sheet('<div class="h2">هدف پس‌انداز</div><div class="field"><label for="g-n">برای چه چیزی؟</label><input class="input" id="g-n" maxlength="40" value="' + esc(S.goal.name) + '" placeholder="مثلاً یک سفر"></div>' +
          '<div class="field"><label for="g-a">مبلغ (تومان)</label><input class="input" id="g-a" inputmode="numeric" value="' + (S.goal.amount ? num(S.goal.amount) : '') + '"></div>' +
          '<button class="primary" id="g-s">ذخیره</button><button class="ghost" data-close>انصراف</button>', function (bg) {
          bg.querySelector('#g-s').onclick = function () {
            S.goal = { name: bg.querySelector('#g-n').value.trim(), amount: parseInt(toEn(bg.querySelector('#g-a').value) || '0', 10) };
            save(); bg.remove(); render();
          };
        });
        return;
    }
  });

  // جداکننده‌ی هزارگان هنگام تایپ مبلغ
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-money') || el.id === 'g-a') {
      var v = toEn(el.value); el.value = v ? num(parseInt(v, 10)) : '';
    }
    if (draft && (el.hasAttribute('data-money') || el.hasAttribute('data-numf'))) {
      readDraftInputs(); var cl = $('#f-costline'); if (cl) cl.textContent = costLine(); var hl = $('#f-hkline'); if (hl) hl.textContent = hkLine();
    }
  });

  window.addEventListener('hashchange', function () { document.querySelectorAll('.sheet-bg').forEach(function (x) { x.remove(); }); if (route() !== 'setup' && route() !== 'plan') draft = null; render(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) syncWidget(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && /^(home|health|progress)$/.test(route())) render(); });

  // دکمه‌ی برگشت اندروید
  try {
    var App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App) App.addListener('backButton', function () {
      var open = document.querySelector('.sheet-bg');
      if (open) { open.remove(); return; }
      if (route() === 'home' || (!S.ready && route() === 'setup')) App.exitApp(); else go(({ plan: 'settings', privacy: 'settings', stats: 'health', game: 'sos', thoughts: 'sos', cravings: 'progress', badges: 'progress' })[route()] || (API.backFor && API.backFor(route())) || 'home');
    });
  } catch (e) {}

  // اتصال بخش کتابخانه
  var API = {
    S: S, save: save, esc: esc, num: num, fa: fa, pad: pad, toEn: toEn, $: $, toast: toast, sheet: sheet,
    go: go, route: route, render: render, nav: nav, I: I, VIEWS: VIEWS, AFTER: AFTER,
    onLeave: function (f) { leaveHooks.push(f); },
    TRIGGERS: TRIGGERS, MILESTONES: MILESTONES, dayKey: dayKey, stats: stats, plugin: plugin, IS_NATIVE: IS_NATIVE,
    MOODS: MOODS, MOOD_COLORS: MOOD_COLORS, KEY: KEY, setRow: setRow, sw: sw, sw2: sw2,
    APP_VERSION: function () { return APP_VERSION; }, costPerCig: costPerCig, milestoneState: milestoneState,
    reschedule: reschedule, notifPermission: notifPermission, ensureChannel: ensureChannel, LN: LN, syncWidget: syncWidget,
    slipsSinceQuit: slipsSinceQuit, slipCigs: slipCigs, lastSlip: lastSlip, cleanText: cleanText, slipSheet: slipSheet,
    cv: cv, faDate: faDate, minText: minText, lifeText: lifeText, TABS: TABS,
    useCig: useCig, useHk: useHk, cpdEff: cpdEff, hkPerDay: hkPerDay, slipHk: slipHk, moneySaved: moneySaved, priceAt: priceAt, dailyCost: dailyCost,
    heroVals: heroVals, slipAmountText: slipAmountText, priceSheet: priceSheet, moneyField: moneyField, cleanMs: cleanMs,
    shortMoney: shortMoney, cur: cur, copy: function (t) { try { navigator.clipboard.writeText(t).then(function () { toast('کپی شد'); }); } catch (e) {} }
  };
  if (window.RAHA_MORE) { try { window.RAHA_MORE(API); } catch (e) { console.error(e); } }
  if (window.RAHA_EXTRAS) { try { window.RAHA_EXTRAS(API); } catch (e) { console.error(e); } }
  if (window.RAHA_TOGETHER) { try { window.RAHA_TOGETHER(API); } catch (e) { console.error(e); } }
  if (window.RAHA_LIB) { try { window.RAHA_LIB(API); } catch (e) { console.error(e); } }
  if (window.RAHA_STATS) { try { window.RAHA_STATS(API); } catch (e) { console.error(e); } }
  if (window.RAHA_HEART) { try { window.RAHA_HEART(API); } catch (e) { console.error(e); } }
  if (window.RAHA_CARE) { try { window.RAHA_CARE(API); } catch (e) { console.error(e); } }
  if (window.RAHA_COACH) { try { window.RAHA_COACH(API); } catch (e) { console.error(e); } }

  render();

  // کارهای هنگام باز شدن اپ
  if (S.ready) { reschedule(false); syncWidget(); }
  if (IS_NATIVE && S.ready && S.set.autoUpdate && (!S.lastUpdateCheck || Date.now() - S.lastUpdateCheck > 86400000)) {
    setTimeout(function () { if (!APP_VERSION.store) checkUpdate(true); }, 3000);
  }
})();
