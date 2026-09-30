const src=require('fs').readFileSync('main.js','utf8');
global.window = {math: require('/tmp/mj/package/lib/browser/math.js')};
const cut=(a,b)=>src.slice(src.indexOf(a), src.indexOf(b));
const str = x => typeof x === 'string' ? x : (x == null ? '' : String(x));
eval(cut('/* ------------------------------------------------------------------ math checking */','/* ------------------------------------------------------------------ storage */').replace(/^const MX/m,'var MX').replace(/^function machineCheck/m,'global.machineCheck=function'));
eval(cut('const P_FIELDS','function diagPrompt').replace(/^const /mg,'var '));
const sample = `=== PROBLEM
TOPIC: mth-1-4
SKILL: chain rule
DIFFICULTY: 2
TYPE: expression
VARS: x
PROMPT:
Differentiate \\( f(x) = \\sin(x^2) \\).
OPTIONS:
ANSWER: 2*x*cos(x^2)
RUBRIC:
HINT: Outer function sin, inner x^2.
SOLUTION:
By the chain rule, \\( f'(x) = \\cos(x^2)\\cdot 2x \\).
=== END
=== PROBLEM
TOPIC: mth-1-4
SKILL: chain rule
DIFFICULTY: 1
TYPE: numbers
TOLERANCE: 0.0001
PROMPT:
Solve \\(x^2 - x - 6 = 0\\).
ANSWER: 3, -2
HINT: factor
SOLUTION:
(x-3)(x+2)=0
=== END
=== PROBLEM
TOPIC: bogus
SKILL: which test
TYPE: choice
PROMPT:
Which applies?
OPTIONS:
A) Ratio test
B) Root test
C) Integral test
ANSWER: C
SOLUTION:
Because...
=== END
=== PROBLEM
TOPIC: mth-1-4
SKILL: u-sub
TYPE: antiderivative
VARS: x
PROMPT:
Integrate 2x e^{x^2}
ANSWER: e^(x^2)
SOLUTION: u = x^2
=== END
=== PROBLEM
TOPIC: mth-1-4
SKILL: partial`;
const blocks=parseProblemBlocks(sample);
console.log('blocks', blocks.length);
const qs=blocks.map(b=>toProblem(b,['mth-1-4'],'mth-1-4'));
qs.forEach(q=>console.log(q&&q.ptype, q&&q.node, q&&q.answer, q&&q.claudeCheck||false, q&&q.tol));
const [a,b,c,d]=qs;
console.log('expr ok', machineCheck(a,'2x cos(x^2)'), 'expr wrong', machineCheck(a,'cos(x^2)'), 'parse', machineCheck(a,'2x cos(('));
console.log('numbers', machineCheck(b,'-2, 3'), machineCheck(b,'3'), machineCheck(b,'x=3 and x = -2'));
console.log('choice', machineCheck(c,'c'), machineCheck(c,'A'));
console.log('anti', machineCheck(d,'e^(x^2) + C'), machineCheck(d,'exp(x^2)+5'), machineCheck(d,'2e^(x^2)'));
console.log('tex', MX.tex('2x cos(x^2)'), MX.tex('sqrt(x)/2'));
