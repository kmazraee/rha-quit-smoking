/* رها — زبان اپ (فارسی یا انگلیسی)
 * متن‌های اپ فارسی نوشته شده‌اند. در حالت انگلیسی، هر متنی که روی صفحه نمایش داده می‌شود
 * با فرهنگ‌نامه‌ی i18n-en.js ترجمه می‌شود؛ عددها جدا می‌شوند تا یک ترجمه برای همه‌ی عددها کار کند.
 * زبان در localStorage با کلید raha-lang نگه داشته می‌شود.
 */
(function () {
  'use strict';
  var lang = 'fa';
  try { lang = localStorage.getItem('raha-lang') === 'en' ? 'en' : 'fa'; } catch (e) {}
  var I = window.RAHA_I18N = {
    lang: lang,
    set: function (l) { try { localStorage.setItem('raha-lang', l === 'en' ? 'en' : 'fa'); } catch (e) {} location.reload(); },
    tr: function (s) { return s; }
  };
  if (lang !== 'en') return;

  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  document.documentElement.classList.add('lang-en');
  // فرهنگ‌نامه پیش از بقیه‌ی اسکریپت‌ها بار می‌شود
  document.write('<script src="i18n-en.js"><\/script>');

  var FAD = '۰۱۲۳۴۵۶۷۸۹', ARD = '٠١٢٣٤٥٦٧٨٩';
  function latin(s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return FAD.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return ARD.indexOf(d); })
      .replace(/٬/g, ',').replace(/٫/g, '.').replace(/٪/g, '%').replace(/،/g, ',').replace(/؛/g, ';').replace(/؟/g, '?').replace(/«/g, '“').replace(/»/g, '”');
  }
  var NUM = /[۰-۹0-9]+(?:[٬٫,.][۰-۹0-9]+)*/g;
  var MONTHS = { 'فروردین': 'Farvardin', 'اردیبهشت': 'Ordibehesht', 'خرداد': 'Khordad', 'تیر': 'Tir', 'مرداد': 'Mordad', 'شهریور': 'Shahrivar', 'مهر': 'Mehr', 'آبان': 'Aban', 'آذر': 'Azar', 'دی': 'Dey', 'بهمن': 'Bahman', 'اسفند': 'Esfand' };
  var DAYS = { 'یکشنبه': 'Sunday', 'دوشنبه': 'Monday', 'سه‌شنبه': 'Tuesday', 'چهارشنبه': 'Wednesday', 'پنجشنبه': 'Thursday', 'پنج‌شنبه': 'Thursday', 'جمعه': 'Friday', 'شنبه': 'Saturday' };
  var DATE_RE = new RegExp('(' + Object.keys(DAYS).join('|') + ')?\\s*[۰-۹0-9]{1,2}\\s+(' + Object.keys(MONTHS).join('|') + ')(\\s+[۰-۹0-9]{4})?(\\s+ساعت\\s+[۰-۹0-9:]+)?', 'g');
  function dates(s) {
    return s.replace(DATE_RE, function (m, d, mo, y, h) {
      var day = (/[۰-۹0-9]{1,2}/.exec(m.replace(d || '', '')) || [''])[0];
      return (d ? DAYS[d] + ' ' : '') + latin(day) + ' ' + MONTHS[mo] + (y ? ' ' + latin(y.trim()) : '') + (h ? ' at ' + latin(h.replace('ساعت', '').trim()) : '');
    });
  }
  var cache = {};
  function lookup(core) {
    var D = window.RAHA_EN || {};
    var nums = [], key = core.replace(NUM, function (m) { nums.push(m); return '{n}'; });
    var v = D[key];
    if (v === undefined) return null;
    var i = 0;
    return v.replace(/\{n\}/g, function () { return latin(nums[i++] || ''); });
  }
  function tr(text) {
    if (!text || !/[؀-ۿ]/.test(text)) return text;
    if (cache.hasOwnProperty(text)) return cache[text];
    var lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], core = text.trim().replace(/\s+/g, ' ');
    var out = lookup(core);
    if (out === null) out = partial(core);
    out = lead + out + trail;
    cache[text] = out;
    return out;
  }
  // ترجمه‌ی بخشی: جداکننده‌ها، یا پیشوند/پسوندی که در فرهنگ‌نامه هست و بقیه‌اش نام است
  function partial(core) {
    var seps = [' · ', ' — ', ' | '];
    for (var s = 0; s < seps.length; s++) {
      if (core.indexOf(seps[s]) > 0) return core.split(seps[s]).map(function (p) { return tr(p); }).join(seps[s]);
    }
    var m = /^سلام[،,]\s*(.+)$/.exec(core); if (m) return 'Hello, ' + m[1];
    var w = core.split(' ');
    if (w.length > 1 && w.length < 16) {
      for (var i = 1; i < w.length && i <= 3; i++) {
        var suf = lookup(w.slice(i).join(' ')); if (suf !== null) return latin(w.slice(0, i).join(' ')) + ' ' + suf;
        var pre = lookup(w.slice(0, w.length - i).join(' ')); if (pre !== null) return pre + ' ' + latin(w.slice(w.length - i).join(' '));
      }
    }
    return latin(dates(core));
  }
  I.tr = tr;

  var SKIP = '.textLayer,#rd-body,.letter-text,.bub,.jr-text,[data-notr],script,style,textarea';
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  function textNode(n) {
    var p = n.parentElement; if (!p || p.closest(SKIP)) return;
    var v = n.nodeValue, t = tr(v);
    if (t !== v) n.nodeValue = t;
  }
  function attrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a && /[؀-ۿ]/.test(a)) el.setAttribute(ATTRS[i], tr(a));
    }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && /[؀-ۿ]/.test(el.value)) el.value = tr(el.value);
  }
  function walk(root) {
    if (root.nodeType === 3) { textNode(root); return; }
    if (root.nodeType !== 1 || (root.closest && root.closest(SKIP))) return;
    attrs(root);
    root.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(attrs);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(textNode);
  }
  function start() {
    walk(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === 'characterData') textNode(m.target);
        else if (m.type === 'attributes') attrs(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.title = 'Raha — Quit smoking';
  }
  document.addEventListener('DOMContentLoaded', start);
})();
