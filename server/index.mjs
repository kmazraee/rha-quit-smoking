// رها — سرور «با هم ترک کنیم»
//
// کار این سرور فقط رساندن اطلاعات بین دوستان است:
//   • عضویت بدون شماره تلفن یا ایمیل (فقط یک نام نمایشی)
//   • کد دوستی شش‌رقمی برای اضافه کردن یکدیگر
//   • نگه‌داشتن خلاصه‌ی پیشرفت هر نفر تا دوستانش ببینند
//   • «حالم بده، کمکم کنید» و پیام‌های دلگرمی آماده
//   • خبر دادن به دوستان در روزهای مهم (۷ روز، ۳۰ روز، …)
//   • نقش «حامی» (کسی که خودش سیگار نمی‌کشد و فقط پشتیبان است) و خبر لغزش به حامی‌ها
//   • گروه‌های ترک با کد گروه و پیام دلگرمی گروهی
//   • دستیار هوش مصنوعی فارسی (از طریق یک سرویس سازگار با OpenAI، مثل هوش مصنوعی لیارا)
//   • آماده برای اعلان فوری (پوشه) در آینده
//
// بدون هیچ کتابخانه‌ی بیرونی؛ فقط Node.js نسخه‌ی ۲۲.۱۳ یا بالاتر (پایگاه داده‌ی داخلی SQLite).
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = process.env.DB_FILE || path.join(DIR, 'data', 'raha.db');
const MAX_FRIENDS = 30;
const MAX_GROUP_MEMBERS = 50;
const MAX_GROUPS = 5;
const EVENT_TTL_DAYS = 30;

