// Learn decks: registration (Probability through the same engine), deck and card validation including the new fields
// (plots, graph choices, exact answers), every shipped deck file, settings, the report, isolation from Zetamac /
// Road to 60 / Stats for two decks at once, and the export → import round trip.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Decks = require('../js/decks.js');
const PB = require('../js/proba.js');
const S = require('../js/stats.js');
const CO = require('../js/coach.js');
const G = require('../js/generator.js');
const P = require('../js/progression.js');
const Storage = require('../js/storage.js');
const Lessons = require('../js/lessons.js');
const FXP = require('./proba-fixture.js');
const DEFS = require('./decks-fixture.js');

global.AT = global.AT || {};
const dk = S.dayKey;
const at = (day, h, m) => { const [y, mo, d] = day.split('-').map(Number); return new Date(y, mo - 1, d, h || 12, m || 0, 0).getTime(); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const quiet = (fn) => { const w = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = w; } };

// register the two sample decks (the fixture copy) in this process, once
const series = quiet(() => Decks.register(clone(DEFS.series)));
const trig = quiet(() => Decks.register(clone(DEFS.trig)));
const SE = Decks.api(series), TR = Decks.api(trig);
const SC = DEFS.series.cards, TC = DEFS.trig.cards;
const by = (cards) => Object.fromEntries(cards.map((c) => [c.id, c]));

// A saved round of a deck: qs = [[id, correct, seconds, extra?]], lessonPrefix 'proba-' or 'deck-series-'.
let rid = 0;
function dround(prefix, day, qs, o) {
  o = o || {};
  const cards = by(SC.concat(TC, FXP));
  return {
    id: 'dr' + (rid++), startedAt: new Date(at(day, o.h || 12, o.m || 0)).toISOString(), mode: 'LEARN', score: qs.filter((x) => x[1]).length,
    settings: { lesson: prefix + (o.sprint ? 'sprint-60' : 'learn') },
    questions: qs.map((x) => Object.assign({ op: 'pb', id: x[0], game: cards[x[0]].game, correct: x[1], timeMs: x[2] * 1000, hinted: false, shown: 'q', answer: 'a', given: 'g' }, x[3] || {}))
  };
}

// ---------- registration ----------

test('Probability is a registered deck with its own names; the others register beside it, in order', () => {
  const p = Decks.get('proba');
  assert.ok(p && Decks.api(p) === PB);
  assert.strictEqual(p.title, 'Probability');
  assert.strictEqual(p.section, 'Probability');
  assert.strictEqual(p.lessonPrefix, 'proba-');
  assert.strictEqual(p.settingsKey, 'proba');
  assert.strictEqual(p.chapterField, 'lecture');
  assert.deepStrictEqual(p.scopes.map((x) => x.maxChapter), [4, 6]);
  assert.deepStrictEqual(PB.settings(null), { scope: 4, complements: false, game: 'all', lectures: [1, 2, 3, 4, 5, 6] });
  assert.ok(series && trig && series.lessonPrefix === 'deck-series-' && series.chapterField === 'chapter' && series.settingsKey === null);
  assert.deepStrictEqual(Decks.list().map((d) => d.id).slice(0, 3), ['proba', 'series', 'trig']);
  assert.strictEqual(Decks.get('nope'), null);
});

test('a bad definition, a repeated id or a repeated prefix is skipped with a warning, not a crash', () => {
  const ok = { id: 'zed', title: 'Zed', section: 'Analysis', idPrefix: 'Z', version: 'v1', chapters: { 1: 'One' }, scopes: null, cards: [] };
  const warns = [];
  const w = console.warn; console.warn = (m) => warns.push(m);
  try {
    assert.strictEqual(Decks.register(Object.assign(clone(ok), { id: 'Bad Id' })), null);
    assert.strictEqual(Decks.register(Object.assign(clone(ok), { id: 'series', idPrefix: 'Q' })), null);     // id taken
    assert.strictEqual(Decks.register(Object.assign(clone(ok), { id: 'other', idPrefix: 'S' })), null);      // prefix taken
    assert.strictEqual(Decks.register(null), null);
  } finally { console.warn = w; }
  assert.strictEqual(warns.length, 4);
  assert.ok(warns.some((x) => /a deck with this id exists/.test(x)) && warns.some((x) => /idPrefix S is used/.test(x)));
});

