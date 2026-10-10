// بررسی ترجمه‌ی انگلیسی: متن‌های فارسی داخل کد را پیدا می‌کند و آن‌هایی را که در www/i18n-en.js نیستند فهرست می‌کند.
// استفاده: node scripts/i18n-check.mjs
// نکته: بعضی از موارد فهرست‌شده تکه‌هایی از یک جمله‌ی بلندترند که در اپ با عدد یا نام ترکیب می‌شوند و نیازی به ترجمه‌ی جدا ندارند.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const www = path.join(root, 'www');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(www, 'i18n-en.js'), 'utf8'), ctx);
const D = ctx.window.RAHA_EN;
const norm = (t) => t.replace(/\s+/g, ' ').trim().replace(/[۰-۹0-9]+(?:[٬٫,.][۰-۹0-9]+)*/g, '{n}');
const missing = new Set();
for (const f of fs.readdirSync(www).filter((x) => x.endsWith('.js') && !x.startsWith('i18n'))) {
  const src = fs.readFileSync(path.join(www, f), 'utf8');
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    for (const seg of m[1].split(/<[^>]*>|\\n/)) {
      if (!/[؀-ۿ]/.test(seg) || /[="<>]/.test(seg)) continue;
      const k = norm(seg);
      if (k.length > 2 && !(k in D)) missing.add(`${f}: ${k}`);
    }
  }
}
console.log([...missing].sort().join('\n'));
console.log(`\n${missing.size} متن بدون ترجمه (یا تکه‌ی جمله)`);
