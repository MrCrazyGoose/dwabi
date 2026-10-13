// Competition window and prize configuration. Override the window with
// COMPETITION_START / COMPETITION_END (ISO dates) environment variables.

export function getCompetition(env = process.env) {
  const start = env.COMPETITION_START || '2026-09-01';
  const end = env.COMPETITION_END || '2026-12-18';
  return {
    name: env.COMPETITION_NAME || 'Fall 2026 Zero-Waste Challenge',
    start: new Date(`${start}T00:00:00-05:00`).toISOString(),
    // Inclusive of the whole final day (Eastern time).
    end: new Date(`${end}T23:59:59-05:00`).toISOString(),
    prizes: [
      { place: '1st to 3rd', prize: 'Gear pack: steel bottle, utensil kit and a backpack made from recycled fabric' },
      { place: '4th to 10th', prize: 'Steel bottle and a set of bin labels for your recycling at home' },
      {
        place: 'Top 25',
        prize: 'A letter documenting your logged sorting work, which MCPS students can submit for Student Service Learning (SSL) hours with school approval',
      },
    ],
    rules: [
      'Open to young people who live in Montgomery County.',
      'Only points earned between the start and end dates count.',
      'Scanning and batch logs have daily limits, so showing up often beats one long session.',
      'Organizers may check top entries before prizes go out.',
    ],
  };
}

export function isWithin(dateIso, competition) {
  return dateIso >= competition.start && dateIso <= competition.end;
}