// ---------- پایگاه داده ----------
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    snapshot TEXT,
    snapshot_at INTEGER,
    last_days INTEGER NOT NULL DEFAULT -1,
    last_sos INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS friends (
    a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created INTEGER NOT NULL,
    PRIMARY KEY (a, b)
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_user TEXT,
    from_name TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_to ON events (to_user, id);
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined INTEGER NOT NULL,
    PRIMARY KEY (group_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS gm_user ON group_members (user_id);
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    contact TEXT,
    version TEXT,
    store TEXT,
    days INTEGER,
    at INTEGER NOT NULL
  );
`);

// ستون‌های تازه برای پایگاه داده‌های قدیمی
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'quitter'");
if (!userCols.includes('push_id')) db.exec('ALTER TABLE users ADD COLUMN push_id TEXT');

const q = {
  userByToken: db.prepare('SELECT * FROM users WHERE token_hash = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByCode: db.prepare('SELECT * FROM users WHERE code = ?'),
  insertUser: db.prepare('INSERT INTO users (id, token_hash, code, name, created, last_seen, role) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  setRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  setPush: db.prepare('UPDATE users SET push_id = ? WHERE id = ?'),
  supporterIds: db.prepare("SELECT f.b FROM friends f JOIN users u ON u.id = f.b WHERE f.a = ? AND u.role = 'supporter'"),
  groupByCode: db.prepare('SELECT * FROM groups WHERE code = ?'),
  groupById: db.prepare('SELECT * FROM groups WHERE id = ?'),
  insertGroup: db.prepare('INSERT INTO groups (id, code, name, owner, created) VALUES (?, ?, ?, ?, ?)'),
  setGroupOwner: db.prepare('UPDATE groups SET owner = ? WHERE id = ?'),
  deleteGroup: db.prepare('DELETE FROM groups WHERE id = ?'),
  addMember: db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, joined) VALUES (?, ?, ?)'),
  removeMember: db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?'),
  isMember: db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'),
  memberCount: db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?'),
  myGroupCount: db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id = ?'),
  myGroups: db.prepare('SELECT g.* FROM group_members m JOIN groups g ON g.id = m.group_id WHERE m.user_id = ? ORDER BY m.joined'),
  members: db.prepare(`SELECT u.id, u.name, u.role, u.snapshot, u.snapshot_at, u.last_seen, m.joined
                       FROM group_members m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? ORDER BY m.joined`),
  oldestMember: db.prepare('SELECT user_id FROM group_members WHERE group_id = ? ORDER BY joined LIMIT 1'),
  groupMateIds: db.prepare('SELECT DISTINCT m2.user_id AS b FROM group_members m1 JOIN group_members m2 ON m2.group_id = m1.group_id WHERE m1.user_id = ? AND m2.user_id != ?'),
  touch: db.prepare('UPDATE users SET last_seen = ? WHERE id = ?'),
  setName: db.prepare('UPDATE users SET name = ? WHERE id = ?'),
  setSnapshot: db.prepare('UPDATE users SET snapshot = ?, snapshot_at = ?, last_days = ? WHERE id = ?'),
  setCode: db.prepare('UPDATE users SET code = ? WHERE id = ?'),
  setSos: db.prepare('UPDATE users SET last_sos = ? WHERE id = ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  deleteEventsFrom: db.prepare('DELETE FROM events WHERE from_user = ?'),
  friendIds: db.prepare('SELECT b FROM friends WHERE a = ?'),
  friendCount: db.prepare('SELECT COUNT(*) AS n FROM friends WHERE a = ?'),
  isFriend: db.prepare('SELECT 1 FROM friends WHERE a = ? AND b = ?'),
  addFriend: db.prepare('INSERT OR IGNORE INTO friends (a, b, created) VALUES (?, ?, ?)'),
  removeFriend: db.prepare('DELETE FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)'),
  friendsOf: db.prepare(`SELECT u.id, u.name, u.role, u.snapshot, u.snapshot_at, u.last_seen, f.created
                         FROM friends f JOIN users u ON u.id = f.b WHERE f.a = ? ORDER BY f.created`),
  insertEvent: db.prepare('INSERT INTO events (to_user, from_user, from_name, type, title, body, at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  inboxSince: db.prepare('SELECT * FROM events WHERE to_user = ? AND id > ? ORDER BY id LIMIT 50'),
  inboxLatest: db.prepare('SELECT * FROM (SELECT * FROM events WHERE to_user = ? ORDER BY id DESC LIMIT 30) ORDER BY id'),
  pruneEvents: db.prepare('DELETE FROM events WHERE at < ?'),
  insertFeedback: db.prepare('INSERT INTO feedback (text, contact, version, store, days, at) VALUES (?, ?, ?, ?, ?, ?)'),
  listFeedback: db.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 200'),
};

// ---------- ابزارها ----------
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (x) => String(x).replace(/\d/g, (d) => FA[d]);
const toLatinDigits = (s) => String(s || '')
  .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
  .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function cleanName(s) {
  const n = String(s || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  return n;
}
function newCode() {
  for (let i = 0; i < 50; i++) {
    const c = String(crypto.randomInt(100000, 1000000));
    if (!q.userByCode.get(c)) return c;
  }
  throw new Error('code space exhausted');
}
// کد گروه هفت‌رقمی است تا با کد دوستی (شش‌رقمی) اشتباه نشود
function newGroupCode() {
  for (let i = 0; i < 50; i++) {
    const c = String(crypto.randomInt(1000000, 10000000));
    if (!q.groupByCode.get(c)) return c;
  }
  throw new Error('group code space exhausted');
}
const cleanRole = (r) => (r === 'supporter' ? 'supporter' : 'quitter');
const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null);
const int = (v, min, max) => { const n = num(v, min, max); return n === null ? null : Math.floor(n); };

// فقط همین فیلدها از پیشرفت هر نفر ذخیره و به دوستانش نشان داده می‌شود
function cleanSnapshot(s) {
  if (!s || typeof s !== 'object') return null;
  const now = Date.now();
  const quitAt = int(s.quitAt, 946684800000, now + 400 * 86400000); // از سال ۲۰۰۰ تا حداکثر ۴۰۰ روز بعد
  if (quitAt === null) return null;
  return {
    quitAt,
    cpd: int(s.cpd, 0, 200) ?? 0,
    notSmoked: int(s.notSmoked, 0, 10_000_000) ?? 0,
    money: s.money === null || s.money === undefined ? null : num(s.money, 0, 1e13),
    mood: s.mood === null || s.mood === undefined ? null : int(s.mood, 0, 3),
    moodAt: int(s.moodAt, 0, now + 86400000),
    streak: int(s.streak, 0, 100000) ?? 0,
    beaten: int(s.beaten, 0, 1_000_000) ?? 0,
    badges: int(s.badges, 0, 1000) ?? 0,
    method: int(s.method, 0, 1) ?? 0,
    kind: int(s.kind, 0, 2) ?? 0,          // ۰ سیگار، ۱ قلیان، ۲ هر دو
    hk: int(s.hk, 0, 1_000_000) ?? 0,      // وعده‌های قلیان نکشیده
    slips: int(s.slips, 0, 1_000_000) ?? 0, // تعداد لغزش‌ها از روز ترک
  };
}
const daysOf = (snap, now = Date.now()) => (snap && snap.quitAt <= now ? Math.floor((now - snap.quitAt) / 86400000) : -1);
const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1095, 1825];

// پیام‌های دلگرمی آماده (همین فهرست در اپ هم هست؛ ترتیب نباید عوض شود، فقط به انتها اضافه شود)
const CHEERS = [
  'آفرین! بهت افتخار می‌کنم.',
  'قوی بمون، این هوس می‌گذره.',
  'من کنارتم.',
  'یه نفس عمیق بکش، تو از پسش برمیای.',
  'الان بهت زنگ می‌زنم.',
  'ادامه بده، داری عالی پیش میری.',
];

function publicGroup(g, u) {
  const members = q.members.all(g.id).map((m) => ({ ...publicFriend(m), joined: m.joined }));
  return { id: g.id, code: g.code, name: g.name, owner: g.owner === u.id, created: g.created, members };
}

// دستورالعمل دستیار: همراه ترک، بر پایه‌ی درمان شناختی-رفتاری و مصاحبه‌ی انگیزشی
const COACH_PROMPT = `تو «همراه رها» هستی، دستیار فارسی‌زبان اپ ترک سیگار و قلیان «رها».
- کوتاه، گرم و محترمانه جواب بده (معمولاً کمتر از ۱۲۰ کلمه)، به فارسی روان و بدون اصطلاح نامفهوم.
- از روش‌های درمان شناختی-رفتاری و مصاحبه‌ی انگیزشی استفاده کن: پرسیدن، بازتاب دادن، شناختن فکرهای فریبنده («فقط یکی»)، برنامه‌ی اگر-آنگاه، تکنیک‌های کوتاه مثل تنفس، صبر ۵ دقیقه‌ای و موج‌سواری هوس.
- لغزش را شکست نبین؛ بدون سرزنش کمک کن کاربر ادامه دهد و از آن درس بگیرد.
- درباره‌ی دارو، دوز یا جایگزین نیکوتین فقط اطلاعات کلی بده و بگو با پزشک یا خط مشاوره‌ی ترک دخانیات ۴۰۳۰ مشورت کند. تشخیص پزشکی نده.
- اگر کاربر از فکر آسیب زدن به خودش یا دیگران، یا یک وضعیت اورژانسی جسمی (درد قفسه‌ی سینه، تنگی نفس شدید) گفت، اول با مهربانی بگو فوراً با اورژانس ۱۱۵، اورژانس اجتماعی ۱۲۳ یا صدای مشاور بهزیستی ۱۴۸۰ تماس بگیرد یا به نزدیک‌ترین بیمارستان برود.
- فقط درباره‌ی ترک دخانیات، هوس، استرس، خواب، وزن و حال روحیِ مربوط به ترک کمک کن؛ برای موضوع‌های دیگر مؤدبانه بگو کارت این نیست.
- نگو انسان هستی. اطلاعات شخصی (نام کامل، تلفن، آدرس) نپرس.`;

function addEvent(toId, from, type, title, body) {
  q.insertEvent.run(toId, from ? from.id : null, from ? from.name : null, type, title, body, Date.now());
  push(toId, title, body);
}
function toMany(ids, from, type, title, body) {
  const seen = new Set();
  for (const id of ids) { if (seen.has(id) || (from && id === from.id)) continue; seen.add(id); addEvent(id, from, type, title, body); }
  return seen.size;
}

// ---------- اعلان فوری (اختیاری) ----------
// اگر PUSH_PROVIDER=pushe و PUSH_API_KEY و PUSH_APP_ID تنظیم شده باشد و اپ شناسه‌ی دستگاه را فرستاده باشد،
// هر رویداد علاوه بر صندوق پیام، به‌صورت اعلان فوری هم فرستاده می‌شود. بدون این تنظیمات کاری نمی‌کند.
function push(toId, title, body) {
  const provider = process.env.PUSH_PROVIDER, key = process.env.PUSH_API_KEY, appId = process.env.PUSH_APP_ID;
  if (provider !== 'pushe' || !key || !appId) return;
  const u = q.userById.get(toId);
  if (!u || !u.push_id) return;
  fetch(process.env.PUSH_URL || 'https://api.pushe.co/v2/messaging/notifications/', {
    method: 'POST',
    headers: { Authorization: 'Token ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_ids: [appId], data: { title, content: body }, filters: { device_id: [u.push_id] } }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}
function toFriends(user, type, title, body) {
  const ids = q.friendIds.all(user.id);
  for (const r of ids) addEvent(r.b, user, type, title, body);
  return ids.length;
}

// ---------- محدودیت تعداد درخواست ----------
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) { b = { start: now, n: 0 }; buckets.set(key, b); }
  b.n++;
  return b.n > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now - b.start > 3600_000) buckets.delete(k);
  q.pruneEvents.run(now - EVENT_TTL_DAYS * 86400000);
}, 10 * 60_000).unref();

// ---------- HTTP ----------
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}
function readBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'درخواست بیش از حد بزرگ است')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'قالب درخواست نادرست است')); }
    });
    req.on('error', reject);
  });
}
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

function auth(req) {
  const h = String(req.headers.authorization || '');
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(h);
  if (!m) fail(401, 'ابتدا وارد بخش «با هم» شوید');
  const u = q.userByToken.get(sha256(m[1]));
  if (!u) fail(401, 'حساب شما پیدا نشد؛ دوباره وارد شوید');
  const now = Date.now();
  if (now - u.last_seen > 60_000) { q.touch.run(now, u.id); u.last_seen = now; }
  return u;
}
const publicFriend = (r) => ({
  id: r.id,
  name: r.name,
  role: r.role || 'quitter',
  snapshot: r.snapshot ? JSON.parse(r.snapshot) : null,
  snapshotAt: r.snapshot_at || null,
  lastSeen: r.last_seen,
});
const publicEvent = (e) => ({ id: e.id, type: e.type, from: e.from_user, fromName: e.from_name, title: e.title, body: e.body, at: e.at });

// ---------- مسیرها ----------
const routes = {
  'GET /health': () => ({ ok: true }),

  // عضویت: فقط یک نام نمایشی
  'POST /api/register': async (req) => {
    if (limited('reg:' + clientIp(req), 10, 3600_000)) fail(429, 'تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره امتحان کنید');
    const body = await readBody(req);
    const name = cleanName(body.name);
    if (!name) fail(400, 'یک نام نمایشی بنویسید');
    const role = cleanRole(body.role);
    const token = crypto.randomBytes(32).toString('base64url');
    const id = crypto.randomUUID();
    const code = newCode();
    const now = Date.now();
    q.insertUser.run(id, sha256(token), code, name, now, now, role);
    return { id, token, code, name, role };
  },

  'GET /api/me': (req) => { const u = auth(req); return { id: u.id, code: u.code, name: u.name, role: u.role }; },

  // به‌روزرسانی نام و خلاصه‌ی پیشرفت
  'PUT /api/me': async (req) => {
    const u = auth(req);
    const body = await readBody(req);
    if (body.name !== undefined) {
      const name = cleanName(body.name);
      if (!name) fail(400, 'یک نام نمایشی بنویسید');
      q.setName.run(name, u.id); u.name = name;
    }
    if (body.role !== undefined) { u.role = cleanRole(body.role); q.setRole.run(u.role, u.id); }
    if (body.push !== undefined) {
      const pid = body.push && typeof body.push.id === 'string' ? body.push.id.replace(/[^A-Za-z0-9_:.-]/g, '').slice(0, 200) : '';
      q.setPush.run(pid || null, u.id);
    }
    let milestone = null;
    if (body.snapshot !== undefined) {
      const snap = cleanSnapshot(body.snapshot);
      if (!snap) fail(400, 'اطلاعات پیشرفت نادرست است');
      const days = daysOf(snap);
      // خبر روزهای مهم به دوستان (بار اول فقط نقطه‌ی شروع ثبت می‌شود)
      if (u.last_days >= 0 && days > u.last_days) {
        const crossed = MILESTONE_DAYS.filter((m) => m > u.last_days && m <= days);
        if (crossed.length) {
          milestone = crossed[crossed.length - 1];
          toFriends(u, 'milestone', `${u.name} 🎉`, `${u.name} ${fa(milestone)} روز است که سیگار نمی‌کشد! به او تبریک بگویید.`);
        }
      }
      q.setSnapshot.run(JSON.stringify(snap), Date.now(), days, u.id);
    }
    return { ok: true, name: u.name, role: u.role, milestone };
  },

  // کد دوستی تازه (اگر کد قبلی دست آدم ناخواسته افتاده)
  'POST /api/me/code': (req) => {
    const u = auth(req);
    if (limited('code:' + u.id, 5, 3600_000)) fail(429, 'کمی بعد دوباره امتحان کنید');
    const code = newCode();
    q.setCode.run(code, u.id);
    return { code };
  },

  // حذف کامل حساب و همه‌ی اطلاعات
  'DELETE /api/me': (req) => {
    const u = auth(req);
    q.deleteEventsFrom.run(u.id);
    q.deleteUser.run(u.id);
    return { ok: true };
  },

  'GET /api/friends': (req) => {
    const u = auth(req);
    return { friends: q.friendsOf.all(u.id).map(publicFriend) };
  },

  // اضافه کردن دوست با کد شش‌رقمی (دوستی دوطرفه است)
  'POST /api/friends': async (req) => {
    const u = auth(req);
    const body = await readBody(req);
    const code = toLatinDigits(body.code).replace(/\D/g, '');
    if (code.length !== 6) fail(400, 'کد دوستی شش رقم است');
    if (code === u.code) fail(400, 'این کد خودتان است؛ کد دوستتان را وارد کنید');
    const other = q.userByCode.get(code);
    if (!other) {
      if (limited('miss:' + u.id, 15, 3600_000)) fail(429, 'تعداد تلاش‌های ناموفق زیاد شد؛ یک ساعت بعد دوباره امتحان کنید');
      fail(404, 'کسی با این کد پیدا نشد');
    }
    if (q.isFriend.get(u.id, other.id)) fail(409, `${other.name} از قبل دوست شماست`);
    if (q.friendCount.get(u.id).n >= MAX_FRIENDS || q.friendCount.get(other.id).n >= MAX_FRIENDS) fail(400, `هر نفر حداکثر ${fa(MAX_FRIENDS)} دوست می‌تواند داشته باشد`);
    const now = Date.now();
    q.addFriend.run(u.id, other.id, now);
    q.addFriend.run(other.id, u.id, now);
    addEvent(other.id, u, 'friend', 'دوست تازه', `${u.name} حالا در فهرست دوستان شماست. با هم ترک کنید!`);
    return { friend: publicFriend({ ...other, created: now }) };
  },

  'DELETE /api/friends/:id': (req, id) => {
    const u = auth(req);
    q.removeFriend.run(u.id, id, id, u.id);
    return { ok: true };
  },

  // «حالم بده، کمکم کنید» به همه‌ی دوستان
  // با { groups: true } اعضای گروه‌های او هم خبردار می‌شوند
  'POST /api/sos': async (req) => {
    const u = auth(req);
    const body = await readBody(req);
    const now = Date.now();
    if (now - u.last_sos < 3 * 60_000) fail(429, 'چند دقیقه پیش به دوستانتان خبر دادید؛ به‌زودی جواب می‌دهند');
    q.setSos.run(now, u.id);
    const ids = q.friendIds.all(u.id).map((r) => r.b);
    if (body.groups === true) for (const r of q.groupMateIds.all(u.id, u.id)) ids.push(r.b);
    const n = toMany(ids, u, 'sos', `${u.name} کمک می‌خواهد`, `${u.name} حالش خوب نیست و هوس سیگار دارد. یک پیام دلگرمی بفرستید یا به او زنگ بزنید.`);
    return { ok: true, notified: n };
  },

  // خبر لغزش فقط به دوستانی که نقش «حامی» دارند (اگر کاربر خودش بخواهد)
  'POST /api/slip': async (req) => {
    const u = auth(req);
    const body = await readBody(req);
    if (limited('slip:' + u.id, 6, 86400_000)) fail(429, 'امروز چند بار خبر داده‌اید');
    const n = int(body.n, 1, 60) ?? 1;
    const what = body.kind === 'h' ? `${fa(n)} وعده قلیان` : `${fa(n)} نخ سیگار`;
    const ids = q.supporterIds.all(u.id).map((r) => r.b);
    const sent = toMany(ids, u, 'slip', `${u.name} لغزش داشت`,
      `${u.name} امروز ${what} کشید، ولی ثبتش کرد و مسیرش را ادامه می‌دهد. بدون سرزنش، یک پیام دلگرمی بفرستید.`);
    return { ok: true, notified: sent };
  },

  // پیام دلگرمی آماده به یک دوست
  'POST /api/cheer': async (req) => {
    const u = auth(req);
    const body = await readBody(req);
    const kind = int(body.kind, 0, CHEERS.length - 1);
    if (kind === null || body.kind !== kind) fail(400, 'پیام نامعتبر است');
    const to = String(body.to || '');
    if (!q.isFriend.get(u.id, to)) fail(404, 'این نفر در فهرست دوستان شما نیست');
    if (limited('cheer:' + u.id, 40, 3600_000) || limited(`cheer:${u.id}:${to}`, 1, 20_000)) fail(429, 'کمی صبر کنید و دوباره بفرستید');
    addEvent(to, u, 'cheer', `پیام از ${u.name}`, CHEERS[kind]);
    return { ok: true };
  },

  // نظر و پیشنهاد کاربران (بدون نیاز به ورود)
  'POST /api/feedback': async (req) => {
    if (limited('fb:' + clientIp(req), 5, 3600_000)) fail(429, 'کمی بعد دوباره امتحان کنید');
    const body = await readBody(req);
    const clip = (v, n) => String(v || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, n);
    const text = clip(body.text, 2000);
    if (text.length < 3) fail(400, 'متن نظر خالی است');
    q.insertFeedback.run(text, clip(body.contact, 80) || null, clip(body.version, 20) || null, clip(body.store, 12) || null, int(body.days, 0, 100000), Date.now());
    return { ok: true };
  },

  // خواندن نظرها برای سازنده‌ی اپ (رمز در متغیر محیطی ADMIN_TOKEN)
  'GET /api/admin/feedback': (req) => {
    const t = String(req.headers['x-admin-token'] || '');
    const want = process.env.ADMIN_TOKEN || '';
    if (!want || t.length !== want.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(want))) fail(401, 'دسترسی ندارید');
    return { feedback: q.listFeedback.all() };
  },

  // ---------- گروه‌ها ----------
  'GET /api/groups': (req) => {
    const u = auth(req);
    return { groups: q.myGroups.all(u.id).map((g) => publicGroup(g, u)) };
  },
  'POST /api/groups': async (req) => {
    const u = auth(req);
    const body = await readBody(req);
    const name = cleanName(body.name);
    if (!name) fail(400, 'یک نام برای گروه بنویسید');
    if (q.myGroupCount.get(u.id).n >= MAX_GROUPS) fail(400, `هر نفر حداکثر در ${fa(MAX_GROUPS)} گروه می‌تواند باشد`);
    if (limited('gnew:' + u.id, 5, 86400_000)) fail(429, 'امروز گروه زیادی ساخته‌اید');
    const g = { id: crypto.randomUUID(), code: newGroupCode(), name, owner: u.id, created: Date.now() };
    q.insertGroup.run(g.id, g.code, g.name, g.owner, g.created);
    q.addMember.run(g.id, u.id, g.created);
    return { group: publicGroup(g, u) };
  },
  'POST /api/groups/join': async (req) => {
    const u = auth(req);
    const body = await readBody(req);
    const code = toLatinDigits(body.code).replace(/\D/g, '');
    if (code.length !== 7) fail(400, 'کد گروه هفت رقم است');
    const g = q.groupByCode.get(code);
    if (!g) {
      if (limited('gmiss:' + u.id, 15, 3600_000)) fail(429, 'تعداد تلاش‌های ناموفق زیاد شد؛ یک ساعت بعد دوباره امتحان کنید');
      fail(404, 'گروهی با این کد پیدا نشد');
    }
    if (q.isMember.get(g.id, u.id)) fail(409, `از قبل عضو «${g.name}» هستید`);
    if (q.myGroupCount.get(u.id).n >= MAX_GROUPS) fail(400, `هر نفر حداکثر در ${fa(MAX_GROUPS)} گروه می‌تواند باشد`);
    if (q.memberCount.get(g.id).n >= MAX_GROUP_MEMBERS) fail(400, `این گروه پر است (حداکثر ${fa(MAX_GROUP_MEMBERS)} نفر)`);
    q.addMember.run(g.id, u.id, Date.now());
    toMany(q.members.all(g.id).map((m) => m.id), u, 'group', `عضو تازه در «${g.name}»`, `${u.name} به گروه «${g.name}» پیوست. خوش‌آمد بگویید!`);
    return { group: publicGroup(g, u) };
  },
  'DELETE /api/groups/:id': (req, id) => {
    const u = auth(req);
    const g = q.groupById.get(id);
    if (!g || !q.isMember.get(id, u.id)) fail(404, 'گروه پیدا نشد');
    q.removeMember.run(id, u.id);
    if (!q.memberCount.get(id).n) q.deleteGroup.run(id);
    else if (g.owner === u.id) q.setGroupOwner.run(q.oldestMember.get(id).user_id, id);
    return { ok: true };
  },
  // پیام دلگرمی آماده به همه‌ی اعضای گروه
  'POST /api/groups/:id/cheer': async (req, id) => {
    const u = auth(req);
    const g = q.groupById.get(id);
    if (!g || !q.isMember.get(id, u.id)) fail(404, 'گروه پیدا نشد');
    const body = await readBody(req);
    const kind = int(body.kind, 0, CHEERS.length - 1);
    if (kind === null || body.kind !== kind) fail(400, 'پیام نامعتبر است');
    if (limited(`gcheer:${u.id}:${id}`, 6, 3600_000)) fail(429, 'کمی صبر کنید و دوباره بفرستید');
    const n = toMany(q.members.all(id).map((m) => m.id), u, 'cheer', `${u.name} در «${g.name}»`, CHEERS[kind]);
    return { ok: true, notified: n };
  },

  // ---------- دستیار هوش مصنوعی ----------
  'GET /api/coach': () => ({ enabled: !!(process.env.AI_BASE_URL && process.env.AI_API_KEY) }),
  'POST /api/coach': async (req) => {
    const u = auth(req);
    const base = process.env.AI_BASE_URL, key = process.env.AI_API_KEY, model = process.env.AI_MODEL || 'gpt-4o-mini';
    if (!base || !key) fail(503, 'دستیار هنوز فعال نشده است');
    if (limited('coach:' + u.id, Number(process.env.AI_DAILY_LIMIT) || 40, 86400_000)) fail(429, 'امروز به سقف گفت‌وگو رسیدید؛ فردا دوباره سر بزنید');
    const body = await readBody(req, 32768);
    const clip = (v, n) => String(v || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, n);
    const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: clip(m.content, 1500) }))
      .filter((m) => m.content);
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') fail(400, 'پیامی برای پاسخ نیست');
    const c = body.context && typeof body.context === 'object' ? body.context : {};
    const ctx = [
      int(c.days, -400, 100000) !== null ? `روزهای ترک: ${int(c.days, -400, 100000)}` : '',
      c.product ? `ترک: ${clip(c.product, 20)}` : '',
      int(c.cpd, 0, 200) ? `مصرف قبلی: ${int(c.cpd, 0, 200)} نخ در روز` : '',
      int(c.slips7, 0, 1000) !== null ? `لغزش در ۷ روز اخیر: ${int(c.slips7, 0, 1000)}` : '',
      int(c.cravings7, 0, 10000) !== null ? `هوس شکست‌خورده در ۷ روز اخیر: ${int(c.cravings7, 0, 10000)}` : '',
      Array.isArray(c.triggers) && c.triggers.length ? `موقعیت‌های پرخطر: ${c.triggers.slice(0, 5).map((t) => clip(t, 30)).join('، ')}` : '',
      int(c.ftnd, 0, 10) !== null ? `امتیاز فاگرستروم: ${int(c.ftnd, 0, 10)} از ۱۰` : '',
    ].filter(Boolean).join(' | ');
    let r;
    try {
      r = await fetch(base.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: COACH_PROMPT + (ctx ? '\n\nوضعیت کاربر: ' + ctx : '') }, ...msgs], max_tokens: 700, temperature: 0.6 }),
        signal: AbortSignal.timeout(45000),
      });
    } catch { fail(502, 'دستیار الان در دسترس نیست؛ کمی بعد دوباره امتحان کنید'); }
    if (!r.ok) { console.error('coach upstream', r.status); fail(502, 'دستیار الان در دسترس نیست؛ کمی بعد دوباره امتحان کنید'); }
    const j = await r.json().catch(() => ({}));
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) fail(502, 'پاسخی دریافت نشد؛ دوباره امتحان کنید');
    return { reply: String(text).trim().slice(0, 4000) };
  },

  // صندوق پیام‌ها: رویدادهای تازه‌تر از شماره‌ی since
  'GET /api/inbox': (req, _id, url) => {
    const u = auth(req);
    const since = Math.max(0, Math.floor(Number(url.searchParams.get('since')) || 0));
    const rows = since > 0 ? q.inboxSince.all(u.id, since) : q.inboxLatest.all(u.id);
    return { events: rows.map(publicEvent) };
  },
};

function match(method, pathname) {
  const exact = routes[`${method} ${pathname}`];
  if (exact) return [exact, null];
  const m = /^\/api\/friends\/([0-9a-f-]{36})$/.exec(pathname);
  if (m && method === 'DELETE') return [routes['DELETE /api/friends/:id'], m[1]];
  const g = /^\/api\/groups\/([0-9a-f-]{36})(\/cheer)?$/.exec(pathname);
  if (g && method === 'DELETE' && !g[2]) return [routes['DELETE /api/groups/:id'], g[1]];
  if (g && method === 'POST' && g[2]) return [routes['POST /api/groups/:id/cheer'], g[1]];
  return [null, null];
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, {});
      if (limited('ip:' + clientIp(req), 300, 60_000)) fail(429, 'درخواست‌ها زیاد است؛ کمی صبر کنید');
      const url = new URL(req.url, 'http://x');
      const [handler, param] = match(req.method, url.pathname);
      if (!handler) fail(404, 'پیدا نشد');
      const out = await handler(req, param, url);
      send(res, 200, out);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      send(res, 500, { error: 'خطای سرور؛ کمی بعد دوباره امتحان کنید' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => console.log(`raha server on :${PORT} (db: ${DB_FILE})`));
}
