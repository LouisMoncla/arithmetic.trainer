const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/progression.js');
const Storage = require('../js/storage.js');
const { zetamacSession } = require('./fixtures.js');

let n = 0;
function session(mode, day, scores, external) {
  const [y, m, d] = day.split('-').map(Number);
  return scores.map((score, i) => ({
    id: 'r' + (n++), startedAt: new Date(y, m - 1, d, 10, i).toISOString(), score, questions: [], settings: {},
    mode: external ? 'EXTERNAL' : mode, ...(external ? { linkedMode: mode } : {})
  }));
}

test('starts at P2 with empty streak', () => {
  const info = P.current([], null);
  assert.strictEqual(info.current.step.id, 'P2');
  assert.strictEqual(info.current.streak, 0);
  assert.strictEqual(P.boxes(0), '□ □ □');
});

test('sessions with < 3 rounds do not count and do not break the streak', () => {
  const rs = [
    ...session('P2', '2026-10-01', [18, 19, 20]),
    ...session('P2', '2026-10-02', [5, 5]),          // only 2 rounds: ignored
    ...session('P2', '2026-10-03', [18, 18, 18])
  ];
  const p = P.current(rs, null).current;
  assert.strictEqual(p.streak, 2);
  assert.strictEqual(p.qualifying.length, 2);
  assert.strictEqual(P.boxes(2), '■ ■ □');
});

test('a failing session resets the streak', () => {
  const rs = [
    ...session('P2', '2026-10-01', [20, 20, 20]),
    ...session('P2', '2026-10-02', [20, 20, 20]),
    ...session('P2', '2026-10-03', [17, 18, 18]),   // avg 17.67 < 18
    ...session('P2', '2026-10-04', [19, 19, 19])
  ];
  assert.strictEqual(P.current(rs, null).current.streak, 1);
});

test('3 in a row completes P2 and moves to P3; external rounds count', () => {
  const rs = [
    ...session('P2', '2026-10-01', [18, 18, 18]),
    ...session('P2', '2026-10-02', [18, 19, 20], true),
    ...session('P2', '2026-10-03', [25, 15, 18])     // avg 19.33
  ];
  const info = P.current(rs, null);
  assert.ok(info.all[0].completed);
  assert.strictEqual(info.all[0].completedAt, 3);
  assert.strictEqual(info.current.step.id, 'P3');
  assert.strictEqual(info.current.step.threshold, 25);
});

test('manual override', () => {
  const info = P.current([], 'P4');
  assert.strictEqual(info.current.step.id, 'P4');
  assert.strictEqual(info.current.step.mode, 'NORMAL120');
  assert.ok(info.overridden);
});

test('recommendation asks for warm-up when no Tables round today', () => {
  const rs = session('P2', '2026-10-05', [10]);
  const info = P.current(rs, null);
  assert.deepStrictEqual(P.recommend(rs, info, '2026-10-05'), { mode: 'P2', warmup: true });
  rs.push(...session('TABLES', '2026-10-05', [35]));
  assert.strictEqual(P.recommend(rs, info, '2026-10-05').warmup, false);
});

test('report has every section, every session, and stays bounded', () => {
  const data = Storage.defaults();
  data.rounds = [...zetamacSession(new Date(2026, 9, 20, 12).getTime()), ...session('P2', '2026-10-20', [15, 16, 17])];
  const text = P.summary(data, new Date(2026, 9, 20, 20).getTime());
  const lines = text.split('\n');
  assert.ok(lines.length <= 400, lines.length + ' lines');
  ['About this data', 'Overview', 'Steps', 'Every day per mode', 'Average score by round number',
    'Speed and accuracy per operation', 'Facts', 'Tables grid', 'Latest day in detail', 'Fatigue'].forEach((h) => {
    assert.match(text, new RegExp('^## ' + h, 'm'));
  });
  assert.match(text, /Step 1 Foundations \(current\)/);
  assert.match(text, /S1 \S+  avg 22\.5  best 28  worst 14 .*\[28\*,24\*,25\*,14\*,22\*,21\*,25\*,21\*\]/);
  assert.match(text, /S2 2026-10-20  avg 16\.0  best 17  worst 15 .*\[15,16,17\]/);
});

test('report on empty data says none yet instead of failing', () => {
  const text = P.summary(Storage.defaults(), new Date(2026, 9, 20, 20).getTime());
  assert.match(text, /## Overview\nnone yet/);
  assert.match(text, /## Latest day in detail\nnone yet/);
});

test('storage: export → reset → import round-trips; merge dedupes by id', () => {
  const data = Storage.defaults();
  data.rounds = [...zetamacSession(Date.now()), ...session('P2', '2026-10-20', [15, 16, 17])];
  data.settings.theme = 'dark';
  const text = Storage.serialize(data);
  const back = Storage.parseBackup(text);
  assert.deepStrictEqual(back.rounds, data.rounds.slice().sort((a, b) => a.startedAt < b.startedAt ? -1 : 1));
  assert.strictEqual(back.settings.theme, 'dark');
  const merged = Storage.merge(back, Storage.parseBackup(text));
  assert.strictEqual(merged.rounds.length, data.rounds.length);
  assert.throws(() => Storage.parseBackup('{"foo":1}'));
  assert.throws(() => Storage.parseBackup('not json'));
});

test('storage: rounds with trick questions survive export and import', () => {
  const G = require('../js/generator.js');
  const data = Storage.defaults();
  data.rounds = [{ id: 'r1', startedAt: '2026-10-20T10:00:00.000Z', mode: 'PERCENT', settings: G.modeSettings('PERCENT'), score: 1,
    questions: [{ ...G.makeTrick('frac', 3, 8), timeMs: 2100, wrongAttempts: 0 }] }];
  const back = Storage.parseBackup(Storage.serialize(data));
  assert.deepStrictEqual(back.rounds[0].questions[0], data.rounds[0].questions[0]);
  assert.match(P.summary(back, '2026-10-20'), /Percentages/);
});
