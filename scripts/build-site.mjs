// ساخت سایت معرفی (پوشه‌ی site): کپی فونت، آیکن و تصاویر فروشگاه، و ساخت صفحه‌ی حریم خصوصی
// از روی همان متنی که در store/bazaar-listing.md است (تا همیشه یکی باشند).
// استفاده: node scripts/build-site.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const site = path.join(root, 'site');
const assets = path.join(site, 'assets');
fs.rmSync(assets, { recursive: true, force: true });
fs.mkdirSync(path.join(assets, 'fonts'), { recursive: true });
for (const f of ['Vazirmatn-Regular.woff2', 'Vazirmatn-Bold.woff2', 'Vazirmatn-ExtraBold.woff2']) {
  fs.copyFileSync(path.join(root, 'www', 'fonts', f), path.join(assets, 'fonts', f));
}
fs.copyFileSync(path.join(root, 'resources', 'icon', 'icon-512.png'), path.join(assets, 'icon-512.png'));
for (const f of fs.readdirSync(path.join(root, 'store', 'screenshots'))) {
  if (/\.png$/i.test(f)) fs.copyFileSync(path.join(root, 'store', 'screenshots', f), path.join(assets, f));
}

const md = fs.readFileSync(path.join(root, 'store', 'bazaar-listing.md'), 'utf8');
const m = /## سیاست حفظ حریم خصوصی\s*\n([\s\S]*?)(\n## |$)/.exec(md);
if (!m) { console.error('بخش حریم خصوصی در bazaar-listing.md پیدا نشد'); process.exit(1); }
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// هر جمله‌ی متن یک پاراگراف کوتاه می‌شود تا خواندنش ساده‌تر باشد
const paras = m[1].trim().split(/\n\s*\n/).flatMap((p) => p.split(/(?<=\.)\s+/)).filter(Boolean).map((p) => `<p>${esc(p.trim())}</p>`).join('\n');
const html = `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>حریم خصوصی — رها</title><link rel="icon" href="assets/icon-512.png">
<style>
@font-face{font-family:"Vazirmatn";src:url("assets/fonts/Vazirmatn-Regular.woff2") format("woff2");font-weight:400}
@font-face{font-family:"Vazirmatn";src:url("assets/fonts/Vazirmatn-ExtraBold.woff2") format("woff2");font-weight:800}
:root{--ground:#F3F5F1;--card:#FFFFFF;--ink:#14211B;--muted:#5A6660;--line:#E2E7E3;--green:#1C7A52}
@media (prefers-color-scheme:dark){:root{--ground:#0F1713;--card:#17221C;--ink:#E8EFEA;--muted:#97A59D;--line:#24332B}}
body{margin:0;font-family:Vazirmatn,Tahoma,sans-serif;background:var(--ground);color:var(--ink);line-height:2.1}
main{max-width:760px;margin:0 auto;padding:32px 16px 60px}
h1{font-weight:800;margin:0 0 18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:8px 22px}
a{color:var(--green);font-weight:700}
</style></head><body><main>
<p><a href="index.html">← رها</a></p>
<h1>سیاست حفظ حریم خصوصی رها</h1>
<div class="card">
${paras}
</div>
</main></body></html>
`;
fs.writeFileSync(path.join(site, 'privacy.html'), html);
console.log('سایت آماده شد: site/');