test('deck definition rules', () => {
  const ok = { id: 'zed', title: 'Zed', section: 'Analysis', idPrefix: 'Z', version: 'v1', chapters: { 1: 'One', 2: 'Two' }, scopes: null, cards: [] };
  assert.deepStrictEqual(Decks.defErrors(ok), []);
  const bad = (patch, re) => { const e = Decks.defErrors(Object.assign(clone(ok), patch)); assert.ok(e.some((x) => re.test(x)), re + ' in ' + JSON.stringify(e)); };
  bad({ id: 'Zed' }, /id must be lowercase/);
  bad({ id: '' }, /id must be lowercase/);
  bad({ title: ' ' }, /title must be/);
  bad({ section: 5 }, /section must be/);
  bad({ idPrefix: 'zz' }, /idPrefix must be/);
  bad({ idPrefix: 'ABCD' }, /idPrefix must be/);
  bad({ version: '' }, /version must be/);
  bad({ chapters: {} }, /chapters must list/);
  bad({ chapters: { a: 'x' } }, /chapters: "a"/);
  bad({ chapters: { 1: '' } }, /chapters: "1"/);
  bad({ scopes: [] }, /scopes must be null or/);
  bad({ scopes: [{ label: 'x', maxChapter: 9 }] }, /scopes\[0\]/);
  bad({ reference: 'x' }, /reference must be a list/);
  bad({ reference: [{ plot: {} }] }, /reference\[0\] needs a title/);
  bad({ reference: [{ title: 'ok', plot: { fns: [] } }] }, /reference\[0\] "ok"/);
  bad({ cards: 5 }, /cards must be a list/);
  assert.deepStrictEqual(Decks.defErrors(Object.assign(clone(ok), { scopes: [{ label: 'Ch 1', maxChapter: 1 }, { label: 'Ch 1–2', maxChapter: 2 }] })), []);
});

// ---------- cards: chapters, ids, and the new fields ----------

const card = (id) => clone(by(SC.concat(TC))[id]);
const errs = (D, c) => D.cardErrors(c);
const has = (list, re) => assert.ok(list.some((x) => re.test(x)), re + ' in ' + JSON.stringify(list));

test('the sample decks validate; chapter and id rules use the deck\'s prefix and chapters', () => {
  assert.deepStrictEqual(SE.validateCards(SC), []);
  assert.deepStrictEqual(TR.validateCards(TC), []);
  assert.deepStrictEqual(Decks.validateDeck(DEFS.series), []);
  assert.deepStrictEqual(Decks.validateDeck(DEFS.trig), []);
  const base = card('S2-geometric');
  has(errs(SE, Object.assign(clone(base), { id: 'geo' })), /id must match S<1-3>-<a-z0-9->/);
  has(errs(SE, Object.assign(clone(base), { id: 'L2-geo' })), /id must match/);
  has(errs(SE, Object.assign(clone(base), { chapter: 9 })), /chapter must be 1 to 3/);
  has(errs(SE, Object.assign(clone(base), { chapter: 1 })), /the id starts with S2 but chapter is 1/);
  has(errs(SE, Object.assign(clone(base), { chapter: undefined, lecture: 2 })), /chapter must be 1 to 3/);   // the field is "chapter" here
  has(TR.validateCards([card('T2-arccos-range'), card('T2-arccos-range')]), /duplicate id/);
  assert.ok(SE.ID_RE.test('S3-abc-1') && !SE.ID_RE.test('S4-abc'));
});

test('plot and explainPlot are validated, with the card id and where', () => {
  const c = card('S1-asymptote-e');
  has(errs(SE, Object.assign(clone(c), { plot: { fns: [] } })), /^plot: plot\.fns must list/);
  has(errs(SE, Object.assign(clone(c), { explainPlot: { fns: [{ f: 'x' }], x: [1, 0], y: [0, 1] } })), /^explainPlot: plot\.x must be/);
  has(errs(SE, Object.assign(clone(c), { plot: Object.assign(clone(c.plot), { fns: [{ f: 'foo(x)' }] }) })), /plot\.fns\[0\]/);
  has(SE.validateCards([Object.assign(clone(c), { plot: 5 })]), /S1-asymptote-e: plot: plot must be an object/);
  assert.deepStrictEqual(errs(SE, c), []);
  // a plot on a true/false or compute card is fine
  assert.deepStrictEqual(errs(SE, Object.assign(card('S2-harmonic-diverges'), { plot: c.plot })), []);
});

