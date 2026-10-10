/* رها — «انگیزه‌های من»: پیام صوتی عزیزان، عکس انگیزشی، نامه به خود آینده، جشن و کارت اشتراک */
window.RAHA_HEART = function (A) {
  'use strict';
  var S = A.S, V = A.VIEWS, AF = A.AFTER, I = A.I, $ = A.$, num = A.num, fa = A.fa, esc = A.esc;
  var faD = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });

  // ======================================================================
  // ذخیره‌ی فایل‌های صوتی در IndexedDB (روی خود گوشی)
  // ======================================================================
  var dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('no idb')); return; }
      var r = indexedDB.open('raha-media', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('voices', { keyPath: 'id', autoIncrement: true }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbP;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('voices', mode), st = t.objectStore('voices'), out = fn(st);
        t.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  function listVoices() { return tx('readonly', function (st) { return st.getAll(); }).then(function (l) { return l || []; }); }
  function addVoice(v) { return tx('readwrite', function (st) { return st.add(v); }); }
  function delVoice(id) { return tx('readwrite', function (st) { return st.delete(id); }); }
  function syncVoiceCount() { return listVoices().then(function (l) { S.voiceCount = l.length; A.save(); return l; }).catch(function () { return []; }); }

  // ======================================================================
  // جشن: کاغذرنگی (confetti)
  // ======================================================================
  function confetti() {
    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    var cv = document.createElement('canvas'); cv.className = 'confetti';
    var W = cv.width = window.innerWidth, H = cv.height = window.innerHeight, ctx = cv.getContext('2d');
    document.body.appendChild(cv);
    var C = ['#1C7A52', '#5FC996', '#E8B04B', '#C0533A', '#4A90C2', '#FFFFFF'], P = [];
    for (var i = 0; i < 140; i++) P.push({ x: W / 2 + (Math.random() - .5) * 80, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: C[i % C.length] });
    var start = performance.now();
    (function frame(now) {
      var t = now - start; ctx.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - t / 2600);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (t < 2600) requestAnimationFrame(frame); else cv.remove();
    })(start);
  }
  A.confetti = confetti;

  // ======================================================================
  // کارت اشتراک‌گذاری (تصویر)
  // ======================================================================
  function shareCard(title) {
    var st = A.stats(), Wd = 1080, Hd = 1350;
    var cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hd;
    var ctx = cv.getContext('2d');
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function draw() {
      var g = ctx.createLinearGradient(0, 0, Wd, Hd); g.addColorStop(0, '#1C7A52'); g.addColorStop(1, '#0F4F35');
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
      // دایره‌های تزئینی
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(900, 180, 260, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(120, 1200, 220, 0, 7); ctx.fill();
      ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.font = '700 46px Vazirmatn'; ctx.fillText('رها', Wd / 2, 150);
      ctx.font = '800 280px Vazirmatn'; ctx.fillText(fa(Math.floor(st.days)), Wd / 2, 520);
      ctx.font = '700 60px Vazirmatn'; ctx.fillText('روز بدون ' + (A.useCig() ? 'سیگار' : 'قلیان'), Wd / 2, 620);
      if (title) { ctx.font = '400 38px Vazirmatn'; ctx.globalAlpha = .92; wrap(title, Wd / 2, 715, 860, 56); ctx.globalAlpha = 1; }
      var hv = A.heroVals(st);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(110, 860, 400, 200, 36); ctx.fill(); rr(570, 860, 400, 200, 36); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 64px Vazirmatn';
      ctx.fillText(hv[0], 770, 955); ctx.fillText(A.shortMoney(st.money), 310, 955);
      ctx.font = '400 32px Vazirmatn'; ctx.globalAlpha = .85;
      ctx.fillText(hv[1], 770, 1015); ctx.fillText(A.cur() + ' پس‌انداز', 310, 1015); ctx.globalAlpha = 1;
      ctx.font = '400 30px Vazirmatn'; ctx.globalAlpha = .75; ctx.fillText('شروع: ' + faD.format(new Date(S.quitAt)), Wd / 2, 1200); ctx.globalAlpha = 1;
    }
    function wrap(text, x, y, maxW, lh) {
      var words = String(text).split(' '), line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = words[i]; y += lh; } else line = test;
      }
      if (line) ctx.fillText(line, x, y);
    }
    var fonts = document.fonts ? Promise.all(['400 30px Vazirmatn', '700 46px Vazirmatn', '800 280px Vazirmatn'].map(function (f) { return document.fonts.load(f); })) : Promise.resolve();
    fonts.then(draw, draw).then(function () {
      var data = cv.toDataURL('image/png'), name = 'raha-' + Math.floor(st.days) + '-days.png';
      var FS = A.plugin('Filesystem'), SH = A.plugin('Share');
      if (A.IS_NATIVE && FS && SH) {
        FS.writeFile({ path: name, data: data.split(',')[1], directory: 'CACHE' })
          .then(function (r) { return SH.share({ title: 'پیشرفت من در رها', files: [r.uri], dialogTitle: 'اشتراک‌گذاری' }); })
          .catch(function () {});
        return;
      }
      A.sheet('<div class="h2">کارت شما</div><img src="' + data + '" alt="کارت پیشرفت" style="width:100%;border-radius:18px">' +
        '<a class="primary" href="' + data + '" download="' + name + '" style="display:flex;align-items:center;justify-content:center;text-decoration:none">ذخیره‌ی تصویر</a><button class="ghost" data-close>بستن</button>');
    });
  }
  A.shareCard = shareCard;

  // جشن روزهای مهم (۱، ۳، ۷، ۱۴، ۳۰، … روز)
  var DAYS = [1, 3, 7, 14, 21, 30, 45, 60, 90, 100, 120, 180, 270, 365, 500, 730, 1000, 1095, 1825, 3650];
  function dayMark(d) { var m = 0; DAYS.forEach(function (x) { if (d >= x) m = x; }); return m; }
  function maybeCelebrateDay() {
    if (!S.ready || S.quitAt > Date.now()) return;
    var st = A.stats(), mark = dayMark(Math.floor(st.days));
    if (typeof S.dayCel !== 'number') { S.dayCel = mark; A.save(); return; } // کاربر قدیمی: جشن‌های گذشته تکرار نمی‌شوند
    if (mark <= S.dayCel) return;
    if (document.querySelector('.sheet-bg')) return;
    S.dayCel = mark; A.save();
    confetti();
    var hv = A.heroVals(st);
    A.sheet('<div class="cel-num">' + fa(mark) + '</div><div class="h2" style="text-align:center">' + num(mark) + ' روز بدون ' + (A.useCig() ? 'سیگار' : 'قلیان') + '!</div>' +
      '<div class="muted" style="text-align:center;line-height:2">' + hv[0] + ' ' + hv[1] + ' و ' + A.shortMoney(st.money) + ' ' + A.cur() + ' پس‌انداز. به خودتان افتخار کنید.</div>' +
      '<button class="primary" data-hx="share-card" data-title="">ساختن کارت و اشتراک‌گذاری</button><button class="ghost" data-close>ادامه</button>');
  }

  // ======================================================================
  // عکس انگیزشی
  // ======================================================================
  function pickImage(cb) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () { cb(img); URL.revokeObjectURL(url); };
      img.onerror = function () { A.toast('این تصویر باز نشد'); URL.revokeObjectURL(url); };
      img.src = url;
    };
    inp.click();
  }
  function resize(img, max, q) {
    var r = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * r), h = Math.round(img.height * r);
    var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', q);
  }
  // برای ویجت یک نسخه‌ی کوچک مربعی
  function squareThumb(img, size) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
    c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, size, size);
    return c.toDataURL('image/jpeg', .8);
  }
  function widgetPlugin() { try { return window.Capacitor && (window.Capacitor.Plugins.RahaWidget || (window.Capacitor.registerPlugin && window.Capacitor.registerPlugin('RahaWidget'))); } catch (e) { return null; } }
  function syncWidgetPhoto() {
    var W = widgetPlugin(); if (!W || !A.IS_NATIVE || !W.setPhoto) return;
    try { W.setPhoto({ data: S.photo && S.photoWidget !== false ? (S.photoThumb || '') : '' }).catch(function () {}); } catch (e) {}
  }
  A.sosPhoto = function () {
    if (!S.photo) return '';
    return '<div class="sos-photo"><img src="' + S.photo + '" alt="عکس انگیزشی"><div>' + esc(S.photoCap || 'به‌خاطر این‌ها ادامه می‌دهم') + '</div></div>';
  };

  // ======================================================================
  // دکمه‌های صفحه‌ی هوس
  // ======================================================================
  A.heartSosButtons = function () {
    var h = '';
    if (S.voiceCount) h += '<button class="alt" data-hx="sos-voice">' + I.headphones + 'صدای عزیزانم</button>';
    if (S.letter && S.letter.sealed && S.letter.slip !== false && !S.letter.opened) h += '<button class="alt" data-hx="letter-read">' + I.bookOpen + 'نامه به خودم</button>';
    return h;
  };
  A.letterAfterSlip = function () {
    if (!S.letter || !S.letter.sealed || S.letter.opened || S.letter.slip === false) return '';
    return '<button class="chip" data-hx="letter-read" style="min-height:48px">نامه‌ای که برای چنین روزی نوشتید را بخوانید</button>';
  };

  // ======================================================================
  // صفحه‌ی «انگیزه‌های من»
  // ======================================================================
  function header(t) { return '<div class="title-bar"><a class="icon-btn" href="#home" aria-label="بازگشت">' + I.back + '</a><div class="h1">' + t + '</div></div>'; }
  var LETTER_DAYS = [7, 30, 90, 365];
  function letterDaysLeft() { var L = S.letter; return Math.max(0, Math.ceil(L.day - (Date.now() - S.quitAt) / 86400000)); }
  function letterCard() {
    var L = S.letter;
    if (!L || !L.sealed) {
      var day = (L && L.day) || 30;
      return '<div class="card"><div class="h2">نامه به خودِ آینده</div>' +
        '<div class="muted small" style="line-height:1.9">برای خودتان بنویسید: چرا ترک کردید، الان چه حسی دارید، و اگر روزی لغزیدید دوست دارید چه چیزی را یادتان بیاید. نامه مهر و موم می‌شود و در روز مشخص (یا بعد از لغزش) باز می‌شود.</div>' +
        '<textarea class="input" id="lt-text" rows="6" maxlength="4000" style="padding:12px 14px;min-height:150px;resize:vertical;line-height:2" placeholder="سلام به خودِ آینده‌ام…">' + esc((L && L.text) || '') + '</textarea>' +
        '<div class="st">کِی باز شود؟</div><div class="chips">' + LETTER_DAYS.map(function (d) { return '<button class="chip' + (d === day ? ' on' : '') + '" data-lday="' + d + '">روز ' + fa(d) + '</button>'; }).join('') + '</div>' +
        '<label class="srow" style="padding:0;gap:10px"><input type="checkbox" id="lt-slip" ' + (!L || L.slip !== false ? 'checked' : '') + ' style="width:22px;height:22px"><span class="small" style="flex:1;line-height:1.8">اگر لغزش داشتم، زودتر بتوانم بخوانمش</span></label>' +
        '<button class="primary" data-hx="letter-seal">مهر و موم کن</button></div>';
    }
    if (!L.opened) {
      var left = letterDaysLeft();
      return '<div class="card letter-sealed"><div class="env">✉️</div><div class="h2">نامه‌ی شما مهر و موم شده</div>' +
        '<div class="muted small" style="line-height:1.9">' + (left > 0 ? 'روز ' + fa(L.day) + ' ترک باز می‌شود؛ ' + num(left) + ' روز دیگر.' : 'وقتش رسیده! از صفحه‌ی خانه باز می‌شود.') + (L.slip !== false ? ' اگر لغزش داشتید، از صفحه‌ی هوس هم می‌توانید بخوانیدش.' : '') + '</div>' +
        '<div class="grid2">' + (left <= 0 ? '<button class="chip on" data-hx="letter-read">باز کردن نامه</button>' : '') + '<button class="chip" data-hx="letter-unseal">نوشتن دوباره</button></div></div>';
    }
    return '<div class="card"><div class="row"><div class="h2">نامه‌ی شما</div><div class="muted small">' + faD.format(new Date(L.at)) + '</div></div>' +
      '<div class="letter-text">' + esc(L.text) + '</div>' +
      '<button class="chip" data-hx="letter-new" style="min-height:46px">نوشتن نامه‌ی تازه</button></div>';
  }
  V.heart = function () {
    return '<div class="screen">' + header('انگیزه‌های من') +
      '<div class="muted" style="line-height:2">در لحظه‌ی هوس، یادآوری آدم‌ها و چیزهایی که برایشان ترک کرده‌اید بیشترین کمک را می‌کند. هرچه اینجا بگذارید در صفحه‌ی هوس نمایش داده می‌شود.</div>' +
      // عکس
      '<div class="card"><div class="h2">عکس انگیزشی</div>' +
      (S.photo
        ? '<img src="' + S.photo + '" alt="عکس انگیزشی" style="width:100%;border-radius:16px;max-height:340px;object-fit:cover">' +
          '<div class="field"><label for="ph-cap">جمله‌ی زیر عکس</label><input class="input" id="ph-cap" maxlength="80" value="' + esc(S.photoCap || '') + '" placeholder="به‌خاطر این‌ها ادامه می‌دهم"></div>' +
          A.setRow('نمایش در ویجت', 'عکس کنار اعداد ویجت صفحه‌ی اصلی گوشی', A.sw2('photo-widget', S.photoWidget !== false)) +
          '<div class="grid2"><button class="chip" data-hx="photo-pick">عوض کردن عکس</button><button class="chip" data-hx="photo-del" style="color:#9B2C2C">حذف عکس</button></div>'
        : '<div class="muted small" style="line-height:1.9">عکس خانواده، فرزند، همسر، یا جایی که با پول پس‌انداز می‌خواهید بروید.</div><button class="primary" data-hx="photo-pick">انتخاب عکس</button>') +
      '</div>' +
      // پیام‌های صوتی
      '<div class="card"><div class="row"><div class="h2">صدای عزیزانم</div><div class="muted small" id="vc-n"></div></div>' +
      '<div class="muted small" style="line-height:1.9">از عزیزانتان بخواهید یک پیام صوتی کوتاه بفرستند، مثلاً «به‌خاطر ما ادامه بده». فایلی که در پیام‌رسان فرستادند را اینجا اضافه کنید، یا همین‌جا صدایشان را ضبط کنید.</div>' +
      '<div id="vc-list" class="col" style="gap:8px"></div>' +
      '<div class="grid2"><button class="chip on" data-hx="voice-rec">ضبط پیام</button><button class="chip" data-hx="voice-file">انتخاب فایل صوتی</button></div>' +
      '<button class="ghost" data-hx="voice-ask" style="font-size:14px">فرستادن درخواست پیام برای عزیزانم</button>' +
      '<div class="muted small" style="line-height:1.8">پیام‌های صوتی فقط روی همین گوشی می‌مانند و در فایل پشتیبان نیستند.</div></div>' +
      letterCard() +
      '</div>' + A.nav('home');
  };
  AF.heart = function () {
    renderVoices();
    var cap = $('#ph-cap');
    if (cap) cap.addEventListener('change', function () { S.photoCap = cap.value.trim().slice(0, 80); A.save(); A.toast('ذخیره شد'); });
    var lt = $('#lt-text');
    if (lt) lt.addEventListener('input', function () { S.letter = S.letter || { day: 30 }; S.letter.text = lt.value; A.save(); });
  };
  var playing = null;
  function stopPlay() { if (playing) { try { playing.a.pause(); } catch (e) {} if (playing.url) URL.revokeObjectURL(playing.url); playing = null; } }
  function durText(s) { s = Math.round(s || 0); return fa(Math.floor(s / 60)) + ':' + A.pad(s % 60); }
  function renderVoices() {
    var box = $('#vc-list'); if (!box) return;
    syncVoiceCount().then(function (l) {
      var n = $('#vc-n'); if (n) n.textContent = l.length ? num(l.length) + ' پیام' : '';
      box.innerHTML = l.length ? l.map(function (v) {
        return '<div class="voice-row"><button class="vplay" data-hx="voice-play" data-id="' + v.id + '" aria-label="پخش">' + I.play + '</button>' +
          '<div class="col" style="flex:1"><b>' + esc(v.name || 'پیام صوتی') + '</b><span class="muted small">' + (v.dur ? durText(v.dur) + ' · ' : '') + faD.format(new Date(v.at)) + '</span></div>' +
          '<button class="icon-btn" data-hx="voice-del" data-id="' + v.id + '" aria-label="حذف">' + I.trash + '</button></div>';
      }).join('') : '<div class="muted small" style="text-align:center;padding:6px">هنوز پیامی اضافه نشده</div>';
    });
  }
  function playVoice(id, btn) {
    stopPlay();
    return listVoices().then(function (l) {
      var v = id === 'random' ? l[Math.floor(Math.random() * l.length)] : l.filter(function (x) { return x.id === id; })[0];
      if (!v) return null;
      var url = URL.createObjectURL(v.blob), a = new Audio(url);
      playing = { a: a, url: url, id: v.id };
      a.onended = function () { if (btn) btn.innerHTML = I.play; var s = $('#sv-state'); if (s) s.textContent = 'تمام شد'; stopPlay(); };
      a.play().catch(function () { A.toast('پخش این فایل ممکن نشد'); });
      if (btn) btn.innerHTML = I.pause;
      return v;
    });
  }
  function nameSheet(blob, dur) {
    A.sheet('<div class="h2">این پیام از طرف کیست؟</div><input class="input" id="vn" maxlength="40" placeholder="مثلاً مامان، سارا، پسرم">' +
      '<button class="primary" id="vn-ok">ذخیره</button><button class="ghost" data-close>انصراف</button>', function (bg) {
      setTimeout(function () { var i = bg.querySelector('#vn'); if (i) i.focus(); }, 100);
      bg.querySelector('#vn-ok').onclick = function () {
        var name = bg.querySelector('#vn').value.trim().slice(0, 40) || 'پیام صوتی';
        addVoice({ name: name, blob: blob, type: blob.type, dur: dur || 0, at: Date.now() }).then(function () { bg.remove(); A.toast('پیام ذخیره شد'); renderVoices(); })
          .catch(function () { A.toast('ذخیره ممکن نشد؛ شاید حافظه‌ی گوشی پر است'); });
      };
    });
  }
  function pickAudio() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*,.ogg,.opus,.m4a,.mp3,.aac,.wav,.amr';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      if (f.size > 15 * 1024 * 1024) { A.toast('فایل بزرگ‌تر از ۱۵ مگابایت است'); return; }
      if ((S.voiceCount || 0) >= 30) { A.toast('حداکثر ۳۰ پیام'); return; }
      var url = URL.createObjectURL(f), a = new Audio();
      a.preload = 'metadata';
      var done = function (d) { URL.revokeObjectURL(url); nameSheet(f, isFinite(d) ? d : 0); };
      a.onloadedmetadata = function () { done(a.duration); };
      a.onerror = function () { done(0); };
      a.src = url;
    };
    inp.click();
  }
  function recordVoice() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { A.toast('ضبط صدا روی این گوشی پشتیبانی نمی‌شود؛ فایل صوتی را انتخاب کنید'); return; }
    if ((S.voiceCount || 0) >= 30) { A.toast('حداکثر ۳۰ پیام'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var chunks = [], rec = new MediaRecorder(stream), t0 = Date.now(), iv = null, cancelled = false;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); }); clearInterval(iv);
        if (cancelled || !chunks.length) return;
        nameSheet(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), (Date.now() - t0) / 1000);
      };
      var bg = A.sheet('<div class="h2" style="text-align:center">در حال ضبط…</div><div class="rec-dot"></div><div class="cel-num" id="rc-t" style="font-size:42px">۰:۰۰</div>' +
        '<div class="muted small" style="text-align:center">حداکثر ۲ دقیقه</div><button class="primary" id="rc-stop">پایان ضبط</button><button class="ghost" id="rc-cancel">انصراف</button>', function (b) {
        b.querySelector('#rc-stop').onclick = function () { b.remove(); if (rec.state !== 'inactive') rec.stop(); };
        b.querySelector('#rc-cancel').onclick = function () { cancelled = true; b.remove(); if (rec.state !== 'inactive') rec.stop(); };
      });
      bg.addEventListener('click', function (e) { if (e.target === bg) { cancelled = true; if (rec.state !== 'inactive') rec.stop(); } });
      iv = setInterval(function () {
        var s = (Date.now() - t0) / 1000, el = bg.querySelector('#rc-t'); if (el) el.textContent = durText(s);
        if (s >= 120) { bg.remove(); if (rec.state !== 'inactive') rec.stop(); }
      }, 250);
      rec.start();
    }).catch(function () { A.toast('اجازه‌ی میکروفون داده نشد'); });
  }
  function askVoices() {
    var text = 'سلام 🌱 من دارم سیگار را ترک می‌کنم. یک پیام صوتی کوتاه برایم بفرست که هر وقت هوس سیگار کردم گوشش کنم. مثلاً بگو چرا دوست داری ادامه بدهم. ممنونم 💚';
    var SH = A.plugin('Share');
    if (A.IS_NATIVE && SH) { SH.share({ title: 'درخواست پیام صوتی', text: text, dialogTitle: 'فرستادن برای…' }).catch(function () {}); return; }
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    A.copy(text);
  }
  function sosVoice() {
    A.sheet('<div class="h2" style="text-align:center">صدای عزیزانتان</div><div class="cel-num" style="font-size:52px">🎧</div><div class="muted" id="sv-name" style="text-align:center;font-weight:700"></div><div class="muted small" id="sv-state" style="text-align:center">در حال پخش…</div>' +
      '<button class="primary" id="sv-next">یک پیام دیگر</button><button class="ghost" data-close>بستن</button>', function (bg) {
      function next() { playVoice('random').then(function (v) { var n = bg.querySelector('#sv-name'); if (n && v) n.textContent = 'از طرف ' + (v.name || 'عزیزتان'); var s = bg.querySelector('#sv-state'); if (s) s.textContent = 'در حال پخش…'; }); }
      bg.querySelector('#sv-next').onclick = next;
      bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('[data-close]')) stopPlay(); });
      next();
    });
  }

  // ======================================================================
  // نامه
  // ======================================================================
  function readLetter() {
    var L = S.letter; if (!L || !L.text) return;
    var first = !L.opened;
    L.opened = true; L.openedAt = Date.now(); A.save();
    if (first) confetti();
    A.sheet('<div class="h2">نامه‌ای از خودِ گذشته‌تان</div><div class="muted small">نوشته‌شده در ' + faD.format(new Date(L.at)) + '</div>' +
      '<div class="letter-text">' + esc(L.text) + '</div><button class="primary" data-close>ممنونم</button>');
  }
  function maybeOpenLetter() {
    var L = S.letter;
    if (!S.ready || !L || !L.sealed || L.opened || document.querySelector('.sheet-bg')) return;
    if ((Date.now() - S.quitAt) / 86400000 < L.day) return;
    A.sheet('<div class="cel-num" style="font-size:60px">✉️</div><div class="h2" style="text-align:center">نامه‌ای از خودِ گذشته‌تان رسید</div>' +
      '<div class="muted" style="text-align:center;line-height:2">' + num(L.day) + ' روز پیش، برای امروز نامه‌ای نوشتید.</div>' +
      '<button class="primary" data-hx="letter-read">باز کردن نامه</button><button class="ghost" data-close>بعداً</button>');
  }

  // ======================================================================
  // رویدادها
  // ======================================================================
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-hx],[data-lday]'); if (!t) return;
    if (t.hasAttribute('data-lday')) {
      S.letter = S.letter || {}; S.letter.day = +t.getAttribute('data-lday'); A.save();
      document.querySelectorAll('[data-lday]').forEach(function (x) { x.classList.toggle('on', x === t); }); return;
    }
    var k = t.getAttribute('data-hx'), bg = t.closest('.sheet-bg');
    if (k === 'share-card') { shareCard(t.getAttribute('data-title') || ''); }
    else if (k === 'photo-pick') {
      pickImage(function (img) {
        try { S.photo = resize(img, 720, .78); S.photoThumb = squareThumb(img, 256); } catch (x) { A.toast('این تصویر باز نشد'); return; }
        if (typeof S.photoWidget !== 'boolean') S.photoWidget = true;
        A.save(); syncWidgetPhoto(); A.toast('عکس ذخیره شد'); A.render();
      });
    }
    else if (k === 'photo-del') { delete S.photo; delete S.photoThumb; A.save(); syncWidgetPhoto(); A.render(); }
    else if (k === 'voice-rec') recordVoice();
    else if (k === 'voice-file') pickAudio();
    else if (k === 'voice-ask') askVoices();
    else if (k === 'voice-play') {
      var id = +t.getAttribute('data-id');
      if (playing && playing.id === id) { stopPlay(); t.innerHTML = I.play; return; }
      document.querySelectorAll('.vplay').forEach(function (b) { b.innerHTML = I.play; });
      playVoice(id, t);
    }
    else if (k === 'voice-del') {
      var vid = +t.getAttribute('data-id');
      A.sheet('<div class="h2">این پیام حذف شود؟</div><button class="primary" id="vd-ok" style="background:#9B2C2C">حذف</button><button class="ghost" data-close>انصراف</button>', function (b) {
        b.querySelector('#vd-ok').onclick = function () { stopPlay(); delVoice(vid).then(function () { b.remove(); renderVoices(); }); };
      });
    }
    else if (k === 'sos-voice') sosVoice();
    else if (k === 'letter-seal') {
      var tx2 = $('#lt-text'), text = tx2 ? tx2.value.trim() : '';
      if (text.length < 10) { A.toast('چند جمله برای خودتان بنویسید'); return; }
      var sl = $('#lt-slip');
      S.letter = { text: text.slice(0, 4000), day: (S.letter && S.letter.day) || 30, slip: sl ? sl.checked : true, sealed: true, opened: false, at: Date.now() };
      A.save(); A.toast('نامه مهر و موم شد'); A.render();
    }
    else if (k === 'letter-read') { if (bg) bg.remove(); readLetter(); }
    else if (k === 'letter-unseal') {
      A.sheet('<div class="h2">نامه را دوباره بنویسید؟</div><div class="muted" style="line-height:2">مهر نامه باز می‌شود و متن آن برای ویرایش نمایش داده می‌شود.</div><button class="primary" id="lu-ok">بله</button><button class="ghost" data-close>نه</button>', function (b) {
        b.querySelector('#lu-ok').onclick = function () { S.letter.sealed = false; A.save(); b.remove(); A.render(); };
      });
    }
    else if (k === 'letter-new') { S.letter = { day: 30, text: '' }; A.save(); A.render(); }
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sw2="photo-widget"]'); if (!t) return;
    S.photoWidget = !(S.photoWidget !== false); A.save(); syncWidgetPhoto(); A.render();
  });

  // ======================================================================
  // اتصال به بقیه‌ی اپ
  // ======================================================================
  A.extraTools = (A.extraTools || []).concat([['heart', 'انگیزه‌های من', I.heart]]);
  A.homeHooks = (A.homeHooks || []).concat([function () { setTimeout(function () { maybeOpenLetter(); maybeCelebrateDay(); }, 500); }]);
  var prevBack = A.backFor;
  A.backFor = function (r) { if (r === 'heart') return 'home'; return prevBack ? prevBack(r) : null; };
  // هنگام خروج از صفحه، پخش متوقف شود
  window.addEventListener('hashchange', stopPlay);
  syncVoiceCount();
  if (S.photo) setTimeout(syncWidgetPhoto, 1500);
};
