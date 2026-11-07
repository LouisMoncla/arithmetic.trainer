// Dev only: print sample questions per finance template to review them by eye.
//   npm run samples                       5 per template
//   npm run samples -- fin.bond.price.2y  one template (a prefix works: "quant", "fin.var")
//   npm run samples -- quant 3            3 per template
// Not deployed (.vercelignore). Seeds are printed, so any question can be reopened at #finance/q/<id>/<seed>.
const F = require('../js/finance-templates.js');
try { require('../js/finance-bank.js'); } catch (e) { /* the bank is optional here */ }

const filter = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : '';
const count = Number(process.argv.find((a, i) => i >= 2 && /^\d+$/.test(a))) || 5;

for (const t of F.list().filter((x) => x.id.startsWith(filter))) {
  console.log('\n=== ' + t.id + '  (' + t.category + ', difficulty ' + t.difficulty + ')' + (t.formula ? '  ' + t.formula : ''));
  for (let i = 1; i <= count; i++) {
    const seed = Math.imul(i, 2654435761) >>> 0, q = F.make(t.id, seed);
    // Plain-text twins: the maths written out (σ, √, x², fractions as a / b).
    console.log('\n  #' + seed + '  ' + q.promptText + (q.ask ? '  [' + q.ask + ']' : ''));
    if (q.kind === 'choice') q.optionsText.forEach((o, k) => console.log('    ' + (k + 1) + (k === q.correct ? ' ✓ ' : '   ') + o));
    if (q.kind === 'choice') q.stepsText.forEach((s) => console.log('    ' + s));
    else {
      q.stepsText.forEach((s) => console.log('    ' + s));
      console.log('    wrong options: ' + q.distractors.map((d) => (typeof d === 'number' ? F.withUnit(F.fmt(d, q.dp), q.unit) : d)).join(' | '));
    }
    if (q.whyText) console.log('    why: ' + q.whyText);
  }
}
