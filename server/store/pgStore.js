// PostgreSQL store. Enabled when DATABASE_URL is set.

import pg from 'pg';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  school_id TEXT NOT NULL,
  grade INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (lower(username));

CREATE TABLE IF NOT EXISTS point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  points INTEGER NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS point_events_user_time ON point_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS point_events_time ON point_events (created_at);
`;

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    schoolId: row.school_id,
    grade: row.grade,
    createdAt: row.created_at.toISOString(),
  };
}

function toEvent(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    points: row.points,
    meta: row.meta,
    createdAt: row.created_at.toISOString(),
  };
}

export class PgStore {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString });
  }

  async init() {
    await this.pool.query(SCHEMA);
  }

  async createUser({ username, displayName, passwordHash, schoolId, grade }) {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO users (username, display_name, password_hash, school_id, grade)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [username, displayName, passwordHash, schoolId, grade],
      );
      return toUser(rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        const e = new Error('Username already taken');
        e.code = 'USERNAME_TAKEN';
        throw e;
      }
      throw err;
    }
  }

  async getUserById(id) {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return toUser(rows[0]);
  }

  async getUserByUsername(username) {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE lower(username) = lower($1)', [username]);
    return toUser(rows[0]);
  }

  async addEvent({ userId, type, points, meta = {}, createdAt }) {
    const { rows } = await this.pool.query(
      `INSERT INTO point_events (user_id, type, points, meta, created_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now())) RETURNING *`,
      [userId, type, points, meta, createdAt || null],
    );
    return toEvent(rows[0]);
  }

  async listUserEvents(userId, { since, limit } = {}) {
    const { rows } = await this.pool.query(
      `SELECT * FROM point_events
       WHERE user_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2)
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, since || null, limit || null],
    );
    return rows.map(toEvent);
  }

  async leaderboardStudents({ start, end, limit = 50 }) {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.username, u.display_name, u.school_id, SUM(e.points)::int AS points
       FROM point_events e JOIN users u ON u.id = e.user_id
       WHERE e.created_at BETWEEN $1 AND $2
       GROUP BY u.id
       HAVING SUM(e.points) > 0
       ORDER BY points DESC, u.display_name ASC
       LIMIT $3`,
      [start, end, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      schoolId: r.school_id,
      points: r.points,
    }));
  }

  async pointsBySchool({ start, end }) {
    const { rows } = await this.pool.query(
      `SELECT school_id, SUM(points)::int AS points, COUNT(*)::int AS students FROM (
         SELECT u.school_id, SUM(e.points) AS points
         FROM point_events e JOIN users u ON u.id = e.user_id
         WHERE e.created_at BETWEEN $1 AND $2
         GROUP BY u.id
         HAVING SUM(e.points) > 0
       ) per_user
       GROUP BY school_id`,
      [start, end],
    );
    return rows.map((r) => ({ schoolId: r.school_id, points: r.points, students: r.students }));
  }

  async close() {
    await this.pool.end();
  }
}