test('graph choices: all graphs or all text, distinct, 3 to 5 distractors, valid plots and labels', () => {
  const g = card('T2-which-arctan');
  assert.deepStrictEqual(errs(TR, g), []);
  const mixed = clone(g); mixed.distractors[1] = '$x$';
  has(errs(TR, mixed), /choices must be all text or all graphs/);
  const mixed2 = clone(g); mixed2.answer = '$x$';
  has(errs(TR, mixed2), /choices must be all text or all graphs/);
  const few = clone(g); few.distractors = few.distractors.slice(0, 2);
  has(errs(TR, few), /distractors must be 3 to 5 graphs/);
  const dupAnswer = clone(g); dupAnswer.distractors[0] = clone(g.answer);
  has(errs(TR, dupAnswer), /distractor 1 repeats the answer/);
  const dup = clone(g); dup.distractors[2] = clone(dup.distractors[1]);
  has(errs(TR, dup), /distractor 3 repeats another choice/);
  const badPlot = clone(g); badPlot.distractors[0].plot.fns = [{ f: 'sin(' }];
  has(errs(TR, badPlot), /distractor 1 plot: plot\.fns\[0\]/);
  const labelled = clone(g); labelled.answer.label = 'the right one'; labelled.distractors[0].label = '$\\frac{1}{2}$';
  assert.deepStrictEqual(errs(TR, labelled), []);
  const badLabel = clone(g); badLabel.distractors[0].label = '$\\nosuch$';
  has(errs(TR, badLabel), /distractor 1 label: Unknown command/);
  const emptyLabel = clone(g); emptyLabel.answer.label = ' ';
  has(errs(TR, emptyLabel), /answer label must be a non-empty string/);
  const extra = clone(g); extra.distractors[0].colour = 'red';
  has(errs(TR, extra), /unknown field colour in distractor 1/);
  const noPlot = clone(g); noPlot.answer = { label: 'x' };
  has(errs(TR, noPlot), /answer must be \{ plot \}/);
});

test('exact answers: answerExpr must evaluate to the answer within the tolerance; answerTex is TeX; compute cards only', () => {
  const c = card('S1-one-plus-2-over-n-3n');
  assert.deepStrictEqual(errs(SE, c), []);
  has(errs(SE, Object.assign(clone(c), { answerExpr: 'e^5' })), /evaluates to 148\.\d+, not the answer 403\.4288/);
  has(errs(SE, Object.assign(clone(c), { answerExpr: 'x' })), /is not an expression with a value/);
  has(errs(SE, Object.assign(clone(c), { answerExpr: 'sqrt(-1)' })), /is not an expression with a value/);
  has(errs(SE, Object.assign(clone(c), { answerExpr: 5 })), /answerExpr must be a string/);
  has(errs(SE, Object.assign(clone(c), { answerTex: '$\\nosuch$' })), /answerTex: Unknown command/);
  has(errs(SE, Object.assign(clone(c), { answerTex: ' ' })), /answerTex must be a non-empty string/);
  assert.deepStrictEqual(errs(SE, Object.assign(clone(c), { answerExpr: 'e^6.0001' })), []);                   // within 0.1%
  has(errs(SE, Object.assign(clone(c), { answerExpr: 'e^6.0001', tol: 1e-6 })), /evaluates to/);            // a tighter tol
  has(errs(SE, Object.assign(card('S2-geometric'), { answerExpr: 'pi' })), /answerExpr and answerTex are for compute cards/);
  has(errs(SE, Object.assign(card('S2-harmonic-diverges'), { answerTex: '$x$' })), /answerExpr and answerTex are for compute cards/);
});

