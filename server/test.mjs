// آزمون خودکار سرور: دو کاربر می‌سازد و همه‌ی مسیرها را امتحان می‌کند
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'raha-test-'));
process.env.DB_FILE = path.join(tmp, 'test.db');
const { createServer } = await import('./index.mjs');
const server = createServer().listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

async function call(method, url, token, body) {
  const r = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json(), headers: r.headers };
}
const day = 86400000;
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// عضویت
let r = await call('POST', '/api/register', null, { name: '  سارا  ' });
ok(r.status === 200 && r.json.code.length === 6 && r.json.name === 'سارا', 'register sara');
const sara = r.json;
r = await call('POST', '/api/register', null, { name: 'علی' });
const ali = r.json;
r = await call('POST', '/api/register', null, { name: '   ' });
ok(r.status === 400, 'empty name rejected');
ok((await call('GET', '/api/me', 'bad-token-xxxxxxxxxxxxxxxxxxxxxxxx')).status === 401, 'bad token');
ok(r.headers.get('access-control-allow-origin') === '*', 'cors header');

// پیشرفت
r = await call('PUT', '/api/me', sara.token, { snapshot: { quitAt: Date.now() - 6.5 * day, cpd: 20, notSmoked: 130, money: 900000, mood: 1, moodAt: Date.now(), streak: 4, beaten: 9, evil: 'x' } });
ok(r.status === 200 && r.json.milestone === null, 'first snapshot sets baseline, no milestone');
r = await call('PUT', '/api/me', sara.token, { snapshot: { quitAt: 'nope' } });
ok(r.status === 400, 'bad snapshot rejected');

// دوستی
r = await call('POST', '/api/friends', ali.token, { code: ali.code });
ok(r.status === 400, 'cannot add self');
r = await call('POST', '/api/friends', ali.token, { code: '000000' === sara.code ? '111111' : '000000' });
ok(r.status === 404, 'unknown code');
const faCode = sara.code.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
r = await call('POST', '/api/friends', ali.token, { code: faCode });
ok(r.status === 200 && r.json.friend.name === 'سارا', 'add friend with Persian digits');
ok(r.json.friend.snapshot.notSmoked === 130 && r.json.friend.snapshot.evil === undefined, 'snapshot whitelisted');
r = await call('POST', '/api/friends', sara.token, { code: ali.code });
ok(r.status === 409, 'already friends');

r = await call('GET', '/api/friends', sara.token);
ok(r.json.friends.length === 1 && r.json.friends[0].name === 'علی', 'mutual friendship');

// صندوق: سارا خبر دوستی گرفته
r = await call('GET', '/api/inbox?since=0', sara.token);
ok(r.json.events.length === 1 && r.json.events[0].type === 'friend', 'friend event');
const firstId = r.json.events[0].id;

// روز مهم: از ۶ روز به ۷ روز
r = await call('PUT', '/api/me', sara.token, { snapshot: { quitAt: Date.now() - 7.2 * day, cpd: 20, notSmoked: 144 } });
ok(r.json.milestone === 7, 'milestone 7 detected');
r = await call('GET', '/api/inbox?since=0', ali.token);
ok(r.json.events.some((e) => e.type === 'milestone' && e.body.includes('۷ روز')), 'friend got milestone');

// کمک
r = await call('POST', '/api/sos', ali.token);
ok(r.status === 200 && r.json.notified === 1, 'sos sent');
r = await call('POST', '/api/sos', ali.token);
ok(r.status === 429, 'sos rate limited');
r = await call('GET', `/api/inbox?since=${firstId}`, sara.token);
ok(r.json.events.length === 1 && r.json.events[0].type === 'sos' && r.json.events[0].fromName === 'علی', 'sos in inbox');

// پیام دلگرمی
r = await call('POST', '/api/cheer', sara.token, { to: ali.id, kind: 2 });
ok(r.status === 200, 'cheer sent');
r = await call('POST', '/api/cheer', sara.token, { to: ali.id, kind: 1 });
ok(r.status === 429, 'cheer per-friend rate limit');
r = await call('POST', '/api/cheer', sara.token, { to: ali.id, kind: 99 });
ok(r.status === 400, 'bad cheer kind');
r = await call('GET', '/api/inbox?since=0', ali.token);
ok(r.json.events.at(-1).body === 'من کنارتم.', 'cheer text');

// نام و کد تازه
r = await call('PUT', '/api/me', ali.token, { name: 'علی‌رضا' });
ok(r.json.name === 'علی‌رضا', 'rename');
r = await call('POST', '/api/me/code', ali.token);
ok(r.json.code !== ali.code && r.json.code.length === 6, 'new code');

// حذف دوست و حذف حساب
r = await call('DELETE', `/api/friends/${ali.id}`, sara.token);
ok(r.status === 200, 'remove friend');
r = await call('GET', '/api/friends', ali.token);
ok(r.json.friends.length === 0, 'removed both ways');
r = await call('DELETE', '/api/me', ali.token);
ok(r.status === 200, 'delete account');
ok((await call('GET', '/api/me', ali.token)).status === 401, 'deleted token no longer works');

// نظر کاربران
r = await call('POST', '/api/feedback', null, { text: 'اپ خوبی است', contact: 'a@b.c', days: 9 });
ok(r.status === 200, 'feedback saved');
r = await call('POST', '/api/feedback', null, { text: ' ' });
ok(r.status === 400, 'empty feedback rejected');
ok((await call('GET', '/api/admin/feedback', null)).status === 401, 'admin needs token');

server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`همه‌ی ${passed} آزمون سرور موفق بود`);
