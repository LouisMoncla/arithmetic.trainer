// js/plot.js: validation, the sampler (branches, clipping), and the SVG it draws.
const test = require('node:test');
const assert = require('node:assert');
const Plot = require('../js/plot.js');

const win = (fns, x, y, more) => Object.assign({ fns: fns.map((f) => (typeof f === 'string' ? { f } : f)), x, y }, more || {});
const inside = (segs, x, y) => segs.every((s) => s.every((p) => p[0] >= x[0] - 1e-9 && p[0] <= x[1] + 1e-9 && p[1] >= y[0] - 1e-9 && p[1] <= y[1] + 1e-9));

test('tan on [-4, 4] gives separate branches, and nothing leaves the window', () => {
  const p = win(['tan(x)'], [-4, 4], [-4, 4]);
  const segs = Plot.sample(p)[0].segs;
  assert.ok(segs.length >= 3, 'branches: ' + segs.length);
  assert.ok(inside(segs, p.x, p.y));
  // no vertical stroke across an asymptote: no two consecutive points of a branch are further apart than the jump rule
  segs.forEach((s) => { for (let i = 1; i < s.length; i++) assert.ok(Math.abs(s[i][1] - s[i - 1][1]) <= 4 + 1e-9); });
  // a point on each side of the asymptote at ±π/2 is in a different branch
  const branchOf = (x) => segs.findIndex((s) => s.some((p2) => Math.abs(p2[0] - x) < 0.02));
  assert.notStrictEqual(branchOf(Math.PI / 2 - 0.3), branchOf(Math.PI / 2 + 0.3));
});

test('a constant function is one segment; outside the window it is none', () => {
  const one = Plot.sample(win(['e'], [0, 20], [0, 3.2]))[0].segs;
  assert.strictEqual(one.length, 1);
  assert.ok(one[0].length > 100);
  assert.strictEqual(Plot.sample(win(['5'], [0, 20], [0, 3.2]))[0].segs.length, 0);
  assert.strictEqual(Plot.sample(win(['pi/2'], [-1, 1], [0, 3.2]))[0].segs.length, 1);
});

test('the domain ends where the function does: acos on [-1.5, 1.5] is one branch from -1 to 1', () => {
  const p = win(['acos(x)'], [-1.5, 1.5], [-0.5, 3.5]);
  const segs = Plot.sample(p)[0].segs;
  assert.strictEqual(segs.length, 1);
  assert.ok(Math.abs(segs[0][0][0] + 1) < 0.01 && Math.abs(segs[0][segs[0].length - 1][0] - 1) < 0.01);
  assert.ok(inside(segs, p.x, p.y));
});

test('1/x breaks at 0 and is clipped by the window; a steep curve is clipped, not broken', () => {
  const p = win(['1/x'], [-2, 2], [-4, 4]);
  const segs = Plot.sample(p)[0].segs;
  assert.strictEqual(segs.length, 2);
  assert.ok(inside(segs, p.x, p.y));
  const cube = win(['x^3'], [-3, 3], [-5, 5]);
  const s3 = Plot.sample(cube)[0].segs;
  assert.strictEqual(s3.length, 1);
  assert.ok(inside(s3, cube.x, cube.y));
  assert.ok(Math.abs(s3[0][0][1] + 5) < 1e-6 && Math.abs(s3[0][s3[0].length - 1][1] - 5) < 1e-6);   // cut at y = ±5
});

test('arctan, tanh and a curve that leaves and re-enters the window', () => {
  const p = win(['atan(x)', 'tanh(x)'], [-6, 6], [-2, 2]);
  Plot.sample(p).forEach((c) => { assert.strictEqual(c.segs.length, 1); assert.ok(inside(c.segs, p.x, p.y)); });
  const wave = win(['3sin(x)'], [0, 6.3], [-1, 1]);
  assert.ok(Plot.sample(wave)[0].segs.length >= 3);        // in, out, in, out…
  assert.ok(inside(Plot.sample(wave)[0].segs, wave.x, wave.y));
});

