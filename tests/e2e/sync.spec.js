// Account sync against a fake Supabase: the app is served over http, config.js points at
// https://test.supabase.co, and every request to it is answered from an in-memory table.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { zetamacSession } = require('../fixtures');

const BASE = 'http://localhost:4173/';
const SB = 'https://test.supabase.co';
const CLIENT = fs.readFileSync(path.join(__dirname, '..', '..', 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'));
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'me@example.com', aud: 'authenticated', role: 'authenticated' };

function b64url(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function session() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: b64url({ alg: 'HS256', typ: 'JWT' }) + '.' + b64url({ sub: USER.id, email: USER.email, role: 'authenticated', aud: 'authenticated', exp }) + '.sig',
    token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'refresh', user: USER
  };
}

// In-memory "database" plus the routes that serve it.
async function fakeSupabase(page, { rows = [], signedIn = true } = {}) {
  const db = { rounds: new Map(rows.map(r => [r.id, { ...r, updated_at: new Date().toISOString() }])), profile: null, writes: [] };
  let tick = 0;
  const stamp = () => new Date(Date.now() + tick++).toISOString();

  await page.route('**/js/config.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `window.AT = window.AT || {}; window.AT.config = { supabaseUrl: '${SB}', supabaseAnonKey: 'anon' };`
  }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: CLIENT
  }));
  await page.route(SB + '/**', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    const json = (body, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(body),
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
    });
    if (method === 'OPTIONS') return json({});
    if (url.pathname.startsWith('/auth/v1/user')) return json(USER);
    if (url.pathname.startsWith('/auth/v1/logout')) return json({});
    if (url.pathname === '/rest/v1/rounds') {
      if (method === 'GET') {
        const gt = (url.searchParams.get('updated_at') || '').replace(/^gt\./, '');
        let list = [...db.rounds.values()].filter(r => !gt || r.updated_at > gt).sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
        return json(list.map(({ id, data, deleted, updated_at }) => ({ id, data, deleted, updated_at })));
      }
      if (method === 'POST') {
        const body = req.postDataJSON();
        (Array.isArray(body) ? body : [body]).forEach(r => db.rounds.set(r.id, { ...r, updated_at: stamp() }));
        db.writes.push({ op: 'upsert', n: body.length });
        return json([], 201);
      }
      if (method === 'PATCH') {
        const ids = (url.searchParams.get('id') || '').replace(/^in\.\(|\)$/g, '').split(',').map(s => s.replace(/"/g, ''));
        ids.forEach(id => { const r = db.rounds.get(id); if (r) Object.assign(r, req.postDataJSON(), { updated_at: stamp() }); });
        db.writes.push({ op: 'delete', ids });
        return json([]);
      }
    }
    if (url.pathname === '/rest/v1/profiles') {
      if (method === 'GET') return json(db.profile ? [db.profile] : []);
      if (method === 'POST') {
        db.profile = { ...req.postDataJSON(), updated_at: stamp() };
        return json({ updated_at: db.profile.updated_at }, 201);
      }
    }
    return json({ message: 'not mocked: ' + method + ' ' + url.pathname }, 404);
  });
  if (signedIn) {
    await page.addInitScript(s => {
      if (!localStorage.getItem('sb-test-auth-token')) localStorage.setItem('sb-test-auth-token', JSON.stringify(s));
    }, session());
  }
  return db;
}

async function withLocalHistory(page) {
  await page.addInitScript(rounds => {
    if (!localStorage.getItem('arithmeticTrainer.v1')) {
      localStorage.setItem('arithmeticTrainer.v1', JSON.stringify({ schemaVersion: 1, rounds, presets: [], settings: {} }));
    }
  }, zetamacSession(Date.now()));
}

const local = page => page.evaluate(() => window.AT.data.rounds.map(r => r.id));
const status = page => page.locator('#sync-status');

test('signed out: Settings offers an email sign-in link and the top bar stays quiet', async ({ page }) => {
  await fakeSupabase(page, { signedIn: false });
  await page.goto(BASE + '#settings');
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(status(page)).toBeHidden();
});

test('first sign-in with local rounds asks, then adds them to the account', async ({ page }) => {
  await withLocalHistory(page);
  const db = await fakeSupabase(page);
  await page.goto(BASE + '#settings');
  await expect(page.getByText('This browser has 8 rounds and your account has 0 rounds.')).toBeVisible();
  await page.getByRole('button', { name: 'Add them to my account' }).click();
  await expect(status(page)).toHaveText('Synced');
  expect(db.rounds.size).toBe(8);
  expect(db.profile).not.toBeNull();
  await expect(page.getByText('Signed in as')).toBeVisible();
});

test('rounds saved here are pushed, deletions become tombstones', async ({ page }) => {
  const db = await fakeSupabase(page);
  await page.goto(BASE + '#log');
  await expect(status(page)).toHaveText('Synced');

  await page.getByLabel('Scores, separated by commas').fill('17, 19');
  await page.getByRole('button', { name: 'Save rounds' }).click();
  await expect.poll(() => db.rounds.size).toBe(2);

  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Delete round with score 19' }).click();
  await expect.poll(() => [...db.rounds.values()].filter(r => r.deleted).length).toBe(1);
  await expect(status(page)).toHaveText('Synced');
});

test('rounds from another device arrive on load, and its deletions are applied', async ({ page }) => {
  const [a, b] = zetamacSession(Date.now());
  const db = await fakeSupabase(page, { rows: [{ id: a.id, data: a, deleted: false }, { id: b.id, data: b, deleted: false }] });
  await page.goto(BASE + '#log');
  await expect(status(page)).toHaveText('Synced');
  expect((await local(page)).sort()).toEqual([a.id, b.id].sort());

  // The other device deletes b; this tab picks it up when it regains focus.
  Object.assign(db.rounds.get(b.id), { deleted: true, data: null, updated_at: new Date(Date.now() + 5000).toISOString() });
  await page.evaluate(() => window.AT.Sync.syncNow());
  await expect.poll(() => local(page)).toEqual([a.id]);
});
