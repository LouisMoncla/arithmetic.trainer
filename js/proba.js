/*
 * proba.js — Learn › Probability: the deck adapter. The engine is js/decks.js (one engine for every deck); this file
 * registers Probability with its own names, so nothing stored or shown changes:
 *   cards     js/proba-cards.js (AT.PROBA_CARDS, AT.PROBA_META), written by the coach, with the field `lecture`
 *             and ids L1-… to L6-…; window.AT_PROBA_FIXTURE (an array) replaces the cards (tests)
 *   rounds    lessons 'proba-learn', 'proba-sprint-60', 'proba-sprint-120'; settings in settings.proba
 *   scopes    Lectures 1–4 (the midterm, the default) | Lectures 1–6
 * AT.Proba is the engine bound to this deck, with the same functions it always had.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var node = typeof module !== 'undefined';
  var Decks = AT.Decks || (node ? require('./decks.js') : null);

  function bankFile() { return node ? require('./proba-cards.js') : {}; }
  function meta() {
    var m = AT.PROBA_META || bankFile().PROBA_META || { version: '?', lectures: {} };
    return { version: m.version, chapters: m.lectures };
  }
  function cards() {
    var fx = typeof window !== 'undefined' && Array.isArray(window.AT_PROBA_FIXTURE) ? window.AT_PROBA_FIXTURE : null;
    return fx || AT.PROBA_CARDS || bankFile().PROBA_CARDS || [];
  }

  var deck = Decks.get('proba') || Decks.register({
    id: 'proba', title: 'Probability', section: 'Probability', idPrefix: 'L', noun: 'Lecture', chapterField: 'lecture',
    lessonPrefix: 'proba-', settingsKey: 'proba', reportTitle: 'Probability (midterm prep)',
    blurb: 'Laws, hypotheses, tools, formulas and quick computations',
    scopeNote: 'Lectures 1–4 are the midterm. Complements are extra cards from the textbook.',
    scopes: [{ label: 'Lectures 1–4', maxChapter: 4 }, { label: 'Lectures 1–6', maxChapter: 6 }],
    meta: meta, cards: cards
  });

  var api = Decks.api(deck);
  AT.Proba = api;
  if (node) module.exports = api;
})();
