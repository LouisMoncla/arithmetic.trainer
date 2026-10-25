/*
 * lessons.js — what the Learn tab teaches: one lesson per trick type (generator.js TRICKS).
 * Plain data, no DOM. Each lesson: a one-line example (short), the rule in a sentence or two, and why it works.
 * Worked examples on the lesson page come fresh from Generator.trickQuestion + trickAdvice.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};

  // Page order: groups, then the lessons in each.
  var GROUPS = [
    { name: 'Squares', types: ['sqmem', 'sq5', 'sq50', 'sq100'] },
    { name: 'Products', types: ['diff', 'x11', 'x25', 'near100'] },
    { name: 'Percentages', types: ['pct', 'pctswap'] },
    { name: 'Fractions', types: ['frac', 'dec2frac', 'fracadd', 'fracsub'] }
  ];

  var LESSONS = {
    sqmem: {
      short: 'By heart, built from the square before',
      rule: 'Learn 11² to 30² by heart. They come up all the time, and the other square tricks lean on them.',
      why: 'Build each one from the square before it: (n + 1)² = n² + n + (n + 1). From 20² = 400, 21² = 400 + 20 + 21 = 441.'
    },
    sq5: {
      short: '65² → 6 × 7 = 42, then 25',
      rule: 'For a number ending in 5, multiply the tens digit by the next number up, then write 25 after it. 65² → 6 × 7 = 42 → 4225.',
      why: '(10a + 5)² = 100a² + 100a + 25 = 100 × a(a + 1) + 25.'
    },
    sq50: {
      short: '47² → 22 hundreds + 3²',
      rule: 'For 50 ± d, start from 25 ± d hundreds, then add d². 47² → 25 − 3 = 22 hundreds, plus 9 → 2209.',
      why: '(50 + d)² = 2500 + 100d + d² = 100 × (25 + d) + d².'
    },
    sq100: {
      short: '104² → 108 hundreds + 4²',
      rule: 'For 100 ± d, the hundreds are the number moved d further away from 100, then add d². 104² → 108 hundreds, plus 16 → 10816. 97² → 94 hundreds, plus 9 → 9409.',
      why: '(100 + d)² = 10000 + 200d + d² = 100 × (100 + 2d) + d². When d² is 100 or more, it carries into the hundreds.'
    },
    diff: {
      short: '47 × 53 → 50² − 3²',
      rule: 'When two numbers sit either side of an easy middle, multiply as middle² − gap². 47 × 53 → 50² − 3² = 2500 − 9 = 2491.',
      why: '(m − d)(m + d) = m² − d².'
    },
    x11: {
      short: '11 × 43 → 4, 4 + 3, 3',
      rule: 'For a two-digit number, add its digits and put the sum in between. 11 × 43 → 4, 4 + 3, 3 → 473. If the sum is 10 or more, carry the 1: 11 × 87 → 8 + 1, 5, 7 → 957.',
      why: '11 × n = 10n + n: the tens digit of one copy lines up with the units digit of the other.'
    },
    x25: {
      short: '25 × 36 → 36 ÷ 4, then × 100',
      rule: 'Divide by 4, then multiply by 100. 25 × 36 → 9 → 900. A remainder of 1, 2 or 3 adds 25, 50 or 75: 25 × 37 → 9 remainder 1 → 925.',
      why: '25 = 100 ÷ 4.'
    },
    near100: {
      short: '96 × 93 → 89 hundreds + 4 × 7',
      rule: 'For two numbers just under 100, find how far each is from 100. One number minus the other’s gap gives the hundreds; the gaps multiplied give the rest. 96 × 93 → gaps 4 and 7 → 96 − 7 = 89 hundreds, 4 × 7 = 28 → 8928.',
      why: '(100 − a)(100 − b) = 100 × (100 − a − b) + ab. When ab is 100 or more, it carries: 88 × 89 → 77 hundreds + 132 → 7832.'
    },
    pct: {
      short: '35% of 380 → 10% is 38, × 3.5',
      rule: 'Find 10% by moving the point one place, then scale. 35% of 380 → 10% is 38, 35% is 38 × 3.5 = 133.',
      why: 'p% of n = p × n ÷ 100, so you can split p any way you like: 35 = 30 + 5, 5% is half of 10%.'
    },
    pctswap: {
      short: '8% of 25 → 25% of 8',
      rule: 'a% of b is the same as b% of a. Swap when the other way round is easier. 8% of 25 → 25% of 8 = 2.',
      why: 'Both are a × b ÷ 100.'
    },
    frac: {
      short: '7 ÷ 8 → 7 × 0.125',
      rule: 'Know 1 ÷ d for the usual denominators, then multiply. 1/8 = 0.125, so 7 ÷ 8 = 7 × 0.125 = 0.875. Useful ones: 1/16 = 0.0625, 1/20 = 0.05, 1/25 = 0.04, 1/40 = 0.025.',
      why: 'a ÷ b = a × (1 ÷ b).'
    },
    dec2frac: {
      short: '0.375 → 3 × 0.125 → 3/8',
      rule: 'Find the 1/d that the decimal is a multiple of. 0.375 = 3 × 0.125 = 3/8. Answer in lowest terms.',
      why: 'A decimal with k places is a whole number over 10^k: 0.375 = 375/1000, and dividing both by 125 gives 3/8.'
    },
    fracadd: {
      short: '1/4 + 1/6 → 3/12 + 2/12',
      rule: 'Put both over their lowest common denominator, add the tops, then reduce. 1/4 + 1/6 → 3/12 + 2/12 = 5/12.',
      why: 'Fractions only add over the same denominator. The lowest common one keeps the numbers small, so there is less to reduce.'
    },
    fracsub: {
      short: '5/6 − 1/4 → 10/12 − 3/12',
      rule: 'The same as adding: common denominator, subtract the tops, reduce. 5/6 − 1/4 → 10/12 − 3/12 = 7/12.',
      why: 'a/b − c/d = (ad − bc)/bd; the lowest common denominator is the same idea with smaller numbers.'
    }
  };

  var Lessons = { GROUPS: GROUPS, LESSONS: LESSONS };
  AT.Lessons = Lessons;
  if (typeof module !== 'undefined' && module.exports) module.exports = Lessons;
})();
