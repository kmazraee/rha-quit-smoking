/* رها — «همراه رها» (دستیار هوش مصنوعی فارسی) و «رها پلاس» */
window.RAHA_COACH = function (A) {
  'use strict';
  var S = A.S, V = A.VIEWS, AF = A.AFTER, I = A.I, $ = A.$, num = A.num, fa = A.fa, esc = A.esc;
  var DAY = 86400000;
  if (!Array.isArray(S.coach)) S.coach = [];
  var enabled = null, busy = false;

  function server() { return A.friendsServer ? A.friendsServer() : ''; }
  function token() { return (A.togetherToken && A.togetherToken()) || S.coachToken || ''; }
  function call(method, path, body, tok) {
    return fetch(server() + path, {
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'خطا در ارتباط با سرور'); e.status = r.status; throw e; }
        return j;
      });
    }, function () { throw new Error('اتصال برقرار نشد؛ اینترنت را بررسی کنید'); });
  }
  // برای کسی که وارد «با هم» نشده، یک حساب بی‌نام فقط برای دستیار ساخته می‌شود (پیشرفتی فرستاده نمی‌شود)
  function ensureToken() {
    if (token()) return Promise.resolve(token());
    return call('POST', '/api/register', { name: 'کاربر رها' }).then(function (r) { S.coachToken = r.token; A.save(); return r.token; });
  }
  function checkEnabled() {
    if (!server()) return Promise.resolve(false);
    if (enabled !== null) return Promise.resolve(enabled);
    return call('GET', '/api/coach').then(function (r) { enabled = !!r.enabled; return enabled; }).catch(function () { return false; });
  }
  function context() {
    var st = A.stats(), now = Date.now();
    return {
      days: Math.floor(st.days),
      product: S.product === 'hookah' ? 'قلیان' : S.product === 'both' ? 'سیگار و قلیان' : 'سیگار',
      cpd: A.useCig() ? S.cpd : 0,
      slips7: S.slips.filter(function (x) { return x.t > now - 7 * DAY; }).length,
      cravings7: S.cravings.filter(function (c) { return (typeof c === 'number' ? c : c.t) > now - 7 * DAY; }).length,
      triggers: (S.triggers || []).slice(0, 5).map(function (g) { return A.TRIGGERS[g][0]; }),
      ftnd: S.ftnd ? S.ftnd.score : null
    };
  }

  var QUICK = ['الان هوس سیگار دارم', 'لغزش کردم و حالم بد است', 'استرس دارم', 'فردا مهمانی دارم، چه کنم؟', 'شب‌ها خوابم نمی‌برد'];
  function bubbles() {
    if (!S.coach.length) return '<div class="coach-empty"><div class="coach-av">ر</div><div class="h2">سلام! من همراه رها هستم</div><div class="muted" style="line-height:2">درباره‌ی هوس، لغزش، استرس یا هر سختی ترک با من حرف بزنید. کوتاه جواب می‌دهم و کمک می‌کنم یک قدم کوچک بردارید.</div></div>';
    return S.coach.map(function (m) { return '<div class="bub ' + (m.role === 'user' ? 'me' : 'ai') + '">' + esc(m.content) + '</div>'; }).join('');
  }
  V.coach = function () {
    var srv = server();
    var head = '<div class="title-bar"><a class="icon-btn" href="#' + (S.ready ? 'home' : 'together') + '" aria-label="بازگشت">' + I.back + '</a><div class="h1">همراه رها</div>' +
      (S.coach.length ? '<button class="ghost small" data-co="clear" style="margin-inline-start:auto;padding:0;min-height:32px">پاک کردن</button>' : '') + '</div>';
    if (!srv) return '<div class="screen">' + head + '<div class="card" style="text-align:center;gap:10px;padding:26px"><div class="h2">به‌زودی</div><div class="muted" style="line-height:2">دستیار هوش مصنوعی فارسی رها به‌زودی فعال می‌شود.</div></div></div>' + A.nav('home');
    return '<div class="screen coach">' + head +
      '<div class="coach-warn">پاسخ‌ها را هوش مصنوعی می‌دهد و ممکن است اشتباه باشد؛ جایگزین پزشک یا مشاور نیست. در شرایط اضطراری: اورژانس <a href="tel:115">۱۱۵</a>، اورژانس اجتماعی <a href="tel:123">۱۲۳</a>، مشاوره‌ی ترک دخانیات <a href="tel:4030">۴۰۳۰</a>.</div>' +
      '<div class="coach-list" id="co-list">' + bubbles() + '</div>' +
      '<div class="chips" id="co-quick">' + QUICK.map(function (q) { return '<button class="chip" data-co-q="' + esc(q) + '">' + q + '</button>'; }).join('') + '</div>' +
      '<div class="coach-input"><textarea class="input" id="co-in" rows="1" maxlength="1500" placeholder="بنویسید…"></textarea><button class="primary" id="co-send" aria-label="فرستادن">فرستادن</button></div>' +
      '<div class="muted small" style="line-height:1.8">پیام‌ها روی همین گوشی می‌مانند. برای پاسخ، متن پیام‌ها و خلاصه‌ای از وضعیت ترک (روزها، لغزش‌ها و موقعیت‌های پرخطر، بدون نام) به سرور رها و سرویس هوش مصنوعی فرستاده می‌شود و ذخیره نمی‌شود.</div>' +
      '</div>' + A.nav('home');
  };
  function scrollEnd() { var l = $('#co-list'); if (l) l.scrollTop = l.scrollHeight; window.scrollTo(0, document.body.scrollHeight); }
  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    S.coach.push({ role: 'user', content: text.slice(0, 1500), t: Date.now() });
    if (S.coach.length > 60) S.coach = S.coach.slice(-60);
    A.save();
    var l = $('#co-list'); if (l) { l.innerHTML = bubbles() + '<div class="bub ai typing"><i></i><i></i><i></i></div>'; scrollEnd(); }
    var inp = $('#co-in'); if (inp) inp.value = '';
    checkEnabled().then(function (on) {
      if (!on) throw new Error('دستیار هنوز فعال نشده است؛ به‌زودی!');
      return ensureToken();
    }).then(function (tok) {
      var msgs = S.coach.slice(-12).map(function (m) { return { role: m.role, content: m.content }; });
      return call('POST', '/api/coach', { messages: msgs, context: context() }, tok).catch(function (e) {
        // اگر حساب دستیار پاک شده بود، یک بار حساب تازه بساز
        if (e.status === 401 && S.coachToken && !(A.togetherToken && A.togetherToken())) { S.coachToken = ''; return ensureToken().then(function (t2) { return call('POST', '/api/coach', { messages: msgs, context: context() }, t2); }); }
        throw e;
      });
    }).then(function (r) {
      S.coach.push({ role: 'assistant', content: r.reply, t: Date.now() }); A.save();
    }).catch(function (e) {
      S.coach.pop(); A.save(); A.toast(e.message);
      var i2 = $('#co-in'); if (i2 && !i2.value) i2.value = text;
    }).then(function () {
      busy = false;
      var l2 = $('#co-list'); if (l2) { l2.innerHTML = bubbles(); scrollEnd(); }
    });
  }
  AF.coach = function () {
    if (!server()) return;
    scrollEnd();
    var inp = $('#co-in'), btn = $('#co-send');
    btn.onclick = function () { send(inp.value); };
    inp.addEventListener('input', function () { inp.style.height = 'auto'; inp.style.height = Math.min(140, inp.scrollHeight) + 'px'; });
  };
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-co-q]'); if (q) { send(q.getAttribute('data-co-q')); return; }
    var c = e.target.closest('[data-co="clear"]');
    if (c) A.sheet('<div class="h2">گفت‌وگو پاک شود؟</div><button class="primary" id="co-clr" style="background:#9B2C2C">پاک کن</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelector('#co-clr').onclick = function () { S.coach = []; A.save(); bg.remove(); A.render(); };
    });
  });

  // ======================================================================
  // رها پلاس (نسخه‌ی ویژه) — زیرساخت آماده؛ فعلاً همه‌ی امکانات رایگان است
  // ======================================================================
  var PLUS = [
    ['همراه رها بدون محدودیت روزانه', 'گفت‌وگوی بیشتر با دستیار هوش مصنوعی'],
    ['تم‌ها و رنگ‌های بیشتر', 'ظاهر اپ را به سلیقه‌ی خودتان تغییر دهید'],
    ['گزارش‌های پیشرفته', 'نمودارهای ماهانه و گزارش کامل‌تر برای پزشک'],
    ['حمایت از توسعه‌ی رها', 'رها بدون تبلیغ و بدون فروش اطلاعات می‌ماند']
  ];
  A.isPlus = function () { return !!(S.plus && S.plus.active); };
  function billing() { if (!A.IS_NATIVE) return null; try { return window.Capacitor.Plugins.RahaBilling || null; } catch (e) { return null; } }
  V.plus = function () {
    var B = billing();
    return '<div class="screen"><div class="title-bar"><a class="icon-btn" href="#settings" aria-label="بازگشت">' + I.back + '</a><div class="h1">رها پلاس</div></div>' +
      '<div class="lvl-hero"><div class="lvl-badge">+</div><div class="col" style="flex:1;gap:4px"><div style="font-size:20px;font-weight:800">رها پلاس</div><div style="font-size:14px;line-height:1.9">همه‌ی ابزارهای اصلی ترک همیشه رایگان می‌مانند.</div></div></div>' +
      '<div class="card">' + PLUS.map(function (p) { return '<div class="row" style="align-items:flex-start;gap:10px"><span style="color:var(--green);font-weight:800">✓</span><div class="col" style="flex:1"><b>' + p[0] + '</b><span class="muted small">' + p[1] + '</span></div></div>'; }).join('') + '</div>' +
      (A.isPlus() ? '<div class="card" style="background:var(--green-tint);text-align:center"><b style="color:var(--green-dark)">رها پلاس شما فعال است. ممنون از حمایتتان!</b></div>'
        : B ? '<button class="primary" data-plus="buy">خرید از کافه‌بازار</button><button class="ghost" data-plus="restore">قبلاً خریده‌ام</button>'
        : '<div class="card muted" style="text-align:center;line-height:2">به‌زودی از طریق کافه‌بازار. تا آن موقع همه‌ی امکانات رایگان است.</div>') +
      '</div>' + A.nav('settings');
  };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-plus]'); if (!t) return;
    var B = billing(); if (!B) return;
    var k = t.getAttribute('data-plus');
    (k === 'buy' ? B.purchase({ sku: 'raha_plus' }) : B.restore({ sku: 'raha_plus' })).then(function (r) {
      if (r && r.active) { S.plus = { active: true, at: Date.now(), token: r.token || '' }; A.save(); if (A.confetti) A.confetti(); A.toast('رها پلاس فعال شد'); A.render(); }
      else A.toast(k === 'buy' ? 'خرید انجام نشد' : 'خریدی پیدا نشد');
    }).catch(function () { A.toast('ارتباط با کافه‌بازار برقرار نشد'); });
  });

  // ======================================================================
  // اتصال به بقیه‌ی اپ
  // ======================================================================
  A.extraTools = (A.extraTools || []).concat([['coach', 'همراه رها (هوش مصنوعی)', I.users]]);
  var prevCare = A.careSosButtons;
  A.careSosButtons = function () { return (prevCare ? prevCare() : '') + (server() ? '<a class="alt" href="#coach">' + I.users + 'حرف زدن با همراه رها</a>' : ''); };
  var prevBack = A.backFor;
  A.backFor = function (r) { if (r === 'coach') return S.ready ? 'home' : 'together'; if (r === 'plus') return 'settings'; return prevBack ? prevBack(r) : null; };
};
