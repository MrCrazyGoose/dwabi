import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
import { FileStore } from '../server/store/fileStore.js';
import { PgStore } from '../server/store/pgStore.js';
import { POINTS, LIMITS } from '../shared/points.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ENV = { COMPETITION_START: '2000-01-01', COMPETITION_END: '2999-12-31', AUTH_RATE_LIMIT: '1000' };

let clock = new Date('2026-10-14T23:00:00Z'); // Wed 7 p.m. ET, eve of a Thursday pickup
let nextBin;
const fakeVision = {
  async checkItem() {
    return { item_id: 'aluminum-can', what_i_see: 'soda can', confidence: 'high', contamination: 'clean', findings: [], photo_quality: 'good' };
  },
  async checkBin() {
    return nextBin;
  },
};
const READY = { bin_type: 'blue_bin', verdict: 'ready', problems: [], looks_good: ['Loose cans'], photo_quality: 'good' };
const BAGGED = {
  bin_type: 'blue_bin',
  verdict: 'fix_first',
  problems: [{ kind: 'plastic_bag', what: 'Grocery bag', where: 'top', fix: 'Store drop-off' }],
  looks_good: [],
  photo_quality: 'good',
};

let server, base, dir, store;
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'ecosort-bn-'));
  // Runs against PostgreSQL when TEST_DATABASE_URL is set.
  store = process.env.TEST_DATABASE_URL ? new PgStore(process.env.TEST_DATABASE_URL) : new FileStore(path.join(dir, 'db.json'));
  await store.init();
  const app = createApp({ store, secret: 's', env: ENV, vision: fakeVision, now: () => clock });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  server.close();
  await store.close();
  await rm(dir, { recursive: true, force: true });
});

async function call(p, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + p, { method, headers, body: body && JSON.stringify(body) });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.text(), type };
}

const suffix = Math.random().toString(36).slice(2, 7);
async function signup(name) {
  const r = await call('/auth/register', { method: 'POST', body: { username: `${name}_${suffix}`, password: 'recycle-123', displayName: name } });
  return r.body.token;
}

test('config reports photo checks on, and item checks work for guests', async () => {
  assert.deepEqual((await call('/config')).body, { photoChecks: true });
  const r = await call('/vision/item', { method: 'POST', body: { image: PNG } });
  assert.equal(r.status, 200);
  assert.equal(r.body.itemId, 'aluminum-can');
});

test('large photos are accepted on photo routes but not elsewhere', async () => {
  const big = 'x'.repeat(100 * 1024);
  assert.equal((await call('/auth/login', { method: 'POST', body: { username: big, password: big } })).status, 413);
  const r = await call('/vision/item', { method: 'POST', body: { image: PNG, pad: big } });
  assert.equal(r.status, 200);
});

test('pickup day setup, calendar file and validation', async () => {
  const token = await signup('pat');
  assert.equal((await call('/me/pickup', { method: 'PUT', token, body: { day: 6 } })).status, 400);
  const r = await call('/me/pickup', { method: 'PUT', token, body: { day: 4 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.pickupDay, 4);
  assert.equal(r.body.pickup.key, '2026-10-15');
  const ics = await call('/pickup/calendar.ics?day=4');
  assert.match(ics.type, /text\/calendar/);
  assert.match(ics.body, /BEGIN:VEVENT/);
  assert.equal((await call('/pickup/calendar.ics?day=9')).status, 400);
});

test('bin checks: no points without a pickup day or outside the window', async () => {
  const token = await signup('noday');
  nextBin = READY;
  let r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.status, 200);
  assert.equal(r.body.points, 0);
  assert.match(r.body.note, /Set your pickup day/);

  await call('/me/pickup', { method: 'PUT', token, body: { day: 2 } }); // Tuesday: next is Oct 20
  r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.body.points, 0);
  assert.match(r.body.note, /noon the day before/);
  assert.equal((await call('/bin-checks', { method: 'POST', body: { image: PNG } })).status, 401);
});

test('bin checks: fix first, then ready earns base + fix bonus, once per pickup, streak next week', async () => {
  const token = await signup('sam');
  await call('/me/pickup', { method: 'PUT', token, body: { day: 4 } });

  nextBin = BAGGED;
  let r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.body.result.verdict, 'fix_first');
  assert.equal(r.body.points, 0);
  assert.match(r.body.note, /check again/);

  nextBin = READY;
  r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.body.counted, true);
  assert.equal(r.body.streak, 1);
  assert.equal(r.body.points, POINTS.BIN_CHECK + POINTS.BIN_FIX_BONUS);

  r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.body.points, 0);
  assert.match(r.body.note, /already counted/);

  let me = await call('/me', { token });
  assert.equal(me.body.stats.binStreak, 1);
  assert.equal(me.body.stats.binCheckedThisPickup, true);

  // Next week's eve.
  clock = new Date('2026-10-21T23:00:00Z');
  r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.body.streak, 2);
  assert.equal(r.body.points, POINTS.BIN_CHECK + POINTS.STREAK_BONUS);

  // Skip a week: streak resets.
  clock = new Date('2026-11-04T23:00:00Z');
  me = await call('/me', { token });
  assert.equal(me.body.stats.binStreak, 0);
  r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.body.streak, 1);

  // Veterans Day week: Thursday pickup slides to Friday, so Thursday evening is bin night.
  clock = new Date('2026-11-11T23:00:00Z');
  r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.match(r.body.note, /Friday, Nov 13/);

  // Unclear photo earns nothing.
  clock = new Date('2026-11-12T23:00:00Z');
  nextBin = { ...READY, photo_quality: 'too_dark' };
  r = await call('/bin-checks', { method: 'POST', token, body: { image: PNG } });
  assert.equal(r.body.points, 0);
  assert.match(r.body.note, /more light/);
});

test('guests are capped on photo checks per day', async () => {
  clock = new Date('2026-12-01T15:00:00Z');
  let last;
  for (let i = 0; i < LIMITS.PHOTO_CHECKS_PER_DAY_GUEST + 1; i++) last = await call('/vision/item', { method: 'POST', body: { image: PNG } });
  assert.equal(last.status, 429);
});

test('without a vision service, photo routes say so', async () => {
  const app = createApp({ store, secret: 's', env: ENV });
  const s = app.listen(0);
  await new Promise((r) => s.once('listening', r));
  const url = `http://127.0.0.1:${s.address().port}/api`;
  const cfg = await (await fetch(`${url}/config`)).json();
  assert.equal(cfg.photoChecks, false);
  const r = await fetch(`${url}/vision/item`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: PNG }) });
  assert.equal(r.status, 503);
  s.close();
});
