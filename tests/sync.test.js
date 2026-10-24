const test = require('node:test');
const assert = require('node:assert');
const Sync = require('../js/sync.js');

const round = (id, day) => ({ id, startedAt: day + 'T10:00:00.000Z', mode: 'P2', score: 20, questions: [] });
const data = rounds => ({ schemaVersion: 1, rounds, presets: [], settings: { theme: 'system' } });

test('diff finds rounds added and ids removed since the last sync', () => {
  const d = data([round('a', '2026-10-01'), round('c', '2026-10-03')]);
  const out = Sync.diff(['a', 'b'], d);
  assert.deepStrictEqual(out.added.map(r => r.id), ['c']);
  assert.deepStrictEqual(out.removed, ['b']);
  assert.deepStrictEqual(Sync.diff(['a', 'c'], d), { added: [], removed: [] });
});

test('applyRemote adds new rounds in date order and drops tombstoned ones', () => {
  const d = data([round('a', '2026-10-01'), round('b', '2026-10-05')]);
  const rows = [
    { id: 'c', deleted: false, data: round('c', '2026-10-03') },
    { id: 'b', deleted: true, data: null },
    { id: 'a', deleted: false, data: round('a', '2026-10-01') }
  ];
  const out = Sync.applyRemote(d, ['a', 'b'], rows);
  assert.ok(out.changed);
  assert.deepStrictEqual(out.data.rounds.map(r => r.id), ['a', 'c']);
  assert.deepStrictEqual(out.ids.sort(), ['a', 'c']);
  assert.deepStrictEqual(d.rounds.map(r => r.id), ['a', 'b'], 'input is not mutated');
  assert.strictEqual(out.data.settings, d.settings);
});

test('applyRemote is idempotent, so overlapping pulls are harmless', () => {
  const rows = [{ id: 'c', deleted: false, data: round('c', '2026-10-03') }, { id: 'x', deleted: true, data: null }];
  const once = Sync.applyRemote(data([round('a', '2026-10-01')]), ['a'], rows);
  const twice = Sync.applyRemote(once.data, once.ids, rows);
  assert.strictEqual(twice.changed, false);
  assert.deepStrictEqual(twice.data.rounds, once.data.rounds);
  assert.deepStrictEqual(twice.ids.sort(), once.ids.sort());
});

test('first sign-in merge: local-only rounds are pushed, remote deletions win', () => {
  // This browser has a, b, local1; the account has a, and b was deleted on another device.
  const local = data([round('a', '2026-10-01'), round('b', '2026-10-02'), round('local1', '2026-10-04')]);
  const rows = [{ id: 'a', deleted: false, data: round('a', '2026-10-01') }, { id: 'b', deleted: true, data: null }];
  const merged = Sync.applyRemote(local, [], rows);
  assert.deepStrictEqual(merged.data.rounds.map(r => r.id), ['a', 'local1']);
  const push = Sync.diff(merged.ids, merged.data);
  assert.deepStrictEqual(push.added.map(r => r.id), ['local1']);
  assert.deepStrictEqual(push.removed, []);
});

test('a pull before the push does not bring back a round deleted here', () => {
  // b was synced, then deleted in this browser; the server still has it.
  const d = data([round('a', '2026-10-01')]);
  const rows = [{ id: 'a', deleted: false, data: round('a', '2026-10-01') }, { id: 'b', deleted: false, data: round('b', '2026-10-02') }];
  const out = Sync.applyRemote(d, ['a', 'b'], rows);
  assert.deepStrictEqual(out.data.rounds.map(r => r.id), ['a']);
  assert.deepStrictEqual(Sync.diff(out.ids, out.data).removed, ['b'], 'still pushed as a deletion');
});

test('a reset tombstones every synced round', () => {
  assert.deepStrictEqual(Sync.diff(['a', 'b'], data([])).removed, ['a', 'b']);
});
