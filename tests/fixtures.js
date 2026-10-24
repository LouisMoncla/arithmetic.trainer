// Test fixture: one session of Normal 120 s entered from zetamac.com, played the day before `nowMs`.
// The app starts empty; tests that need some history load this one.
const SCORES = [28, 24, 25, 14, 22, 21, 25, 21];

function zetamacSession(nowMs) {
  const d = new Date(nowMs - 86400000);
  d.setHours(18, 0, 0, 0);
  return SCORES.map((score, i) => ({
    id: 'fixture-' + (i + 1),
    startedAt: new Date(d.getTime() + i * 180000).toISOString(),
    mode: 'EXTERNAL', linkedMode: 'NORMAL120',
    settings: { duration: 120 },
    score, questions: []
  }));
}

module.exports = { zetamacSession };