test('typed answers: the exact expression, its decimal and a near miss', () => {
  const c = card('S1-one-plus-2-over-n-3n');
  const ok = (s) => SE.check(c, SE.parseNumber(s));
  ['e^6', 'exp(6)', '403.43', '403,4288', 'e^3 * e^3', '(e^2)^3', 'e^6.0001'].forEach((s) => assert.ok(ok(s), s));
  ['403', 'e^5', 'e^6.1', '6', '', 'x', 'e^'].forEach((s) => assert.ok(!ok(s), s));
  assert.strictEqual(SE.answerText(c), 'e^6 ≈ 403.4288');
  assert.strictEqual(PB.answerText(FXP.find((x) => x.id === 'L3-bin-pmf')), '0.375');          // Probability: unchanged
  assert.strictEqual(SE.hasExpr(), true);
  assert.strictEqual(PB.hasExpr(), false);
});

test('graph choices through the engine: shuffled, checked by identity, hinted, described in words', () => {
  const g = TC.find((x) => x.id === 'T2-which-arctan'), rng = G.mulberry32(3);
  const ch = TR.choices(g, rng);
  assert.strictEqual(ch.length, 4);
  assert.ok(ch.every((x) => TR.isGraph(x)));
  const right = ch.filter((x) => TR.check(g, x));
  assert.strictEqual(right.length, 1);
  assert.strictEqual(right[0], g.answer);
  assert.ok(!TR.check(g, g.distractors[0]));
  assert.strictEqual(TR.hintKind(g, 4), 'cut');
  assert.strictEqual(TR.cut(ch, g, rng).length, 3);
  assert.strictEqual(TR.choiceText(g.answer), 'graph of y = atan(x)');
  assert.strictEqual(TR.choiceText({ plot: g.answer.plot, label: 'the $\\arctan$ curve' }), 'the arctan curve');
  assert.strictEqual(TR.answerText(g), 'graph of y = atan(x)');
  assert.strictEqual(TR.choiceText('$e^{x}$'), 'e^x');
});

// ---------- every shipped deck file ----------

test('every deck file in js/decks registers one valid deck, is loaded by index.html, and does not shadow a lesson', () => {
  const dir = path.join(__dirname, '..', 'js', 'decks'), html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const files = fs.readdirSync(dir).filter((f) => /\.js$/.test(f));
  assert.ok(files.length >= 2);
  const reserved = new Set(Object.keys(Lessons.LESSONS).concat(['taylor', 'fractions', 'proba', 'road', 'play', 'stats']));
  const ids = new Set(), prefixes = new Set(['L']);
  files.forEach((f) => {
    const defs = [], saved = global.AT.registerDeck;
    global.AT.registerDeck = (d) => { defs.push(d); return null; };
    try { delete require.cache[require.resolve(path.join(dir, f))]; require(path.join(dir, f)); } finally { global.AT.registerDeck = saved; }
    assert.strictEqual(defs.length, 1, f + ' registers exactly one deck');
    const d = defs[0];
    assert.strictEqual(f, d.id + '.js', 'the file is named after the deck id');
    assert.deepStrictEqual(Decks.validateDeck(d), [], f);
    assert.ok(!reserved.has(d.id), f + ': id is a Learn route already');
    assert.ok(!ids.has(d.id) && !prefixes.has(d.idPrefix), f + ': id and idPrefix are unique');
    ids.add(d.id); prefixes.add(d.idPrefix);
    assert.ok(html.includes('<script src="js/decks/' + f + '"></script>'), f + ' has a script tag in index.html');
    assert.ok(d.cards.length > 0, f + ' has cards');
  });
  // and the tags of index.html point at files that exist, after deck-ui.js and before app.js
  const tags = [...html.matchAll(/<script src="js\/decks\/([^"]+)"><\/script>/g)].map((m) => m[1]);
  tags.forEach((t) => assert.ok(files.includes(t), t + ' exists'));
  assert.ok(html.indexOf('js/deck-ui.js') < html.indexOf('js/decks/' + tags[0]) && html.indexOf('js/decks/' + tags[tags.length - 1]) < html.indexOf('js/app.js'));
  // the script order the engine needs
  ['js/tex.js', 'js/expr.js', 'js/plot.js', 'js/decks.js', 'js/proba-cards.js', 'js/proba.js'].reduce((prev, s) => { const i = html.indexOf(s); assert.ok(i > prev, s + ' comes in order'); return i; }, -1);
});