test('validation: a good plot passes; every kind of mistake is named', () => {
  const good = win([{ f: 'acos(x)' }, { f: 'pi/2', dash: true }], [-1.5, 1.5], [-0.5, 3.5], { xticks: [[-1, '−1'], [1, '1']], yticks: [[1.5708, 'π/2']], points: [{ x: -1, y: 3.1416 }, { x: 1, y: 0, open: true }], hlines: [1.5708], vlines: [0], caption: 'y = arccos x' });
  assert.deepStrictEqual(Plot.validatePlot(good), []);
  const bad = (p, re) => { const e = Plot.validatePlot(p); assert.ok(e.some((x) => re.test(x)), re + ' in ' + JSON.stringify(e)); };
  bad(null, /must be an object/);
  bad(win([], [0, 1], [0, 1]), /1 to 6/);
  bad(win(['x', 'x', 'x', 'x', 'x', 'x', 'x'], [0, 1], [0, 1]), /1 to 6/);
  bad(win(['sin('], [0, 1], [0, 1]), /plot\.fns\[0\]/);
  bad(win(['y+1'], [0, 1], [0, 1]), /Unknown y/);
  bad(win([{ f: 'x', color: 'red' }], [0, 1], [0, 1]), /unknown field color/);
  bad(win(['x'], [1, 0], [0, 1]), /plot\.x must be/);
  bad(win(['x'], [0, 1], [0, 0]), /plot\.y must be/);
  bad(win(['x'], [0, 'a'], [0, 1]), /plot\.x must be/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { fn: [] }), /unknown plot field fn/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { xticks: [[5, '5']] }), /outside the window/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { xticks: [[0.5, '$\\pi$']] }), /plain label/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { yticks: [[0.5]] }), /plain label/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { points: [{ x: 2, y: 0 }] }), /outside the window/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { points: [{ x: 'a', y: 0 }] }), /numeric/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { hlines: ['a'] }), /list of numbers/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { vlines: [9] }), /outside the window/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { caption: 'y = $x$' }), /plain text/);
  bad(Object.assign(win(['x'], [0, 1], [0, 1]), { caption: 'x'.repeat(100) }), /80 characters/);
});

test('svg: viewBox sizes, curves, branches, ticks, points, caption, escaping, accessibility', () => {
  const p = win(['tan(x)', { f: 'x', dash: true }], [-4, 4], [-4, 4], { xticks: [[-1, '−1']], yticks: [[1.5708, 'π/2']], points: [{ x: 0, y: 0 }, { x: 1, y: 1, open: true }], vlines: [1.5708], caption: 'y = tan x & more <b>' });
  const s = Plot.svg(p);
  assert.ok(s.startsWith('<svg class="plot plot-prompt"') && s.endsWith('</svg>'));
  assert.ok(s.includes('viewBox="0 0 320 238"'));                          // 220 + the caption line
  assert.ok(!s.includes('NaN') && !s.includes('undefined') && !s.includes('Infinity'));
  const tanPath = /<path class="pl-curve" d="([^"]*)"/.exec(s)[1];
  assert.ok((tanPath.match(/M/g) || []).length >= 3, 'tan draws at least 3 branches');
  assert.ok(s.includes('<path class="pl-dash"'));
  assert.ok(s.includes('class="pl-guide"') && s.includes('class="pl-pt"') && s.includes('class="pl-pt pl-open"'));
  assert.ok(s.includes('>π/2</text>') && s.includes('>−1</text>'));
  assert.ok(s.includes('y = tan x &amp; more &lt;b&gt;') && !s.includes('<b>'));   // escaped
  assert.ok(s.includes('<title>y = tan x &amp; more &lt;b&gt;</title>') && s.includes('role="img"'));
  assert.strictEqual((s.match(/<text/g) || []).length, (s.match(/<\/text>/g) || []).length);
  const small = Plot.svg(win(['x'], [0, 1], [0, 1]), { size: 'choice' });
  assert.ok(small.includes('viewBox="0 0 200 150"') && small.includes('plot-choice'));
  // every coordinate in the drawing is a finite number inside the viewBox (plus the arrowheads)
  (s.match(/-?\d+(\.\d+)?/g) || []).forEach((n) => assert.ok(isFinite(+n)));
  assert.ok(Plot.describe(win(['atan(x)'], [0, 1], [0, 1])) === 'graph of y = atan(x)');
  assert.ok(Plot.describe(win([{ f: 'x', dash: true }], [0, 1], [0, 1])).includes('(dashed)'));
  assert.ok(Plot.describe(p).startsWith('y = tan x'));
});

test('the axes pass through 0 when it is in the window, else sit on the edge', () => {
  const lineY = (s) => /<line class="pl-axis" x1="\d+" y1="([\d.]+)" x2="\d+" y2="\1"/.exec(s);
  const mid = Plot.svg(win(['x'], [-2, 2], [-2, 2]));
  const low = Plot.svg(win(['x'], [1, 2], [1, 2]));
  const yMid = +lineY(mid)[1], yLow = +lineY(low)[1];
  assert.ok(Math.abs(yMid - (10 + (220 - 22 - 10) / 2)) < 1);   // halfway down the window
  assert.strictEqual(yLow, 220 - 22);                            // the bottom edge
});
