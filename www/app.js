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
  var DEFAULT_SET = { notifMilestones: true, daily: true, dailyTime: '21:00', vibrate: true, currency: 'toman', autoUpdate: true };
  S.set = Object.assign({}, DEFAULT_SET, S.set || {});
  if (typeof S.seenMs !== 'number') S.seenMs = -1; // تعداد مراحلی که جشنشان نمایش داده شده (-۱ یعنی هنوز مقداردهی نشده)

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
  function buySummary() {
    var t = S.buyType || 'pack';
    if (t === 'single') return 'هر نخ ' + shortMoney(S.singlePrice) + ' ' + cur();
    if (t === 'roll') return 'سیگار پیچ · هر نخ حدود ' + shortMoney(Math.round(costPerCig())) + ' ' + cur();
    return 'هر پاکت ' + shortMoney(S.packPrice) + ' ' + cur();
  }
  function elapsedMs() { return Math.max(0, Date.now() - S.quitAt); }
  function stats() {
    var ms = elapsedMs();
    var days = ms / 86400000;
    var notSmoked = Math.floor(days * S.cpd);
    var money = notSmoked * costPerCig();
    var lifeMin = notSmoked * 11; // برآورد رایج: حدود ۱۱ دقیقه برای هر نخ
    return { ms: ms, days: days, notSmoked: notSmoked, money: money, lifeMin: lifeMin };
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
  function milestoneState() {
    var m = elapsedMs() / 60000;
    var list = MILESTONES.map(function (x) { return { title: x.title, when: x.when, t: x.t, p: Math.min(100, m / x.t * 100) }; });
    var done = list.filter(function (x) { return x.p >= 100; }).length;
    var next = list.filter(function (x) { return x.p < 100; })[0] || null;
    if (next) next.left = Math.max(0, next.t - m);
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
  var MS_ID = 100, DAILY_ID = 200;
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
    var ids = [{ id: DAILY_ID }];
    for (var i = 0; i < MILESTONES.length; i++) ids.push({ id: MS_ID + i });
    return LN.cancel({ notifications: ids }).catch(function () {}).then(function () {
      if (!S.set.notifMilestones && !S.set.daily) return;
      return notifPermission(askPermission).then(function (ok) {
        if (!ok) return;
        return ensureChannel().then(function () {
          var list = [], now = Date.now();
          if (S.set.notifMilestones) {
            MILESTONES.forEach(function (m, i) {
              var at = S.quitAt + m.t * 60000;
              if (at > now + 5000) list.push({ id: MS_ID + i, channelId: 'raha', title: 'یک قدم دیگر برای سلامتی شما', body: MS_BODY[i], schedule: { at: new Date(at), allowWhileIdle: true }, extra: { go: 'health' } });
            });
          }
          if (S.set.daily) {
            var hm = S.set.dailyTime.split(':');
            list.push({ id: DAILY_ID, channelId: 'raha', title: 'رها', body: DAILY_MSG[Math.floor(Math.random() * DAILY_MSG.length)], schedule: { on: { hour: +hm[0], minute: +hm[1] }, allowWhileIdle: true }, extra: { go: 'home' } });
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
      sheet('<div class="ring" style="align-self:center">' + fa(done) + '/' + fa(MILESTONES.length) + '</div>' +
        '<div class="h2" style="text-align:center">یک مرحله‌ی تازه کامل شد!</div><div class="muted" style="text-align:center;line-height:1.9">' + m.title + '</div>' +
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
    if (!S.ready && full !== 'setup') { go('setup'); return; }
    var parts = full.split('/'), r = parts[0], arg = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')) : undefined;
    if (!VIEWS[r]) r = 'home';
    document.body.classList.toggle('dark', r === 'sos');
    document.body.classList.toggle('has-mini', !!(API.miniPlayer && API.miniPlayer()));
    var html = VIEWS[r](arg);
    $('#app').innerHTML = html;
    window.scrollTo(0, 0);
    if (AFTER[r]) AFTER[r](arg);
    if (r === 'home') celebrateIfNeeded();
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', r === 'sos' ? '#14211B' : '#F3F5F1');
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

  VIEWS.home = function () {
    var st = stats(), ms = milestoneState(), mood = S.moods[dayKey(Date.now())];
    var nx = ms.next;
    return '<div class="screen">' +
      '<div class="row"><div class="col"><div class="muted">' + esc(todayFa.format(new Date())) + '</div>' +
      '<div class="h1">سلام' + (S.name ? '، ' + esc(S.name) : '') + '</div></div>' +
      '<a class="icon-btn" href="#settings" aria-label="تنظیمات اعلان‌ها">' + I.bell + '</a></div>' +
      '<div class="hero"><div style="font-size:14px;font-weight:500;opacity:.9">مدت زمانی که سیگار نکشیده‌اید</div>' +
      '<div class="units"><div class="unit"><div class="big" id="c-d">۰</div><div class="lbl">روز</div></div>' +
      '<div class="unit"><div class="mid" id="c-h">۰۰</div><div class="lbl">ساعت</div></div>' +
      '<div class="unit"><div class="mid" id="c-m">۰۰</div><div class="lbl">دقیقه</div></div>' +
      '<div class="unit"><div class="mid" id="c-s">۰۰</div><div class="lbl">ثانیه</div></div></div>' +
      '<div class="sep"></div><div class="grid3">' +
      '<div class="col"><div class="stat-v" id="s-n">' + num(st.notSmoked) + '</div><div class="stat-l">نخ نکشیده</div></div>' +
      '<div class="col"><div class="stat-v" id="s-m">' + shortMoney(st.money) + '</div><div class="stat-l">' + cur() + ' پس‌انداز</div></div>' +
      '<div class="col"><div class="stat-v" id="s-l">' + lifeText(st.lifeMin) + '</div><div class="stat-l">عمر برگشته</div></div>' +
      '</div></div>' +
      '<a class="sos" href="#sos"><div class="ic">' + I.flame + '</div><div class="col" style="flex:1"><div style="font-size:17px;font-weight:700">هوس سیگار دارم</div>' +
      '<div style="font-size:13px;color:#C9D3CD">چند دقیقه با من بمان، می‌گذرد</div></div>' + I.chev + '</a>' +
      (nx ? '<a class="card" href="#health"><div class="row"><div class="muted">قدم بعدی بدن شما</div><div style="font-size:13px;font-weight:700;color:var(--green)">' + num(Math.floor(nx.p)) + '٪</div></div>' +
        '<div class="h2">' + nx.title + '</div><div class="bar"><div style="width:' + nx.p + '%"></div></div><div class="muted small">' + leftText(nx.left) + '</div></a>' : '') +
      '<div class="card"><div class="row"><div class="h2">حال امروزت چطوره؟</div><div class="muted small">ثبت روزانه</div></div>' +
      '<div class="grid4">' + MOODS.map(function (m, i) { return '<button class="mood' + (mood === i ? ' on' : '') + '" data-mood="' + i + '">' + m + '</button>'; }).join('') + '</div></div>' +
      '</div>' + nav('home');
  };
  AFTER.home = function () {
    function upd() {
      var ms = elapsedMs(), s = Math.floor(ms / 1000);
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      var e = $('#c-d'); if (!e) return;
      e.textContent = num(d); $('#c-h').textContent = pad(h); $('#c-m').textContent = pad(m); $('#c-s').textContent = pad(sec);
      var st = stats();
      $('#s-n').textContent = num(st.notSmoked); $('#s-m').textContent = shortMoney(st.money); $('#s-l').textContent = lifeText(st.lifeMin);
    }
    upd(); tick = setInterval(upd, 1000);
  };

  VIEWS.sos = function () {
    return '<div class="screen no-nav" style="gap:18px">' +
      '<div class="row"><a class="icon-btn" href="#home" aria-label="بستن">' + I.close + '</a><div class="muted">هوس معمولاً چند دقیقه بیشتر نمی‌ماند</div></div>' +
      '<div class="col" style="align-items:center;gap:6px;padding-top:8px"><div style="font-size:26px;font-weight:800">با هم نفس بکشیم</div>' +
      '<div class="muted" style="font-size:15px">دکمه را بزن و با دایره هماهنگ شو</div></div>' +
      '<div class="breath-wrap"><div class="breath-ring"><div class="breath" id="br"><b id="br-l">آماده‌ای؟</b><span id="br-h">تنفس ۴-۴-۶</span></div></div></div>' +
      '<button class="mint-btn" id="br-btn">شروع تمرین تنفس</button>' +
      '<div class="col" style="gap:10px"><div class="muted">یا یکی از این‌ها را امتحان کن</div><div class="grid2">' +
      '<button class="alt" data-act="water">' + I.drop + 'یک لیوان آب</button>' +
      '<button class="alt" data-act="reasons">' + I.heart + 'دلیل‌هایم برای ترک</button>' +
      '<button class="alt" data-act="wait">' + I.timer + 'فقط ۵ دقیقه صبر</button>' +
      '<button class="alt" data-act="walk">' + I.walk + 'یک قدم‌زدن کوتاه</button>' +
      '</div><a href="#instead" style="color:#C9D3CD;font-size:14px;text-decoration:underline;align-self:center;min-height:36px;display:flex;align-items:center">ایده‌های بیشتر برای جایگزین سیگار</a></div>' +
      '<button class="primary" data-act="beat" style="background:#fff;color:var(--ink)">هوس را پشت سر گذاشتم</button>' +
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
      '<div class="muted small" style="line-height:1.8">این زمان‌بندی‌ها میانگین‌های کلی هستند و برای هر نفر ممکن است فرق کند. برای مشاوره‌ی پزشکی با پزشک صحبت کنید.</div>' +
      '</div>' + nav('health');
  };

  VIEWS.progress = function () {
    var st = stats();
    var goalAmt = S.goal.amount || 0, saved = st.money;
    var pct = goalAmt > 0 ? Math.min(100, saved / goalAmt * 100) : 0;
    var perDay = S.cpd * costPerCig();
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
      '<button data-act="goal" style="min-height:32px;border-radius:16px;border:none;background:#fff;color:var(--amber-ink);font-size:12px;font-weight:700;padding:0 12px">' + (goalAmt ? 'ویرایش' : 'تعیین هدف') + '</button></div>' +
      '<div style="font-size:18px;font-weight:800;color:var(--ink)">' + (S.goal.name ? esc(S.goal.name) : 'برای پولی که جمع می‌شود یک هدف بگذارید') + '</div>' +
      '<div class="row" style="justify-content:flex-start;align-items:baseline;gap:6px"><div class="amt">' + num(Math.round(cv(saved))) + '</div>' +
      '<div style="font-size:13px">' + (goalAmt ? 'از ' + num(cv(goalAmt)) + ' ' + cur() : cur()) + '</div></div>' +
      (goalAmt ? '<div class="bar"><div style="width:' + pct + '%"></div></div><div style="font-size:12px">' + (daysLeft ? 'با این روند، حدود ' + num(daysLeft) + ' روز دیگر به هدف می‌رسید' : 'به هدف رسیدید!') + '</div>' : '') +
      '</div>' +
      '<div class="card"><div class="row"><div class="h2">هوس‌های شکست‌خورده در ۷ روز</div><div class="muted small">' + num(beaten) + ' در کل</div></div>' +
      '<div class="chart">' + counts.map(function (c, j) { return '<div class="c">' + num(c) + '<div class="b' + (j === 6 ? ' today' : '') + '" style="height:' + Math.round(c / max * 86) + 'px"></div></div>'; }).join('') + '</div>' +
      '<div class="days">' + labels.map(function (l) { return '<div>' + l + '</div>'; }).join('') + '</div></div>' +
      dashboardCards() +
      '<div class="row"><div class="h2">نشان‌ها</div><div class="muted">' + num(got) + ' از ' + num(BAD.length) + '</div></div>' +
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
    var perDay = S.cpd * MIN_PER_CIG, total = st.notSmoked * MIN_PER_CIG;
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
  function dashboardCards() {
    // ۱) حال روزانه در ۱۴ روز گذشته
    var dots = '', logged = 0, mc = [0, 0, 0, 0];
    for (var i = 13; i >= 0; i--) {
      var k = dayKey(Date.now() - i * 86400000), m = S.moods[k];
      if (typeof m === 'number') { logged++; mc[m]++; }
      dots += '<div class="mdot" title="" style="background:' + (typeof m === 'number' ? MOOD_COLORS[m] : '#E2E7E3') + '"></div>';
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
    var slipsN = (S.slips || []).length;
    var sum = '<div class="grid3"><div class="card" style="padding:12px;gap:2px;align-items:center"><div class="stat-v" style="color:var(--green)">' + num(S.cravings.length) + '</div><div class="muted small">هوس شکست‌خورده</div></div>' +
      '<div class="card" style="padding:12px;gap:2px;align-items:center"><div class="stat-v">' + num(slipsN) + '</div><div class="muted small">لغزش</div></div>' +
      '<div class="card" style="padding:12px;gap:2px;align-items:center"><div class="stat-v">' + num(logged) + '</div><div class="muted small">ثبت حال</div></div></div>';
    return sum + moodCard + trigCard + timeCard + tip;
  }

  // ---------- تنظیمات ----------
  function sw(key, on) {
    return '<button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-toggle="' + key + '"><span></span></button>';
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
      'روزی ' + num(S.cpd) + ' نخ · ' + buySummary() + '</div></div>' + I.chev + '</a>' +
      '</div>' +

      '<div class="sec">اعلان‌ها</div><div class="card sgroup">' +
      '<div id="perm-box"></div>' +
      setRow('اعلان مراحل سلامتی', 'هر بار که بدنتان یک مرحله از بهبود را پشت سر بگذارد خبرتان می‌کنیم', sw('notifMilestones', st.notifMilestones)) +
      setRow('یادآور روزانه', 'یک پیام کوتاه برای ثبت حال و ادامه‌ی مسیر', sw('daily', st.daily)) +
      (st.daily ? setRow('ساعت یادآور', '', '<input type="time" class="input" id="daily-time" value="' + esc(st.dailyTime) + '" style="width:150px;direction:ltr;min-height:42px;padding:0 10px" aria-label="ساعت یادآور">') : '') +
      '<div class="srow"><button class="chip" data-act="test-notif" style="width:100%">ارسال یک اعلان آزمایشی</button></div>' +
      '</div>' +

      '<div class="sec">عمومی</div><div class="card sgroup">' +
      setRow('واحد پول', '', '<div class="seg"><button class="' + (st.currency === 'toman' ? 'on' : '') + '" data-cur="toman">تومان</button><button class="' + (st.currency === 'rial' ? 'on' : '') + '" data-cur="rial">ریال</button></div>') +
      setRow('لرزش در تمرین تنفس', '', sw('vibrate', st.vibrate)) +
      '</div>' +

      '<div class="sec">به‌روزرسانی</div><div class="card sgroup">' +
      setRow('نسخه‌ی فعلی', '', '<div class="muted" id="ver">' + (APP_VERSION.code ? fa(APP_VERSION.name) : APP_VERSION.name) + '</div>') +
      setRow('بررسی خودکار', 'روزی یک بار هنگام باز کردن اپ', sw('autoUpdate', st.autoUpdate)) +
      '<div class="srow"><button class="primary" data-act="update" style="min-height:48px;font-size:15px">بررسی به‌روزرسانی</button></div>' +
      '</div>' +

      '<div class="sec">داده‌ها</div><div class="card sgroup">' +
      '<div class="srow"><button class="ghost" data-act="reset" style="color:#9B2C2C;text-decoration:none;font-weight:700;padding:0">پاک کردن همه‌ی اطلاعات</button></div>' +
      '</div>' +
      '<div class="muted small" style="text-align:center;padding:8px 0">رها — همراه شما برای زندگی بدون سیگار</div>' +
      '</div>' + nav('settings');
  };
  AFTER.settings = function () {
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
    return { name: S.name, cpd: S.cpd, perPack: S.perPack, packPrice: S.packPrice, buyType: S.buyType || 'pack', singlePrice: S.singlePrice || 0, pouchPrice: S.pouchPrice || 0, perPouch: S.perPouch || 40, rollExtra: S.rollExtra || 0, method: S.method, reasons: S.reasons.slice(), triggers: (S.triggers || []).slice(), when: S.ready ? 'keep' : 'now' };
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
  function planView(isSetup) {
    if (!draft) draft = freshDraft();
    var M = [['یک‌باره', 'از یک تاریخ مشخص، کامل کنار بگذار'], ['تدریجی', 'هر هفته تعداد را کم کن']];
    return '<div class="screen' + (isSetup ? ' no-nav' : '') + '">' +
      (isSetup ? '<div class="col" style="gap:8px"><div class="muted">به رها خوش آمدید</div><div style="font-size:24px;font-weight:800;line-height:1.5">بیایید برنامه‌ی ترک شما را بسازیم</div></div>'
        : '<div class="title-bar"><a class="icon-btn" href="#settings" aria-label="بازگشت">' + I.back + '</a><div class="h1">برنامه‌ی ترک</div></div>') +
      '<div class="card"><div class="field"><label for="f-name">اسم شما (اختیاری)</label><input class="input" id="f-name" value="' + esc(draft.name) + '" maxlength="30"></div></div>' +
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
      '<div class="muted small" id="f-costline">' + costLine() + '</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">روش ترک</div><div class="grid2">' +
      M.map(function (m, i) { return '<button class="method' + (draft.method === i ? ' on' : '') + '" data-method="' + i + '"><b>' + m[0] + '</b><span>' + m[1] + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">چرا می‌خواهید ترک کنید؟</div><div class="chips">' +
      REASONS.map(function (r, i) { return '<button class="chip' + (draft.reasons.indexOf(i) >= 0 ? ' on' : '') + '" data-reason="' + i + '">' + r + '</button>'; }).join('') + '</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">بیشتر چه موقع‌هایی سیگار دلتان می‌خواهد؟</div><div class="chips">' +
      TRIGGERS.map(function (x, i) { return '<button class="chip' + (draft.triggers.indexOf(i) >= 0 ? ' on' : '') + '" data-trig="' + i + '">' + x[0] + '</button>'; }).join('') + '</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-size:15px;font-weight:700">زمان ترک</div><div class="chips">' +
      (S.ready ? '<button class="chip' + (draft.when === 'keep' ? ' on' : '') + '" data-when="keep">بدون تغییر</button>' : '') +
      '<button class="chip' + (draft.when === 'now' ? ' on' : '') + '" data-when="now">' + (S.ready ? 'از همین الان دوباره' : 'از همین الان') + '</button>' +
      '<button class="chip' + (draft.when === 'pick' ? ' on' : '') + '" data-when="pick">انتخاب تاریخ و ساعت</button></div>' +
      (draft.when === 'pick' ? '<input class="input" type="datetime-local" id="f-date" style="direction:ltr" aria-label="تاریخ ترک">' : '') + '</div>' +
      '<button class="primary" data-act="save">' + (isSetup ? 'شروع کنیم' : 'ذخیره') + '</button>' +
      '</div>' + (isSetup ? '' : nav('settings'));
  }
  VIEWS.setup = function () { return planView(!S.ready); };
  VIEWS.plan = function () { return planView(false); };
  function readDraftInputs() {
    var n = $('#f-name'); if (n) draft.name = n.value.trim();
    function intOf(id, def) { var e = $('#' + id); return e ? parseInt(toEn(e.value) || String(def), 10) : null; }
    var v;
    if ((v = intOf('f-price', 0)) !== null) draft.packPrice = v;
    if ((v = intOf('f-pack', 20)) !== null) draft.perPack = Math.max(1, v);
    if ((v = intOf('f-single', 0)) !== null) draft.singlePrice = v;
    if ((v = intOf('f-pouch', 0)) !== null) draft.pouchPrice = v;
    if ((v = intOf('f-perpouch', 40)) !== null) draft.perPouch = Math.max(1, v);
    if ((v = intOf('f-extra', 0)) !== null) draft.rollExtra = v;
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
      if (key === 'notifMilestones' || key === 'daily') {
        reschedule(on).then(function () { render(); });
      } else render();
      return;
    }
    if (t.hasAttribute('data-cur')) { S.set.currency = t.getAttribute('data-cur'); save(); render(); return; }
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
        if (draft.buyType === 'pack' && !draft.packPrice) { toast('لطفاً قیمت پاکت را وارد کنید'); $('#f-price').focus(); return; }
        if (draft.buyType === 'single' && !draft.singlePrice) { toast('لطفاً قیمت هر نخ را وارد کنید'); $('#f-single').focus(); return; }
        if (draft.buyType === 'roll' && !draft.pouchPrice) { toast('لطفاً قیمت بسته‌ی توتون را وارد کنید'); $('#f-pouch').focus(); return; }
        var when = S.quitAt;
        if (draft.when === 'now') when = Date.now();
        if (draft.when === 'pick') {
          var dv = $('#f-date') && $('#f-date').value;
          if (!dv) { toast('تاریخ و ساعت را انتخاب کنید'); return; }
          when = new Date(dv).getTime();
        }
        S.name = draft.name; S.cpd = draft.cpd; S.perPack = draft.perPack; S.packPrice = draft.packPrice; S.buyType = draft.buyType; S.singlePrice = draft.singlePrice; S.pouchPrice = draft.pouchPrice; S.perPouch = draft.perPouch; S.rollExtra = draft.rollExtra;
        S.method = draft.method; S.reasons = draft.reasons.slice(); S.triggers = draft.triggers.slice(); S.quitAt = when;
        var first = !S.ready; S.ready = true; S.seenMs = -1; save(); draft = null;
        reschedule(first);
        if (first) go('home'); else { toast('ذخیره شد'); go('settings'); }
        return;
      }
      case 'reset':
        sheet('<div class="h2">همه‌ی اطلاعات پاک شود؟</div><div class="muted">این کار برگشت‌پذیر نیست.</div>' +
          '<button class="primary" id="do-reset" style="background:#9B2C2C">بله، پاک کن</button><button class="ghost" data-close>انصراف</button>', function (bg) {
          bg.querySelector('#do-reset').onclick = function () { S.ready = false; S.set.notifMilestones = S.set.daily = false; reschedule(false); try { localStorage.removeItem(KEY); } catch (x) {} if (LN) { var ids = [{ id: DAILY_ID }]; for (var q = 0; q < MILESTONES.length; q++) ids.push({ id: MS_ID + q }); LN.cancel({ notifications: ids }).catch(function () {}); } setTimeout(function () { location.hash = '#setup'; location.reload(); }, 300); };
        });
        return;
      case 'idea-done': S.ideaDone = S.ideaDone || {}; S.ideaDone[dayKey(Date.now())] = 1; save(); toast('عالی! همین کارهای کوچک جای سیگار را پر می‌کنند'); render(); return;
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
          '<button class="primary" id="bt-save">ثبت</button>', function (bg) {
          var g = -1, inten = 2;
          bg.querySelectorAll('[data-g]').forEach(function (el) { el.onclick = function () { g = +el.getAttribute('data-g'); bg.querySelectorAll('[data-g]').forEach(function (x) { x.classList.toggle('on', x === el); }); }; });
          bg.querySelectorAll('[data-i]').forEach(function (el) { el.onclick = function () { inten = +el.getAttribute('data-i'); bg.querySelectorAll('[data-i]').forEach(function (x) { x.classList.toggle('on', x === el); }); }; });
          bg.querySelector('#bt-save').onclick = function () {
            S.cravings.push({ t: Date.now(), g: g, i: inten }); save(); bg.remove();
            toast(num(S.cravings.length) + ' هوس را شکست داده‌اید'); setTimeout(function () { go('home'); }, 700);
          };
        });
        return;
      case 'slip':
        sheet('<div class="h2">اشکالی ندارد، ادامه بده</div><div class="muted" style="line-height:1.9">یک لغزش به معنای شکست نیست. می‌خواهید شمارنده از همین الان دوباره شروع شود، یا فقط ثبت شود و شمارنده ادامه پیدا کند؟</div>' +
          '<button class="primary" id="slip-log">فقط ثبت کن</button><button class="primary" id="slip-reset" style="background:var(--ink)">شمارنده از نو</button><button class="ghost" data-close>انصراف</button>', function (bg) {
          bg.querySelector('#slip-log').onclick = function () { S.slips.push(Date.now()); save(); bg.remove(); go('home'); };
          bg.querySelector('#slip-reset').onclick = function () { S.slips.push(Date.now()); S.quitAt = Date.now(); S.seenMs = -1; save(); reschedule(false); bg.remove(); go('home'); };
        });
        return;
      case 'reasons':
        sheet('<div class="h2">دلیل‌های شما برای ترک</div><div class="chips">' +
          (S.reasons.length ? S.reasons.map(function (r) { return '<span class="chip on" style="display:inline-flex;align-items:center">' + REASONS[r] + '</span>'; }).join('') : '<div class="muted">هنوز دلیلی انتخاب نکرده‌اید. از «برنامه من» اضافه کنید.</div>') +
          '</div><div class="muted" style="line-height:1.9">تا الان ' + num(stats().notSmoked) + ' نخ نکشیده‌اید. این را خراب نکنید.</div><button class="primary" data-close>باشه</button>');
        return;
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
      readDraftInputs(); var cl = $('#f-costline'); if (cl) cl.textContent = costLine();
    }
  });

  window.addEventListener('hashchange', function () { document.querySelectorAll('.sheet-bg').forEach(function (x) { x.remove(); }); if (route() !== 'setup' && route() !== 'plan') draft = null; render(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && /^(home|health|progress)$/.test(route())) render(); });

  // دکمه‌ی برگشت اندروید
  try {
    var App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App) App.addListener('backButton', function () {
      var open = document.querySelector('.sheet-bg');
      if (open) { open.remove(); return; }
      if (route() === 'home' || (!S.ready && route() === 'setup')) App.exitApp(); else go(route() === 'plan' ? 'settings' : route() === 'stats' ? 'health' : (API.backFor && API.backFor(route())) || 'home');
    });
  } catch (e) {}

  // اتصال بخش کتابخانه
  var API = {
    S: S, save: save, esc: esc, num: num, fa: fa, pad: pad, toEn: toEn, $: $, toast: toast, sheet: sheet,
    go: go, route: route, render: render, nav: nav, I: I, VIEWS: VIEWS, AFTER: AFTER,
    onLeave: function (f) { leaveHooks.push(f); }
  };
  if (window.RAHA_LIB) { try { window.RAHA_LIB(API); } catch (e) { console.error(e); } }
  if (window.RAHA_STATS) { try { window.RAHA_STATS(API); } catch (e) { console.error(e); } }

  render();

  // کارهای هنگام باز شدن اپ
  if (S.ready) reschedule(false);
  if (IS_NATIVE && S.ready && S.set.autoUpdate && (!S.lastUpdateCheck || Date.now() - S.lastUpdateCheck > 86400000)) {
    setTimeout(function () { checkUpdate(true); }, 3000);
  }
})();
