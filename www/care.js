/* رها — سلامت من و ابزارهای هوشمند:
 * علائم ترک، آزمون نفس، وزن، گزارش PDF برای پزشک، ذهن‌آگاهی، هشدار ساعت‌های پرخطر،
 * تقویم شمسی روزهای پاک، امتیاز و سطح و چالش هفتگی، فهرست آرزوها.
 */
window.RAHA_CARE = function (A) {
  'use strict';
  var S = A.S, V = A.VIEWS, AF = A.AFTER, I = A.I, $ = A.$, num = A.num, fa = A.fa, esc = A.esc, dayKey = A.dayKey;
  var DAY = 86400000;
  var faD = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });
  var faDM = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric' });

  ['symLog', 'tests', 'weight', 'mindLog', 'wishes'].forEach(function (k) { if (!Array.isArray(S[k])) S[k] = []; });
  if (!S.sym || typeof S.sym !== 'object') S.sym = {};
  if (!S.chDone || typeof S.chDone !== 'object') S.chDone = {};

  function header(t, to) { return '<div class="title-bar"><a class="icon-btn" href="#' + (to || 'home') + '" aria-label="بازگشت">' + I.back + '</a><div class="h1">' + t + '</div></div>'; }
  function keyTime(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
  function cTime(c) { return typeof c === 'number' ? c : c.t; }
  function round1(x) { return Math.round(x * 10) / 10; }

  // نمودار خطی ساده (SVG) از راست (قدیمی) به چپ (جدید)
  function lineChart(vals, color, h) {
    h = h || 90; var W = 300;
    if (vals.length < 2) return '';
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals); if (mx === mn) { mx += 1; mn -= 1; }
    var pts = vals.map(function (v, i) { return [(W - 10) - i / (vals.length - 1) * (W - 20), h - 10 - (v - mn) / (mx - mn) * (h - 22)]; });
    return '<svg viewBox="0 0 ' + W + ' ' + h + '" style="width:100%;height:auto"><polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      pts.map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="' + color + '"/>'; }).join('') + '</svg>';
  }

  // ======================================================================
  // ۱) علائم ترک
  // ======================================================================
  var SYM = [
    ['هوس سیگار', 'هوس معمولاً چند دقیقه می‌ماند؛ تمرین تنفس یا موج‌سواری هوس را امتحان کنید.'],
    ['زودرنجی و بی‌قراری', 'چند دقیقه قدم بزنید و به اطرافیان بگویید این روزها کمی حساس‌ترید.'],
    ['اضطراب', 'تنفس آرام و طولانی‌تر کردن بازدم، سیستم عصبی را آرام می‌کند.'],
    ['غمگینی و کم‌حوصلگی', 'با کسی حرف بزنید و کارهای کوچک لذت‌بخش برنامه‌ریزی کنید. اگر بیش از دو هفته ماند، با پزشک مشورت کنید.'],
    ['مشکل خواب', 'عصرها چای و قهوه را کم کنید و ساعت خواب را ثابت نگه دارید.'],
    ['اشتهای زیاد', 'میوه، سبزی و آب در دسترس بگذارید و آرام غذا بخورید.'],
    ['تمرکز کم', 'کارها را کوتاه‌تر کنید و بین آن‌ها استراحت کوتاه بگذارید.'],
    ['سرفه', 'سرفه‌ی چند هفته‌ی اول معمولاً نشانه‌ی پاک شدن ریه است؛ آب زیاد بنوشید. اگر طول کشید یا خون داشت، به پزشک مراجعه کنید.'],
    ['سردرد', 'آب کافی بنوشید و استراحت کنید.'],
    ['یبوست', 'آب، میوه، سبزی و پیاده‌روی کمک می‌کند.']
  ];
  var LV = ['ندارم', 'کم', 'متوسط', 'زیاد'];
  function symTotal(arr) { return (arr || []).reduce(function (a, b) { return a + (b || 0); }, 0); }
  V.symptoms = function () {
    var k = dayKey(Date.now()), today = S.sym[k] || SYM.map(function () { return 0; });
    var vals = [], labels = [];
    for (var i = 13; i >= 0; i--) { var kk = dayKey(Date.now() - i * DAY); vals.push(S.sym[kk] ? symTotal(S.sym[kk]) : null); labels.push(kk); }
    var mx = Math.max.apply(null, vals.map(function (v) { return v || 0; }).concat([1]));
    var top = today.map(function (v, i) { return [v, i]; }).filter(function (x) { return x[0] >= 2; }).sort(function (a, b) { return b[0] - a[0]; });
    return '<div class="screen">' + header('علائم ترک', 'care') +
      '<div class="muted" style="line-height:2">علائم ترک نیکوتین معمولاً در چند روز اول شدیدترند و طی دو تا چهار هفته کم می‌شوند. ثبت روزانه کمک می‌کند ببینید چطور بهتر می‌شوید.</div>' +
      '<div class="card"><div class="row"><div class="h2">امروز</div><div class="muted small">' + (S.sym[k] ? 'ثبت شده' : 'هنوز ثبت نشده') + '</div></div>' +
      SYM.map(function (s, i) {
        return '<div class="sym-row"><div class="sym-name">' + s[0] + '</div><div class="sym-seg">' + LV.map(function (l, j) {
          return '<button class="' + (today[i] === j ? 'on l' + j : '') + '" data-sym="' + i + '" data-v="' + j + '">' + l + '</button>';
        }).join('') + '</div></div>';
      }).join('') + '</div>' +
      (top.length ? '<div class="card" style="background:var(--green-tint)"><div class="h2" style="color:var(--green-dark)">برای امروز</div>' + top.slice(0, 3).map(function (x) { return '<div style="line-height:2;font-size:14px"><b>' + SYM[x[1]][0] + ':</b> ' + SYM[x[1]][1] + '</div>'; }).join('') + '</div>' : '') +
      '<div class="card"><div class="h2">۱۴ روز اخیر</div><div class="muted small" style="margin-top:-6px">جمع شدت علائم هر روز</div>' +
      '<div class="chart" style="grid-template-columns:repeat(14,1fr);gap:3px;font-size:10px">' + vals.map(function (v, j) { return '<div class="c">' + (v === null ? '' : num(v)) + '<div class="b' + (j === 13 ? ' today' : '') + '" style="height:' + Math.round((v || 0) / mx * 86) + 'px;' + (v === null ? 'opacity:.25' : '') + '"></div></div>'; }).join('') + '</div></div>' +
      '<div class="muted small" style="line-height:1.9">اگر غمگینی شدید، بی‌خوابی طولانی یا علامت نگران‌کننده‌ای دارید، با پزشک یا خط ۴۰۳۰ مشورت کنید.</div>' +
      '</div>' + A.nav('home');
  };

  // ======================================================================
  // ۲) آزمون نفس
  // ======================================================================
  V.breathtest = function () {
    var hold = S.tests.filter(function (x) { return x.k === 'hold'; }), stairs = S.tests.filter(function (x) { return x.k === 'stairs'; });
    function summary(list, unit) {
      if (!list.length) return '<div class="muted small">هنوز ثبت نشده</div>';
      var f = list[0], l = list[list.length - 1], d = l.v - f.v;
      return '<div class="row"><div><b style="font-size:26px">' + num(l.v) + '</b> <span class="muted small">' + unit + ' (آخرین)</span></div>' +
        (list.length > 1 ? '<div class="small" style="color:' + (d >= 0 ? 'var(--green)' : '#C0533A') + ';font-weight:700">' + (d >= 0 ? '+' : '−') + num(Math.abs(d)) + ' ' + unit + ' از بار اول</div>' : '') + '</div>' +
        lineChart(list.slice(-12).map(function (x) { return x.v; }).reverse(), 'var(--green)');
    }
    return '<div class="screen">' + header('آزمون نفس', 'care') +
      '<div class="muted" style="line-height:2">هر هفته یک بار امتحان کنید تا ببینید ریه‌هایتان چطور بهتر می‌شوند. این یک آزمون پزشکی نیست؛ اگر سرگیجه یا درد داشتید، متوقف شوید.</div>' +
      '<div class="card"><div class="h2">نگه داشتن نفس</div><div class="muted small" style="line-height:1.9">نشسته و آرام، یک نفس عمیق بکشید، «شروع» را بزنید و هر وقت لازم شد نفس بکشید «پایان» را بزنید. به خودتان فشار نیاورید.</div>' +
      '<div class="cel-num" id="bt-sec" style="font-size:56px">۰٫۰</div>' +
      '<button class="primary" id="bt-go">شروع</button>' + summary(hold, 'ثانیه') + '</div>' +
      '<div class="card"><div class="h2">بالا رفتن از پله</div><div class="muted small" style="line-height:1.9">با سرعت معمولی از پله بالا بروید و بنویسید چند طبقه بدون نفس‌نفس زدن رفتید.</div>' +
      '<div class="row" style="gap:10px"><input class="input" id="st-v" inputmode="numeric" placeholder="تعداد طبقه" style="flex:1"><button class="chip on" id="st-ok" style="min-height:46px">ثبت</button></div>' +
      summary(stairs, 'طبقه') + '</div>' +
      '</div>' + A.nav('home');
  };
  AF.breathtest = function () {
    var t0 = 0, iv = null, btn = $('#bt-go'), out = $('#bt-sec');
    btn.onclick = function () {
      if (!t0) { t0 = Date.now(); btn.textContent = 'پایان'; iv = setInterval(function () { out.textContent = num((Date.now() - t0) / 1000, 1); }, 100); return; }
      clearInterval(iv); var s = Math.round((Date.now() - t0) / 100) / 10; t0 = 0;
      if (s < 3) { A.toast('خیلی کوتاه بود؛ دوباره امتحان کنید'); btn.textContent = 'شروع'; out.textContent = '۰٫۰'; return; }
      S.tests.push({ t: Date.now(), k: 'hold', v: s }); A.save(); A.toast(num(s, 1) + ' ثانیه ثبت شد'); A.render();
    };
    $('#st-ok').onclick = function () {
      var v = parseInt(A.toEn($('#st-v').value) || '0', 10);
      if (!v || v > 60) { A.toast('تعداد طبقه را وارد کنید'); return; }
      S.tests.push({ t: Date.now(), k: 'stairs', v: v }); A.save(); A.toast('ثبت شد'); A.render();
    };
    A.onLeave(function () { clearInterval(iv); });
  };

  // ======================================================================
  // ۳) وزن
  // ======================================================================
  var FOOD = [
    'میوه و سبزی شسته و آماده در یخچال داشته باشید؛ هوس دهان را با هویج، خیار یا سیب جواب بدهید.',
    'آب زیاد بنوشید؛ گاهی تشنگی شبیه گرسنگی یا هوس است.',
    'آدامس بدون قند و تخمه‌ی بدون نمک، دست و دهان را مشغول می‌کند.',
    'غذا را آرام بخورید و بعد از غذا زود از سر میز بلند شوید.',
    'روزی ۳۰ دقیقه پیاده‌روی هم به وزن کمک می‌کند هم به هوس.',
    'شیرینی و نوشابه را در دسترس نگذارید؛ به‌جایش خرما یا میوه‌ی خشک کم.'
  ];
  V.weight = function () {
    var W = S.weight, last = W[W.length - 1], first = W[0];
    var atQuit = null; W.forEach(function (x) { if (x.t <= S.quitAt + 3 * DAY) atQuit = x; });
    var base = atQuit || first, diff = last && base ? round1(last.kg - base.kg) : 0;
    return '<div class="screen">' + header('وزن', 'care') +
      '<div class="muted" style="line-height:2">کمی افزایش وزن بعد از ترک رایج است (در پژوهش‌ها به‌طور میانگین حدود ۴ تا ۵ کیلوگرم در سال اول) و خطرش در برابر سود ترک بسیار کم است. هدف، کنترل آرام است نه رژیم سخت.</div>' +
      '<div class="card"><div class="row" style="gap:10px"><input class="input" id="w-v" inputmode="decimal" placeholder="وزن امروز (کیلوگرم)" style="flex:1"><button class="chip on" id="w-ok" style="min-height:46px">ثبت</button></div>' +
      (last ? '<div class="grid2" style="text-align:center"><div class="col"><b style="font-size:24px">' + num(last.kg, 1) + '</b><span class="muted small">آخرین وزن (کیلوگرم)</span></div>' +
        '<div class="col"><b style="font-size:24px">' + (diff > 0 ? '+' : diff < 0 ? '−' : '') + num(Math.abs(diff), 1) + '</b><span class="muted small">تغییر از ' + (atQuit ? 'روز ترک' : 'اولین ثبت') + '</span></div></div>' +
        lineChart(W.slice(-20).map(function (x) { return x.kg; }).reverse(), 'var(--amber)') +
        '<div class="col" style="gap:4px">' + W.slice(-5).reverse().map(function (x) { return '<div class="row small"><span>' + faD.format(new Date(x.t)) + '</span><span><b>' + num(x.kg, 1) + '</b> کیلوگرم</span></div>'; }).join('') + '</div>'
        : '<div class="muted small">هفته‌ای یک بار، صبح و ناشتا وزن کنید.</div>') + '</div>' +
      '<div class="card"><div class="h2">چند پیشنهاد ساده</div>' + FOOD.map(function (f) { return '<div style="line-height:2;font-size:14px">• ' + f + '</div>'; }).join('') + '</div>' +
      '</div>' + A.nav('home');
  };
  AF.weight = function () {
    $('#w-ok').onclick = function () {
      var raw = String($('#w-v').value).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[٫,\/]/g, '.');
      var v = parseFloat(raw);
      if (!(v > 25 && v < 350)) { A.toast('وزن را به کیلوگرم وارد کنید'); return; }
      var k = dayKey(Date.now()); S.weight = S.weight.filter(function (x) { return dayKey(x.t) !== k; });
      S.weight.push({ t: Date.now(), kg: round1(v) }); A.save(); A.toast('ثبت شد'); A.render();
    };
  };

  // ======================================================================
  // ۴) ذهن‌آگاهی (تمرین‌های راهنما)
  // ======================================================================
  var MIND = [
    ['موج‌سواری هوس', 'برای لحظه‌ی هوس، ۳ دقیقه', [
      ['راحت بنشینید و چشم‌هایتان را ببندید یا به یک نقطه نگاه کنید.', 12],
      ['هوس را مثل یک موج دریا تصور کنید. لازم نیست با آن بجنگید.', 15],
      ['ببینید هوس کجای بدنتان حس می‌شود؟ دهان، گلو، سینه یا دست‌ها؟', 20],
      ['فقط نگاهش کنید و نامش را بگذارید: «این یک هوس است».', 15],
      ['نفس بکشید… موج دارد بالا می‌آید. روی نفس بمانید.', 20],
      ['حس کنید موج در اوج است. شما سوار آن هستید، نه زیر آن.', 20],
      ['حالا موج کم‌کم پایین می‌آید. شدتش را از ۱ تا ۱۰ بسنجید.', 20],
      ['هر هوسی که بدون سیگار رد می‌شود، هوس بعدی را ضعیف‌تر می‌کند.', 15],
      ['یک نفس عمیق دیگر. شما از این موج رد شدید.', 12]
    ]],
    ['تنفس مربعی', '۴ ثانیه دم، ۴ نگه، ۴ بازدم، ۴ نگه — ۲ دقیقه', 'box'],
    ['اسکن بدن', 'آرام کردن بدن از سر تا پا، ۴ دقیقه', [
      ['راحت بنشینید یا دراز بکشید. سه نفس آرام بکشید.', 15],
      ['توجه را به پیشانی و چشم‌ها ببرید. اگر گرفته‌اند، رهایشان کنید.', 20],
      ['فک و گلو. دندان‌ها را از هم باز کنید و زبان را شل کنید.', 20],
      ['شانه‌ها. شاید بالا رفته باشند؛ بگذارید پایین بیایند.', 20],
      ['قفسه‌ی سینه. بالا و پایین رفتن آن را با هر نفس حس کنید. ریه‌هایتان دارند ترمیم می‌شوند.', 25],
      ['شکم. نرم و آرام.', 20],
      ['دست‌ها و انگشت‌ها. گرما یا گزگز را حس کنید.', 20],
      ['پاها و کف پا. تماسشان با زمین را حس کنید.', 20],
      ['کل بدن را با هم حس کنید. یک نفس عمیق، و آرام چشم‌ها را باز کنید.', 20]
    ]],
    ['۵-۴-۳-۲-۱', 'برگشتن به لحظه‌ی حال، ۲ دقیقه', [
      ['دور و برتان را نگاه کنید و ۵ چیز را که می‌بینید نام ببرید.', 25],
      ['۴ چیز را که می‌توانید لمس کنید حس کنید: لباس، صندلی، زمین…', 25],
      ['به ۳ صدایی که می‌شنوید گوش بدهید.', 20],
      ['۲ بو را پیدا کنید. حس بویایی‌تان بعد از ترک بهتر شده است.', 20],
      ['۱ مزه را حس کنید؛ شاید یک جرعه آب.', 15],
      ['حالا یک نفس عمیق بکشید. اینجا و اکنون هستید.', 10]
    ]]
  ];
  function boxSteps() { var s = []; for (var i = 0; i < 8; i++) s.push(['دم…', 4, 'in'], ['نگه دار', 4, 'hold'], ['بازدم…', 4, 'out'], ['نگه دار', 4, 'hold2']); return s; }
  var actx = null;
  function chime() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = 528;
      g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.15, actx.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 1.6);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 1.7);
    } catch (e) {}
  }
  V.mindful = function (arg) {
    if (arg !== undefined && MIND[+arg]) {
      var m = MIND[+arg];
      return '<div class="screen no-nav mind-play"><div class="row"><a class="icon-btn" href="#mindful" aria-label="بستن">' + I.close + '</a><div class="muted">' + m[0] + '</div></div>' +
        '<div class="mind-circle" id="md-c"></div>' +
        '<div class="mind-text" id="md-t">آماده‌اید؟</div>' +
        '<div class="bar"><div id="md-b" style="width:0%"></div></div>' +
        '<div class="grid2"><button class="primary" id="md-go">شروع</button><button class="chip" id="md-next" style="min-height:52px">بعدی</button></div>' +
        '<div class="muted small" style="text-align:center">با هر مرحله‌ی تازه یک صدای آرام پخش می‌شود.</div></div>';
    }
    var done = S.mindLog.length;
    return '<div class="screen">' + header('ذهن‌آگاهی') +
      '<div class="muted" style="line-height:2">تمرین‌های کوتاه فارسی برای لحظه‌ی هوس، استرس و بی‌خوابی. ' + (done ? num(done) + ' تمرین تا حالا انجام داده‌اید.' : '') + '</div>' +
      MIND.map(function (m, i) { return '<a class="card" href="#mindful/' + i + '" style="flex-direction:row;align-items:center;gap:12px"><div class="mind-ic">' + I.breath + '</div><div class="col" style="flex:1"><div class="h2">' + m[0] + '</div><div class="muted small">' + m[1] + '</div></div>' + I.chev + '</a>'; }).join('') +
      '</div>' + A.nav('home');
  };
  AF.mindful = function (arg) {
    if (arg === undefined || !MIND[+arg]) return;
    var m = MIND[+arg], steps = m[2] === 'box' ? boxSteps() : m[2];
    var total = steps.reduce(function (a, s) { return a + s[1]; }, 0), i = -1, left = 0, el = 0, iv = null, running = false;
    var tEl = $('#md-t'), bEl = $('#md-b'), cEl = $('#md-c'), go = $('#md-go');
    function show() {
      var s = steps[i]; tEl.textContent = s[0];
      cEl.className = 'mind-circle' + (s[2] ? ' ' + s[2] : '');
      cEl.style.transitionDuration = s[1] + 's';
      if (!s[2] || s[2] === 'in') chime();
    }
    function step() {
      i++; if (i >= steps.length) { finish(); return; }
      left = steps[i][1]; show();
    }
    function finish() {
      clearInterval(iv); running = false; tEl.textContent = 'تمام شد. آفرین!'; bEl.style.width = '100%'; cEl.className = 'mind-circle';
      S.mindLog.push(Date.now()); A.save(); chime(); go.textContent = 'دوباره'; i = -1; el = 0;
      if (A.checkChallenges) A.checkChallenges();
    }
    go.onclick = function () {
      if (running) { clearInterval(iv); running = false; go.textContent = 'ادامه'; return; }
      running = true; go.textContent = 'مکث';
      if (i < 0) { el = 0; step(); }
      iv = setInterval(function () { left -= 0.25; el += 0.25; bEl.style.width = Math.min(100, el / total * 100) + '%'; if (left <= 0) step(); }, 250);
    };
    $('#md-next').onclick = function () { if (i < 0) return; el += Math.max(0, left); step(); };
    A.onLeave(function () { clearInterval(iv); });
  };

  // ======================================================================
  // ۵) هشدار پیش از ساعت‌های پرخطر
  // ======================================================================
  var TRIG_HOUR = { 0: 8, 1: 14, 2: 17, 5: 20, 7: 18, 8: 11 };
  function riskyHours() {
    var hc = []; for (var h = 0; h < 24; h++) hc.push(0);
    S.cravings.forEach(function (c) { hc[new Date(cTime(c)).getHours()]++; });
    S.slips.forEach(function (x) { hc[new Date(x.t).getHours()] += 2; });
    var total = hc.reduce(function (a, b) { return a + b; }, 0), out = [];
    if (total >= 5) {
      out = hc.map(function (n, h) { return [n, h]; }).filter(function (x) { return x[0] >= 2; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 2).map(function (x) { return { h: x[1], src: 'data' }; });
    }
    if (!out.length) (S.triggers || []).forEach(function (g) { if (TRIG_HOUR[g] !== undefined && out.length < 2 && !out.some(function (o) { return o.h === TRIG_HOUR[g]; })) out.push({ h: TRIG_HOUR[g], g: g, src: 'trig' }); });
    return out.sort(function (a, b) { return a.h - b.h; });
  }
  var RISK_ID = 500;
  function scheduleRisk() {
    var LN = A.LN; if (!LN) return Promise.resolve();
    var ids = [{ id: RISK_ID }, { id: RISK_ID + 1 }];
    return LN.cancel({ notifications: ids }).catch(function () {}).then(function () {
      if (!S.set.riskAlert || !S.ready) return;
      var hrs = riskyHours(); if (!hrs.length) return;
      return A.notifPermission(true).then(function (ok) {
        if (!ok) return;
        return A.ensureChannel().then(function () {
          return LN.schedule({ notifications: hrs.map(function (o, j) {
            var hh = (o.h + 23) % 24;
            return { id: RISK_ID + j, channelId: 'raha', title: 'رها: ساعت پرخطر نزدیک است', body: 'معمولاً حدود ساعت ' + fa(o.h) + ' هوس می‌کنید' + (o.g !== undefined ? ' (' + A.TRIGGERS[o.g][0] + ')' : '') + '. از الان برنامه‌ی جایگزینتان را آماده کنید.', schedule: { on: { hour: hh, minute: 45 }, allowWhileIdle: true }, extra: { go: 'sos' } };
          }) }).catch(function () {});
        });
      });
    }).then(function () { S.riskAt = Date.now(); A.save(); });
  }
  A.settingsNotifExtra = function () {
    var hrs = riskyHours();
    return A.setRow('هشدار پیش از ساعت‌های پرخطر', hrs.length ? 'هر روز ۱۵ دقیقه قبل از ساعت ' + hrs.map(function (o) { return fa(o.h); }).join(' و ') + (hrs[0].src === 'data' ? ' (از روی هوس‌های ثبت‌شده)' : ' (از روی موقعیت‌هایی که گفتید)') : 'بعد از ثبت چند هوس، ساعت‌های پرخطرتان پیدا می‌شود', A.sw2('risk-alert', !!S.set.riskAlert));
  };

  // ======================================================================
  // ۶) تقویم شمسی روزهای پاک
  // ======================================================================
  var pf = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
  var monthName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' });
  function jp(d) { var o = {}; pf.formatToParts(d).forEach(function (p) { if (p.type === 'year' || p.type === 'month' || p.type === 'day') o[p.type] = parseInt(p.value, 10); }); return o; }
  function monthStart(off) {
    var d = new Date(); d.setHours(12, 0, 0, 0);
    while (jp(d).day > 1) d = new Date(d.getTime() - DAY);
    while (off < 0) { d = new Date(d.getTime() - DAY); while (jp(d).day > 1) d = new Date(d.getTime() - DAY); off++; }
    while (off > 0) { var m = jp(d).month; while (jp(d).month === m) d = new Date(d.getTime() + DAY); off--; }
    return d;
  }
  var calOff = 0;
  function dayInfo(k) {
    var t0 = keyTime(k), t1 = t0 + DAY;
    var sl = S.slips.filter(function (x) { return x.t >= t0 && x.t < t1; });
    return {
      slips: sl.reduce(function (a, x) { return a + (x.n || 1); }, 0), slipList: sl,
      cr: S.cravings.filter(function (c) { var t = cTime(c); return t >= t0 && t < t1; }).length,
      mood: S.moods[k], jr: (S.journal || []).filter(function (e) { return e.t >= t0 && e.t < t1; }).length
    };
  }
  V.calendar = function () {
    var start = monthStart(calOff), m = jp(start).month, cells = '', d = start;
    var lead = (start.getDay() + 1) % 7, today = dayKey(Date.now()), qDay = dayKey(S.quitAt), qT = keyTime(qDay);
    for (var i = 0; i < lead; i++) cells += '<div></div>';
    var clean = 0, slipD = 0;
    while (jp(d).month === m) {
      var k = dayKey(d.getTime()), t = keyTime(k), info = dayInfo(k), future = t > Date.now(), before = t < qT;
      var cls = future ? 'fut' : before ? 'off' : info.slips ? 'slip' : 'ok';
      if (cls === 'ok') clean++; if (cls === 'slip') slipD++;
      cells += '<button class="cal-d ' + cls + (k === today ? ' today' : '') + '" data-cal="' + k + '"><span>' + fa(jp(d).day) + '</span>' +
        (info.slips ? '<i>' + fa(info.slips) + '</i>' : typeof info.mood === 'number' ? '<b style="background:' + A.MOOD_COLORS[info.mood] + '"></b>' : '') + (k === qDay ? '<em>★</em>' : '') + '</button>';
      d = new Date(d.getTime() + DAY);
    }
    return '<div class="screen">' + header('تقویم روزهای پاک', 'progress') +
      '<div class="row"><button class="icon-btn" data-calm="-1" aria-label="ماه قبل">' + I.back + '</button><div class="h2">' + monthName.format(start) + '</div>' + (calOff < 0 ? '<button class="icon-btn" data-calm="1" aria-label="ماه بعد">' + I.chev + '</button>' : '<span style="width:44px"></span>') + '</div>' +
      '<div class="card"><div class="cal-grid cal-head">' + ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(function (x) { return '<div>' + x + '</div>'; }).join('') + '</div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="mlegend"><span><i style="background:var(--green)"></i>روز پاک</span><span><i style="background:#C0533A"></i>لغزش (تعداد)</span><span>★ روز ترک</span></div></div>' +
      '<div class="grid2"><div class="card" style="align-items:center;padding:12px"><b style="font-size:22px;color:var(--green)">' + num(clean) + '</b><span class="muted small">روز پاک در این ماه</span></div>' +
      '<div class="card" style="align-items:center;padding:12px"><b style="font-size:22px">' + num(slipD) + '</b><span class="muted small">روز با لغزش</span></div></div>' +
      '<div class="muted small" style="text-align:center">روی هر روز بزنید تا جزئیاتش را ببینید.</div>' +
      '</div>' + A.nav('progress');
  };
  function calDay(k) {
    var info = dayInfo(k), t = keyTime(k);
    A.sheet('<div class="h2">' + faD.format(new Date(t)) + '</div>' +
      (t < keyTime(dayKey(S.quitAt)) ? '<div class="muted">پیش از روز ترک</div>' :
        '<div class="col" style="gap:8px;line-height:2">' +
        '<div>' + (info.slips ? '🔸 لغزش: ' + A.slipAmountText(info.slipList.filter(function (x) { return x.k !== 'h'; }).reduce(function (a, x) { return a + (x.n || 1); }, 0), info.slipList.filter(function (x) { return x.k === 'h'; }).reduce(function (a, x) { return a + (x.n || 1); }, 0)) : '✅ روز پاک') + '</div>' +
        info.slipList.filter(function (x) { return x.note; }).map(function (x) { return '<div class="muted small">«' + esc(x.note) + '»</div>'; }).join('') +
        '<div>هوس شکست‌خورده: ' + num(info.cr) + '</div>' +
        (typeof info.mood === 'number' ? '<div>حال: ' + A.MOODS[info.mood] + '</div>' : '') +
        (info.jr ? '<div>یادداشت دفترچه: ' + num(info.jr) + '</div>' : '') + '</div>') +
      '<button class="primary" data-close>بستن</button>');
  }

  // ======================================================================
  // ۷) امتیاز، سطح و چالش هفتگی
  // ======================================================================
  var LEVELS = [[0, 'تازه‌کار'], [100, 'مصمم'], [300, 'پایدار'], [700, 'قهرمان'], [1500, 'الهام‌بخش'], [3000, 'استاد رها']];
  function weekStart(t) { var d = new Date(t || Date.now()); d.setHours(0, 0, 0, 0); return d.getTime() - ((d.getDay() + 1) % 7) * DAY; }
  function cntKeys(obj, ws) { return Object.keys(obj || {}).filter(function (k) { var t = keyTime(k); return t >= ws && t < ws + 7 * DAY && obj[k] !== undefined && obj[k] !== null && obj[k] !== 0; }).length; }
  function cntTimes(list, ws, f) { return (list || []).filter(function (x) { var t = f ? f(x) : x; return t >= ws && t < ws + 7 * DAY; }).length; }
  var CH = [
    ['mood5', 'پنج روز حالت را ثبت کن', 5, function (ws) { return Object.keys(S.moods).filter(function (k) { var t = keyTime(k); return t >= ws && t < ws + 7 * DAY; }).length; }],
    ['beat3', 'سه هوس را شکست بده', 3, function (ws) { return cntTimes(S.cravings, ws, cTime); }],
    ['pledge5', 'پنج روز تعهد بده', 5, function (ws) { return cntKeys(S.pledges, ws); }],
    ['mind3', 'سه تمرین ذهن‌آگاهی', 3, function (ws) { return cntTimes(S.mindLog, ws); }],
    ['jr2', 'دو بار در دفترچه بنویس', 2, function (ws) { return cntTimes(S.journal, ws, function (e) { return e.t; }); }],
    ['clean7', 'یک هفته‌ی کامل بدون لغزش', 7, function (ws) { if (S.quitAt > ws) return 0; if (S.slips.some(function (x) { return x.t >= ws && x.t < ws + 7 * DAY; })) return 0; return Math.min(7, Math.floor((Date.now() - ws) / DAY)); }],
    ['sym3', 'سه روز علائم ترک را ثبت کن', 3, function (ws) { return cntKeys(S.sym, ws); }],
    ['breath1', 'آزمون نفس را انجام بده', 1, function (ws) { return cntTimes(S.tests, ws, function (x) { return x.t; }); }],
    ['idea3', 'سه پیشنهاد «به‌جاش» را انجام بده', 3, function (ws) { return cntKeys(S.ideaDone, ws); }]
  ];
  function weekChallenges() {
    var ws = weekStart(), wi = Math.floor((ws + 3.5 * DAY) / (7 * DAY));
    return [0, 1, 2].map(function (j) {
      var c = CH[(wi * 3 + j) % CH.length], p = Math.min(c[2], c[3](ws));
      return { id: c[0], title: c[1], goal: c[2], p: p, key: ws + ':' + c[0], done: !!S.chDone[ws + ':' + c[0]] };
    });
  }
  function checkChallenges() {
    if (!S.ready) return;
    weekChallenges().forEach(function (c) {
      if (!c.done && c.p >= c.goal) { S.chDone[c.key] = Date.now(); A.save(); A.toast('چالش «' + c.title + '» انجام شد! ۵۰ امتیاز'); if (A.confetti) A.confetti(); }
    });
  }
  A.checkChallenges = checkChallenges;
  function points() {
    var st = A.stats(), totalDays = Math.floor(Math.max(0, st.days)), slipDays = {};
    A.slipsSinceQuit().forEach(function (x) { slipDays[dayKey(x.t)] = 1; });
    var P = [
      ['روز پاک', Math.max(0, totalDays - Object.keys(slipDays).length), 10],
      ['هوس شکست‌خورده', S.cravings.length, 5],
      ['تعهد روزانه', Object.keys(S.pledges || {}).length, 3],
      ['ثبت حال', Object.keys(S.moods).length, 2],
      ['یادداشت دفترچه', (S.journal || []).length, 3],
      ['مأموریت ۳۰ روزه', Object.keys(S.journeyDone || {}).length, 5],
      ['تمرین ذهن‌آگاهی', S.mindLog.length, 3],
      ['ثبت علائم', Object.keys(S.sym).length, 1],
      ['آزمون نفس', S.tests.length, 2],
      ['چالش هفتگی', Object.keys(S.chDone).length, 50]
    ];
    return { rows: P, total: P.reduce(function (a, r) { return a + r[1] * r[2]; }, 0) };
  }
  function level(total) { var L = LEVELS[0], N = null; LEVELS.forEach(function (l, i) { if (total >= l[0]) { L = l; N = LEVELS[i + 1] || null; } }); return { name: L[1], from: L[0], next: N, idx: LEVELS.indexOf(L) }; }
  A.points = points; A.level = level;
  function chRow(c) {
    return '<div class="ch-row' + (c.done ? ' done' : '') + '"><div class="ch-ic">' + (c.done ? '✓' : fa(c.p) + '/' + fa(c.goal)) + '</div><div class="col" style="flex:1;gap:4px"><div style="font-weight:700;font-size:14px">' + c.title + '</div>' +
      '<div class="bar" style="height:6px"><div style="width:' + (c.p / c.goal * 100) + '%"></div></div></div></div>';
  }
  V.level = function () {
    checkChallenges();
    var P = points(), L = level(P.total), chs = weekChallenges(), ws = weekStart();
    var pct = L.next ? (P.total - L.from) / (L.next[0] - L.from) * 100 : 100;
    return '<div class="screen">' + header('امتیاز و چالش‌ها', 'progress') +
      '<div class="lvl-hero"><div class="lvl-badge">' + fa(L.idx + 1) + '</div><div class="col" style="flex:1;gap:6px"><div style="font-size:20px;font-weight:800">' + L.name + '</div>' +
      '<div style="font-size:14px">' + num(P.total) + ' امتیاز' + (L.next ? ' · ' + num(L.next[0] - P.total) + ' امتیاز تا «' + L.next[1] + '»' : '') + '</div>' +
      '<div class="bar" style="background:rgba(255,255,255,.25)"><div style="width:' + pct + '%;background:#FFFFFF"></div></div></div></div>' +
      '<div class="card"><div class="row"><div class="h2">چالش‌های این هفته</div><div class="muted small">تا ' + faDM.format(new Date(ws + 6 * DAY)) + '</div></div>' +
      chs.map(chRow).join('') + '<div class="muted small">هر چالش ۵۰ امتیاز دارد. هر شنبه چالش‌های تازه می‌آیند.</div></div>' +
      '<div class="card"><div class="h2">امتیازها از کجا آمده؟</div>' + P.rows.filter(function (r) { return r[1]; }).map(function (r) { return '<div class="row small"><span>' + r[0] + ' (' + num(r[1]) + ' × ' + num(r[2]) + ')</span><b>' + num(r[1] * r[2]) + '</b></div>'; }).join('') + '</div>' +
      '<div class="card"><div class="h2">سطح‌ها</div>' + LEVELS.map(function (l, i) { return '<div class="row small" style="' + (i === L.idx ? 'font-weight:800;color:var(--green)' : P.total < l[0] ? 'opacity:.55' : '') + '"><span>' + fa(i + 1) + '. ' + l[1] + '</span><span>' + num(l[0]) + ' امتیاز</span></div>'; }).join('') + '</div>' +
      '</div>' + A.nav('progress');
  };
  function levelCard() {
    if (!S.ready || S.quitAt > Date.now()) return '';
    var P = points(), L = level(P.total), chs = weekChallenges(), d = chs.filter(function (c) { return c.done; }).length;
    return '<a class="card lvl-mini" href="#level"><div class="lvl-badge sm">' + fa(L.idx + 1) + '</div><div class="col" style="flex:1"><div style="font-weight:700">' + L.name + ' · ' + num(P.total) + ' امتیاز</div>' +
      '<div class="muted small">چالش‌های این هفته: ' + fa(d) + ' از ۳</div></div>' + I.chev + '</a>';
  }

  // ======================================================================
  // ۸) فهرست آرزوها
  // ======================================================================
  function wishState() {
    var avail = A.stats().money - S.wishes.filter(function (w) { return w.bought; }).reduce(function (a, w) { return a + w.price; }, 0);
    return S.wishes.map(function (w) {
      if (w.bought) return { w: w, p: 100 };
      var p = w.price > 0 ? Math.max(0, Math.min(100, avail / w.price * 100)) : 0; avail = Math.max(0, avail - w.price);
      return { w: w, p: p };
    });
  }
  V.wishes = function () {
    var ws = wishState(), perDay = A.dailyCost();
    return '<div class="screen">' + header('فهرست آرزوها', 'progress') +
      '<div class="muted" style="line-height:2">چیزهایی که می‌خواهید با پول سیگار بخرید را به ترتیب بنویسید. پس‌انداز شما اول صرف اولی می‌شود، بعد دومی و…</div>' +
      '<div class="card" style="align-items:center;padding:12px"><b style="font-size:22px;color:var(--amber)">' + A.shortMoney(A.stats().money) + ' ' + A.cur() + '</b><span class="muted small">پس‌انداز تا امروز</span></div>' +
      (ws.length ? ws.map(function (x, i) {
        var w = x.w, left = w.bought || x.p >= 100 ? 0 : Math.ceil((w.price * (1 - x.p / 100)) / Math.max(1, perDay));
        return '<div class="card wish' + (w.bought ? ' bought' : '') + '"><div class="row"><div class="h2">' + esc(w.name) + '</div><div class="muted small">' + A.shortMoney(w.price) + ' ' + A.cur() + '</div></div>' +
          '<div class="bar"><div style="width:' + x.p + '%;background:var(--amber)"></div></div>' +
          '<div class="row small"><span>' + (w.bought ? 'خریدید! 🎉' : x.p >= 100 ? 'پولش جمع شده!' : num(Math.floor(x.p)) + '٪ · حدود ' + num(left) + ' روز دیگر') + '</span>' +
          '<span style="display:flex;gap:6px">' + (i > 0 && !w.bought ? '<button class="chip" data-wish-up="' + i + '" style="min-height:32px;padding:0 10px" aria-label="بالاتر">▲</button>' : '') +
          (!w.bought && x.p >= 100 ? '<button class="chip on" data-wish-buy="' + i + '" style="min-height:32px">خریدم</button>' : '') +
          '<button class="chip" data-wish-del="' + i + '" style="min-height:32px;padding:0 10px" aria-label="حذف">' + I.trash + '</button></span></div></div>';
      }).join('') : '<div class="card muted" style="text-align:center">هنوز آرزویی اضافه نکرده‌اید.</div>') +
      '<button class="primary" data-wish-add>افزودن آرزو</button>' +
      '</div>' + A.nav('progress');
  };

  // ======================================================================
  // ۹) گزارش PDF برای پزشک
  // ======================================================================
  // یک PDF ساده که هر صفحه‌اش یک تصویر JPEG است (برای نمایش درست متن فارسی)
  function makePdf(jpegs) {
    var enc = function (s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
    var parts = [], offs = [], len = 0;
    function push(x) { var b = typeof x === 'string' ? enc(x) : x; parts.push(b); len += b.length; }
    function obj(n, body) { offs[n] = len; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); }
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    var n = jpegs.length, kids = [];
    for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(1, function () { push('<< /Type /Catalog /Pages 2 0 R >>'); });
    obj(2, function () { push('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>'); });
    jpegs.forEach(function (j, i) {
      var p = 3 + i * 3, c = 'q 595 0 0 842 0 0 cm /Im0 Do Q';
      obj(p, function () { push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>'); });
      obj(p + 1, function () { push('<< /Length ' + c.length + ' >>\nstream\n' + c + '\nendstream'); });
      obj(p + 2, function () { push('<< /Type /XObject /Subtype /Image /Width ' + j.w + ' /Height ' + j.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + j.bytes.length + ' >>\nstream\n'); push(j.bytes); push('\nendstream'); });
    });
    var xref = len, total = 3 + n * 3;
    var x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (var k = 1; k < total; k++) x += ('0000000000' + offs[k]).slice(-10) + ' 00000 n \n';
    push(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    var out = new Uint8Array(len), o = 0; parts.forEach(function (b) { out.set(b, o); o += b.length; });
    return out;
  }
  function dataUrlBytes(u) { var b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function reportData() {
    var st = A.stats(), R = [], now = Date.now();
    var prod = S.product === 'hookah' ? 'قلیان' : S.product === 'both' ? 'سیگار و قلیان' : 'سیگار';
    R.push(['h', 'مشخصات']);
    if (S.name) R.push(['r', 'نام', S.name]);
    R.push(['r', 'ماده‌ی ترک‌شده', prod]);
    if (A.useCig()) R.push(['r', 'مصرف پیش از ترک', num(S.cpd) + ' نخ سیگار در روز']);
    if (A.useHk()) R.push(['r', 'قلیان پیش از ترک', num(S.hkWeek) + ' وعده در هفته']);
    R.push(['r', 'روش ترک', S.method === 1 ? 'کاهش تدریجی' : 'یک‌باره']);
    R.push(['r', 'تاریخ ترک', faD.format(new Date(S.quitAt))]);
    if (S.ftnd) R.push(['r', 'آزمون وابستگی فاگرستروم', fa(S.ftnd.score) + ' از ۱۰' + (A.ftndLevel ? ' (' + A.ftndLevel(S.ftnd.score)[1] + ')' : '') + ' — ' + faD.format(new Date(S.ftnd.at))]);
    R.push(['h', 'روند ترک']);
    R.push(['r', 'مدت', num(Math.floor(st.days)) + ' روز']);
    var sl = A.slipsSinceQuit(), slipDays = {}; sl.forEach(function (x) { slipDays[dayKey(x.t)] = 1; });
    var td = Math.max(1, Math.ceil(st.days));
    R.push(['r', 'روزهای بدون مصرف', num(Math.max(0, td - Object.keys(slipDays).length)) + ' از ' + num(td) + ' روز']);
    R.push(['r', 'لغزش‌ها', sl.length ? num(sl.length) + ' بار، ' + A.slipAmountText(A.slipCigs(), A.slipHk()) + (sl.length ? ' — آخرین: ' + faD.format(new Date(A.lastSlip().t)) : '') : 'بدون لغزش']);
    var cr30 = S.cravings.filter(function (c) { return cTime(c) > now - 30 * DAY; }).length;
    R.push(['r', 'هوس‌های مدیریت‌شده', num(S.cravings.length) + ' (۳۰ روز اخیر: ' + num(cr30) + ')']);
    var tc = {}; S.cravings.concat(sl).forEach(function (c) { var g = typeof c === 'number' ? -1 : c.g; if (typeof g === 'number' && g >= 0) tc[g] = (tc[g] || 0) + 1; });
    var tops = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }).slice(0, 3).map(function (g) { return A.TRIGGERS[g][0]; });
    if (tops.length) R.push(['r', 'موقعیت‌های پرخطر', tops.join('، ')]);
    var nrt14 = (S.nrt || []).filter(function (x) { return x.t > now - 14 * DAY; });
    if (nrt14.length && A.NRT) {
      R.push(['h', 'جایگزین نیکوتین و دارو (۱۴ روز اخیر)']);
      var nc = {}; nrt14.forEach(function (x) { nc[x.k] = (nc[x.k] || 0) + (x.n || 1); });
      Object.keys(nc).forEach(function (k) { R.push(['r', A.NRT[k] || 'سایر', num(nc[k]) + ' بار']); });
    }
    var symKeys = Object.keys(S.sym).filter(function (k) { return keyTime(k) > now - 7 * DAY; });
    if (symKeys.length) {
      R.push(['h', 'علائم ترک — میانگین ۷ روز اخیر (۰ تا ۳)']);
      SYM.forEach(function (s, i) { var a = symKeys.reduce(function (x, k) { return x + (S.sym[k][i] || 0); }, 0) / symKeys.length; if (a > 0) R.push(['r', s[0], num(a, 1)]); });
    }
    if (S.weight.length) {
      var w0 = S.weight[0], w1 = S.weight[S.weight.length - 1];
      R.push(['h', 'وزن']);
      R.push(['r', 'اولین ثبت', num(w0.kg, 1) + ' کیلوگرم — ' + faD.format(new Date(w0.t))]);
      if (S.weight.length > 1) R.push(['r', 'آخرین ثبت', num(w1.kg, 1) + ' کیلوگرم — ' + faD.format(new Date(w1.t))]);
    }
    var hold = S.tests.filter(function (x) { return x.k === 'hold'; });
    if (hold.length) {
      R.push(['h', 'نگه داشتن نفس (خودآزمایی)']);
      R.push(['r', 'اولین', num(hold[0].v, 1) + ' ثانیه — ' + faD.format(new Date(hold[0].t))]);
      if (hold.length > 1) R.push(['r', 'آخرین', num(hold[hold.length - 1].v, 1) + ' ثانیه — ' + faD.format(new Date(hold[hold.length - 1].t))]);
    }
    var mc = [0, 0, 0, 0], ml = 0; for (var i = 0; i < 14; i++) { var m = S.moods[dayKey(now - i * DAY)]; if (typeof m === 'number') { mc[m]++; ml++; } }
    if (ml) { R.push(['h', 'حال روزانه (۱۴ روز اخیر)']); R.push(['r', 'روزهای ثبت‌شده', A.MOODS.map(function (n, j) { return n + ' ' + fa(mc[j]); }).join('، ')]); }
    return R;
  }
  function buildReport() {
    var W = 1240, H = 1754, M = 100, pages = [], ctx = null, y = 0;
    function newPage() {
      var c = document.createElement('canvas'); c.width = W; c.height = H; ctx = c.getContext('2d');
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = '#14211B';
      pages.push(c); y = M;
      if (pages.length === 1) {
        ctx.fillStyle = '#1C7A52'; ctx.fillRect(0, 0, W, 190); ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 54px Vazirmatn'; ctx.fillText('گزارش ترک دخانیات', W - M, 100);
        ctx.font = '400 28px Vazirmatn'; ctx.fillText('تهیه‌شده با اپ رها — ' + faD.format(new Date()), W - M, 150);
        ctx.fillStyle = '#14211B'; y = 260;
      }
    }
    newPage();
    reportData().forEach(function (r) {
      var need = r[0] === 'h' ? 110 : 56;
      if (y + need > H - 160) newPage();
      if (r[0] === 'h') {
        y += 30; ctx.fillStyle = '#1C7A52'; ctx.font = '700 34px Vazirmatn'; ctx.fillText(r[1], W - M, y); y += 18;
        ctx.fillStyle = '#D5DDD8'; ctx.fillRect(M, y, W - 2 * M, 2); y += 52; ctx.fillStyle = '#14211B';
      } else {
        ctx.font = '400 28px Vazirmatn'; ctx.fillStyle = '#5B6B63'; ctx.fillText(r[1], W - M, y);
        ctx.fillStyle = '#14211B'; ctx.font = '700 28px Vazirmatn'; ctx.textAlign = 'left'; ctx.direction = 'rtl';
        var v = String(r[2]); while (ctx.measureText(v).width > 640 && v.length > 4) v = v.slice(0, -2);
        ctx.fillText(v, M, y); ctx.textAlign = 'right'; y += 56;
      }
    });
    pages.forEach(function (c, i) {
      var g = c.getContext('2d'); g.direction = 'rtl'; g.textAlign = 'center'; g.fillStyle = '#5B6B63'; g.font = '400 22px Vazirmatn';
      g.fillText('این اطلاعات را خود بیمار در اپ ثبت کرده است و جایگزین معاینه و ارزیابی پزشکی نیست.', W / 2, H - 90);
      g.fillText('صفحه‌ی ' + fa(i + 1) + ' از ' + fa(pages.length), W / 2, H - 50);
    });
    return makePdf(pages.map(function (c) { return { w: W, h: H, bytes: dataUrlBytes(c.toDataURL('image/jpeg', 0.85)) }; }));
  }
  function shareReport() {
    var fonts = document.fonts ? Promise.all(['400 28px Vazirmatn', '700 34px Vazirmatn', '800 54px Vazirmatn'].map(function (f) { return document.fonts.load(f); })) : Promise.resolve();
    A.toast('در حال ساختن گزارش…');
    fonts.then(build, build);
    function build() {
      var pdf;
      try { pdf = buildReport(); } catch (e) { A.toast('ساختن گزارش ممکن نشد'); return; }
      var name = 'raha-report-' + new Date().toISOString().slice(0, 10) + '.pdf';
      var FS = A.plugin('Filesystem'), SH = A.plugin('Share');
      if (A.IS_NATIVE && FS && SH) {
        FS.writeFile({ path: name, data: b64(pdf), directory: 'CACHE' })
          .then(function (r) { return SH.share({ title: 'گزارش ترک دخانیات', files: [r.uri], dialogTitle: 'فرستادن برای پزشک یا ذخیره' }); })
          .catch(function () {});
        return;
      }
      var url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
      var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }
  }
  A.buildReport = buildReport;

  // ======================================================================
  // صفحه‌ی «سلامت من»
  // ======================================================================
  V.care = function () {
    var k = dayKey(Date.now()), symToday = S.sym[k], lw = S.weight[S.weight.length - 1], lh = S.tests.filter(function (x) { return x.k === 'hold'; }).pop();
    function item(href, title, sub) { return '<a class="card" href="#' + href + '" style="flex-direction:row;align-items:center;gap:12px"><div class="col" style="flex:1"><div class="h2">' + title + '</div><div class="muted small">' + sub + '</div></div>' + I.chev + '</a>'; }
    return '<div class="screen">' + header('سلامت من') +
      item('symptoms', 'علائم ترک', symToday ? 'امروز ثبت شده · جمع شدت ' + num(symTotal(symToday)) : 'امروز چطورید؟ ثبت در کمتر از یک دقیقه') +
      item('breathtest', 'آزمون نفس', lh ? 'آخرین: ' + num(lh.v, 1) + ' ثانیه نگه داشتن نفس' : 'نگه داشتن نفس و بالا رفتن از پله') +
      item('weight', 'وزن', lw ? 'آخرین: ' + num(lw.kg, 1) + ' کیلوگرم' : 'ثبت هفتگی و پیشنهادهای ساده') +
      item('mindful', 'ذهن‌آگاهی', 'موج‌سواری هوس، تنفس مربعی، اسکن بدن، ۵-۴-۳-۲-۱') +
      '<div class="card" style="gap:10px"><div class="h2">گزارش برای پزشک</div><div class="muted small" style="line-height:1.9">یک فایل PDF از روند ترک، لغزش‌ها، آزمون وابستگی، جایگزین نیکوتین، علائم، وزن و آزمون نفس، برای نشان دادن به پزشک یا مشاور.</div>' +
      '<button class="primary" data-care="report">ساختن گزارش PDF</button></div>' +
      '</div>' + A.nav('home');
  };

  // ======================================================================
  // رویدادها
  // ======================================================================
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sym],[data-cal],[data-calm],[data-care],[data-wish-add],[data-wish-up],[data-wish-buy],[data-wish-del],[data-sw2="risk-alert"]');
    if (!t) return;
    if (t.hasAttribute('data-sym')) {
      var k = dayKey(Date.now()), i = +t.getAttribute('data-sym'), v = +t.getAttribute('data-v');
      if (!S.sym[k]) S.sym[k] = SYM.map(function () { return 0; });
      S.sym[k][i] = v; A.save(); checkChallenges(); A.render(); return;
    }
    if (t.hasAttribute('data-cal')) { calDay(t.getAttribute('data-cal')); return; }
    if (t.hasAttribute('data-calm')) { calOff = Math.min(0, calOff + +t.getAttribute('data-calm')); A.render(); return; }
    if (t.getAttribute('data-care') === 'report') { shareReport(); return; }
    if (t.getAttribute('data-sw2') === 'risk-alert') {
      S.set.riskAlert = !S.set.riskAlert; A.save();
      scheduleRisk().then(function () { if (S.set.riskAlert) A.toast(riskyHours().length ? 'هشدار ساعت‌های پرخطر روشن شد' : 'بعد از ثبت چند هوس، هشدارها فعال می‌شوند'); A.render(); });
      return;
    }
    if (t.hasAttribute('data-wish-add')) {
      A.sheet('<div class="h2">آرزوی تازه</div><div class="field"><label for="wa-n">چه چیزی؟</label><input class="input" id="wa-n" maxlength="50" placeholder="مثلاً دوچرخه، سفر شمال"></div>' +
        A.moneyField('wa-p', 'قیمت (تومان)', 0, 'مثلاً ۱۰٬۰۰۰٬۰۰۰') + '<button class="primary" id="wa-ok">افزودن</button><button class="ghost" data-close>انصراف</button>', function (bg) {
        bg.querySelector('#wa-ok').onclick = function () {
          var n = bg.querySelector('#wa-n').value.trim(), p = parseInt(A.toEn(bg.querySelector('#wa-p').value) || '0', 10);
          if (!n || !p) { A.toast('نام و قیمت را وارد کنید'); return; }
          S.wishes.push({ name: n.slice(0, 50), price: p, bought: 0, at: Date.now() }); A.save(); bg.remove(); A.render();
        };
      });
      return;
    }
    if (t.hasAttribute('data-wish-up')) { var u = +t.getAttribute('data-wish-up'), x = S.wishes[u]; S.wishes[u] = S.wishes[u - 1]; S.wishes[u - 1] = x; A.save(); A.render(); return; }
    if (t.hasAttribute('data-wish-buy')) { S.wishes[+t.getAttribute('data-wish-buy')].bought = Date.now(); A.save(); if (A.confetti) A.confetti(); A.toast('مبارک باشد! این را سیگار نخرید، خودتان خریدید'); A.render(); return; }
    if (t.hasAttribute('data-wish-del')) {
      var di = +t.getAttribute('data-wish-del');
      A.sheet('<div class="h2">«' + esc(S.wishes[di].name) + '» حذف شود؟</div><button class="primary" id="wd-ok" style="background:#9B2C2C">حذف</button><button class="ghost" data-close>انصراف</button>', function (bg) {
        bg.querySelector('#wd-ok').onclick = function () { S.wishes.splice(di, 1); A.save(); bg.remove(); A.render(); };
      });
    }
  });

  // ======================================================================
  // اتصال به بقیه‌ی اپ
  // ======================================================================
  A.careSosButtons = function () { return '<a class="alt" href="#mindful/0">' + I.breath + 'موج‌سواری هوس</a>'; };
  A.extraTools = (A.extraTools || []).concat([['care', 'سلامت من', I.heart], ['mindful', 'ذهن‌آگاهی', I.breath], ['level', 'امتیاز و چالش', I.spark], ['wishes', 'فهرست آرزوها', I.bookmark]]);
  var prevHome = A.homeExtra;
  A.homeExtra = function () { return (prevHome ? prevHome() : '') + levelCard(); };
  var prevDash = A.dashExtra;
  A.dashExtra = function () {
    return (prevDash ? prevDash() : '') +
      '<div class="grid2"><a class="chip" href="#calendar" style="display:flex;align-items:center;justify-content:center;min-height:48px">تقویم روزهای پاک</a><a class="chip" href="#wishes" style="display:flex;align-items:center;justify-content:center;min-height:48px">فهرست آرزوها</a></div>';
  };
  var prevBack = A.backFor;
  A.backFor = function (r) {
    var m = { care: 'home', symptoms: 'care', breathtest: 'care', weight: 'care', mindful: 'home', calendar: 'progress', level: 'progress', wishes: 'progress' };
    if (/^mindful\//.test(r)) return 'mindful';
    return m[r] || (prevBack ? prevBack(r) : null);
  };
  A.homeHooks = (A.homeHooks || []).concat([function () {
    checkChallenges();
    if (S.set.riskAlert && (!S.riskAt || Date.now() - S.riskAt > DAY)) scheduleRisk();
  }]);
};
