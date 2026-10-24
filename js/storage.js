/*
 * storage.js — load/save to localStorage, export/import, schema migration.
 * Everything lives under one key as one JSON object with a schemaVersion.
 * Node-safe (localStorage is only touched inside load/save).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};

  var KEY = 'arithmeticTrainer.v1';
  var SCHEMA = 1;

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
      custom: null          // last-used custom settings
    };
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
    // (future) if (v < 2) { ...transform... }
    out.schemaVersion = SCHEMA;
    out.rounds.sort(byStart);
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
    if (!obj || !Array.isArray(obj.rounds)) throw new Error('File has no rounds; is it an Arithmetic Trainer export?');
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
