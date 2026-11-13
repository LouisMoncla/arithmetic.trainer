// js/expr.js: the expression language of typed answers and plots. No eval, no new Function.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const E = require('../js/expr.js');

const num = (s) => E.evalNumber(s);
const close = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

test('every case of the old number parser still reads the same', () => {
  const ok = { '0.375': 0.375, '0,375': 0.375, '3/8': 0.375, '-1 / 4': -0.25, '.5': 0.5, '2e-3': 0.002, '-2': -2, ' 7 ': 7, '1/-4': -0.25, '1,5e2': 150, '−1/4': -0.25 };
  Object.keys(ok).forEach((k) => assert.ok(close(num(k), ok[k]), k + ' → ' + num(k)));
  ['abc', '', '   ', '3/0', '3/', '/3', '1/2/3', '1e', '--2', '0.3.4', '3 8', 'NaN', 'Infinity', '1e999'].forEach((k) => assert.strictEqual(num(k), null, JSON.stringify(k)));
  assert.strictEqual(num(null), null);
  assert.strictEqual(num(undefined), null);
});

test('exact expressions are accepted', () => {
  const ok = { 'pi/3': Math.PI / 3, '2pi': 2 * Math.PI, 'sqrt(3)/2': Math.sqrt(3) / 2, 'e^6': Math.exp(6), 'π': Math.PI, 'arccos(0)': Math.PI / 2,
    '3sqrt(2)': 3 * Math.SQRT2, '2(1+1)': 4, 'e^-1': Math.exp(-1), '2*e': 2 * Math.E, '2 e': 2 * Math.E, '1/2pi': Math.PI / 2, '2π/3': 2 * Math.PI / 3,
    'ln(e)': 1, 'log(e^2)': 2, 'sin(pi/6)': 0.5, 'arctan(1)': Math.PI / 4, 'asin(1)': Math.PI / 2, 'acos(1)': 0, 'atan(0)': 0, 'sinh(0)': 0, 'cosh(0)': 1, 'tanh(0)': 0,
    'abs(-3)': 3, 'floor(2.7)': 2, 'exp(1)': Math.E, '2exp(1)': 2 * Math.E, '2^3^2': 512, '-2^2': -4, '(1+2)(3+4)': 21, '+7': 7, '2E3': 2000, '1 / 4': 0.25,
    '(pi)': Math.PI, 'sqrt(2)^2': 2.0000000000000004, '1-1/3': 2 / 3, '10-2-3': 5 };
  Object.keys(ok).forEach((k) => assert.ok(close(num(k), ok[k]), k + ' → ' + num(k) + ' (want ' + ok[k] + ')'));
});

test('what is not an answer is rejected: the variable, domain errors, junk, the ambiguous', () => {
  ['x', '2x', 'sqrt(-1)', '1/0', 'ln(0)', 'ln(-1)', 'acos(2)', 'abc', '2**3', '2e', '2e^2', 'sqrt 2', 'sin', 'sin()', '(1+2', '1+2)', '()', '1+', '*2', '2*', '3 8', '1/2/3', '--2', '- -2', '2^', 'foo(1)', 'pie', '10^400', '1..2', '5%', '2,,3'].forEach((k) => assert.strictEqual(num(k), null, JSON.stringify(k)));
  assert.strictEqual(num('x'.repeat(400)), null);                    // too long
  assert.strictEqual(num('('.repeat(100) + '1' + ')'.repeat(100)), null);   // too deep: no stack overflow
  assert.strictEqual(num('1' + '+1'.repeat(50)), 51);
});

test('no eval: the language cannot reach JavaScript', () => {
  ['constructor', 'process', 'this', 'alert(1)', 'Math.PI', '__proto__', 'toString(1)', 'a=1', '[1]', '{}', '`1`', '1;2', 'globalThis'].forEach((k) => assert.strictEqual(num(k), null, k));
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'expr.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.ok(!/\beval\s*\(|new\s+Function|\bFunction\s*\(/.test(src));
});

test('compile: expressions in x, precedence, and domain errors become NaN for the plot to break on', () => {
  const f = (s) => E.fnOf(s);
  assert.strictEqual(f('-x^2')(3), -9);
  assert.strictEqual(f('2(x+1)')(3), 8);
  assert.strictEqual(f('(1+1/x)^x')(1), 2);
  assert.ok(close(f('x/sqrt(1+x^2)')(1), Math.SQRT1_2));
  assert.ok(isNaN(f('acos(x)')(2)));
  assert.ok(isNaN(f('sqrt(x)')(-1)));
  assert.strictEqual(f('1/x')(0), Infinity);
  assert.strictEqual(f('e')(123), Math.E);                 // a constant function
  assert.strictEqual(f('x+'), null);
  assert.strictEqual(f('y'), null);
  assert.strictEqual(E.check('x+1'), null);
  assert.ok(/Unknown/.test(E.check('y')));
  assert.ok(E.hasVar(E.parse('2x')) && !E.hasVar(E.parse('2pi')));
});
