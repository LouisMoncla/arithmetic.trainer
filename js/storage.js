/*
 * storage.js — load/save to localStorage, export/import, schema migration.
 * Everything lives under one key as one JSON object with a schemaVersion.
 * Node-safe (localStorage is only touched inside load/save).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var node = typeof module !== 'undefined';
  var CO = node ? require('./coach.js') : AT.Coach;

  var KEY = 'arithmeticTrainer.v1';
  // 2: Road to 60 (settings.coach; rounds may carry coach: {block, test} and extra: true, both optional).
  // 3: a day runs from 05:00 to 05:00 (S.dayKey): rounds started after their day's coach session was complete are
  //    tagged extra (CO.tagExtras), which catches the ones played after midnight before this change.
  var SCHEMA = 3;

  function uuid() {
    var b = new Uint8Array(16), i;
    try { crypto.getRandomValues(b); } catch (e) { for (i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x + 0x100).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function defaultSettings() {
    return {
      theme: 'system',      // 'system' | 'light' | 'dark'
      countdown: true,
      stepOverride: null,   // null | 'P2' | 'P3' | 'P4'
      negMark: 1,           // interview: points lost per wrong answer
      lastExport: null,     // ISO timestamp
      announced: [],        // step ids whose completion message was shown
      custom: null,         // last-used custom settings
      learnSquares: null,   // Learn, Squares 11–30: the practice range { from, to } (2–50; practice is never saved)
      proba: null,          // Learn, Probability: { scope 4|6, complements, game, lectures }, read through Proba.settings
      taylor: null,         // Learn, Taylor expansions: { tiers, types, from, to, notation, penalty }, read through Taylor.settings
      matrix: null,         // last-used Matrices options { set: 'N'|'Z', max: 9|12|'custom', customLo, customHi, duration: 60|120 }
      finance: null,        // last-used Finance options { mode, fams, cat, diff, duration, answer, weak }
      coach: defaultCoach() // Road to 60
    };
  }

  // hints: method hints in Road to 60 drills; announced: one-time messages already shown ("mastered:sub-borrow", "gate60").
  function defaultCoach() {
    return { hints: true, announced: [], multN: null };
  }

  function defaults() {
    return { schemaVersion: SCHEMA, rounds: [], presets: [], settings: defaultSettings(), seeded: false };
  }

  // Bring any stored object up to the current schema. Unknown/missing fields get defaults.
  function migrate(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Not a data object');
    var v = obj.schemaVersion || 0;
    var out = defaults();
    out.rounds = Array.isArray(obj.rounds) ? obj.rounds.filter(validRound) : [];
    out.presets = Array.isArray(obj.presets) ? obj.presets : [];
    out.seeded = v === 0 ? true : !!obj.seeded;
    var s = obj.settings || {};
    for (var k in out.settings) if (s[k] !== undefined) out.settings[k] = s[k];
    if (v < 2 || !out.settings.coach || typeof out.settings.coach !== 'object') out.settings.coach = defaultCoach();
    else {
      var c = defaultCoach();
      for (var ck in c) if (out.settings.coach[ck] === undefined) out.settings.coach[ck] = c[ck];
      if (!Array.isArray(out.settings.coach.announced)) out.settings.coach.announced = [];
    }
    out.rounds.sort(byStart);
    if (v < 3) CO.tagExtras(out.rounds);
    out.schemaVersion = SCHEMA;
    return out;
  }

  function validRound(r) {
    return r && typeof r.id === 'string' && typeof r.startedAt === 'string' && typeof r.mode === 'string' &&
      typeof r.score === 'number' && !isNaN(Date.parse(r.startedAt));
  }

  function byStart(a, b) { return a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0; }

  function load() {
    var data = null;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) data = migrate(JSON.parse(raw));
    } catch (e) {
      data = null;
    }
    return data || defaults();
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }

  function serialize(data) { return JSON.stringify(data, null, 1); }

  // Parse an exported file. Throws on invalid input.
  function parseBackup(text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('File is not valid JSON.'); }
    if (!obj || !Array.isArray(obj.rounds)) throw new Error('File has no rounds; is it a 103 export?');
    return migrate(obj);
  }

  // Union of rounds by id; current settings are kept.
  function merge(current, incoming) {
    var byId = {}, out = JSON.parse(JSON.stringify(current));
    out.rounds.forEach(function (r) { byId[r.id] = true; });
    incoming.rounds.forEach(function (r) { if (!byId[r.id]) { out.rounds.push(r); byId[r.id] = true; } });
    var names = {};
    out.presets.forEach(function (p) { names[p.name] = true; });
    incoming.presets.forEach(function (p) { if (!names[p.name]) out.presets.push(p); });
    out.rounds.sort(byStart);
    return out;
  }

  var api = {
    KEY: KEY, SCHEMA: SCHEMA, uuid: uuid, defaults: defaults, migrate: migrate,
    load: load, save: save, serialize: serialize, parseBackup: parseBackup, merge: merge
  };
  AT.Storage = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
