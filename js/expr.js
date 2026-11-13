/*
 * expr.js — a small, safe expression language: typed answers (pi/3, sqrt(3)/2, e^6) and the curves of the plots.
 * Tokenizer, recursive-descent parser, AST, compile to a closure. No eval, no new Function. DOM-free: runs in the
 * browser (window.AT.Expr) and in Node.
 *
 *   numbers     0.375  0,375  .5  2e-3  1,5e2
 *   operators   + - * / ^   unary minus, parentheses; ^ is right-associative and binds tighter than unary minus
 *   products    2pi  3sqrt(2)  2(x+1)  (a number followed by a number is not a product: "3 8" is unreadable)
 *   constants   pi (also π), e
 *   functions   sqrt exp ln log(=ln) sin cos tan asin acos atan (also arcsin arccos arctan) sinh cosh tanh abs floor,
 *               always with parentheses
 *   variable    x (plots only; typed answers reject it)
 * Limits that keep the older typed-number rules: one "/" per chain without parentheses (1/2/3 is ambiguous, so
 * unreadable), one sign in a row (--2), and a digit followed by an "e" that is not an exponent (2e: write 2*e).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};

  var CONSTS = { pi: Math.PI, 'π': Math.PI, e: Math.E };
  var FUNCS = {
    sqrt: Math.sqrt, exp: Math.exp, ln: Math.log, log: Math.log, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, abs: Math.abs, floor: Math.floor
  };
  var MAX_LEN = 300, MAX_DEPTH = 60;

  function fail(msg) { throw new Error(msg); }

  // ---------- tokens: { t: 'num'|'id'|'op', v } ----------

  function tokenize(src) {
    var s = String(src === null || src === undefined ? '' : src)
      .replace(/[−‒–]/g, '-').replace(/[×·⋅]/g, '*').replace(/÷/g, '/');
    if (s.length > MAX_LEN) fail('Too long');
    var out = [], i = 0, m;
    while (i < s.length) {
      var c = s.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      // a number: 12  1.5  1,5  .5  3.  with an optional exponent e-3
      m = /^(\d+(?:[.,]\d*)?|[.,]\d+)/.exec(s.slice(i));
      if (m) {
        var text = m[0], j = i + text.length;
        var ex = /^[eE][+-]?\d+/.exec(s.slice(j));
        if (ex) { text += ex[0]; j += ex[0].length; }
        else if (/^[eE]/.test(s.slice(j)) && !/^[eE][A-Za-zπ]/.test(s.slice(j))) fail('Unfinished exponent');   // "2e", "2e^2"
        else if (/^[eE][A-Za-zπ]/.test(s.slice(j))) { /* 2exp(1): a product with a name */ }
        var v = +text.replace(',', '.');
        if (isNaN(v)) fail('Bad number');
        out.push({ t: 'num', v: v });
        i = j;
        continue;
      }
      m = /^[A-Za-zπ]+/.exec(s.slice(i));
      if (m) { out.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
      if ('+-*/^()'.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; }
      fail('Unexpected ' + c);
    }
    return out;
  }

  // ---------- parser → AST ----------
  // { k: 'num', v } | { k: 'x' } | { k: 'neg', a } | { k: 'bin', op, a, b } | { k: 'call', f, a }

  function parse(src) {
    var toks = tokenize(src), pos = 0, depth = 0;
    if (!toks.length) fail('Empty');
    function peek() { return toks[pos]; }
    function isOp(v) { var t = toks[pos]; return !!t && t.t === 'op' && t.v === v; }
    function startsFactor(t) { return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '(')); }

    function expr() {
      if (++depth > MAX_DEPTH) fail('Too deep');
      var left = term();
      while (isOp('+') || isOp('-')) { var op = toks[pos++].v; left = { k: 'bin', op: op, a: left, b: term() }; }
      depth--;
      return left;
    }
    function term() {
      var left = unary(), divs = 0;
      for (;;) {
        var t = peek();
        if (isOp('*')) { pos++; left = { k: 'bin', op: '*', a: left, b: unary() }; }
        else if (isOp('/')) { if (++divs > 1) fail('Ambiguous: use parentheses'); pos++; left = { k: 'bin', op: '/', a: left, b: unary() }; }
        else if (startsFactor(t)) {
          if (t.t === 'num' && toks[pos - 1] && toks[pos - 1].t === 'num') fail('Two numbers in a row');
          left = { k: 'bin', op: '*', a: left, b: power() };
        } else return left;
      }
    }
    function unary() {
      if (isOp('-')) { pos++; return { k: 'neg', a: power() }; }
      if (isOp('+')) { pos++; return power(); }
      return power();
    }
    function power() {
      var base = atom();
      if (isOp('^')) {
        pos++;
        var neg = false;
        if (isOp('-')) { pos++; neg = true; } else if (isOp('+')) pos++;
        var e = power();
        return { k: 'bin', op: '^', a: base, b: neg ? { k: 'neg', a: e } : e };
      }
      return base;
    }
    function atom() {
      var t = toks[pos++];
      if (!t) fail('Unfinished');
      if (t.t === 'num') return { k: 'num', v: t.v };
      if (t.t === 'op' && t.v === '(') { var inner = expr(); if (!isOp(')')) fail('Missing )'); pos++; return inner; }
      if (t.t === 'id') {
        if (Object.prototype.hasOwnProperty.call(FUNCS, t.v)) {
          if (!isOp('(')) fail(t.v + ' needs (…)');
          pos++;
          var arg = expr();
          if (!isOp(')')) fail('Missing )');
          pos++;
          return { k: 'call', f: t.v, a: arg };
        }
        if (Object.prototype.hasOwnProperty.call(CONSTS, t.v)) return { k: 'num', v: CONSTS[t.v], c: t.v };
        if (t.v === 'x') return { k: 'x' };
        fail('Unknown ' + t.v);
      }
      fail('Unexpected ' + t.v);
    }
    var ast = expr();
    if (pos < toks.length) fail('Unexpected ' + toks[pos].v);
    return ast;
  }

  function hasVar(ast) {
    return ast.k === 'x' || (ast.a ? hasVar(ast.a) : false) || (ast.b ? hasVar(ast.b) : false);
  }

  // The AST as a function of x.
  function compile(ast) {
    switch (ast.k) {
      case 'num': { var v = ast.v; return function () { return v; }; }
      case 'x': return function (x) { return x; };
      case 'neg': { var a = compile(ast.a); return function (x) { return -a(x); }; }
      case 'call': { var f = FUNCS[ast.f], g = compile(ast.a); return function (x) { return f(g(x)); }; }
      case 'bin': {
        var l = compile(ast.a), r = compile(ast.b);
        switch (ast.op) {
          case '+': return function (x) { return l(x) + r(x); };
          case '-': return function (x) { return l(x) - r(x); };
          case '*': return function (x) { return l(x) * r(x); };
          case '/': return function (x) { return l(x) / r(x); };
          default: return function (x) { return Math.pow(l(x), r(x)); };
        }
      }
    }
    fail('Unknown node');
  }

  // A typed answer: a finite number, or null (unreadable: a syntax error, the variable x, a domain error, 1/0).
  function evalNumber(str) {
    try {
      var ast = parse(str);
      if (hasVar(ast)) return null;
      var v = compile(ast)(0);
      return typeof v === 'number' && isFinite(v) ? v : null;
    } catch (e) { return null; }
  }
  // An expression in x as a function, or null when it does not parse (plots, the validator).
  function fnOf(str) {
    try { return compile(parse(str)); } catch (e) { return null; }
  }
  // Why an expression is not usable, or null when it is.
  function check(str) { try { parse(str); return null; } catch (e) { return e.message; } }

  var api = { tokenize: tokenize, parse: parse, compile: compile, hasVar: hasVar, evalNumber: evalNumber, fnOf: fnOf, check: check, FUNCS: FUNCS, CONSTS: CONSTS };
  AT.Expr = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
