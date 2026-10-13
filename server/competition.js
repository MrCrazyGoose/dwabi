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
      {
        place: 'Top 3 students',
        prize: 'Eco-friendly gear pack (reusable bottle, bamboo utensil kit, recycled-fabric backpack)',
      },
      {
        place: 'Top 25 students',
        prize: 'Student Service Learning (SSL) hour recognition letter for verified, logged sorting activity, subject to school approval',
      },
      {
        place: 'Top school (points per active student)',
        prize: 'Sponsored green-team grant for a school sustainability project',
      },
      {
        place: 'Top cluster',
        prize: 'Featured on the county-wide EcoSort leaderboard and a celebration event',
      },
    ],
    rules: [
      'Open to Montgomery County middle and high school students.',
      'Points count only between the start and end dates.',
      'Daily caps limit points from scanning and batch logs — consistency beats volume.',
      'School rankings use points per active student so small and large schools compete fairly.',
      'Organizers may verify top entries before awarding prizes.',
    ],
  };
}

export function isWithin(dateIso, competition) {
  return dateIso >= competition.start && dateIso <= competition.end;
}