// ---------- the menu, settings, progress ----------

test('Learn menu sections: Probability keeps its place, the others group by section, an empty deck is hidden', () => {
  quiet(() => Decks.register({ id: 'empty', title: 'Empty', section: 'Analysis', idPrefix: 'E', version: 'v', chapters: { 1: 'x' }, scopes: null, cards: [{ id: 'bad' }] }));
  assert.ok(Decks.get('empty'));
  assert.deepStrictEqual(Decks.sections().map((s) => [s.name, s.decks.map((d) => d.id)]), [['Probability', ['proba']], ['Analysis', ['series', 'trig']]]);
  assert.ok(!Decks.visible().some((d) => d.id === 'empty'));
  assert.strictEqual(Decks.api(Decks.get('empty')).bank().cards.length, 0);
});

test('settings live where they always did for Probability, in settings.decks[id] for the others', () => {
  const data = { settings: Storage.defaults().settings };
  assert.strictEqual(data.settings.decks, null);
  assert.strictEqual(Decks.getSettings(data, Decks.get('proba')), null);
  Decks.setSettings(data, Decks.get('proba'), PB.settings({ scope: 6 }));
  Decks.setSettings(data, series, SE.settings({ game: 'formulas', lectures: [1, 2] }));
  Decks.setSettings(data, trig, TR.settings({ complements: true }));
  assert.strictEqual(data.settings.proba.scope, 6);
  assert.deepStrictEqual(Object.keys(data.settings.decks), ['series', 'trig']);
  assert.deepStrictEqual(Decks.getSettings(data, series), { scope: 3, complements: false, game: 'formulas', lectures: [1, 2] });
  assert.strictEqual(SE.settings({ scope: 2 }).scope, 3);                    // no scopes: always every chapter
  assert.deepStrictEqual(SE.scopeLectures(null), [1, 2, 3]);
  assert.deepStrictEqual(TR.scopeLectures(null), [1, 2, 3, 4]);
  assert.deepStrictEqual(SE.settings({ lectures: [9, 1] }).lectures, [1]);
});

test('a deck with scopes keeps them; progress and the cheat sheet use the deck\'s chapters and prefix', () => {
  const D = Decks.api(quiet(() => Decks.register({ id: 'sc', title: 'Scoped', section: 'Analysis', idPrefix: 'K', version: 'v9', noun: 'Part',
    chapters: { 1: 'A', 2: 'B', 3: 'C' }, scopes: [{ label: 'Parts 1–2', maxChapter: 2 }, { label: 'Parts 1–3', maxChapter: 3 }],
    cards: [{ id: 'K1-a', chapter: 1, game: 'truefalse', prompt: 'p', answer: true, explain: 'e' }, { id: 'K3-b', chapter: 3, game: 'truefalse', prompt: 'q', answer: false, explain: 'f' }] })));
  assert.deepStrictEqual(D.settings(null), { scope: 2, complements: false, game: 'all', lectures: [1, 2, 3] });
  assert.strictEqual(D.settings({ scope: 3 }).scope, 3);
  assert.strictEqual(D.settings({ scope: 1 }).scope, 2);
  assert.deepStrictEqual(D.scopeLectures(null), [1, 2]);
  assert.strictEqual(D.scopeLabel({ scope: 3 }), 'Parts 1–3');
  const cards = D.bank().cards, st = D.stats(cards, [], dk);
  assert.deepStrictEqual(D.pool(cards, null).map((c) => c.id), ['K1-a']);
  assert.deepStrictEqual(D.pool(cards, { scope: 3 }).map((c) => c.id), ['K1-a', 'K3-b']);
  assert.strictEqual(D.progress(cards, { scope: 3 }, st).total.t, 2);
  assert.strictEqual(D.tag(cards[1]), 'K3 · True or false');
});

// ---------- rounds belong to their own deck ----------

