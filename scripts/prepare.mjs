// آماده‌سازی پیش از ساخت اپ:
// ۱) کپی کتابخانه‌های نمایش PDF و EPUB به پوشه‌ی www/lib (تا اپ بدون اینترنت کار کند)
// ۲) ساخت خودکار فهرست کتاب‌ها (www/books/books.json) از روی پوشه‌های داخل www/books
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const www = path.join(root, 'www');
const nm = path.join(root, 'node_modules');

function copy(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}

// ---------- ۱) کتابخانه‌ها ----------
const lib = path.join(www, 'lib');
fs.rmSync(lib, { recursive: true, force: true });
copy(path.join(nm, 'pdfjs-dist/legacy/build/pdf.min.mjs'), path.join(lib, 'pdfjs/pdf.min.mjs'));
copy(path.join(nm, 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'), path.join(lib, 'pdfjs/pdf.worker.min.mjs'));
for (const d of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  const s = path.join(nm, 'pdfjs-dist', d);
  if (fs.existsSync(s)) copy(s, path.join(lib, 'pdfjs', d));
}
copy(path.join(nm, 'jszip/dist/jszip.min.js'), path.join(lib, 'jszip.min.js'));
copy(path.join(nm, 'epubjs/dist/epub.min.js'), path.join(lib, 'epub.min.js'));

// ---------- ۲) فهرست کتاب‌ها ----------
const booksDir = path.join(www, 'books');
fs.mkdirSync(booksDir, { recursive: true });
const AUDIO = /\.(mp3|m4a|m4b|aac|ogg|oga|opus|wav|flac)$/i;
const IMG = /^cover\.(jpe?g|png|webp)$/i;
const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
const enDigits = (s) => s.replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => AR.indexOf(d));
const natural = (a, b) => enDigits(a).localeCompare(enDigits(b), 'fa', { numeric: true });
const cleanTitle = (f) => f.replace(/\.[^.]+$/, '').replace(/^[\s\d۰-۹٠-٩._\-–—]+/, '').replace(/[_]+/g, ' ').trim() || f.replace(/\.[^.]+$/, '');
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

const books = [];
for (const folder of fs.readdirSync(booksDir).sort(natural)) {
  const dir = path.join(booksDir, folder);
  if (!fs.statSync(dir).isDirectory()) continue;
  const files = fs.readdirSync(dir).sort(natural);
  let info = {};
  if (files.includes('info.json')) {
    try { info = JSON.parse(fs.readFileSync(path.join(dir, 'info.json'), 'utf8')); }
    catch (e) { console.warn('info.json نامعتبر در', folder); }
  }
  const pdf = files.find((f) => /\.pdf$/i.test(f));
  const epub = files.find((f) => /\.epub$/i.test(f));
  const audio = files.filter((f) => AUDIO.test(f));
  const cover = files.find((f) => IMG.test(f));
  if (!pdf && !epub && !audio.length) continue;
  books.push({
    id: folder,
    title: info.title || folder.replace(/[_]+/g, ' '),
    author: info.author || '',
    description: info.description || '',
    order: typeof info.order === 'number' ? info.order : 1000,
    cover: cover ? enc(`books/${folder}/${cover}`) : '',
    doc: epub ? { type: 'epub', file: enc(`books/${folder}/${epub}`) } : pdf ? { type: 'pdf', file: enc(`books/${folder}/${pdf}`) } : null,
    tracks: audio.map((f) => ({ title: cleanTitle(f), file: enc(`books/${folder}/${f}`) }))
  });
}
books.sort((a, b) => a.order - b.order || natural(a.title, b.title));
fs.writeFileSync(path.join(booksDir, 'books.json'), JSON.stringify(books, null, 2));
console.log(`فهرست کتاب‌ها ساخته شد: ${books.length} کتاب`);
for (const b of books) console.log(' -', b.title, b.doc ? `[${b.doc.type}]` : '', b.tracks.length ? `[${b.tracks.length} فایل صوتی]` : '');
