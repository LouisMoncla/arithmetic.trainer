const test = require('node:test');
const assert = require('node:assert');
const Storage = require('../js/storage.js');

// What a v1 export looked like before Road to 60 (schemaVersion 1, no settings.coach).
const V1 = {
  schemaVersion: 1,
  rounds: [
    { id: 'a', startedAt: '2026-10-20T18:00:00.000Z', mode: 'EXTERNAL', linkedMode: 'NORMAL120', settings: { duration: 120 }, score: 41, questions: [] },
    { id: 'b', startedAt: '2026-10-21T09:00:00.000Z', mode: 'P3', settings: { duration: 60 }, score: 21,
      questions: [{ op: 'add', a: 45, b: 29, shown: '45 + 29', answer: 74, timeMs: 2400, wrongAttempts: 0 }] }
  ],
  presets: [{ name: 'Mine', settings: { ops: ['add'] } }],
  settings: { theme: 'dark', countdown: false, stepOverride: null, negMark: 1, lastExport: null, announced: ['P2'], custom: null, matrix: null, finance: null },
  seeded: false
};

test('a v1 export migrates to v2: rounds, presets and settings kept, Road to 60 defaults added', () => {
  assert.strictEqual(Storage.SCHEMA, 2);
  const d = Storage.parseBackup(JSON.stringify(V1));
  assert.strictEqual(d.schemaVersion, 2);
  assert.deepStrictEqual(d.rounds.map((r) => r.id), ['a', 'b']);
  assert.deepStrictEqual(d.rounds[1].questions, V1.rounds[1].questions);
  assert.strictEqual(d.presets.length, 1);
  assert.strictEqual(d.settings.theme, 'dark');
  assert.strictEqual(d.settings.countdown, false);
  assert.deepStrictEqual(d.settings.announced, ['P2']);
  assert.deepStrictEqual(d.settings.coach, { hints: true, announced: [], multN: null });
});

test('v2 keeps its coach settings, fills missing ones; v0 still loads', () => {
  const v2 = JSON.parse(JSON.stringify(V1));
  v2.schemaVersion = 2;
  v2.settings.coach = { hints: false, announced: ['gate60'] };
  const d = Storage.migrate(v2);
  assert.deepStrictEqual(d.settings.coach, { hints: false, announced: ['gate60'], multN: null });
  const v0 = Storage.migrate({ rounds: V1.rounds });
  assert.strictEqual(v0.schemaVersion, 2);
  assert.strictEqual(v0.rounds.length, 2);
  assert.strictEqual(v0.settings.coach.hints, true);
});

test('Road to 60 round fields survive a round trip', () => {
  const data = Storage.defaults();
  data.rounds.push({ id: 'x', startedAt: '2026-10-21T09:00:00.000Z', mode: 'R60', settings: { drill: 'mult', n: 7 }, score: 12, questions: [], coach: { block: 3, test: false } });
  data.rounds.push({ id: 'y', startedAt: '2026-10-21T10:00:00.000Z', mode: 'P3', settings: {}, score: 20, questions: [], extra: true });
  const back = Storage.parseBackup(Storage.serialize(data));
  assert.deepStrictEqual(back.rounds[0].coach, { block: 3, test: false });
  assert.strictEqual(back.rounds[1].extra, true);
});