test('a round counts for its own deck only: lessons proba-… and deck-<id>-… never mix', () => {
  const pr = dround('proba-', '2026-11-10', [['L3-geo-var', true, 3], ['L3-geo-var', true, 3]]);
  const sr = dround('deck-series-', '2026-11-10', [['S2-geometric', true, 3], ['S2-geometric', true, 3]]);
  const tr = dround('deck-trig-', '2026-11-10', [['T2-arccos-range', true, 3], ['T2-arccos-range', true, 3]], { sprint: true });
  const rounds = [pr, sr, tr];
  assert.strictEqual(PB.stats(FXP, rounds, dk)['L3-geo-var'].state, 'mastered');
  assert.strictEqual(SE.stats(SC, rounds, dk)['S2-geometric'].state, 'mastered');
  assert.strictEqual(TR.stats(TC, rounds, dk)['T2-arccos-range'].state, 'mastered');
  assert.strictEqual(PB.answers(rounds).length, 2);
  assert.strictEqual(SE.answers(rounds).length, 2);
  assert.strictEqual(TR.answers(rounds)[0].mode, 'sprint');
  assert.ok(PB.mine(pr) && !PB.mine(sr) && !SE.mine(pr) && !SE.mine(tr) && TR.mine(tr));
  // each deck's rounds are rounds of "practice outside Zetamac" for the stats
  [pr, sr, tr].forEach((r) => assert.ok(S.isProba(r)));
  assert.ok(!S.isProba({ mode: 'LEARN', settings: { lesson: 'taylor-learn' } }) && !S.isProba({ mode: 'LEARN', settings: { lesson: 'x11' } }));
  // another deck's answers to the same id are not counted: a series answer filed under the trig lesson is ignored
  const wrong = dround('deck-trig-', '2026-11-10', [['S2-geometric', true, 3], ['S2-geometric', true, 3]]);
  assert.strictEqual(SE.stats(SC, [wrong], dk)['S2-geometric'].state, 'new');
});

test('report: one section per deck with answers, Probability first and exactly as before; the others by the deck\'s title', () => {
  const rounds = [
    dround('proba-', '2026-11-09', [['L3-geo-var', false, 6], ['L3-geo-var', true, 6]]),
    dround('deck-series-', '2026-11-10', [['S2-geometric', true, 3], ['S2-geometric', true, 3], ['S1-asymptote-e', false, 20]]),
    dround('deck-trig-', '2026-11-10', [['T2-which-arctan', false, 9]])
  ];
  const sl = SE.report(SC, { version: '2026-11-12-sample' }, null, rounds, dk);
  assert.strictEqual(sl[0], '## Series & limits (Learn deck)');
  assert.strictEqual(sl[1], 'Scope: all chapters · bank 2026-11-12-sample');
  assert.strictEqual(sl[2], 'Cards: mastered 1 / seen 2 / total 5');
  assert.strictEqual(sl[3], 'Per chapter: S1 0/1/3 · S2 1/1/2 · S3 0/0/0');
  assert.ok(sl[4].startsWith('Per game (last 3 days): ') && sl[4].includes('Formulas to know 67%'), sl[4]);
  assert.ok(sl.some((l) => l.startsWith('- S1-asymptote-e — Horizontal asymptote of the plotted function as x → + ∞ ? (0%, 1 attempt)') || l.startsWith('- S1-asymptote-e')));
  assert.deepStrictEqual(SE.report(SC, { version: 'v' }, null, [rounds[0], rounds[2]], dk), []);                   // nothing answered in this deck
  assert.strictEqual(PB.report(FXP, { version: '2026-11-12-sample' }, null, rounds, dk)[0], '## Probability (midterm prep)');
  const settings = Storage.defaults().settings;
  const text = P.summary({ rounds, presets: [], settings }, at('2026-11-12'), { proba: { cards: FXP, meta: { version: '2026-11-12-sample' } } });
  const i = text.indexOf('## Probability (midterm prep)'), j = text.indexOf('## Series & limits (Learn deck)'), k = text.indexOf('## Trigonometry (Learn deck)');
  assert.ok(i > 0 && j > i && k > j, 'Probability, then Series, then Trigonometry');
  assert.ok(text.includes('\n\n## Series & limits (Learn deck)\nScope: all chapters'));
});

