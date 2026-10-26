import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { hashPassword, verifyPassword, signToken, verifyToken, rateLimiter } from './auth.js';
import { getCompetition, isWithin } from './competition.js';
import { weekKey, questionsForWeek, publicQuestion } from './quizBank.js';
import { getItem, searchItems, decide } from '../shared/rules.js';
import { POINTS, LIMITS, BATCH_CHECKLIST, BATCH_FIELDS, streakBonus } from '../shared/points.js';
import { PICKUP_DAYS, addDays, applySlide, dateKey, eastern, formatDate, inCheckWindow, nextPickup } from '../shared/pickup.js';
import { BRAND_NAME } from '../shared/brand.js';
import { dayStreak, earnedBadges, levelFor } from '../shared/progress.js';
import { VisionError } from './vision.js';
import { pickupCalendar } from './ics.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const DISPLAY_NAME_RE = /^[\p{L}\p{N} ._'-]{2,30}$/u;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    pickupDay: user.pickupDay ?? null,
    createdAt: user.createdAt,
  };
}

function pickupInfo(pickup) {
  return pickup && { key: pickup.key, label: formatDate(pickup.date), holiday: pickup.holiday };
}

// `vision` is the photo checker from server/vision.js (null when no API key
// is configured). `now` is injectable for tests.
export function createApp({ store, secret, env = process.env, staticDir, vision = null, now = () => new Date() } = {}) {
  if (!store) throw new Error('createApp requires a store');
  if (!secret) throw new Error('createApp requires a secret');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  // Photo routes take larger bodies; everything else stays small.
  const smallJson = express.json({ limit: '32kb' });
  const photoJson = express.json({ limit: '5mb' });
  const PHOTO_ROUTES = ['/api/vision/item', '/api/bin-checks'];
  app.use((req, res, next) => (PHOTO_ROUTES.includes(req.path) ? next() : smallJson(req, res, next)));

  // Serialize point-awarding requests per user so daily caps and the
  // one-quiz-per-week rule cannot be bypassed with parallel requests.
  const userLocks = new Map();
  async function withUserLock(userId, fn) {
    const prev = userLocks.get(userId) || Promise.resolve();
    let release;
    const current = new Promise((r) => (release = r));
    const chained = prev.then(() => current);
    userLocks.set(userId, chained);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (userLocks.get(userId) === chained) userLocks.delete(userId);
    }
  }

  const requireAuth = wrap(async (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const userId = verifyToken(token, secret);
    const user = userId && (await store.getUserById(userId));
    if (!user) throw new HttpError(401, 'Please log in.');
    req.user = user;
    next();
  });

  // Like requireAuth, but lets guests through with req.user unset.
  const optionalAuth = wrap(async (req, res, next) => {
    const header = req.get('authorization') || '';
    const userId = header.startsWith('Bearer ') && verifyToken(header.slice(7), secret);
    if (userId) req.user = await store.getUserById(userId);
    next();
  });

  // AI photo checks cost money per call, so cap them per person per day.
  const photoUsage = new Map();
  function takePhotoCheck(req) {
    const e = eastern(now());
    const day = `${e.y}-${e.m}-${e.d}`;
    const key = req.user ? `u:${req.user.id}` : `ip:${req.ip}`;
    const limit = req.user ? LIMITS.PHOTO_CHECKS_PER_DAY : LIMITS.PHOTO_CHECKS_PER_DAY_GUEST;
    const entry = photoUsage.get(key);
    const count = entry && entry.day === day ? entry.count : 0;
    if (count >= limit) {
      throw new HttpError(429, req.user ? 'That is all the photo checks for today. Search for the item instead.' : 'Sign up to keep using photo checks today.');
    }
    photoUsage.set(key, { day, count: count + 1 });
  }

  async function runVision(fn) {
    if (!vision) throw new HttpError(503, 'Photo checking is not set up on this server.');
    try {
      return await fn();
    } catch (err) {
      if (err instanceof VisionError) throw new HttpError(err.status, err.message);
      throw err;
    }
  }

  const authLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: Number(env.AUTH_RATE_LIMIT || 30) });

  // ---------- Public reference data ----------

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/config', (req, res) => res.json({ photoChecks: Boolean(vision) }));

  app.get('/api/competition', (req, res) => res.json({ competition: getCompetition(env) }));

  app.get('/api/rules', (req, res) => {
    res.json({ items: searchItems(req.query.q || '', Number(req.query.limit) || 60) });
  });

  app.get('/api/rules/:id', (req, res) => {
    const verdict = decide(req.params.id);
    if (!verdict) throw new HttpError(404, 'Unknown item');
    res.json(verdict);
  });

  // ---------- Auth ----------

  app.post(
    '/api/auth/register',
    authLimiter,
    wrap(async (req, res) => {
      const { username, password, displayName } = req.body || {};
      if (!USERNAME_RE.test(username || '')) {
        throw new HttpError(400, 'Username must be 3–20 letters, numbers or underscores.');
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
        throw new HttpError(400, 'Password must be at least 8 characters.');
      }
      const name = String(displayName || '').trim();
      if (!DISPLAY_NAME_RE.test(name)) {
        throw new HttpError(400, 'Display name must be 2–30 characters (letters, numbers, spaces).');
      }
      let user;
      try {
        user = await store.createUser({
          username,
          displayName: name,
          passwordHash: await hashPassword(password),
        });
      } catch (err) {
        if (err.code === 'USERNAME_TAKEN') throw new HttpError(409, 'That username is taken.');
        throw err;
      }
      res.status(201).json({ token: signToken(user.id, secret), user: publicUser(user) });
    }),
  );

  app.post(
    '/api/auth/login',
    authLimiter,
    wrap(async (req, res) => {
      const { username, password } = req.body || {};
      const user = username && (await store.getUserByUsername(String(username)));
      if (!user || !(await verifyPassword(String(password || ''), user.passwordHash))) {
        throw new HttpError(401, 'Incorrect username or password.');
      }
      res.json({ token: signToken(user.id, secret), user: publicUser(user) });
    }),
  );

  // ---------- Dashboard ----------

  app.get(
    '/api/me',
    requireAuth,
    wrap(async (req, res) => {
      const competition = getCompetition(env);
      const events = await store.listUserEvents(req.user.id);
      const since = new Date(Date.now() - DAY_MS).toISOString();
      const breakdown = { scan: 0, quiz: 0, batch: 0 };
      let allTime = 0;
      let competitionPoints = 0;
      let scansCount = 0;
      let contaminationCaught = 0;
      let scanPointsToday = 0;
      let batchesToday = 0;
      for (const e of events) {
        allTime += e.points;
        breakdown[e.type] = (breakdown[e.type] || 0) + e.points;
        if (isWithin(e.createdAt, competition)) competitionPoints += e.points;
        if (e.type === 'scan') {
          scansCount++;
          if (e.meta?.contaminationFound) contaminationCaught++;
          if (e.createdAt >= since) scanPointsToday += e.points;
        }
        if (e.type === 'batch' && e.createdAt >= since) batchesToday++;
      }

      const board = await store.leaderboard({ start: competition.start, end: competition.end, limit: 10000 });
      const rankIndex = board.findIndex((r) => r.id === req.user.id);

      const week = weekKey();
      const quizThisWeek = events.find((e) => e.type === 'quiz' && e.meta?.week === week);

      const dailyStreak = dayStreak(events, now());
      const pickup = nextPickup(req.user.pickupDay, now());
      const lastReady = events.find((e) => e.type === 'bincheck' && e.meta?.verdict === 'ready');
      // The streak is alive if the last counted check was for this pickup or the one before it.
      let streak = 0;
      if (lastReady && pickup) {
        const prevKey = dateKey(applySlide(addDays(pickup.scheduled, -7)).date);
        if ([pickup.key, prevKey].includes(lastReady.meta.pickupKey)) streak = lastReady.meta.streak;
      }

      res.json({
        user: publicUser(req.user),
        stats: {
          allTime,
          competitionPoints,
          rank: rankIndex === -1 ? null : rankIndex + 1,
          rankedStudents: board.length,
          breakdown,
          scansCount,
          contaminationCaught,
          scanPointsRemainingToday: Math.max(0, LIMITS.SCAN_POINTS_PER_DAY - scanPointsToday),
          batchesRemainingToday: Math.max(0, LIMITS.BATCHES_PER_DAY - batchesToday),
          quizTakenThisWeek: Boolean(quizThisWeek),
          binStreak: streak,
          binCheckedThisPickup: Boolean(lastReady && pickup && lastReady.meta.pickupKey === pickup.key),
          dayStreak: dailyStreak,
        },
        level: levelFor(competitionPoints),
        badges: earnedBadges(events, { dayStreak: dailyStreak }),
        pickup: pickupInfo(pickup),
        recent: events.slice(0, 15),
      });
    }),
  );

  // ---------- Earning points ----------

  app.post(
    '/api/scans',
    requireAuth,
    wrap(async (req, res) => {
      const { itemId, contaminationFound, level, source } = req.body || {};
      const item = getItem(itemId);
      if (!item) throw new HttpError(400, 'Unknown item.');

      // A bonus is only possible for items that have a contamination check
      // or a "never in the blue bin" alert.
      const bonusEligible = Boolean(item.contaminationCheck || item.alert);
      const caught = Boolean(contaminationFound) && bonusEligible;

      const result = await withUserLock(req.user.id, async () => {
        const since = new Date(Date.now() - DAY_MS).toISOString();
        const today = (await store.listUserEvents(req.user.id, { since })).filter((e) => e.type === 'scan');
        const usedToday = today.reduce((a, e) => a + e.points, 0);
        const remaining = Math.max(0, LIMITS.SCAN_POINTS_PER_DAY - usedToday);
        const earned = Math.min(remaining, POINTS.SCAN + (caught ? POINTS.CONTAMINATION_BONUS : 0));
        const event = await store.addEvent({
          userId: req.user.id,
          type: 'scan',
          points: earned,
          meta: {
            itemId: item.id,
            itemName: item.name,
            contaminationFound: caught,
            level: ['clean', 'light', 'heavy', 'unknown'].includes(level) ? level : null,
            source: ['camera', 'upload', 'search'].includes(source) ? source : null,
          },
        });
        return { event, capped: earned < POINTS.SCAN + (caught ? POINTS.CONTAMINATION_BONUS : 0) };
      });

      res.status(201).json({ points: result.event.points, capped: result.capped, event: result.event });
    }),
  );

  app.get(
    '/api/quiz/current',
    requireAuth,
    wrap(async (req, res) => {
      const week = weekKey();
      const questions = questionsForWeek(week, LIMITS.QUIZ_QUESTIONS);
      const events = await store.listUserEvents(req.user.id);
      const attempt = events.find((e) => e.type === 'quiz' && e.meta?.week === week);
      res.json({
        week,
        questions: questions.map(publicQuestion),
        attempt: attempt ? { points: attempt.points, ...attempt.meta } : null,
      });
    }),
  );

  app.post(
    '/api/quiz/submit',
    requireAuth,
    wrap(async (req, res) => {
      const week = weekKey();
      const questions = questionsForWeek(week, LIMITS.QUIZ_QUESTIONS);
      const answers = (req.body && req.body.answers) || {};
      if (typeof answers !== 'object') throw new HttpError(400, 'Invalid answers.');

      const result = await withUserLock(req.user.id, async () => {
        const events = await store.listUserEvents(req.user.id);
        if (events.some((e) => e.type === 'quiz' && e.meta?.week === week)) {
          throw new HttpError(409, 'You already took this week\'s quiz. Come back next week!');
        }
        const review = questions.map((q) => {
          const chosen = Number.isInteger(answers[q.id]) ? answers[q.id] : null;
          return { id: q.id, chosen, answer: q.answer, correct: chosen === q.answer, explanation: q.explanation };
        });
        const correct = review.filter((r) => r.correct).length;
        const points =
          correct * POINTS.QUIZ_PER_CORRECT + (correct === questions.length ? POINTS.QUIZ_PERFECT_BONUS : 0);
        await store.addEvent({
          userId: req.user.id,
          type: 'quiz',
          points,
          meta: { week, correct, total: questions.length, review },
        });
        return { week, correct, total: questions.length, points, review };
      });

      res.status(201).json(result);
    }),
  );

  app.post(
    '/api/batches',
    requireAuth,
    wrap(async (req, res) => {
      const { counts = {}, checklist = [], note } = req.body || {};
      const cleanCounts = {};
      let totalItems = 0;
      for (const f of BATCH_FIELDS) {
        const n = Number(counts[f.id] || 0);
        if (!Number.isInteger(n) || n < 0 || n > 500) throw new HttpError(400, `Invalid count for ${f.label}.`);
        cleanCounts[f.id] = n;
        totalItems += n;
      }
      if (totalItems < 3) throw new HttpError(400, 'A batch needs at least 3 sorted items.');
      const checked = BATCH_CHECKLIST.map((c) => c.id).filter((id) => Array.isArray(checklist) && checklist.includes(id));
      if (!checked.includes('no-bags')) {
        throw new HttpError(400, 'Recyclables have to go in the bin loose, not in a plastic bag. Check that box first.');
      }

      const event = await withUserLock(req.user.id, async () => {
        const since = new Date(Date.now() - DAY_MS).toISOString();
        const recent = (await store.listUserEvents(req.user.id, { since })).filter((e) => e.type === 'batch');
        if (recent.length >= LIMITS.BATCHES_PER_DAY) {
          throw new HttpError(429, `That's ${LIMITS.BATCHES_PER_DAY} batches today, the daily limit. You can log more tomorrow.`);
        }
        const points = POINTS.BATCH + (checked.length === BATCH_CHECKLIST.length ? POINTS.BATCH_CHECKLIST_BONUS : 0);
        return store.addEvent({
          userId: req.user.id,
          type: 'batch',
          points,
          meta: { counts: cleanCounts, totalItems, checklist: checked, note: String(note || '').slice(0, 200) },
        });
      });

      res.status(201).json({ points: event.points, event });
    }),
  );

  // ---------- Photo checks ----------

  app.post(
    '/api/vision/item',
    photoJson,
    optionalAuth,
    wrap(async (req, res) => {
      takePhotoCheck(req);
      const out = await runVision(() => vision.checkItem(req.body?.image));
      res.json({
        itemId: out.item_id === 'unknown' ? null : out.item_id,
        whatISee: out.what_i_see,
        confidence: out.confidence,
        contamination: out.contamination,
        findings: out.findings,
        photoQuality: out.photo_quality,
      });
    }),
  );

  // ---------- Bin night ----------

  app.put(
    '/api/me/pickup',
    requireAuth,
    wrap(async (req, res) => {
      const day = req.body?.day === null ? null : Number(req.body?.day);
      if (day !== null && !PICKUP_DAYS.includes(day)) throw new HttpError(400, 'Pick a weekday from Monday to Friday.');
      const user = await store.updateUser(req.user.id, { pickupDay: day });
      res.json({ user: publicUser(user), pickup: pickupInfo(nextPickup(day, now())) });
    }),
  );

  app.get('/api/pickup/calendar.ics', (req, res) => {
    const day = Number(req.query.day);
    if (!PICKUP_DAYS.includes(day)) throw new HttpError(400, 'Pick a weekday from Monday to Friday.');
    const origin = `${req.protocol}://${req.get('host')}`;
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="bin-night.ics"');
    res.send(pickupCalendar(day, { now: now(), appName: BRAND_NAME, url: `${origin}/bin-night` }));
  });

  app.post(
    '/api/bin-checks',
    photoJson,
    requireAuth,
    wrap(async (req, res) => {
      takePhotoCheck(req);
      const result = await runVision(() => vision.checkBin(req.body?.image));
      const at = now();
      const pickup = nextPickup(req.user.pickupDay, at);

      const response = { result, pickup: pickupInfo(pickup), points: 0, streak: 0, counted: false, note: null };
      if (!pickup) {
        response.note = 'Set your pickup day to earn points for bin checks.';
        return res.json(response);
      }
      if (!inCheckWindow(pickup.date, at)) {
        response.note = `Checks earn points from noon the day before pickup until 10 a.m. pickup day. Your next pickup is ${formatDate(pickup.date)}.`;
        return res.json(response);
      }
      if (result.photo_quality !== 'good' || result.bin_type === 'unclear' || result.verdict === 'unclear') {
        response.note = 'The photo did not show the inside of the bin clearly enough. Open the lid and try again with more light.';
        return res.json(response);
      }

      await withUserLock(req.user.id, async () => {
        const events = await store.listUserEvents(req.user.id, { since: new Date(at.getTime() - 3 * DAY_MS).toISOString() });
        const thisPickup = events.filter((e) => e.type === 'bincheck' && e.meta?.pickupKey === pickup.key);
        if (thisPickup.some((e) => e.meta.verdict === 'ready')) {
          response.note = 'This pickup is already counted. See you next bin night.';
          return;
        }
        const meta = {
          pickupKey: pickup.key,
          verdict: result.verdict,
          binType: result.bin_type,
          problems: result.problems.map((p) => p.kind),
        };
        if (result.verdict === 'fix_first') {
          await store.addEvent({ userId: req.user.id, type: 'bincheck', points: 0, meta, createdAt: at.toISOString() });
          response.note = 'Take those out, then check again to get the points.';
          return;
        }
        // Ready: work out the streak from the previous pickup.
        const prevKey = dateKey(applySlide(addDays(pickup.scheduled, -7)).date);
        const history = await store.listUserEvents(req.user.id, { since: new Date(at.getTime() - 10 * DAY_MS).toISOString() });
        const prev = history.find((e) => e.type === 'bincheck' && e.meta?.verdict === 'ready' && e.meta.pickupKey === prevKey);
        const streak = prev ? prev.meta.streak + 1 : 1;
        const fixed = thisPickup.some((e) => e.meta.verdict === 'fix_first');
        const points = POINTS.BIN_CHECK + streakBonus(streak) + (fixed ? POINTS.BIN_FIX_BONUS : 0);
        await store.addEvent({ userId: req.user.id, type: 'bincheck', points, meta: { ...meta, streak, fixed }, createdAt: at.toISOString() });
        Object.assign(response, { points, streak, counted: true });
      });
      res.json(response);
    }),
  );

  // ---------- Leaderboard ----------

  app.get(
    '/api/leaderboard',
    wrap(async (req, res) => {
      const competition = getCompetition(env);
      const rows = await store.leaderboard({ start: competition.start, end: competition.end, limit: 100 });
      res.json({
        competition,
        players: rows.map((r, i) => ({ rank: i + 1, id: r.id, displayName: r.displayName, points: r.points })),
      });
    }),
  );

  // ---------- Static frontend (production) ----------

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That request is too large.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}

