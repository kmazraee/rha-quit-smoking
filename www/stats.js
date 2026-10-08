/* رها — آمار زنده‌ی مرگ‌ومیر و بیماری‌های ناشی از دخانیات
 *
 * روش محاسبه (مثل شمارنده‌های زنده‌ی جهانی):
 *   تعداد تا این لحظه = آمار سالانه × (زمان گذشته از ابتدای سال ÷ کل زمان یک سال)
 * یعنی فرض می‌شود رخدادها در طول سال به‌طور یکنواخت پخش شده‌اند.
 * سهم هر بیماری از روی سهم آن در مرگ‌های ناشی از سیگار در مطالعه‌ی بار جهانی بیماری‌ها (GBD 2019) برآورد شده است.
 */
window.RAHA_STATS = function (A) {
  'use strict';
  var num = A.num, esc = A.esc, S = A.S;

  // ---------- داده‌ها (هر سال با منابع تازه به‌روز شود) ----------
  var DATA = {
    world: {
      label: 'جهان',
      yearStart: 'gregorian',
      deaths: 7000000,          // WHO، برگه‌ی اطلاعات دخانیات (ژوئن ۲۰۲۶): بیش از ۷ میلیون مرگ در سال
      secondhand: 1600000,      // WHO: بیش از ۱٫۶ میلیون مرگ غیرسیگاری‌ها بر اثر دود دست دوم
      users: 1200000000,        // WHO: ۱٫۲ میلیارد مصرف‌کننده‌ی دخانیات
      cigarettes: 7.41e12,      // GBD 2019: ۷٫۴۱ تریلیون نخ (معادل سیگار) در سال
      lungCancerCases: 2260000 * 0.642 // GBD 2019: ۲٫۲۶ میلیون مورد جدید سرطان ریه × سهم ۶۴٪ سیگار
    },
    iran: {
      label: 'ایران',
      yearStart: 'persian',
      deaths: 34676,            // GBD 2021 (به نقل از GSTHR): مرگ‌های منتسب به دخانیات در ایران
      men: 28632, women: 6044,
      users: 6359000            // اطلس دخانیات (۲۰۲۲): تعداد سیگاری‌های بزرگسال ایران
    }
  };
  // سهم بیماری‌ها از مرگ‌های ناشی از سیگار (GBD 2019؛ کل ۷٫۶۹ میلیون)
  var CAUSES = [
    ['بیماری قلبی (ایسکمیک)', 1682000 / 7690000, '#C0533A'],
    ['بیماری انسدادی مزمن ریه (COPD)', 1520000 / 7690000, '#8A5A0E'],
    ['سرطان ریه، نای و برونش', 1310000 / 7690000, '#5B3E96'],
    ['سکته‌ی مغزی', 930000 / 7690000, '#1F5F8B'],
    ['سرطان‌های دیگر، دیابت، سل و سایر بیماری‌ها', 0, '#5A6660']
  ];
  CAUSES[4][1] = 1 - CAUSES.slice(0, 4).reduce(function (a, c) { return a + c[1]; }, 0);
  var SERIOUS_ILL_PER_DEATH = 30; // CDC: به ازای هر مرگ، دست‌کم ۳۰ نفر با بیماری جدی ناشی از سیگار زندگی می‌کنند

  var YEAR_MS = 365.2425 * 86400000;
  function gregorianStart() { var d = new Date(); return new Date(d.getFullYear(), 0, 1).getTime(); }
  var persianStartCache = null;
  function persianStart() {
    if (persianStartCache) return persianStartCache;
    try {
      var f = new Intl.DateTimeFormat('en-u-ca-persian', { month: 'numeric', day: 'numeric' });
      var d = new Date(); d.setHours(0, 0, 0, 0);
      for (var i = 0; i < 370; i++) {
        var parts = f.formatToParts(d), m = 0, day = 0;
        parts.forEach(function (p) { if (p.type === 'month') m = +p.value; if (p.type === 'day') day = +p.value; });
        if (m === 1 && day === 1) { persianStartCache = d.getTime(); return persianStartCache; }
        d = new Date(d.getTime() - 86400000); d.setHours(0, 0, 0, 0);
      }
    } catch (e) {}
    persianStartCache = gregorianStart();
    return persianStartCache;
  }
  function persianYearLabel() {
    try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date()); } catch (e) { return ''; }
  }

  var region = 'world', openedAt = Date.now(), timer = null;

  A.VIEWS.stats = function () {
    var D = DATA[region];
    var since = D.yearStart === 'persian' ? 'از ابتدای سال ' + persianYearLabel() : 'از ابتدای سال ' + A.fa(new Date().getFullYear()) + ' میلادی';
    var perSec = YEAR_MS / D.deaths / 1000;
    var every = perSec < 60 ? 'هر ' + num(perSec, 1) + ' ثانیه یک نفر' : 'هر ' + num(perSec / 60, 1) + ' دقیقه یک نفر';
    var quitRow = S.ready ? '<div class="lv-mini"><div class="muted small">از وقتی شما ترک کردید</div><div class="lv-n" id="lv-quit">۰</div></div>' : '';
    return '<div class="screen">' +
      '<div class="title-bar"><a class="icon-btn" href="#health" aria-label="بازگشت">' + A.I.back + '</a><div class="h1">آمار زنده</div></div>' +
      '<div class="seg"><button style="flex:1" data-rg="world" class="' + (region === 'world' ? 'on' : '') + '">جهان</button><button style="flex:1" data-rg="iran" class="' + (region === 'iran' ? 'on' : '') + '">ایران</button></div>' +
      '<div class="lv-hero"><div class="lv-dot"></div><div style="font-size:14px;opacity:.85">مرگ بر اثر دخانیات در ' + D.label + '، ' + since + '</div>' +
      '<div class="lv-big" id="lv-total">۰</div>' +
      '<div style="font-size:13px;opacity:.85">' + every + ' · سالانه حدود ' + num(D.deaths) + ' نفر</div></div>' +
      '<div class="grid2"><div class="lv-mini"><div class="muted small">از وقتی این صفحه را باز کردید</div><div class="lv-n" id="lv-open">۰</div></div>' + quitRow +
      (region === 'world' ? '<div class="lv-mini"><div class="muted small">مرگ غیرسیگاری‌ها بر اثر دود دیگران، امسال</div><div class="lv-n" id="lv-sh">۰</div></div>' : '') +
      (region === 'iran' ? '<div class="lv-mini"><div class="muted small">مردان / زنان، امسال</div><div class="lv-n" id="lv-mw" style="font-size:18px">۰</div></div>' : '') +
      '</div>' +
      '<div class="h2">به تفکیک بیماری</div>' +
      '<div class="card" style="gap:14px">' + CAUSES.map(function (c, i) {
        return '<div class="col" style="gap:6px"><div class="row"><div style="font-size:14px;font-weight:700">' + c[0] + '</div><div class="lv-c" id="lv-c' + i + '" style="color:' + c[2] + '">۰</div></div>' +
          '<div class="hbar" style="height:8px;border-radius:4px;background:var(--ground);overflow:hidden"><div style="height:100%;width:' + (c[1] * 100).toFixed(1) + '%;background:' + c[2] + '"></div></div>' +
          '<div class="muted small">حدود ' + num(Math.round(c[1] * 100)) + '٪ مرگ‌ها</div></div>';
      }).join('') + '</div>' +
      '<div class="h2">بیماری‌ها و مصرف</div>' +
      '<div class="card" style="gap:14px">' +
      (region === 'world' ? '<div class="row"><div class="col" style="flex:1"><div style="font-size:14px;font-weight:700">موارد تازه‌ی سرطان ریه ناشی از سیگار</div><div class="muted small">امسال، برآورد</div></div><div class="lv-c" id="lv-lc">۰</div></div>' +
        '<div class="row"><div class="col" style="flex:1"><div style="font-size:14px;font-weight:700">سیگار کشیده‌شده در جهان</div><div class="muted small">امسال (نخ)</div></div><div class="lv-c" id="lv-cig" style="font-size:16px">۰</div></div>' : '') +
      '<div class="row"><div class="col" style="flex:1"><div style="font-size:14px;font-weight:700">افرادی که با بیماری جدی ناشی از سیگار زندگی می‌کنند</div><div class="muted small">برآورد: ۳۰ نفر به ازای هر مرگ سالانه</div></div><div class="lv-c">' + num(D.deaths * SERIOUS_ILL_PER_DEATH) + '</div></div>' +
      '<div class="row"><div class="col" style="flex:1"><div style="font-size:14px;font-weight:700">' + (region === 'world' ? 'مصرف‌کنندگان دخانیات' : 'سیگاری‌های بزرگسال') + '</div></div><div class="lv-c">' + num(D.users) + '</div></div>' +
      '</div>' +
      '<div class="card" style="background:var(--green-tint)"><div class="h2" style="color:var(--green-dark)">شما دیگر جزو این آمار نیستید</div>' +
      '<div style="line-height:2;font-size:14px">هر روزی که سیگار نمی‌کشید، خطر این بیماری‌ها برایتان کمتر می‌شود. پیشرفت بدنتان را در صفحه‌ی سلامتی ببینید.</div></div>' +
      '<details class="alt-card"><summary><span>این اعداد چطور حساب می‌شوند؟</span>' + A.I.chev + '</summary>' +
      '<div class="muted small" style="line-height:2.1">' +
      '<p>شمارنده‌ها آمار رسمی سالانه را بر ثانیه‌های سال تقسیم می‌کنند و از ابتدای سال جلو می‌روند (برای جهان از اول ژانویه، برای ایران از نوروز). یعنی فرض شده مرگ‌ها در طول سال یکنواخت رخ می‌دهند؛ پس اعداد برآوردی‌اند، نه شمارش واقعی لحظه‌به‌لحظه.</p>' +
      '<p>آمار جهان: سازمان جهانی بهداشت (بیش از ۷ میلیون مرگ در سال، از جمله ۱٫۶ میلیون نفر بر اثر دود دست دوم). آمار ایران: مطالعه‌ی بار جهانی بیماری‌ها ۲۰۲۱ (حدود ۳۴٬۷۰۰ مرگ در سال). برآوردهای داخلی گاهی تا حدود ۶۰ تا ۷۰ هزار نفر هم گزارش شده‌اند؛ اینجا عدد محتاطانه‌تر استفاده شده است.</p>' +
      '<p>سهم هر بیماری از مطالعه‌ی بار جهانی بیماری‌ها ۲۰۱۹ گرفته شده و برای ایران هم همان سهم جهانی به کار رفته است. سهم بیماری انسدادی ریه از روی سهم سیگار در بار این بیماری برآورد شده است.</p>' +
      '<p>نسبت ۳۰ بیمار به ازای هر مرگ از مرکز کنترل بیماری‌های آمریکا (CDC) است و برای همه‌ی کشورها دقیق نیست.</p></div></details>' +
      '</div>' + A.nav('health');
  };

  A.AFTER.stats = function () {
    var D = DATA[region];
    var start = D.yearStart === 'persian' ? persianStart() : gregorianStart();
    var els = {
      total: document.getElementById('lv-total'), open: document.getElementById('lv-open'), quit: document.getElementById('lv-quit'),
      sh: document.getElementById('lv-sh'), mw: document.getElementById('lv-mw'), lc: document.getElementById('lv-lc'), cig: document.getElementById('lv-cig')
    };
    var causeEls = CAUSES.map(function (c, i) { return document.getElementById('lv-c' + i); });
    function at(perYear, fromMs) { return perYear * Math.max(0, Date.now() - fromMs) / YEAR_MS; }
    var last = {};
    function set(el, key, v) { if (!el) return; var r = Math.floor(v); if (last[key] === r) return; last[key] = r; el.textContent = num(r); }
    function tick() {
      if (!els.total || !els.total.isConnected) { stop(); return; }
      set(els.total, 't', at(D.deaths, start));
      set(els.open, 'o', at(D.deaths, openedAt));
      if (els.quit) set(els.quit, 'q', at(D.deaths, S.quitAt));
      if (els.sh) set(els.sh, 's', at(D.secondhand, start));
      if (els.mw) { var mm = Math.floor(at(D.men, start)), ww = Math.floor(at(D.women, start)); if (last.mw !== mm + '/' + ww) { last.mw = mm + '/' + ww; els.mw.textContent = num(mm) + ' / ' + num(ww); } }
      if (els.lc) set(els.lc, 'l', at(D.lungCancerCases, start));
      if (els.cig) set(els.cig, 'c', at(D.cigarettes, start));
      CAUSES.forEach(function (c, i) { set(causeEls[i], 'c' + i, at(D.deaths * c[1], start)); });
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    stop(); tick(); timer = setInterval(tick, 100);
    A.onLeave(stop);
    document.querySelectorAll('[data-rg]').forEach(function (b) {
      b.onclick = function () { region = b.getAttribute('data-rg'); A.render(); };
    });
  };
};