// ---------- isolation from Zetamac, Road to 60 and Stats, for two decks at once ----------

const zq = (op, a, b, ms, extra) => Object.assign({ op, a, b, timeMs: ms, wrongAttempts: 0 }, G.makeQuestion(op, a, b), { timeMs: ms }, extra || {});
let zid = 0;
function zround(mode, day, o) {
  o = o || {};
  const [y, m, d] = day.split('-').map(Number);
  return Object.assign({ id: 'z' + (zid++), startedAt: new Date(y, m - 1, d, o.h || 10, zid % 60).toISOString(), mode, score: o.score || 30, settings: {}, questions: o.qs || [] }, o.more || {});
}
function zday(day, bench, qs) {
  const out = [zround('TABLES', day, { more: { coach: { block: 1, test: false } } }), zround('P3', day, { qs: qs, more: { coach: { block: 5, test: false } } })];
  bench.forEach((s) => out.push(zround('NORMAL120', day, { score: s, qs: qs, more: { coach: { block: 6, test: false } } })));
  return out;
}

test('rounds of any deck change nothing in the Road to 60 benchmark, trend, milestones, weak facts, overview and report', () => {
  const qs = [];
  for (let i = 0; i < 12; i++) qs.push(zq('mul', 7, 14, 4000 + 300 * (i % 3)), zq('add', 45, 29, 1800), zq('sub', 63, 28, 2200, i % 5 === 0 ? { wrongAttempts: 1 } : {}));
  const days = ['2026-10-12', '2026-10-14', '2026-10-17', '2026-10-19', '2026-10-21', '2026-10-24', '2026-10-27', '2026-10-29', '2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'];
  const plain = days.flatMap((d, i) => zday(d, [40 + i, 41 + i], qs));
  const extra = [
    dround('proba-', '2026-10-13', [['L3-geo-var', true, 4], ['L3-geo-var', false, 9]]), dround('deck-series-', '2026-10-15', [['S2-geometric', true, 3]]),
    dround('deck-trig-', '2026-10-18', [['T2-arccos-range', true, 5]], { sprint: true }), dround('deck-series-', '2026-10-20', [['S1-asymptote-e', false, 40]]),
    dround('proba-', '2026-10-22', [['L3-geo-var', true, 4]]), dround('deck-trig-', '2026-10-23', [['T2-which-arctan', true, 3]]),
    dround('deck-series-', '2026-10-26', [['S2-geometric', true, 4]]), dround('proba-', '2026-10-28', [['L3-geo-var', true, 4]]),
    dround('deck-trig-', '2026-11-01', [['T2-arccos-range', true, 4]]), dround('deck-series-', '2026-11-03', [['S2-geometric', true, 4]]), dround('deck-series-', '2026-11-05', [['S2-geometric', true, 4]]),
    dround('deck-series-', '2026-11-09', [['S2-geometric', false, 3]], { h: 20 }), dround('deck-trig-', '2026-11-10', [['T2-arccos-range', true, 3]], { h: 2 }),
    dround('deck-series-', '2026-11-11', [['S2-geometric', true, 3]]), dround('deck-trig-', '2026-11-12', [['T2-arccos-range', true, 3]])
  ];
  const mixed = plain.concat(extra).sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  const today = '2026-11-12', now = at(today, 13);
  assert.deepStrictEqual(CO.headline(mixed, today), CO.headline(plain, today));
  assert.ok(CO.headline(plain, today).status.state !== 'none');
  assert.deepStrictEqual(CO.snapshot(mixed, today), CO.snapshot(plain, today));
  assert.deepStrictEqual(CO.costs(CO.snapshot(mixed, today)), CO.costs(CO.snapshot(plain, today)));
  assert.deepStrictEqual(CO.completeSessions(mixed).map((s) => [s.day, s.avg]), CO.completeSessions(plain).map((s) => [s.day, s.avg]));
  const trend = (rs) => S.trend(S.sessionsForMode(rs, 'NORMAL120'), 60, S.sessionDays(rs).length);
  assert.deepStrictEqual(trend(mixed), trend(plain));
  assert.strictEqual(trend(plain).ok, true);
  assert.deepStrictEqual(S.factStats(mixed, now), S.factStats(plain, now));
  assert.deepStrictEqual(S.sessionDays(mixed), S.sessionDays(plain));
  assert.strictEqual(S.sessionNumber(mixed, today), S.sessionNumber(plain, today));
  assert.deepStrictEqual(S.activity(mixed, today), S.activity(plain, today));
  assert.strictEqual(S.streak(mixed, today), S.streak(plain, today));
  assert.strictEqual(S.accuracy(mixed.filter(CO.isNormal)), S.accuracy(plain.filter(CO.isNormal)));
  const settings = Storage.defaults().settings, opts = { proba: { cards: FXP, meta: { version: '2026-11-12-sample' } } };
  const withD = P.summary({ rounds: mixed, presets: [], settings }, now, opts).split('\n');
  const without = P.summary({ rounds: plain, presets: [], settings }, now, opts).split('\n');
  // cut the deck sections out (they run from their "## " line to the next one that is not a deck's)
  const isDeck = (l) => /^## (Probability \(midterm prep\)|Series & limits \(Learn deck\)|Trigonometry \(Learn deck\))$/.test(l);
  const kept = []; let skipping = false;
  withD.forEach((l) => { if (/^#/.test(l)) skipping = isDeck(l); if (!skipping) kept.push(l); });
  assert.deepStrictEqual(kept, without);
  assert.ok(withD.some((l) => l === '## Series & limits (Learn deck)') && withD.some((l) => l === '## Trigonometry (Learn deck)'));
});

// ---------- export and import ----------

test('export → import keeps the rounds and settings of two decks; an old export imports with defaults; merge adds the rounds', () => {
  const old = Storage.migrate({ schemaVersion: 3, rounds: [], presets: [], settings: { theme: 'dark' } });
  assert.strictEqual(old.settings.decks, null);
  assert.deepStrictEqual(SE.settings(Decks.getSettings(old, series)), { scope: 3, complements: false, game: 'all', lectures: [1, 2, 3] });
  const d = Storage.defaults();
  d.settings.proba = PB.settings({ scope: 6, complements: true });
  Decks.setSettings(d, series, SE.settings({ game: 'formulas', lectures: [2] }));
  Decks.setSettings(d, trig, TR.settings({ complements: true, lectures: [2, 3] }));
  d.rounds.push(dround('proba-', '2026-11-10', [['L3-geo-var', true, 3, { t: 111 }]]), dround('deck-series-', '2026-11-10', [['S2-geometric', true, 3, { t: 222 }]]),
    dround('deck-trig-', '2026-11-11', [['T2-which-arctan', false, 5, { t: 333, chapter: 2 }]]));
  const back = Storage.parseBackup(Storage.serialize(d));
  assert.deepStrictEqual(back.settings.proba, d.settings.proba);
  assert.deepStrictEqual(back.settings.decks, d.settings.decks);
  assert.deepStrictEqual(back.rounds, d.rounds);
  assert.strictEqual(Storage.SCHEMA, 3);
  const merged = Storage.merge(Storage.defaults(), back);
  assert.strictEqual(merged.rounds.length, 3);
  assert.strictEqual(SE.stats(SC, back.rounds, dk)['S2-geometric'].n, 1);
  assert.strictEqual(TR.stats(TC, back.rounds, dk)['T2-which-arctan'].n, 1);
  assert.strictEqual(PB.stats(FXP, back.rounds, dk)['L3-geo-var'].n, 1);
  assert.deepStrictEqual(G.factKeys(back.rounds[1].questions[0]), []);   // not a fact for the weak-fact engine
});

test('a hand-made export may carry a deck setting for a deck that is gone: it is kept and nothing breaks', () => {
  const d = Storage.migrate({ schemaVersion: 3, rounds: [], presets: [], settings: { decks: { vanished: { scope: 9 }, series: { game: 'nonsense' } } } });
  assert.deepStrictEqual(Object.keys(d.settings.decks), ['vanished', 'series']);
  assert.strictEqual(SE.settings(Decks.getSettings(d, series)).game, 'all');
});
