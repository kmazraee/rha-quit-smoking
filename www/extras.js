/* رها — ابزارهای تکمیلی (برگرفته از بهترین اپ‌های ترک سیگار و ترک عادت):
 * برنامه‌ی ۳۰ روزه، دفترچه، کارت انگیزشی، برنامه‌ی اگر-آنگاه، بازی آرام‌کننده،
 * بررسی فکرهای فریبنده، تاریخچه‌ی هوس‌ها، ثبت جایگزین نیکوتین، گواهی‌نامه،
 * همه‌ی نشان‌ها، کمک تخصصی و آمادگی پیش از روز ترک.
 */
window.RAHA_EXTRAS = function (A) {
  'use strict';
  var S = A.S, esc = A.esc, num = A.num, fa = A.fa, $ = A.$, I = A.I;
  var V = A.VIEWS, AF = A.AFTER;

  ['journal', 'ifthen', 'nrt', 'myReasons'].forEach(function (k) { if (!Array.isArray(S[k])) S[k] = []; });
  ['journeyDone', 'prep', 'pledges'].forEach(function (k) { if (!S[k] || typeof S[k] !== 'object') S[k] = {}; });

  function back(to) { return '<a class="icon-btn" href="#' + to + '" aria-label="بازگشت">' + I.back + '</a>'; }
  function header(title, to) { return '<div class="title-bar">' + back(to || 'home') + '<div class="h1">' + title + '</div></div>'; }
  var faDT = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  var faD = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });

  // ======================================================================
  // ۱) برنامه‌ی ۳۰ روزه (درس کوتاه + مأموریت روزانه)
  // ======================================================================
  var JOURNEY = [
    ['امروز روز شروع است', 'هوس سیگار معمولاً چند دقیقه طول می‌کشد و بعد فروکش می‌کند. هر بار که از یک هوس عبور می‌کنید، مغزتان یاد می‌گیرد که بدون سیگار هم می‌شود.', 'همه‌ی سیگارها، فندک‌ها و زیرسیگاری‌ها را از خانه، کیف و ماشین بیرون ببرید.'],
    ['نیکوتین چطور کار می‌کند؟', 'نیکوتین چند ثانیه بعد از هر کام به مغز می‌رسد. آرامشی که سیگاری‌ها بعد از کشیدن حس می‌کنند، بیشتر برطرف شدن بی‌قراریِ نبودِ نیکوتین است، نه آرامش واقعی.', 'امروز سه بار تمرین تنفس صفحه‌ی هوس را انجام دهید، حتی اگر هوس ندارید.'],
    ['روزهای سخت اول', 'روزهای سوم تا پنجم معمولاً سخت‌ترین‌اند: بی‌قراری، زودرنجی، بی‌خوابی و تمرکز کم. این علائم موقت‌اند و یعنی بدن دارد خودش را پاک می‌کند.', 'آب زیاد بنوشید و چای و قهوه را کمی کمتر کنید؛ بعد از ترک، کافئین اثر قوی‌تری دارد.'],
    ['موقعیت‌های هوس را بشناسید', 'بیشتر هوس‌ها به یک موقعیت گره خورده‌اند: بعد از غذا، با چای، استرس، رانندگی. شناختن آن‌ها نیمی از راه است.', 'امروز هر هوسی که آمد، در صفحه‌ی هوس ثبت کنید و بگویید چه چیزی باعثش شد.'],
    ['برنامه‌ی اگر-آنگاه', 'مغز در لحظه‌ی هوس فرصت فکر کردن ندارد. اگر از قبل تصمیم گرفته باشید «اگر فلان شد، آنگاه این کار را می‌کنم»، اجرای آن خیلی آسان‌تر است.', 'دست‌کم دو برنامه‌ی اگر-آنگاه در جعبه‌ابزار بنویسید.'],
    ['به دیگران بگویید', 'وقتی اطرافیان بدانند ترک کرده‌اید، کمتر به شما سیگار تعارف می‌کنند و حمایتتان می‌کنند.', 'به دست‌کم دو نفر بگویید ترک کرده‌اید و بخواهید جلویتان سیگار نکشند.'],
    ['یک هفته!', 'بیشتر نیکوتین از بدن خارج شده است. از اینجا به بعد بیشتر با عادت‌ها روبه‌رو هستید تا با خود نیکوتین.', 'با بخشی از پول پس‌انداز این هفته، جایزه‌ی کوچکی به خودتان بدهید.'],
    ['فکرهای فریبنده', '«فقط یکی که چیزی نمی‌شود» رایج‌ترین دامِ بازگشت است. این فکرها را بشناسید تا وقتی آمدند غافلگیر نشوید.', 'بخش «فکرهای فریبنده» را در جعبه‌ابزار بخوانید.'],
    ['استرس بدون سیگار', 'سیگار استرس را حل نمی‌کرد؛ فقط چند دقیقه حواس را پرت می‌کرد. راه‌های دیگری هم همین کار را می‌کنند.', 'دفعه‌ی بعد که عصبی شدید، به‌جای هر کاری اول یک دقیقه تمرین تنفس کنید.'],
    ['خواب و انرژی', 'خواب ممکن است چند هفته به‌هم بریزد. تحرک در طول روز و کافئین کمتر در بعدازظهر کمک می‌کند.', 'امروز ۲۰ دقیقه پیاده‌روی کنید.'],
    ['غذا و اشتها', 'بعد از ترک، اشتها و طعم غذاها بیشتر می‌شود. این خبر خوبی است، فقط میان‌وعده‌ی سالم آماده داشته باشید.', 'یک میان‌وعده‌ی سالم مثل میوه یا سبزی کنار دستتان بگذارید.'],
    ['چای و قهوه', 'برای خیلی‌ها چای و سیگار یک جفت جدانشدنی‌اند. کمی تغییر در این عادت، پیوندشان را می‌شکند.', 'امروز جای همیشگی چای خوردنتان را عوض کنید.'],
    ['جمع و مهمانی', 'در جمع، تعارف سیگار پیش می‌آید. اگر جواب از قبل آماده باشد، گفتنش آسان است.', 'جمله‌ی «نه ممنون، ترک کرده‌ام» را چند بار بلند تمرین کنید.'],
    ['دو هفته!', 'گردش خون و کار ریه‌ها دارد بهتر می‌شود. شاید بالا رفتن از پله راحت‌تر شده باشد.', 'از اطلاعاتتان پشتیبان بگیرید و گواهی‌نامه‌ی پیشرفتتان را ببینید.'],
    ['قلیان هم دخانیات است', 'قلیان هم نیکوتین و دود دارد و یک وعده قلیان می‌تواند دود زیادی وارد ریه کند. ترک واقعی یعنی ترک همه‌ی دخانیات.', 'اگر قلیان یا هر دخانیات دیگری مصرف می‌کردید، آن را هم کنار بگذارید.'],
    ['هوس‌های غافلگیرکننده', 'گاهی هفته‌ها بعد، ناگهان هوس شدیدی می‌آید. طبیعی است و مثل بقیه می‌گذرد.', 'یک کارت انگیزشی که دوست دارید را پیدا کنید و به خاطر بسپارید.'],
    ['لغزش، پایان راه نیست', 'اگر یک نخ کشیدید، یعنی شکست نخورده‌اید. مهم این است که بفهمید چرا شد و همان لحظه ادامه دهید.', 'یک برنامه‌ی اگر-آنگاه برای پرخطرترین موقعیتتان بنویسید.'],
    ['پولتان کجا برود؟', 'پولی که دیگر خرج سیگار نمی‌شود، می‌تواند هدفی واقعی بسازد: سفر، کلاس، هدیه.', 'یک هدف پس‌انداز در داشبورد بگذارید.'],
    ['بدنِ تازه‌نفس', 'ریه‌ها و قلب در حال ترمیم‌اند. فعالیتی که قبلاً نفستان را می‌برید، شاید حالا آسان‌تر باشد.', 'امروز به‌جای آسانسور از پله استفاده کنید.'],
    ['هویت تازه', 'به‌جای «دارم ترک می‌کنم» بگویید «من سیگاری نیستم». این جمله ذهن را با تصمیمتان همراه می‌کند.', 'امروز دست‌کم یک بار به کسی بگویید «من سیگار نمی‌کشم».'],
    ['سه هفته', 'بسیاری از عادت‌های روزانه‌ی بدون سیگار دیگر جا افتاده‌اند. قدرشان را بدانید.', 'در دفترچه سه چیز بنویسید که بعد از ترک بهتر شده است.'],
    ['کمک گرفتن نشانه‌ی قوت است', 'مشاوره و درمان دارویی شانس موفقیت را بیشتر می‌کنند. خط مشاوره‌ی ترک دخانیات و مراکز خدمات جامع سلامت رایگان کمک می‌کنند.', 'صفحه‌ی «کمک تخصصی» را ببینید و شماره را در گوشی ذخیره کنید.'],
    ['بوها و طعم‌ها', 'حس بویایی و چشایی برگشته است. از آن لذت ببرید.', 'یک غذای خوش‌عطر بپزید یا بخرید و با دقت طعمش را حس کنید.'],
    ['تجربه‌تان را بدهید', 'گفتن تجربه به دیگران، تصمیم خودتان را هم محکم‌تر می‌کند.', 'تجربه‌تان را با کسی که می‌خواهد ترک کند در میان بگذارید.'],
    ['وقتی خسته می‌شوید', 'گاهی حس خستگی از «جنگیدن» می‌آید. این وقتِ مرور دلیل‌های شخصی است.', 'دلیل‌هایتان را بخوانید و یک دلیل تازه به آن‌ها اضافه کنید.'],
    ['پیش‌بینی موقعیت‌های پرخطر', 'سفر، عروسی، امتحان یا روزهای پرکار ممکن است وسوسه بیاورند. پیش‌بینی، آن‌ها را بی‌خطر می‌کند.', 'برای یک موقعیت پرخطرِ پیش رو برنامه‌ی اگر-آنگاه بنویسید.'],
    ['جشن کوچک', 'هر پیشرفتی ارزش جشن دارد. این کار مغز را به ادامه‌ی مسیر تشویق می‌کند.', 'با بخشی از پول پس‌انداز کار خوبی برای خودتان یا خانواده انجام دهید.'],
    ['چهار هفته', 'خطر بازگشت خیلی کمتر از روزهای اول است، ولی هنوز هوشیار باشید؛ یک نخ می‌تواند همه‌چیز را برگرداند.', 'تاریخچه‌ی هوس‌هایتان را مرور کنید و ببینید چقدر کمتر شده‌اند.'],
    ['نامه به خودِ گذشته', 'نوشتن برای خودِ یک ماه پیش، تغییری را که ساخته‌اید پررنگ می‌کند.', 'در دفترچه نامه‌ای کوتاه به خودِ یک ماه پیش بنویسید.'],
    ['یک ماه!', 'یک ماه بدون سیگار دستاورد بزرگی است. حالا ادامه‌ی مسیر آسان‌تر است.', 'گواهی‌نامه‌ی یک ماهه را بگیرید و برای ماه دوم یک هدف بگذارید.']
  ];
  function journeyDay() {
    if (Date.now() < S.quitAt) return 0;
    return Math.min(JOURNEY.length, Math.floor((Date.now() - S.quitAt) / 86400000) + 1);
  }
  A.journeyCard = function () {
    var d = journeyDay(); if (!d) return '';
    var j = JOURNEY[d - 1], done = S.journeyDone[d];
    return '<a class="card" href="#journey" style="gap:6px"><div class="row"><div class="muted small">برنامه‌ی ۳۰ روزه · روز ' + fa(d) + '</div>' +
      (done ? '<div class="small" style="color:var(--green);font-weight:700">انجام شد</div>' : '<div class="lib-tags"><span>مأموریت امروز</span></div>') + '</div>' +
      '<div class="h2">' + j[0] + '</div><div class="muted small" style="line-height:1.9">' + j[2] + '</div></a>';
  };
  V.journey = function () {
    var cur = journeyDay();
    var doneN = Object.keys(S.journeyDone).length;
    return '<div class="screen">' + header('برنامه‌ی ۳۰ روزه') +
      '<div class="card" style="gap:8px"><div class="row"><div class="h2">' + num(doneN) + ' از ' + num(JOURNEY.length) + ' مأموریت</div><div class="muted small">' + (cur ? 'امروز: روز ' + fa(cur) : 'از روز ترک شروع می‌شود') + '</div></div>' +
      '<div class="bar"><div style="width:' + (doneN / JOURNEY.length * 100) + '%"></div></div>' +
      '<div class="muted small" style="line-height:1.9">هر روز یک درس کوتاه و یک کار کوچک. روزهای آینده با گذشت زمان باز می‌شوند.</div></div>' +
      JOURNEY.map(function (j, i) {
        var d = i + 1, open = d <= cur, done = S.journeyDone[d];
        if (!open) return '<div class="jr locked"><span class="jn">' + fa(d) + '</span><div style="flex:1">' + j[0] + '</div>' + I.lock + '</div>';
        return '<details class="alt-card"' + (d === cur ? ' open' : '') + '><summary><span style="display:flex;gap:10px;align-items:center"><span class="jn' + (done ? ' on' : '') + '">' + (done ? '✓' : fa(d)) + '</span>' + j[0] + '</span>' + I.chev + '</summary>' +
          '<div style="line-height:2;font-size:14px;margin-bottom:8px">' + j[1] + '</div>' +
          '<div class="mark-quote" style="background:var(--green-tint);-webkit-line-clamp:unset">مأموریت: ' + j[2] + '</div>' +
          (done ? '<div style="color:var(--green);font-weight:700;font-size:14px;margin-top:8px">انجامش دادید</div>' : '<button class="chip on" data-jdone="' + d + '" style="margin-top:10px">انجامش دادم</button>') +
          '</details>';
      }).join('') + '</div>' + A.nav('home');
  };

  // ======================================================================
  // ۲) دفترچه‌ی روزانه
  // ======================================================================
  V.journal = function () {
    var list = S.journal.map(function (e, i) { return { e: e, i: i }; }).reverse();
    var prompts = ['امروز چه چیزی بدون سیگار بهتر بود؟', 'سخت‌ترین لحظه‌ی امروز چه بود و چطور گذشت؟', 'به خودتان در یک ماه بعد چه می‌گویید؟', 'برای چه چیزی امروز ممنونید؟'];
    var p = prompts[new Date().getDate() % prompts.length];
    return '<div class="screen">' + header('دفترچه') +
      '<div class="card"><div class="field"><label for="jr-t">' + p + '</label><textarea class="input" id="jr-t" rows="4" style="padding:10px 14px;min-height:110px;resize:vertical"></textarea></div>' +
      '<button class="primary" data-x="jr-save">ذخیره در دفترچه</button></div>' +
      (list.length ? list.map(function (x) {
        return '<div class="card" style="gap:6px"><div class="row"><div class="muted small">' + faDT.format(new Date(x.e.t)) + '</div>' +
          '<button class="icon-btn" style="width:36px;height:36px;background:transparent" data-jr-del="' + x.i + '" aria-label="حذف">' + I.trash + '</button></div>' +
          (x.e.q ? '<div class="muted small">' + esc(x.e.q) + '</div>' : '') +
          '<div style="line-height:2;white-space:pre-wrap">' + esc(x.e.text) + '</div></div>';
      }).join('') : '<div class="muted small">هنوز یادداشتی ننوشته‌اید.</div>') +
      '</div>' + A.nav('home');
  };
  AF.journal = function () {
    var q = document.querySelector('label[for="jr-t"]').textContent;
    $('#app').onclick = function (e) {
      var t = e.target.closest('[data-x="jr-save"],[data-jr-del]'); if (!t) return;
      if (t.hasAttribute('data-jr-del')) { S.journal.splice(+t.getAttribute('data-jr-del'), 1); A.save(); A.render(); return; }
      var v = $('#jr-t').value.trim(); if (!v) { A.toast('چیزی ننوشته‌اید'); return; }
      S.journal.push({ t: Date.now(), q: q, text: v.slice(0, 4000) }); A.save(); A.toast('در دفترچه ذخیره شد'); A.render();
    };
    A.onLeave(function () { $('#app').onclick = null; });
  };

  // ======================================================================
  // ۳) کارت‌های انگیزشی (با تکان دادن گوشی)
  // ======================================================================
  var CARDS = [
    'هوس مثل موج است: بالا می‌آید، به اوج می‌رسد و فرو می‌نشیند. شما فقط باید سوارش بمانید.',
    'شما سیگار را ترک نکرده‌اید؛ سیگار را از زندگی‌تان بیرون کرده‌اید.',
    'هر هوسی که از آن عبور می‌کنید، هوس بعدی را ضعیف‌تر می‌کند.',
    'یک نخ، «فقط یکی» نیست؛ اولین قدمِ برگشت است.',
    'بدن شما همین حالا در حال ترمیم است. به آن فرصت بدهید.',
    'آرامشی که دنبالش هستید، با سه نفس عمیق هم می‌آید.',
    'پولی که امروز دود نکردید، یک قدم به هدفتان نزدیک‌تر است.',
    'نفس کشیدن بدون بوی دود، بهترین هدیه‌ای است که به خودتان داده‌اید.',
    'لازم نیست برای همیشه قول بدهید؛ فقط همین امروز سیگار نکشید.',
    'شما از هوس قوی‌ترید؛ تا حالا بارها ثابتش کرده‌اید.',
    'عزیزانتان نفس راحت‌تری می‌کشند، چون شما سیگار نمی‌کشید.',
    'چند دقیقه صبر کنید. هوس هرگز تا ابد نمی‌ماند.',
    'به جای سیگار، یک لیوان آب. به جای فندک، یک قدم زدن.',
    'روزهای سخت هم تمام می‌شوند؛ ترک شما می‌ماند.',
    'به خودتان افتخار کنید؛ کاری می‌کنید که خیلی‌ها فقط آرزویش را دارند.',
    'هر روز بدون سیگار، روزی است که به عمرتان اضافه شده است.',
    'سیگار به شما چیزی نمی‌داد که بدون آن نتوانید داشته باشید.',
    'اگر لغزیدید، شکست نخورده‌اید. همین الان دوباره شروع کنید.',
    'دلیل‌هایتان را یادتان باشد؛ آن‌ها از هر هوسی مهم‌ترند.',
    'شما در حال ساختن آدمی آزادتر هستید.',
    'هوس فقط یک احساس است، نه یک دستور.',
    'ریه‌هایتان از شما ممنون‌اند.',
    'امروز فقط امروز. فردا هم فقط فردا.',
    'آزادی از سیگار یعنی دیگر لازم نیست برای یک نخ برنامه بریزید.'
  ];
  var cardIdx = Math.floor(Math.random() * CARDS.length);
  V.cards = function () {
    return '<div class="screen">' + header('کارت انگیزشی') +
      '<div class="mcard" id="mcard"><div class="mq">«</div><div id="mc-t">' + CARDS[cardIdx] + '</div></div>' +
      '<button class="primary" data-x="next-card">کارت بعدی</button>' +
      '<div class="muted small" style="text-align:center">گوشی را تکان بدهید تا کارت تازه بیاید.</div>' +
      '</div>' + A.nav('home');
  };
  AF.cards = function () {
    function next() {
      cardIdx = (cardIdx + 1 + Math.floor(Math.random() * (CARDS.length - 1))) % CARDS.length;
      var el = $('#mc-t'), c = $('#mcard'); if (!el) return;
      c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip');
      el.textContent = CARDS[cardIdx];
      if (S.set.vibrate && navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} }
    }
    $('#app').onclick = function (e) { if (e.target.closest('[data-x="next-card"]')) next(); };
    var last = 0;
    function onMotion(ev) {
      var a = ev.accelerationIncludingGravity; if (!a) return;
      var g = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0));
      if (g > 22 && Date.now() - last > 1200) { last = Date.now(); next(); }
    }
    window.addEventListener('devicemotion', onMotion);
    A.onLeave(function () { window.removeEventListener('devicemotion', onMotion); $('#app').onclick = null; });
  };
  A.randomCard = function () { return CARDS[Math.floor(Math.random() * CARDS.length)]; };

  // ======================================================================
  // ۴) برنامه‌های اگر-آنگاه
  // ======================================================================
  V.ifthen = function () {
    var T = A.TRIGGERS;
    return '<div class="screen">' + header('برنامه‌ی اگر-آنگاه') +
      '<div class="muted" style="line-height:2">از قبل تصمیم بگیرید در هر موقعیت به‌جای سیگار چه کنید. این برنامه‌ها در صفحه‌ی هوس هم نشان داده می‌شوند.</div>' +
      '<div class="card"><div class="field"><label for="it-if">اگر …</label><select class="input" id="it-if">' +
      T.map(function (t, i) { return '<option value="' + i + '">' + t[0] + '</option>'; }).join('') + '<option value="-1">موقعیت دیگر (بنویسید)</option></select></div>' +
      '<div class="field" id="it-custom-w" style="display:none"><label for="it-custom">موقعیت</label><input class="input" id="it-custom" maxlength="60"></div>' +
      '<div class="field"><label for="it-then">آنگاه …</label><input class="input" id="it-then" maxlength="120" placeholder="مثلاً: بلافاصله مسواک می‌زنم"></div>' +
      '<button class="primary" data-x="it-add">افزودن</button></div>' +
      (S.ifthen.length ? '<div class="card" style="padding:4px 16px;gap:0">' + S.ifthen.map(function (p, i) {
        return '<div class="mark-row"><div class="col" style="flex:1"><div style="font-size:14px"><b>اگر</b> ' + esc(p.if) + '</div><div style="font-size:14px;color:var(--green-dark)"><b>آنگاه</b> ' + esc(p.then) + '</div></div>' +
          '<button class="icon-btn" style="width:40px;height:40px;background:transparent" data-it-del="' + i + '" aria-label="حذف">' + I.trash + '</button></div>';
      }).join('') + '</div>' : '<div class="muted small">هنوز برنامه‌ای ننوشته‌اید.</div>') +
      '</div>' + A.nav('home');
  };
  AF.ifthen = function () {
    var sel = $('#it-if');
    sel.onchange = function () { $('#it-custom-w').style.display = sel.value === '-1' ? '' : 'none'; };
    $('#app').onclick = function (e) {
      var t = e.target.closest('[data-x="it-add"],[data-it-del]'); if (!t) return;
      if (t.hasAttribute('data-it-del')) { S.ifthen.splice(+t.getAttribute('data-it-del'), 1); A.save(); A.render(); return; }
      var cond = sel.value === '-1' ? $('#it-custom').value.trim() : A.TRIGGERS[+sel.value][0];
      var then = $('#it-then').value.trim();
      if (!cond || !then) { A.toast('هر دو بخش را پر کنید'); return; }
      S.ifthen.push({ if: cond, then: then }); A.save(); A.toast('برنامه اضافه شد'); A.render();
    };
    A.onLeave(function () { $('#app').onclick = null; });
  };
  A.ifthenHtml = function () {
    if (!S.ifthen.length) return '';
    return '<div class="col" style="gap:8px"><div class="muted">برنامه‌های اگر-آنگاه شما</div>' + S.ifthen.slice(0, 4).map(function (p) {
      return '<div class="alt" style="flex-direction:column;align-items:flex-start;gap:2px;padding:10px 14px"><span style="opacity:.75;font-size:12px">اگر ' + esc(p.if) + '</span><b>' + esc(p.then) + '</b></div>';
    }).join('') + '</div>';
  };

  // ======================================================================
  // ۵) بازی آرام‌کننده: حباب‌ها را بترکانید (۶۰ ثانیه)
  // ======================================================================
  V.game = function () {
    return '<div class="screen no-nav" style="gap:12px">' + header('حباب‌ها را بترکانید', 'sos') +
      '<div class="row"><div class="muted">امتیاز: <b id="g-score">۰</b></div><div class="muted">زمان: <b id="g-time">۶۰</b></div></div>' +
      '<div class="game" id="game"><button class="primary" id="g-start" style="position:absolute;inset:auto 20px 45% 20px">شروع</button></div>' +
      '<div class="muted small" style="text-align:center;line-height:1.9">یک دقیقه فقط روی حباب‌ها تمرکز کنید؛ هوس در این مدت آرام می‌شود.</div></div>';
  };
  AF.game = function () {
    var box = $('#game'), score = 0, left = 60, iv = null, spawn = null;
    var colors = ['#5FC996', '#1C7A52', '#E8B04B', '#1F5F8B', '#9B6BD6'];
    function pop(b) {
      if (b.classList.contains('popped')) return;
      b.classList.add('popped'); score++; $('#g-score').textContent = fa(score);
      if (S.set.vibrate && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
      setTimeout(function () { b.remove(); }, 250);
    }
    function add() {
      var b = document.createElement('button');
      var size = 44 + Math.floor(Math.random() * 30);
      b.className = 'bubble'; b.setAttribute('aria-label', 'حباب');
      b.style.width = b.style.height = size + 'px';
      b.style.left = Math.floor(Math.random() * Math.max(10, box.clientWidth - size)) + 'px';
      b.style.top = Math.floor(Math.random() * Math.max(10, box.clientHeight - size)) + 'px';
      b.style.background = colors[Math.floor(Math.random() * colors.length)];
      b.onpointerdown = function () { pop(b); };
      box.appendChild(b);
      setTimeout(function () { if (b.isConnected && !b.classList.contains('popped')) b.remove(); }, 2600);
    }
    function stop() { clearInterval(iv); clearInterval(spawn); iv = spawn = null; }
    $('#g-start').onclick = function () {
      this.remove(); score = 0; left = 60;
      spawn = setInterval(add, 520);
      iv = setInterval(function () {
        left--; var te = $('#g-time'); if (!te) { stop(); return; }
        te.textContent = fa(left);
        if (left <= 0) {
          stop(); box.innerHTML = '';
          A.sheet('<div class="h2">آفرین!</div><div class="muted" style="line-height:2">' + fa(score) + ' حباب ترکاندید. هوستان الان چطور است؟</div>' +
            '<a class="primary" href="#sos" style="display:flex;align-items:center;justify-content:center">برگشت به صفحه‌ی هوس</a><button class="ghost" data-close>یک دور دیگر</button>', function (bg) {
            bg.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) A.render(); });
          });
        }
      }, 1000);
    };
    A.onLeave(stop);
  };

  // ======================================================================
  // ۶) فکرهای فریبنده و پاسخشان
  // ======================================================================
  var THOUGHTS = [
    ['«فقط یکی که چیزی نمی‌شود»', 'برای مغزی که به نیکوتین عادت کرده، «یکی» وجود ندارد. یک نخ دوباره مسیر هوس را روشن می‌کند و معمولاً راه را برای بعدی باز می‌کند.'],
    ['«سیگار آرامم می‌کند»', 'آن آرامش در واقع برطرف شدن بی‌قراریِ نبود نیکوتین است. غیرسیگاری‌ها این بی‌قراری را اصلاً ندارند. چند هفته بعد از ترک، آرامش پایه‌تان بیشتر می‌شود.'],
    ['«امروز خیلی سخت بود؛ حقم است»', 'حق شما زندگی سالم و آزاد است. یک جایزه‌ی دیگر انتخاب کنید: یک خوراکی خوب، یک فیلم، یک دوش گرم.'],
    ['«دیگر دیر شده، فایده ندارد»', 'بدن از همان ۲۰ دقیقه‌ی اول ترمیم را شروع می‌کند و در هر سنی ترک کردن سود دارد. هیچ‌وقت دیر نیست.'],
    ['«بدون سیگار تمرکز ندارم»', 'کم شدن تمرکز در هفته‌های اول موقت است و با گذشت زمان برمی‌گردد. پیاده‌روی کوتاه و آب کافی کمک می‌کند.'],
    ['«همه دور و برم می‌کشند»', 'شما می‌توانید اولین نفری باشید که آزاد شده. از قبل جوابتان را آماده کنید و در جمع کنار غیرسیگاری‌ها بنشینید.'],
    ['«چاق می‌شوم»', 'افزایش اشتها با میان‌وعده‌ی سالم و تحرک قابل کنترل است. سود ترک سیگار برای سلامتی بسیار بیشتر از چند کیلو وزن است.'],
    ['«یک بار لغزیدم، پس شکست خوردم»', 'لغزش برای خیلی‌ها بخشی از مسیر است، نه پایانش. بفهمید چرا شد، یک برنامه‌ی اگر-آنگاه بنویسید و همین الان ادامه دهید.']
  ];
  V.thoughts = function () {
    return '<div class="screen">' + header('فکرهای فریبنده', 'sos') +
      '<div class="muted" style="line-height:2">وقتی هوس می‌آید، ذهن بهانه می‌سازد. این بهانه‌ها را بشناسید و جوابشان را از قبل بدانید.</div>' +
      THOUGHTS.map(function (t, i) {
        return '<details class="alt-card"' + (i === 0 ? ' open' : '') + '><summary><span>' + t[0] + '</span>' + I.chev + '</summary><div style="line-height:2;font-size:14px">' + t[1] + '</div></details>';
      }).join('') + '</div>' + A.nav('home');
  };

  // ======================================================================
  // ۷) تاریخچه‌ی هوس‌ها
  // ======================================================================
  var HELPS = ['تمرین تنفس', 'آب', 'قدم زدن', 'صبر کردن', 'بازی', 'کارت انگیزشی', 'حرف زدن با کسی', 'خوردن چیزی', 'دلیل‌هایم'];
  A.HELPS = HELPS;
  V.cravings = function () {
    var T = A.TRIGGERS, list = S.cravings.map(function (c, i) { return { c: c, i: i }; }).reverse();
    var INT = ['', 'کم', 'متوسط', 'شدید'];
    return '<div class="screen">' + header('تاریخچه‌ی هوس‌ها', 'progress') +
      '<div class="muted">' + num(S.cravings.length) + ' هوس را پشت سر گذاشته‌اید.</div>' +
      (list.length ? '<div class="card" style="padding:4px 16px;gap:0">' + list.map(function (x) {
        var c = typeof x.c === 'number' ? { t: x.c } : x.c;
        var tags = [];
        if (typeof c.g === 'number' && c.g >= 0 && T[c.g]) tags.push(T[c.g][0]);
        if (c.i) tags.push('شدت ' + INT[c.i]);
        return '<div class="mark-row"><div class="col" style="flex:1;gap:4px"><div class="muted small">' + faDT.format(new Date(c.t)) + '</div>' +
          (tags.length ? '<div class="lib-tags">' + tags.map(function (s) { return '<span>' + s + '</span>'; }).join('') + '</div>' : '') +
          (c.h && c.h.length ? '<div class="small">کمک کرد: ' + c.h.map(function (h) { return HELPS[h] || ''; }).join('، ') + '</div>' : '') +
          (c.n ? '<div class="small muted" style="line-height:1.8">' + esc(c.n) + '</div>' : '') + '</div>' +
          '<button class="icon-btn" style="width:40px;height:40px;background:transparent" data-cr-del="' + x.i + '" aria-label="حذف">' + I.trash + '</button></div>';
      }).join('') + '</div>' : '<div class="muted small">هنوز هوسی ثبت نشده است.</div>') +
      '</div>' + A.nav('progress');
  };
  AF.cravings = function () {
    $('#app').onclick = function (e) {
      var t = e.target.closest('[data-cr-del]'); if (!t) return;
      S.cravings.splice(+t.getAttribute('data-cr-del'), 1); A.save(); A.render();
    };
    A.onLeave(function () { $('#app').onclick = null; });
  };

  // ======================================================================
  // ۸) ثبت جایگزین نیکوتین (چسب، آدامس، قرص مکیدنی …)
  // ======================================================================
  var NRT = ['چسب نیکوتین', 'آدامس نیکوتین', 'قرص مکیدنی نیکوتین', 'اسپری یا استنشاقی', 'داروی تجویزی'];
  V.nrt = function () {
    var today = A.dayKey(Date.now());
    var todayList = S.nrt.filter(function (x) { return A.dayKey(x.t) === today; });
    var counts = NRT.map(function (n, i) { return todayList.filter(function (x) { return x.k === i; }).reduce(function (a, x) { return a + (x.n || 1); }, 0); });
    var days = [];
    for (var d = 6; d >= 0; d--) {
      var k = A.dayKey(Date.now() - d * 86400000);
      days.push(S.nrt.filter(function (x) { return A.dayKey(x.t) === k; }).reduce(function (a, x) { return a + (x.n || 1); }, 0));
    }
    var mx = Math.max.apply(null, days.concat([1]));
    var cost = S.nrt.reduce(function (a, x) { return a + (x.c || 0); }, 0);
    return '<div class="screen">' + header('جایگزین نیکوتین') +
      '<div class="card" style="background:var(--amber-tint);color:var(--amber-ink)"><div class="small" style="line-height:1.9">مصرف چسب، آدامس، قرص یا داروهای ترک باید با نظر پزشک یا داروساز باشد. این بخش فقط برای ثبت مصرف و دیدن روند کاهش آن است.</div></div>' +
      '<div class="h2">امروز</div><div class="grid2">' + NRT.map(function (n, i) {
        return '<button class="nrt-btn" data-nrt="' + i + '"><span>' + n + '</span><b>' + num(counts[i]) + '</b><span class="small" style="opacity:.7">+ ثبت</span></button>';
      }).join('') + '</div>' +
      '<div class="card"><div class="h2">۷ روز اخیر</div><div class="chart">' + days.map(function (c, j) { return '<div class="c">' + num(c) + '<div class="b' + (j === 6 ? ' today' : '') + '" style="height:' + Math.round(c / mx * 86) + 'px"></div></div>'; }).join('') + '</div>' +
      (cost ? '<div class="muted small">هزینه‌ی ثبت‌شده تا امروز: ' + num(cost) + ' تومان</div>' : '') + '</div>' +
      (S.nrt.length ? '<button class="ghost" data-x="nrt-undo" style="color:var(--muted)">حذف آخرین ثبت</button>' : '') +
      '</div>' + A.nav('home');
  };
  AF.nrt = function () {
    $('#app').onclick = function (e) {
      var u = e.target.closest('[data-x="nrt-undo"]');
      if (u) { S.nrt.pop(); A.save(); A.render(); return; }
      var t = e.target.closest('[data-nrt]'); if (!t) return;
      var k = +t.getAttribute('data-nrt');
      A.sheet('<div class="h2">ثبت ' + NRT[k] + '</div>' +
        '<div class="field"><label for="nr-n">تعداد</label><input class="input" id="nr-n" inputmode="numeric" value="۱"></div>' +
        '<div class="field"><label for="nr-c">هزینه (تومان، اختیاری)</label><input class="input" id="nr-c" inputmode="numeric" data-money></div>' +
        '<button class="primary" id="nr-ok">ثبت</button><button class="ghost" data-close>انصراف</button>', function (bg) {
        bg.querySelector('#nr-ok').onclick = function () {
          var n = parseInt(A.toEn(bg.querySelector('#nr-n').value) || '1', 10) || 1;
          var c = parseInt(A.toEn(bg.querySelector('#nr-c').value) || '0', 10) || 0;
          S.nrt.push({ t: Date.now(), k: k, n: n, c: c }); A.save(); bg.remove(); A.toast('ثبت شد'); A.render();
        };
      });
    };
    A.onLeave(function () { $('#app').onclick = null; });
  };

  // ======================================================================
  // ۹) همه‌ی نشان‌ها
  // ======================================================================
  function pledgeStreak() {
    var n = 0, d = 0;
    if (!S.pledges[A.dayKey(Date.now())]) d = 1; // اگر امروز هنوز تعهد نداده، از دیروز بشمار
    for (; d < 4000; d++) { if (S.pledges[A.dayKey(Date.now() - d * 86400000)]) n++; else break; }
    return n;
  }
  A.pledgeStreak = pledgeStreak;
  function allBadges() {
    var st = A.stats(), d = st.days, cig = st.notSmoked, money = st.money, beaten = S.cravings.length, ps = pledgeStreak();
    var B = [];
    [[1, '۱ روز'], [3, '۳ روز'], [7, '۱ هفته'], [14, '۲ هفته'], [30, '۱ ماه'], [60, '۲ ماه'], [90, '۳ ماه'], [180, '۶ ماه'], [365, '۱ سال'], [730, '۲ سال']].forEach(function (x) { B.push(['زمان', x[1], d >= x[0], Math.min(1, d / x[0])]); });
    [[100, '۱۰۰ نخ'], [500, '۵۰۰ نخ'], [1000, '۱۰۰۰ نخ'], [5000, '۵۰۰۰ نخ'], [10000, '۱۰٬۰۰۰ نخ']].forEach(function (x) { B.push(['نخ نکشیده', x[1], cig >= x[0], Math.min(1, cig / x[0])]); });
    [[1e6, '۱ میلیون'], [5e6, '۵ میلیون'], [1e7, '۱۰ میلیون'], [5e7, '۵۰ میلیون'], [1e8, '۱۰۰ میلیون']].forEach(function (x) { B.push(['پس‌انداز (تومان)', x[1], money >= x[0], Math.min(1, money / x[0])]); });
    [[10, '۱۰ هوس'], [50, '۵۰ هوس'], [100, '۱۰۰ هوس']].forEach(function (x) { B.push(['هوس شکست‌خورده', x[1], beaten >= x[0], Math.min(1, beaten / x[0])]); });
    [[7, '۷ روز پیاپی'], [30, '۳۰ روز پیاپی']].forEach(function (x) { B.push(['تعهد روزانه', x[1], ps >= x[0], Math.min(1, ps / x[0])]); });
    var jd = Object.keys(S.journeyDone).length;
    B.push(['برنامه‌ی ۳۰ روزه', 'همه‌ی مأموریت‌ها', jd >= 30, jd / 30]);
    return B;
  }
  A.badgeCount = function () { var b = allBadges(); return [b.filter(function (x) { return x[2]; }).length, b.length]; };
  V.badges = function () {
    var B = allBadges(), cats = [];
    B.forEach(function (b) { if (cats.indexOf(b[0]) < 0) cats.push(b[0]); });
    var got = B.filter(function (b) { return b[2]; }).length;
    return '<div class="screen">' + header('نشان‌ها', 'progress') +
      '<div class="card" style="gap:8px"><div class="h2">' + num(got) + ' از ' + num(B.length) + ' نشان</div><div class="bar"><div style="width:' + (got / B.length * 100) + '%"></div></div></div>' +
      cats.map(function (c) {
        return '<div class="h2">' + c + '</div><div class="grid4">' + B.filter(function (b) { return b[0] === c; }).map(function (b) {
          return '<div class="badge"><div class="m' + (b[2] ? ' on' : '') + '">' + b[1] + '</div>' + (b[2] ? 'گرفتید' : num(Math.floor(b[3] * 100)) + '٪') + '</div>';
        }).join('') + '</div>';
      }).join('') +
      '<button class="primary" data-x="share-prog">اشتراک‌گذاری پیشرفتم</button>' +
      '</div>' + A.nav('progress');
  };
  AF.badges = function () {
    $('#app').onclick = function (e) { if (e.target.closest('[data-x="share-prog"]')) shareProgress(); };
    A.onLeave(function () { $('#app').onclick = null; });
  };
  function progressText() {
    var st = A.stats();
    return 'من ' + num(Math.floor(st.days)) + ' روز است که سیگار نمی‌کشم! ' + num(st.notSmoked) + ' نخ نکشیده‌ام و ' + num(Math.round(st.money)) + ' تومان پس‌انداز کرده‌ام. — اپ رها';
  }
  function shareProgress() {
    var SH = A.plugin('Share'), text = progressText();
    if (A.IS_NATIVE && SH) { SH.share({ title: 'پیشرفت من', text: text, dialogTitle: 'اشتراک‌گذاری' }).catch(function () {}); return; }
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    A.copy(text);
  }
  A.shareProgress = shareProgress;

  // ======================================================================
  // ۱۰) گواهی‌نامه (تصویر قابل اشتراک)
  // ======================================================================
  V.certificate = function () {
    return '<div class="screen">' + header('گواهی‌نامه') +
      '<canvas id="cert" width="1080" height="1350" style="width:100%;height:auto;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,.15)"></canvas>' +
      '<button class="primary" data-x="cert-share">ذخیره یا اشتراک‌گذاری</button>' +
      '</div>' + A.nav('home');
  };
  AF.certificate = function () {
    var cv = $('#cert'), ctx = cv.getContext('2d');
    function draw() {
      var st = A.stats(), W = 1080, H = 1350;
      ctx.fillStyle = '#F3F5F1'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1C7A52'; roundRect(60, 60, W - 120, H - 120, 48); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; roundRect(90, 90, W - 180, H - 180, 36); ctx.stroke();
      ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.font = '700 44px Vazirmatn'; ctx.fillText('گواهی‌نامه‌ی زندگی بدون سیگار', W / 2, 230);
      ctx.font = '400 34px Vazirmatn'; ctx.globalAlpha = .9;
      ctx.fillText(S.name ? 'تقدیم به ' + S.name : 'تقدیم به شما', W / 2, 310); ctx.globalAlpha = 1;
      ctx.font = '800 260px Vazirmatn'; ctx.fillText(fa(Math.floor(st.days)), W / 2, 620);
      ctx.font = '700 56px Vazirmatn'; ctx.fillText('روز بدون سیگار', W / 2, 710);
      ctx.font = '400 38px Vazirmatn';
      ctx.fillText(num(st.notSmoked) + ' نخ نکشیده', W / 2, 850);
      ctx.fillText(A.shortMoney(st.money) + ' ' + A.cur() + ' پس‌انداز', W / 2, 915);
      ctx.fillText('از ' + faD.format(new Date(S.quitAt)), W / 2, 980);
      ctx.font = '700 40px Vazirmatn'; ctx.fillText('رها', W / 2, 1180);
      ctx.font = '400 26px Vazirmatn'; ctx.globalAlpha = .8; ctx.fillText(faD.format(new Date()), W / 2, 1225); ctx.globalAlpha = 1;
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    var fonts = document.fonts ? Promise.all(['400 34px Vazirmatn', '700 44px Vazirmatn', '800 260px Vazirmatn'].map(function (f) { return document.fonts.load(f); })) : Promise.resolve();
    fonts.then(draw, draw);
    $('#app').onclick = function (e) {
      if (!e.target.closest('[data-x="cert-share"]')) return;
      var data = cv.toDataURL('image/png'), name = 'raha-certificate.png';
      var FS = A.plugin('Filesystem'), SH = A.plugin('Share');
      if (A.IS_NATIVE && FS && SH) {
        FS.writeFile({ path: name, data: data.split(',')[1], directory: 'CACHE' })
          .then(function (r) { return SH.share({ title: 'گواهی‌نامه‌ی رها', files: [r.uri], dialogTitle: 'ذخیره یا اشتراک‌گذاری' }); })
          .catch(function () {});
        return;
      }
      var a = document.createElement('a'); a.href = data; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    };
    A.onLeave(function () { $('#app').onclick = null; });
  };

  // ======================================================================
  // ۱۱) کمک تخصصی
  // ======================================================================
  V.help = function () {
    return '<div class="screen">' + header('کمک تخصصی') +
      '<div class="muted" style="line-height:2">ترکیب مشاوره و درمان دارویی، شانس موفقیت ترک را بیشتر از هرکدام به‌تنهایی می‌کند.</div>' +
      '<a class="card" href="tel:4030" style="gap:6px"><div class="row"><div class="h2">خط مشاوره‌ی ترک دخانیات</div><div style="font-size:22px;font-weight:800;color:var(--green)">۴۰۳۰</div></div>' +
      '<div class="muted small" style="line-height:1.9">سامانه‌ی وزارت بهداشت. بعد از تماس، طبق اعلام وزارت بهداشت گزینه‌ی ۵ را برای مشاوره‌ی ترک دخانیات انتخاب کنید. ساعت پاسخگویی ممکن است محدود به ساعات اداری باشد.</div></a>' +
      '<div class="card" style="gap:6px"><div class="h2">مراکز خدمات جامع سلامت</div><div class="muted small" style="line-height:1.9">در مراکز بهداشت محله، مشاوره‌ی ترک دخانیات رایگان است. پزشک می‌تواند درباره‌ی جایگزین‌های نیکوتین (چسب، آدامس، قرص مکیدنی) یا داروهای ترک راهنمایی کند. داروها فقط با تجویز پزشک مصرف شوند.</div></div>' +
      '<div class="card" style="gap:6px;background:#FBE9E7"><div class="h2" style="color:#8A2C1C">فوریت</div><div class="small" style="line-height:1.9;color:#5A2418">اگر درد قفسه‌ی سینه، تنگی نفس شدید یا علائم نگران‌کننده‌ی دیگری دارید، فوراً با اورژانس ۱۱۵ تماس بگیرید.</div>' +
      '<a class="chip on" href="tel:115" style="align-self:flex-start;display:flex;align-items:center;background:#9B2C2C;border-color:#9B2C2C">تماس با ۱۱۵</a></div>' +
      '</div>' + A.nav('home');
  };

  // ======================================================================
  // ۱۲) آمادگی پیش از روز ترک
  // ======================================================================
  var PREP = [
    'روز ترک را در تقویم علامت زدم',
    'به خانواده و دوستان گفتم که ترک می‌کنم',
    'موقعیت‌هایی که بیشتر هوس می‌کنم را شناختم',
    'دست‌کم دو برنامه‌ی اگر-آنگاه نوشتم',
    'آب، آدامس بدون قند یا میوه آماده کردم',
    'سیگار، فندک و زیرسیگاری را از خانه و ماشین بیرون می‌برم',
    'درباره‌ی جایگزین نیکوتین یا دارو با پزشک مشورت کردم (اختیاری)',
    'دلیل‌های شخصی‌ام را نوشتم'
  ];
  V.prep = function () {
    var doneN = PREP.filter(function (p, i) { return S.prep[i]; }).length;
    return '<div class="screen">' + header('آماده‌شدن برای روز ترک') +
      '<div class="card" style="gap:8px"><div class="h2">' + num(doneN) + ' از ' + num(PREP.length) + ' آماده است</div><div class="bar"><div style="width:' + (doneN / PREP.length * 100) + '%"></div></div></div>' +
      '<div class="card" style="padding:4px 16px;gap:0">' + PREP.map(function (p, i) {
        return '<button class="prep-row' + (S.prep[i] ? ' on' : '') + '" data-prep="' + i + '"><span class="pc">' + (S.prep[i] ? '✓' : '') + '</span><span style="flex:1;text-align:right">' + p + '</span></button>';
      }).join('') + '</div>' +
      '<div class="grid2"><a class="chip" href="#ifthen" style="display:flex;align-items:center;justify-content:center">برنامه‌ی اگر-آنگاه</a><a class="chip" href="#plan" style="display:flex;align-items:center;justify-content:center">دلیل‌های من</a></div>' +
      '</div>' + A.nav('home');
  };
  AF.prep = function () {
    $('#app').onclick = function (e) {
      var t = e.target.closest('[data-prep]'); if (!t) return;
      var i = +t.getAttribute('data-prep'); S.prep[i] = !S.prep[i]; A.save(); A.render();
    };
    A.onLeave(function () { $('#app').onclick = null; });
  };

  // ======================================================================
  // ۱۳) حریم خصوصی
  // ======================================================================
  V.privacy = function () {
    return '<div class="screen">' + header('حریم خصوصی', 'settings') +
      '<div class="card" style="gap:10px;line-height:2.1;font-size:14px">' +
      '<p style="margin:0"><b>رها هیچ اطلاعات شخصی‌ای از شما جمع نمی‌کند و به هیچ سروری نمی‌فرستد.</b></p>' +
      '<p style="margin:0">همه‌ی اطلاعاتی که وارد می‌کنید (برنامه‌ی ترک، حال روزانه، هوس‌ها، دفترچه، نشانه‌های کتاب‌ها و تنظیمات) فقط روی همین گوشی ذخیره می‌شود.</p>' +
      '<p style="margin:0">فایل پشتیبان فقط وقتی ساخته می‌شود که خودتان بخواهید و فقط به جایی می‌رود که خودتان انتخاب کنید.</p>' +
      '<p style="margin:0">اپ برای نمایش اعلان‌های مراحل سلامتی و یادآورها از اجازه‌ی «اعلان» استفاده می‌کند. اینترنت فقط برای باز کردن ویدیوها، پادکست‌ها و مقاله‌هایی لازم است که خودتان انتخاب می‌کنید؛ آن محتواها در سایت سازندگانشان باز می‌شوند.</p>' +
      '<p style="margin:0">با پاک کردن اپ یا زدن «پاک کردن همه‌ی اطلاعات» در تنظیمات، همه‌ی اطلاعات از گوشی حذف می‌شود.</p>' +
      '<p style="margin:0">رها جایگزین مشاوره‌ی پزشکی نیست. برای درمان دارویی یا جایگزین نیکوتین با پزشک مشورت کنید.</p>' +
      '</div></div>' + A.nav('settings');
  };

  // ======================================================================
  // جعبه‌ابزار صفحه‌ی خانه
  // ======================================================================
  A.toolbox = function () {
    var T = [
      ['journey', 'برنامه‌ی ۳۰ روزه', I.list], ['journal', 'دفترچه', I.bookOpen], ['cards', 'کارت انگیزشی', I.spark],
      ['ifthen', 'اگر-آنگاه', I.type], ['game', 'بازی آرام‌کننده', I.breath], ['thoughts', 'فکرهای فریبنده', I.heart],
      ['nrt', 'جایگزین نیکوتین', I.drop], ['certificate', 'گواهی‌نامه', I.bookmark], ['help', 'کمک تخصصی', I.headphones]
    ];
    return '<div class="h2" style="margin-top:4px">جعبه‌ابزار</div><div class="tools">' + T.map(function (t) {
      return '<a class="tool" href="#' + t[0] + '">' + t[2] + '<span>' + t[1] + '</span></a>';
    }).join('') + '</div>';
  };

  // رویدادهای مشترک این بخش
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-jdone]');
    if (j) { S.journeyDone[+j.getAttribute('data-jdone')] = Date.now(); A.save(); A.toast('آفرین! مأموریت امروز انجام شد'); A.render(); }
  });
};
