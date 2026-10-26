// Competition window configuration. Override the window with
// COMPETITION_START / COMPETITION_END (ISO dates) environment variables.

export function getCompetition(env = process.env) {
  const start = env.COMPETITION_START || '2026-09-01';
  const end = env.COMPETITION_END || '2026-12-18';
  return {
    name: env.COMPETITION_NAME || 'Fall 2026 Zero-Waste Challenge',
    start: new Date(`${start}T00:00:00-05:00`).toISOString(),
    // Inclusive of the whole final day (Eastern time).
    end: new Date(`${end}T23:59:59-05:00`).toISOString(),
  };
}

export function isWithin(dateIso, competition) {
  return dateIso >= competition.start && dateIso <= competition.end;
}
