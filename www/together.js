/* رها — «با هم ترک کنیم»
 * دوستان با یک کد شش‌رقمی همدیگر را اضافه می‌کنند، پیشرفت هم را می‌بینند،
 * وقتی حالشان بد است به هم خبر می‌دهند و پیام دلگرمی می‌فرستند.
 * اطلاعات فقط وقتی به سرور رها فرستاده می‌شود که کاربر خودش این بخش را روشن کند.
 */
window.RAHA_TOGETHER = function (A) {
  'use strict';
  var S = A.S, esc = A.esc, num = A.num, fa = A.fa, $ = A.$, I = A.I;

  // همین فهرست روی سرور هم هست؛ ترتیب نباید عوض شود
  var CHEERS = [
    'آفرین! بهت افتخار می‌کنم.',
    'قوی بمون، این هوس می‌گذره.',
    'من کنارتم.',
    'یه نفس عمیق بکش، تو از پسش برمیای.',
    'الان بهت زنگ می‌زنم.',
    'ادامه بده، داری عالی پیش میری.'
  ];
  var USERS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 20a6.5 6.5 0 0 0-3-5.5"/></svg>';
  var AVATAR_COLORS = ['#1C7A52', '#1F5F8B', '#8A5A0E', '#5B3E96', '#9B4A2C', '#2E6B6B'];

  // ---------- وضعیت ----------
  if (!S.together || typeof S.together !== 'object') S.together = {};
  var T = S.together; // token, id, code, name, shareMoney, seen, alerted, friends
  if (typeof T.shareMoney !== 'boolean') T.shareMoney = true;
  T.seen = T.seen || 0; T.alerted = T.alerted || 0;
  if (!Array.isArray(T.friends)) T.friends = [];
  var server = '';           // آدرس سرور از www/config.json
  var feed = null;           // آخرین رویدادها برای نمایش در صفحه
  var unread = 0;
  var recentSos = [];        // درخواست‌های کمک دوستان در چند ساعت اخیر
  var pollT = null, pushT = null;

  function joined() { return !!(server && T.token); }
  function save() { A.save(); }

  // ---------- ارتباط با سرور ----------
  function api(method, path, body) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    return fetch(server + path, {
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, T.token ? { Authorization: 'Bearer ' + T.token } : {}),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && T.token && path !== '/api/register') { forget(); A.render(); }
        if (!r.ok) { var e = new Error(j.error || 'خطا در ارتباط با سرور'); e.status = r.status; throw e; }
        return j;
      });
    }, function () {
      if (timer) clearTimeout(timer);
      throw new Error('اتصال به سرور برقرار نشد؛ اینترنت را بررسی کنید');
    });
  }
  function forget() {
    var NF = native(); if (NF) { try { NF.disable().catch(function () {}); } catch (e) {} }
    S.together = T = { shareMoney: T.shareMoney, seen: 0, alerted: 0, friends: [] };
    feed = null; unread = 0; recentSos = []; save(); stopPolling();
  }

  // ---------- بخش بومی اندروید (اعلان در پس‌زمینه) ----------
  function native() {
    if (!A.IS_NATIVE) return null;
    try { return window.Capacitor.Plugins.RahaFriends || (window.Capacitor.registerPlugin && window.Capacitor.registerPlugin('RahaFriends')); } catch (e) { return null; }
  }
  function configureNative() {
    var NF = native(); if (!NF || !joined()) return;
    try { NF.configure({ server: server, token: T.token, cursor: T.alerted }).catch(function () {}); } catch (e) {}
  }
  function syncNativeCursor() {
    var NF = native(); if (!NF) return Promise.resolve();
    return NF.getCursor().then(function (r) {
      if (r && r.cursor > T.alerted) { T.alerted = r.cursor; save(); }
    }).catch(function () {}).then(function () {
      return NF.consumeRoute().then(function (r) { if (r && r.route === 'together' && A.route() !== 'together') A.go('together'); }).catch(function () {});
    });
  }

  // ---------- خلاصه‌ی پیشرفت من ----------
  function snapshot() {
    var st = A.stats(), m = S.moods[A.dayKey(Date.now())];
    return {
      quitAt: S.quitAt, cpd: S.cpd, notSmoked: st.notSmoked,
      money: T.shareMoney ? Math.round(st.money) : null,
      mood: typeof m === 'number' ? m : null, moodAt: typeof m === 'number' ? Date.now() : null,
      streak: A.pledgeStreak ? A.pledgeStreak() : 0,
      beaten: (S.cravings || []).length,
      badges: A.badgeCount ? A.badgeCount()[0] : 0,
      method: S.method || 0
    };
  }
  function pushSnapshot() {
    if (!joined() || !S.ready) return Promise.resolve();
    return api('PUT', '/api/me', { snapshot: snapshot() }).catch(function () {});
  }
  function schedulePush() { clearTimeout(pushT); pushT = setTimeout(pushSnapshot, 2500); }

  function loadFriends() {
    return api('GET', '/api/friends').then(function (r) { T.friends = r.friends || []; save(); }).catch(function () {});
  }

  // ---------- صندوق پیام ----------
  function poll(alertNew) {
    if (!joined()) return Promise.resolve();
    return api('GET', '/api/inbox?since=' + T.seen).then(function (r) {
      var ev = r.events || [];
      unread = ev.length;
      var fresh = ev.filter(function (e) { return e.id > T.alerted; });
      noteSos(ev);
      var stranger = ev.some(function (e) { return e.from && !T.friends.some(function (f) { return f.id === e.from; }); });
      var ready = stranger ? loadFriends() : Promise.resolve();
      return ready.then(function () { return { ev: ev, fresh: fresh }; });
    }).then(function (x) {
      if (!x) return;
      var fresh = x.fresh;
      if (fresh.length) {
        T.alerted = Math.max.apply(null, fresh.map(function (e) { return e.id; }).concat([T.alerted]));
        save();
        var NF = native(); if (NF) { try { NF.setCursor({ cursor: T.alerted }).catch(function () {}); } catch (e) {} }
        if (alertNew && !document.hidden) showFresh(fresh);
        if (/^(together|home)$/.test(A.route()) && !inputBusy()) A.render();
      }
      updateBadges();
    }).catch(function () {});
  }
  function noteSos(ev) {
    var cut = Date.now() - 3 * 3600000;
    ev.forEach(function (e) {
      if (e.type === 'sos' && e.at > cut && !recentSos.some(function (x) { return x.id === e.id; })) recentSos.push(e);
    });
    recentSos = recentSos.filter(function (x) { return x.at > cut; });
  }
  function showFresh(fresh) {
    var sos = fresh.filter(function (e) { return e.type === 'sos'; }).pop();
    if (sos) {
      A.sheet('<div class="tg-sos-ic">!</div><div class="h2" style="text-align:center">' + esc(sos.title) + '</div>' +
        '<div class="muted" style="text-align:center;line-height:2">' + esc(sos.body) + '</div>' +
        '<button class="primary" data-tg-cheer="' + esc(sos.from || '') + '">پیام دلگرمی بفرست</button>' +
        '<button class="ghost" data-close>بعداً</button>');
      return;
    }
    var last = fresh[fresh.length - 1];
    A.toast(last.type === 'cheer' ? last.title + ': ' + last.body : last.body);
  }
  function inputBusy() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA)$/.test(a.tagName); }
  function updateBadges() {
    document.querySelectorAll('.tg-badge').forEach(function (b) {
      b.textContent = unread > 9 ? '+۹' : fa(unread);
      b.style.display = unread ? '' : 'none';
    });
  }

  function startPolling() {
    stopPolling();
    if (!joined()) return;
    pollT = setInterval(function () { if (!document.hidden) poll(true); }, 30000);
  }
  function stopPolling() { if (pollT) clearInterval(pollT); pollT = null; }
  var pushEvery = setInterval(function () { if (!document.hidden) pushSnapshot(); }, 5 * 60000);
  document.addEventListener('visibilitychange', function () {
    if (!joined()) return;
    if (document.hidden) { pushSnapshot(); return; }
    syncNativeCursor().then(function () { poll(true); pushSnapshot(); loadFriends().then(function () { if (A.route() === 'home') A.render(); }); });
  });

  // ---------- ابزارهای نمایش ----------
  function avatar(id, name, size) {
    var h = 0; String(id).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    var ch = String(name || '؟').trim().charAt(0) || '؟';
    return '<div class="tg-av" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.42) + 'px;background:' + AVATAR_COLORS[h % AVATAR_COLORS.length] + '">' + esc(ch) + '</div>';
  }
  function ago(t) {
    var s = Math.max(0, Date.now() - t) / 1000;
    if (s < 90) return 'همین حالا';
    if (s < 3600) return num(Math.round(s / 60)) + ' دقیقه پیش';
    if (s < 86400) return num(Math.round(s / 3600)) + ' ساعت پیش';
    if (s < 172800) return 'دیروز';
    return num(Math.floor(s / 86400)) + ' روز پیش';
  }
  function presence(t) { return Date.now() - t < 5 * 60000 ? '<span class="tg-online"></span>همین حالا در رها' : 'آخرین بار ' + ago(t); }
  function friendDays(s) {
    var now = Date.now();
    if (!s) return null;
    if (s.quitAt > now) return { future: true, left: Math.ceil((s.quitAt - now) / 86400000) };
    var d = (now - s.quitAt) / 86400000;
    return { days: Math.floor(d), hours: Math.floor((d - Math.floor(d)) * 24), notSmoked: Math.floor(d * (s.cpd || 0)) };
  }
  function moodChip(s) {
    if (!s || typeof s.mood !== 'number' || !s.moodAt || A.dayKey(s.moodAt) !== A.dayKey(Date.now())) return '<span class="tg-chip">حال امروز ثبت نشده</span>';
    return '<span class="tg-chip"><i style="background:' + A.MOOD_COLORS[s.mood] + '"></i>حال امروز: ' + A.MOODS[s.mood] + '</span>';
  }
  function sosFrom(id) { return recentSos.filter(function (e) { return e.from === id; }).pop(); }
  function shareText() {
    return 'من با اپ «رها» دارم سیگار را ترک می‌کنم. بیا با هم ترک کنیم!\nکد دوستی من: ' + fa(T.code) + '\nدر رها، بخش «با هم» را باز کن و این کد را وارد کن.';
  }
  function shareCode() {
    var SH = A.plugin('Share'), text = shareText();
    if (A.IS_NATIVE && SH) { SH.share({ title: 'با هم ترک کنیم', text: text, dialogTitle: 'فرستادن کد دوستی' }).catch(function () {}); return; }
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    A.copy(text);
  }

  // ---------- آیکن سربرگ و کارت صفحه‌ی خانه ----------
  A.togetherIcon = function () {
    if (!server) return '';
    return '<a class="icon-btn tg-head" href="#together" aria-label="با هم ترک کنیم">' + USERS + '<span class="tg-badge" style="' + (unread ? '' : 'display:none') + '">' + (unread > 9 ? '+۹' : fa(unread)) + '</span></a>';
  };
  A.togetherCard = function () {
    if (!server || !S.ready) return '';
    if (!T.token) {
      return '<a class="card tg-invite" href="#together"><div class="tg-ic">' + USERS + '</div><div class="col" style="flex:1;gap:2px">' +
        '<div class="h2">با دوستت ترک کن</div><div class="muted small" style="line-height:1.8">پیشرفت هم را ببینید و وقتی حالتان بد است، به هم خبر بدهید.</div></div>' + I.chev + '</a>';
    }
    if (!T.friends.length) {
      return '<a class="card tg-invite" href="#together"><div class="tg-ic">' + USERS + '</div><div class="col" style="flex:1;gap:2px">' +
        '<div class="h2">کد دوستی شما: <span dir="ltr">' + fa(T.code || '') + '</span></div><div class="muted small">برای دوستت بفرست تا با هم ترک کنید</div></div>' + I.chev + '</a>';
    }
    var rows = T.friends.slice(0, 3).map(function (f) {
      var s = sosFrom(f.id), fd = friendDays(f.snapshot);
      var right = s ? '<span class="tg-sos-pill">کمک خواسته</span>'
        : fd ? (fd.future ? '<span class="muted small">' + num(fd.left) + ' روز تا ترک</span>' : '<b>' + num(fd.days) + '</b><span class="muted small"> روز</span>') : '';
      return '<div class="tg-row">' + avatar(f.id, f.name, 34) + '<div style="flex:1;font-weight:700;font-size:14px">' + esc(f.name) + '</div><div>' + right + '</div></div>';
    }).join('');
    return '<a class="card" href="#together" style="gap:10px"><div class="row"><div class="h2">با هم</div><div class="muted small">' +
      (unread ? '<span class="tg-badge" style="position:static;display:inline-flex">' + fa(Math.min(unread, 9)) + '</span> پیام تازه' : num(T.friends.length) + ' دوست') + '</div></div>' + rows + '</a>';
  };
  A.togetherSosButton = function () {
    if (!joined() || !T.friends.length) return '';
    return '<button class="alt" data-tg="sos" style="border-color:#E5484D">' + USERS + 'به دوستانم خبر بده</button>';
  };
  A.onReset = function () {
    if (joined()) { try { api('DELETE', '/api/me'); } catch (e) {} }
  };

  // ---------- صفحه‌ی «با هم» ----------
  A.VIEWS.together = function () {
    var head = '<div class="title-bar"><a class="icon-btn" href="#home" aria-label="بازگشت">' + I.back + '</a><div class="h1">با هم ترک کنیم</div></div>';
    if (!server) {
      return '<div class="screen">' + head +
        '<div class="card" style="align-items:center;text-align:center;padding:28px 20px;gap:12px"><div class="tg-ic big">' + USERS + '</div>' +
        '<div class="h2">به‌زودی</div><div class="muted" style="line-height:2">این بخش به‌زودی فعال می‌شود. آن‌وقت می‌توانید با دوستانتان با هم ترک کنید، پیشرفت هم را ببینید و وقتی حالتان بد است به هم خبر بدهید.</div></div>' +
        '</div>' + A.nav('home');
    }
    if (!T.token) return joinView(head);

    var friends = T.friends;
    var sosBtn = '<button class="tg-sos-btn" data-tg="sos"' + (friends.length ? '' : ' disabled') + '>' +
      '<b>حالم بده، کمکم کنید</b><span>' + (friends.length ? 'به ' + num(friends.length) + ' دوستتان خبر می‌دهیم' : 'اول یک دوست اضافه کنید') + '</span></button>';
    var me = '<div class="card tg-me"><div class="row"><div class="col" style="gap:2px"><div class="muted small">کد دوستی شما</div>' +
      '<div class="tg-code" dir="ltr">' + fa(T.code || '') + '</div></div>' + avatar(T.id || 'me', T.name, 48) + '</div>' +
      '<div class="grid2"><button class="chip on" data-tg="share">فرستادن برای دوست</button><button class="chip" data-tg="copy">کپی کد</button></div></div>';
    var add = '<div class="card"><div class="h2">افزودن دوست</div>' +
      '<div style="display:flex;gap:8px"><input class="input" id="tg-code" inputmode="numeric" maxlength="11" placeholder="کد شش‌رقمی دوستتان" style="flex:1;letter-spacing:2px;text-align:center" aria-label="کد دوستی">' +
      '<button class="chip on" data-tg="add" style="min-width:84px">افزودن</button></div></div>';
    var list = friends.length
      ? friends.map(friendCard).join('')
      : '<div class="card" style="text-align:center;gap:8px;padding:22px"><div class="h2">هنوز دوستی اضافه نکرده‌اید</div><div class="muted small" style="line-height:1.9">کد خودتان را برای دوستی که می‌خواهد ترک کند بفرستید، یا کد او را بالا وارد کنید.</div></div>';
    var feedHtml = feedView();
    var settings = '<details class="alt-card"><summary><span>تنظیمات «با هم»</span>' + I.chev + '</summary><div class="col" style="gap:12px;padding-bottom:6px">' +
      '<div class="field"><label for="tg-name">نام نمایشی</label><div style="display:flex;gap:8px"><input class="input" id="tg-name" maxlength="24" value="' + esc(T.name || '') + '" style="flex:1"><button class="chip" data-tg="rename">ذخیره</button></div></div>' +
      '<div class="srow" style="border:none;padding:0"><div class="col" style="flex:1"><div class="st">پس‌اندازم را به دوستانم نشان بده</div></div>' +
      '<button class="switch' + (T.shareMoney ? ' on' : '') + '" role="switch" aria-checked="' + T.shareMoney + '" data-tg="money"><span></span></button></div>' +
      '<button class="chip" data-tg="newcode">ساختن کد دوستی تازه</button>' +
      '<div class="muted small" style="line-height:1.9">با کد تازه، کد قبلی دیگر کار نمی‌کند. دوستانی که تا الان اضافه کرده‌اید می‌مانند.</div>' +
      '<button class="ghost" data-tg="leave" style="color:#9B2C2C;font-weight:700">خروج و پاک کردن اطلاعاتم از سرور</button></div></details>';
    return '<div class="screen">' + head + sosBtn + me + add +
      '<div class="row"><div class="h2">دوستان</div><button class="ghost small" data-tg="refresh" style="padding:0;min-height:32px">به‌روزرسانی</button></div>' +
      '<div id="tg-friends" class="col" style="gap:12px">' + list + '</div>' +
      '<div class="h2">پیام‌ها و خبرها</div><div id="tg-feed">' + feedHtml + '</div>' + settings +
      '</div>' + A.nav('home');
  };

  function joinView(head) {
    return '<div class="screen">' + head +
      '<div class="card tg-hero"><div class="tg-ic big">' + USERS + '</div><div class="h2">ترک سیگار با یک دوست آسان‌تر است</div>' +
      '<ul class="tg-list"><li>پیشرفت هم را هر لحظه ببینید: روزهای بدون سیگار، پس‌انداز و حال روزانه</li>' +
      '<li>وقتی هوس سیگار دارید، با یک دکمه به دوستانتان خبر بدهید</li>' +
      '<li>برای هم پیام دلگرمی بفرستید و روزهای مهم هم را جشن بگیرید</li></ul></div>' +
      '<div class="card"><div class="field"><label for="tg-join-name">نامی که دوستانتان می‌بینند</label>' +
      '<input class="input" id="tg-join-name" maxlength="24" value="' + esc(S.name || '') + '" placeholder="مثلاً سارا"></div>' +
      '<div class="srow" style="border:none;padding:0"><div class="col" style="flex:1"><div class="st">پس‌اندازم را به دوستانم نشان بده</div></div>' +
      '<button class="switch' + (T.shareMoney ? ' on' : '') + '" role="switch" aria-checked="' + T.shareMoney + '" data-tg="money"><span></span></button></div>' +
      '<button class="primary" data-tg="join">شروع</button></div>' +
      '<div class="card" style="background:var(--green-tint);gap:6px"><div class="st" style="color:var(--green-dark)">چه چیزی با دوستانم به اشتراک گذاشته می‌شود؟</div>' +
      '<div class="small" style="line-height:2">نام نمایشی، تاریخ ترک، تعداد نخ روزانه، نخ‌های نکشیده، پس‌انداز (اگر بخواهید)، حال امروز، روزهای پیاپی تعهد و تعداد هوس‌های شکست‌خورده. ' +
      'این‌ها روی سرور رها نگه‌داری می‌شود و فقط دوستانی که کد شما را دارند می‌بینند. شماره تلفن و ایمیل لازم نیست. هر وقت بخواهید، با «خروج و پاک کردن اطلاعاتم» همه پاک می‌شود. دفترچه، یادداشت‌ها و بقیه‌ی اطلاعاتتان روی گوشی می‌ماند.</div></div>' +
      '</div>' + A.nav('home');
  }

  function friendCard(f) {
    var s = f.snapshot, fd = friendDays(s), sos = sosFrom(f.id);
    var big = !fd ? '<div class="muted">هنوز اطلاعاتی نفرستاده</div>'
      : fd.future ? '<div class="tg-days"><b>' + num(fd.left) + '</b> روز تا روز ترک</div>'
      : '<div class="tg-days"><b>' + num(fd.days) + '</b> روز' + (fd.hours ? ' و ' + num(fd.hours) + ' ساعت' : '') + ' بدون سیگار</div>';
    var stats = fd && !fd.future ? '<div class="tg-stats">' +
      '<div><b>' + num(fd.notSmoked) + '</b><span>نخ نکشیده</span></div>' +
      (s.money !== null && s.money !== undefined ? '<div><b>' + A.shortMoney(s.money) + '</b><span>' + A.cur() + ' پس‌انداز</span></div>' : '') +
      '<div><b>' + num(s.streak || 0) + '</b><span>روز تعهد پیاپی</span></div>' +
      '<div><b>' + num(s.beaten || 0) + '</b><span>هوس شکست‌خورده</span></div></div>' : '';
    return '<div class="card tg-friend' + (sos ? ' alarm' : '') + '">' +
      (sos ? '<div class="tg-alarm">' + esc(f.name) + ' ' + ago(sos.at) + ' کمک خواسته است</div>' : '') +
      '<div class="row" style="align-items:center;gap:12px">' + avatar(f.id, f.name, 46) +
      '<div class="col" style="flex:1;gap:2px"><div style="font-size:16px;font-weight:800">' + esc(f.name) + '</div><div class="muted small">' + presence(f.lastSeen) + '</div></div>' +
      '<button class="icon-btn" data-tg-menu="' + esc(f.id) + '" aria-label="گزینه‌ها" style="background:transparent">⋯</button></div>' +
      big + stats + '<div class="row" style="gap:8px;flex-wrap:wrap">' + moodChip(s) +
      '<button class="chip on" data-tg-cheer="' + esc(f.id) + '">' + (sos ? 'دلگرمی بفرست' : 'پیام دلگرمی') + '</button></div></div>';
  }

  function feedView() {
    if (!feed) return '<div class="muted small">در حال دریافت…</div>';
    if (!feed.length) return '<div class="muted small">هنوز پیامی نیامده است.</div>';
    var IC = { sos: '!', cheer: '♥', friend: '+', milestone: '★' };
    return '<div class="card" style="padding:4px 16px;gap:0">' + feed.slice().reverse().map(function (e) {
      var canReply = e.from && T.friends.some(function (f) { return f.id === e.from; }) && (e.type === 'sos' || e.type === 'milestone' || e.type === 'cheer');
      return '<div class="tg-ev ev-' + e.type + '"><span class="tg-ev-ic">' + (IC[e.type] || '•') + '</span><div class="col" style="flex:1;gap:2px">' +
        '<div style="font-size:14px;font-weight:700">' + esc(e.title) + '</div><div class="small" style="line-height:1.8">' + esc(e.body) + '</div>' +
        '<div class="muted small">' + ago(e.at) + '</div></div>' +
        (canReply ? '<button class="chip" data-tg-cheer="' + esc(e.from) + '" style="align-self:center;min-height:36px;padding:0 12px">' + (e.type === 'cheer' ? 'جواب' : 'دلگرمی') + '</button>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function refresh() {
    if (!joined()) return Promise.resolve();
    return Promise.all([
      api('GET', '/api/friends').then(function (r) { T.friends = r.friends || []; save(); }),
      api('GET', '/api/inbox?since=0').then(function (r) {
        feed = r.events || [];
        noteSos(feed);
        var max = feed.reduce(function (m, e) { return Math.max(m, e.id); }, 0);
        if (max > T.seen) T.seen = max;
        if (max > T.alerted) { T.alerted = max; var NF = native(); if (NF) { try { NF.setCursor({ cursor: max }).catch(function () {}); } catch (e) {} } }
        unread = 0; save(); updateBadges();
      })
    ]).catch(function (e) { A.toast(e.message); });
  }

  A.AFTER.together = function () {
    if (!joined()) return;
    refresh().then(function () { if (A.route() === 'together' && !inputBusy()) redrawLists(); });
    pushSnapshot();
    var t = setInterval(function () { if (A.route() === 'together' && !document.hidden && !inputBusy()) redrawLists(); }, 60000);
    A.onLeave(function () { clearInterval(t); });
  };
  function redrawLists() {
    var fl = $('#tg-friends'), fe = $('#tg-feed');
    if (fl) fl.innerHTML = T.friends.length ? T.friends.map(friendCard).join('') : fl.innerHTML;
    if (fe) fe.innerHTML = feedView();
  }

  // ---------- کارها ----------
  function cheerSheet(friendId, retried) {
    var f = T.friends.filter(function (x) { return x.id === friendId; })[0];
    if (!f && !retried) { loadFriends().then(function () { cheerSheet(friendId, true); }); return; }
    if (!f) { A.toast('این نفر دیگر در فهرست دوستان شما نیست'); return; }
    A.sheet('<div class="h2">پیام دلگرمی برای ' + esc(f.name) + '</div><div class="col" style="gap:8px">' +
      CHEERS.map(function (c, i) { return '<button class="tg-cheer-opt" data-k="' + i + '">' + c + '</button>'; }).join('') +
      '</div><button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelectorAll('[data-k]').forEach(function (b) {
        b.onclick = function () {
          b.disabled = true;
          api('POST', '/api/cheer', { to: f.id, kind: +b.getAttribute('data-k') })
            .then(function () { bg.remove(); A.toast('پیام برای ' + f.name + ' فرستاده شد'); })
            .catch(function (e) { b.disabled = false; A.toast(e.message); });
        };
      });
    });
  }
  function friendMenu(friendId) {
    var f = T.friends.filter(function (x) { return x.id === friendId; })[0]; if (!f) return;
    A.sheet('<div class="h2">' + esc(f.name) + '</div>' +
      '<button class="primary" id="tg-rm" style="background:#9B2C2C">حذف از دوستان</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      bg.querySelector('#tg-rm').onclick = function () {
        api('DELETE', '/api/friends/' + f.id).then(function () {
          T.friends = T.friends.filter(function (x) { return x.id !== f.id; }); save(); bg.remove(); A.toast(f.name + ' از دوستان حذف شد'); A.render();
        }).catch(function (e) { A.toast(e.message); });
      };
    });
  }
  function sendSos() {
    if (!T.friends.length) { A.toast('اول یک دوست اضافه کنید'); return; }
    A.sheet('<div class="h2">به دوستانتان خبر بدهیم؟</div><div class="muted" style="line-height:2">به ' + num(T.friends.length) + ' دوستتان پیام می‌رسد که حالتان خوب نیست و به دلگرمی نیاز دارید.</div>' +
      '<button class="primary" id="tg-sos-go" style="background:#C0533A">بله، خبر بده</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      var btn = bg.querySelector('#tg-sos-go');
      btn.onclick = function () {
        btn.disabled = true;
        api('POST', '/api/sos').then(function (r) {
          bg.remove();
          A.sheet('<div class="h2" style="text-align:center">به ' + num(r.notified) + ' دوست خبر دادیم</div><div class="muted" style="text-align:center;line-height:2">تا جواب بدهند، با هم نفس بکشیم. هوس معمولاً چند دقیقه بیشتر نمی‌ماند.</div>' +
            '<a class="primary" href="#sos" style="display:flex;align-items:center;justify-content:center">تمرین تنفس</a><button class="ghost" data-close>بستن</button>');
        }).catch(function (e) { btn.disabled = false; A.toast(e.message); });
      };
    });
  }
  function join() {
    var name = ($('#tg-join-name') || {}).value || '';
    name = name.trim();
    if (!name) { A.toast('یک نام بنویسید تا دوستانتان شما را بشناسند'); return; }
    var btn = document.querySelector('[data-tg="join"]'); if (btn) btn.disabled = true;
    api('POST', '/api/register', { name: name }).then(function (r) {
      T.token = r.token; T.id = r.id; T.code = r.code; T.name = r.name; T.seen = 0; T.alerted = 0; T.friends = [];
      save(); configureNative(); startPolling();
      return pushSnapshot();
    }).then(function () { A.toast('به «با هم» خوش آمدید'); A.render(); })
      .catch(function (e) { if (btn) btn.disabled = false; A.toast(e.message); });
  }
  function addFriend() {
    var inp = $('#tg-code'), code = A.toEn(inp ? inp.value : '');
    if (code.length !== 6) { A.toast('کد دوستی شش رقم است'); return; }
    api('POST', '/api/friends', { code: code }).then(function (r) {
      T.friends = T.friends.filter(function (f) { return f.id !== r.friend.id; }).concat([r.friend]); save();
      A.toast(r.friend.name + ' به دوستان شما اضافه شد'); if (inp) inp.value = ''; A.render();
    }).catch(function (e) { A.toast(e.message); });
  }

  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-tg-cheer]');
    if (c) { var bg = c.closest('.sheet-bg'); if (bg) bg.remove(); cheerSheet(c.getAttribute('data-tg-cheer')); return; }
    var m = e.target.closest('[data-tg-menu]');
    if (m) { friendMenu(m.getAttribute('data-tg-menu')); return; }
    var t = e.target.closest('[data-tg]'); if (!t) return;
    var k = t.getAttribute('data-tg');
    if (k === 'join') join();
    else if (k === 'money') {
      T.shareMoney = !T.shareMoney; save();
      t.classList.toggle('on', T.shareMoney); t.setAttribute('aria-checked', T.shareMoney);
      pushSnapshot();
    }
    else if (k === 'share') shareCode();
    else if (k === 'copy') A.copy(T.code);
    else if (k === 'add') addFriend();
    else if (k === 'sos') sendSos();
    else if (k === 'refresh') refresh().then(redrawLists);
    else if (k === 'rename') {
      var n = ($('#tg-name') || {}).value || '';
      api('PUT', '/api/me', { name: n }).then(function (r) { T.name = r.name; save(); A.toast('نام ذخیره شد'); A.render(); }).catch(function (er) { A.toast(er.message); });
    }
    else if (k === 'newcode') {
      api('POST', '/api/me/code').then(function (r) { T.code = r.code; save(); A.toast('کد تازه ساخته شد'); A.render(); }).catch(function (er) { A.toast(er.message); });
    }
    else if (k === 'leave') {
      A.sheet('<div class="h2">خروج از «با هم»؟</div><div class="muted" style="line-height:2">نام، پیشرفت، دوستی‌ها و پیام‌هایتان از سرور پاک می‌شود و دوستانتان دیگر شما را نمی‌بینند. بقیه‌ی اطلاعات روی گوشی می‌ماند.</div>' +
        '<button class="primary" id="tg-leave-go" style="background:#9B2C2C">بله، خارج شو</button><button class="ghost" data-close>انصراف</button>', function (bg) {
        bg.querySelector('#tg-leave-go').onclick = function () {
          api('DELETE', '/api/me').then(function () { forget(); bg.remove(); A.toast('اطلاعات شما از سرور پاک شد'); A.render(); })
            .catch(function (er) { A.toast(er.message); });
        };
      });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target) return;
    if (e.target.id === 'tg-code') addFriend();
    if (e.target.id === 'tg-join-name') join();
  });

  // ---------- شروع ----------
  fetch('config.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (cfg) {
    var override = null;
    try { override = localStorage.getItem('raha-friends-server'); } catch (e) {}
    server = String(override || (cfg && cfg.friendsServer) || '').replace(/\/+$/, '');
    if (!server) return;
    if (/^(home|together)$/.test(A.route())) A.render();
    if (!joined()) return;
    configureNative(); startPolling();
    syncNativeCursor().then(function () { poll(true); pushSnapshot(); loadFriends().then(function () { if (A.route() === 'home') A.render(); }); });
  });
};
