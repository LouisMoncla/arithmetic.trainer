/*
 * sync.js — optional account sync through Supabase (email magic link).
 *
 * Local first: the browser copy (storage.js) stays the source the app reads. When signed in,
 *   push: after each save, rounds added since the last sync are upserted and rounds removed are
 *         marked deleted (tombstones, so other devices drop them too); settings + presets go to one
 *         profile row. Debounced, retried on reconnect / tab focus.
 *   pull: on sign-in, load and tab focus, rows changed since the cursor are applied
 *         (new rounds added, tombstoned ones removed, newer settings taken).
 * Rounds never change after they are saved, so a round id is all that needs comparing.
 *
 * Runs only on http(s) with js/config.js filled in; elsewhere (file://, offline) it stays off.
 * diff / applyRemote are pure and exported for node --test.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var node = typeof module !== 'undefined';

  var CLIENT_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
  var CLIENT_SRI = 'sha384-BWcjm9OdFth9TbhCxZPdm+gAOUMAzQy9nmTs12ioXdCcbVnJaPMn+fMUoQCLt60R';
  var STATE_KEY = 'arithmeticTrainer.sync';
  var BATCH = 200, PAGE = 1000, OVERLAP_MS = 60000;

  // ---------- pure ----------

  // Rounds added since the last sync, and ids that were synced but are gone now.
  function diff(syncedIds, data) {
    var had = {}, now = {};
    syncedIds.forEach(function (id) { had[id] = true; });
    data.rounds.forEach(function (r) { now[r.id] = true; });
    return {
      added: data.rounds.filter(function (r) { return !had[r.id]; }),
      removed: syncedIds.filter(function (id) { return !now[id]; })
    };
  }

  // Apply server rows to local data. Returns { data, ids, changed }: ids = the synced id set after it.
  function applyRemote(data, syncedIds, rows) {
    var out = { rounds: data.rounds.slice() }, ids = {}, byId = {}, changed = false;
    for (var k in data) if (k !== 'rounds') out[k] = data[k];
    syncedIds.forEach(function (id) { ids[id] = true; });
    out.rounds.forEach(function (r) { byId[r.id] = true; });
    var drop = {};
    rows.forEach(function (row) {
      if (row.deleted) {
        delete ids[row.id];
        if (byId[row.id]) { drop[row.id] = true; changed = true; }
      } else if (!byId[row.id] && !ids[row.id] && row.data) {
        // New from another device. (Synced before but missing here = deleted here, not pushed yet: leave it out.)
        out.rounds.push(row.data); byId[row.id] = true; ids[row.id] = true; changed = true;
      } else if (byId[row.id]) {
        ids[row.id] = true;
      }
    });
    out.rounds = out.rounds.filter(function (r) { return !drop[r.id]; });
    out.rounds.sort(function (a, b) { return a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0; });
    return { data: out, ids: Object.keys(ids), changed: changed };
  }

  function profileJson(data) { return JSON.stringify({ settings: data.settings, presets: data.presets }); }

  var pure = { diff: diff, applyRemote: applyRemote, profileJson: profileJson };
  if (node) { module.exports = pure; return; }

  // ---------- browser ----------

  var cfg = AT.config || {};
  var client = null, user = null, ctx = null, timer = null, busy = false, again = false;
  var status = 'off', listeners = [], adoption = null, lastSynced = null, lastError = null;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveState(s) { try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) { /* sync just restarts */ } }
  var state = loadState();

  function configured() { return !!(cfg.supabaseUrl && cfg.supabaseAnonKey); }
  function supported() { return configured() && /^https?:$/.test(location.protocol); }

  function setStatus(s, err) {
    status = s; lastError = err || null;
    listeners.forEach(function (fn) { fn(); });
  }

  function loadClient(done) {
    if (window.supabase) return done();
    var s = document.createElement('script');
    s.src = CLIENT_URL; s.integrity = CLIENT_SRI; s.crossOrigin = 'anonymous';
    s.onload = done;
    s.onerror = function () { setStatus('unavailable'); };
    document.head.appendChild(s);
  }

  /*
   * ctx = { getData(), replaceData(d) } — replaceData stores locally and re-renders, without calling changed().
   */
  function init(c) {
    ctx = c;
    if (!supported()) return;
    loadClient(function () {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      });
      client.auth.onAuthStateChange(function (event, session) {
        // Supabase asks not to await other calls inside this callback.
        setTimeout(function () { onSession(session); }, 0);
      });
      window.addEventListener('online', function () { if (user) run(); });
      document.addEventListener('visibilitychange', function () { if (user && document.visibilityState === 'visible') run(); });
    });
  }

  function onSession(session) {
    var u = session && session.user;
    if (location.search.indexOf('code=') >= 0) history.replaceState(null, '', location.pathname + location.hash);
    if (!u) { user = null; setStatus(client ? 'signedOut' : 'off'); return; }
    if (user && user.id === u.id) return;
    user = u;
    if (state.userId === u.id) return run();
    firstSync();
  }

  // A new account in this browser: fetch everything, then merge or ask.
  function firstSync() {
    setStatus('syncing');
    fetchAll(null).then(function (res) {
      var data = ctx.getData();
      var mine = state.lastUserId === user.id;   // same person signing back in: merge silently
      if (!data.rounds.length || mine) return adopt('merge', res);
      adoption = { res: res, local: data.rounds.length, remote: res.rows.filter(function (r) { return !r.deleted; }).length };
      setStatus('choose');
    }, fail);
  }

  // choice: 'merge' adds this browser's rounds to the account; 'account' replaces them with the account's.
  function adopt(choice, res) {
    res = res || (adoption && adoption.res);
    adoption = null;
    var data = ctx.getData();
    if (choice === 'account') data = { schemaVersion: data.schemaVersion, rounds: [], presets: [], settings: data.settings, seeded: data.seeded };
    var a = applyRemote(data, [], res.rows);
    var d = a.data;
    if (res.profile) { d.settings = mergeSettings(d.settings, res.profile.settings); d.presets = res.profile.presets || d.presets; }
    state = {
      userId: user.id, lastUserId: user.id, ids: a.ids, cursor: res.cursor,
      profile: res.profile ? profileJson(d) : null, profileAt: res.profile ? res.profile.updated_at : null
    };
    saveState(state);
    setStatus('syncing');   // leaves 'choose', which run() would otherwise wait on
    ctx.replaceData(d);
    run();
  }

  function mergeSettings(local, remote) {
    var out = {};
    for (var k in local) out[k] = local[k];
    for (var j in remote || {}) out[j] = remote[j];
    return out;
  }

  function fail(err) {
    setStatus(navigator.onLine === false ? 'offline' : 'error', err && err.message);
    clearTimeout(timer);
    timer = setTimeout(function () { if (user) run(); }, 30000);
  }

  // Rows changed since `since` (null = all), oldest first, paged; plus the profile row.
  function fetchAll(since) {
    var rows = [];
    function page(from) {
      var q = client.from('rounds').select('id,data,deleted,updated_at').order('updated_at', { ascending: true }).range(from, from + PAGE - 1);
      if (since) q = q.gt('updated_at', new Date(Date.parse(since) - OVERLAP_MS).toISOString());
      return q.then(function (r) {
        if (r.error) throw r.error;
        rows = rows.concat(r.data);
        return r.data.length === PAGE ? page(from + PAGE) : null;
      });
    }
    return page(0).then(function () {
      return client.from('profiles').select('settings,presets,updated_at').maybeSingle();
    }).then(function (p) {
      if (p.error) throw p.error;
      var cursor = rows.length ? rows[rows.length - 1].updated_at : since;
      return { rows: rows, profile: p.data, cursor: cursor };
    });
  }

  // One pull then one push. Overlapping calls fold into a single re-run.
  function run() {
    if (!user || status === 'choose') return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; clearTimeout(timer);
    setStatus('syncing');
    return pull().then(push).then(function () {
      lastSynced = new Date(); setStatus('synced');
    }, fail).then(function () {
      busy = false;
      if (again) { again = false; run(); }
    });
  }

  function pull() {
    return fetchAll(state.cursor).then(function (res) {
      var data = ctx.getData(), a = applyRemote(data, state.ids || [], res.rows), d = a.data;
      var changed = a.changed;
      // Settings from another device win only if this browser hasn't changed them since the last sync.
      // (Compared by timestamp: Postgres reorders JSON keys, so the text never matches.)
      if (res.profile && res.profile.updated_at !== state.profileAt && profileJson(data) === state.profile) {
        d.settings = mergeSettings(d.settings, res.profile.settings); d.presets = res.profile.presets || d.presets;
        state.profile = profileJson(d); state.profileAt = res.profile.updated_at;
        if (state.profile !== profileJson(data)) changed = true;
      }
      state.ids = a.ids; state.cursor = res.cursor;
      saveState(state);
      if (changed) ctx.replaceData(d);
    });
  }

  function push() {
    var data = ctx.getData(), dd = diff(state.ids || [], data), jobs = [];
    for (var i = 0; i < dd.added.length; i += BATCH) {
      jobs.push(dd.added.slice(i, i + BATCH).map(function (r) {
        return { user_id: user.id, id: r.id, started_at: r.startedAt, data: r, deleted: false };
      }));
    }
    var chain = Promise.resolve();
    jobs.forEach(function (rows) {
      chain = chain.then(function () {
        return client.from('rounds').upsert(rows, { onConflict: 'user_id,id' }).then(check);
      }).then(function () {
        state.ids = state.ids.concat(rows.map(function (r) { return r.id; })); saveState(state);
      });
    });
    for (var j = 0; j < dd.removed.length; j += BATCH) {
      (function (ids) {
        chain = chain.then(function () {
          return client.from('rounds').update({ deleted: true, data: null }).in('id', ids).then(check);
        }).then(function () {
          state.ids = state.ids.filter(function (id) { return ids.indexOf(id) < 0; }); saveState(state);
        });
      })(dd.removed.slice(j, j + BATCH));
    }
    var pj = profileJson(data);
    if (pj !== state.profile) {
      chain = chain.then(function () {
        return client.from('profiles').upsert({ user_id: user.id, settings: data.settings, presets: data.presets }, { onConflict: 'user_id' })
          .select('updated_at').single().then(check);
      }).then(function (r) { state.profile = pj; state.profileAt = r.data.updated_at; saveState(state); });
    }
    return chain;
  }

  function check(r) { if (r.error) throw r.error; return r; }

  // ---------- called by the UI ----------

  function changed() {
    if (!user || status === 'choose') return;
    clearTimeout(timer);
    timer = setTimeout(run, 1000);
  }

  function signIn(email) {
    var back = location.origin + location.pathname;
    return client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: back } }).then(check);
  }

  function signOut() {
    return client.auth.signOut().then(function () {
      state = { lastUserId: state.lastUserId }; saveState(state);
      user = null; adoption = null; setStatus('signedOut');
    });
  }

  // Delete the account itself (its rounds and profile cascade, see supabase/schema.sql). The browser copy stays.
  function deleteAccount() {
    return client.rpc('delete_my_account').then(check).then(function () {
      return client.auth.signOut({ scope: 'local' });
    }).then(function () {
      state = {}; saveState(state);
      user = null; adoption = null; setStatus('signedOut');
    });
  }

  AT.Sync = {
    diff: diff, applyRemote: applyRemote,
    init: init, changed: changed, syncNow: run, signIn: signIn, signOut: signOut, adopt: adopt, deleteAccount: deleteAccount,
    supported: supported, configured: configured,
    onChange: function (fn) { listeners.push(fn); },
    info: function () {
      return { status: status, email: user ? user.email : null, lastSynced: lastSynced, error: lastError, adoption: adoption && { local: adoption.local, remote: adoption.remote } };
    }
  };
})();
