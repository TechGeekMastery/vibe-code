/* ------------------------------------------------------------------ prompts */
const HOUSE = `You write for "Deep Recall", a rigorous self-study app. The learner is a sharp adult who wants genuine understanding: causal mechanisms, the reasons behind facts, and how experts actually think about the topic.
Rules:
- Explain mechanisms and causal structure. Every "what" gets a "why".
- Concrete beats abstract: specific examples, numbers, dates, names, worked cases.
- Where the epistemic status of a claim isn't obvious, tag it inline as [Established], [Inferred], or [Contested]. On contested questions, give the strongest version of each serious position and its evidence, then say where the evidence actually points.
- Neither defer to institutional consensus by default nor oppose it by default: weigh evidence, incentives, and track record.
- No filler, no motivational language, no moralizing, no stock phrases like "it's important to note".
- Define each technical term on first use.
- Math: every expression, symbol, number with an exponent or unit, and formula in LaTeX inside \\( \\) or \\[ \\] (in JSON, use the Unicode symbols instead). Never keyboard notation: no x^2, sqrt(), *, <=, ->, 3/4 for fractions in prose.`;
/* rigor and pull are compatible: how the writing earns attention */
const ENGAGE = `How to make it gripping without giving up any rigor:
- Lead with a question the reader wants answered: a puzzle, an anomaly, a real case with stakes, a prediction that turns out wrong, the moment someone in history got stuck. Never open with a definition, a list of facts, or "X is...".
- Make the reader think before you tell them: pose it, let them guess, then resolve it.
- The explanation is the resolution: mechanism and evidence (how we know), carried by one concrete case followed all the way through, not a catalogue of facts.
- Name things after the reader already grasps them: introduce a term when the story needs a word for it, and define it in plain words woven into the sentence. At most one parenthetical per sentence; don't define everyday words.
- Vary rhythm; short sentences for the key moves. Address the reader as "you". The voice of a brilliant teacher who finds this genuinely interesting, not a textbook and not a hype piece: no exclamation marks, no "fascinating", no "amazing".
- Every paragraph earns its place. If a fact doesn't serve the question, cut it.`;
const depthLine = () => (DEPTHS[Store.profile.depth] || DEPTHS.rigorous).prompt;
const topicLine = info => `"${info.title}" (${info.program ? 'course' : 'unit'} "${info.unit}" of the subject "${info.subject.name}")`;
const gapLines = gaps => gaps.map((g, i) => `${i + 1}. ${g.concept}: ${g.detail}${(g.hits || 1) > 1 ? ` (missed ${g.hits} times)` : ''}`).join('\n');
const QSCHEMA = `Question schemas (JSON):
{"type":"mcq","prompt":"...","options":["...","...","...","..."],"answer":<index of correct option>,"explanation":"why the answer is right, 2-3 sentences","traps":[<one entry per option: null for the correct one; for each wrong one, one sentence on the misconception that makes it tempting>],"gap":"short label of the concept tested, max 6 words"}
{"type":"recall","prompt":"asks the learner to explain a mechanism or reason in their own words","rubric":["key idea 1","key idea 2","key idea 3"],"model":"model answer, 2-5 sentences","gap":"..."}
{"type":"apply","prompt":"a NEW concrete scenario the learner must reason through using the concepts","rubric":["..."],"model":"...","gap":"..."}
{"type":"order","prompt":"Put these in order: ...","items":["first","second","third","fourth"],"explanation":"...","gap":"..."}
Every wrong mcq option must be something a specific misconception would produce, not an obviously silly answer. Vary the position of the correct option. ${NOTATION}`;

function researchPrompt(info) {
  return `You are researching current sources for a lesson on ${topicLine(info)}. Today is ${new Date().toDateString()}.
Use the web tools: run 2 to 4 targeted searches, then read the 1 to 3 most authoritative pages. Prefer primary sources, official data, and reputable recent reporting, and note dates.
After researching, write a research brief: 8 to 15 bullets of specific facts, figures, and developments, especially anything from the last two years that changes the picture. End each bullet with its source as a Markdown link [title](url). Output the brief as your final message.`;
}
function lessonPrompt(info, gaps, brief, source) {
  const o = Store.outlines[info.key];
  return `${HOUSE}
${ENGAGE}
Level: ${depthLine()}

Write the lesson ${topicLine(info)}.
${gaps.length ? `The learner has shown these specific gaps on this topic. Repair each one explicitly inside the lesson:\n${gapLines(gaps)}\n` : ''}${brief ? `Current sources, gathered from a web search just now. Prefer them over older knowledge for anything recent, and cite them:\n"""\n${brief}\n"""\n` : ''}${source ? `The learner is studying this SOURCE (${source.title}${source.url ? ', ' + source.url : ''}). Build the lesson around what the source says: explain its key claims and arguments, add the context and mechanisms it assumes, and say plainly where the source is wrong, outdated, one-sided, or contested. Quote it sparingly.\n"""\n${String(source.text).slice(0, 40000)}\n"""\n` : ''}${info.program ? 'This is a problem-solving topic. At least two sections must contain fully worked examples of increasing difficulty with every step shown, and name the common mistakes at each step.\n' : ''}${info.skills ? 'This is a hands-on practical skill. Include safety points where relevant, the tools and parts involved, what correct results look and measure like, and how to troubleshoot when it goes wrong. Keep any electrical work to low-voltage DC; for mains electricity teach concepts and hazards only, never live work.\n' : ''}${info.program ? PLOT_DOC + '\n' : ''}
Use exactly this Markdown format:

# ${info.title}
One or two sentences: a puzzle, paradox, or sharp question that this lesson resolves.

${o ? `This topic has a frozen syllabus of ${o.kps.length} knowledge points, anchored to ${o.ref}${o.obj ? ' and the official objective "' + o.obj + '"' : ''}. Teach EVERY one, in this order, at full depth:\n${o.kps.map(k => k.id + ': ' + k.t + ': ' + k.d).join('\n')}\n\nUse one section per 2 to 4 knowledge points (as many sections as that takes). End each section heading with the ids it covers in square brackets, e.g. "## Block cipher modes [k4,k5]".` : 'Then 3 to 5 sections.'} Each section:
## <section heading>
<200-400 words. Open with the question or case this section resolves, then resolve it. Short paragraphs; lists only where they help; **bold** for key terms. Depth over breadth: the mechanism, a concrete case, and the exact point where people go wrong.>
CHECK: <a retrieval question on this section that requires recalling or reasoning, not yes/no>
ANSWER: <model answer, 1-3 sentences>

Then these closing sections, in this order:
## Common misconceptions
<3-4 bullets: the wrong model, and why it fails>
## Settled vs. contested
<2-4 bullets, each starting with [Established], [Inferred], or [Contested]>
## Connections
<2-3 bullets linking this to other fields or topics>
## Key points
<5-8 bullets, each one atomic, specific, testable claim>
${brief || (source && source.url) ? '## Sources\n<the sources you used, as Markdown links>\n' : ''}
Math: inline \\( ... \\), display \\[ ... \\]. Never use $ for math. Write nothing before the title line.`;
}
function questionsPrompt(info, lessonMd, pretest) {
  const n = pretest ? 6 : 7;
  return `${HOUSE}
Level: ${depthLine()}

Create a practice set on ${topicLine(info)}.
${pretest
  ? 'The learner has NOT studied this yet. This is a pre-test to find what they already know and what they are missing, so cover the core ideas of the topic at the stated level.'
  : `Base it on this lesson the learner just studied, but test understanding, not memory of the lesson's wording:\n"""\n${String(lessonMd).slice(0, 24000)}\n"""`}
${kpBlock(info.key, n, 'json')}
${openGapsFor(info.key).length ? `Known gaps for this learner on this topic (include at least one question on them):\n${gapLines(openGapsFor(info.key).slice(0, 4))}` : ''}

Write ${n} questions. Target understanding: mechanisms, "why" questions, predictions, applying concepts to new cases. Avoid trivia.
Mix: 3 mcq, 2 recall, ${pretest ? '1 apply' : '1-2 apply, and at most one order question if the topic has a genuine sequence (process, causal chain, or chronology)'}. Order from easier to harder.

${QSCHEMA}

Reply with only JSON: {"questions":[...]}`;
}
function reviewPrompt(items) {
  const blocks = items.map(({info, node}) => { const t = kpTargets(info.key, 3); return `- node "${info.key}": ${topicLine(info)}${t.length ? '\n  Knowledge points due (test these; put the id in "kp"): ' + t.map(k => k.id + ' ' + k.t).join('; ') : node.keyPoints && node.keyPoints.length ? '\n  Key points studied:\n' + node.keyPoints.slice(0, 8).map(k => '  • ' + k).join('\n') : ''}`; }).join('\n');
  return `${HOUSE}
Level: ${depthLine()}

Write a spaced-review session: 2 questions per topic below (${items.length * 2} total). These test long-term retention, so favor free recall and application over recognition: at most one third multiple choice. Ask from new angles rather than restating the key points.
Topics:
${blocks}

${QSCHEMA}
Every question must also include "node": the node id it tests (e.g. "${items[0].info.key}"). Interleave the topics.

Reply with only JSON: {"questions":[...]}`;
}
function diagnosticPrompt(s) {
  const list = nodeKeys(s).map(k => { const i = nodeInfo(k); return `- "${k}": ${i.title} (unit: ${i.unit})`; }).join('\n');
  return `${HOUSE}
Level: ${depthLine()}

Write a 10-question diagnostic for the subject "${s.name}" to map what the learner already knows. Spread the questions across the course (at most one per lesson), weighted toward the foundational lessons. Each question should discriminate real understanding from surface familiarity.
Lessons (node ids):
${list}

Mix about 5 mcq, 4 recall, 1 apply.
${QSCHEMA}
Every question must also include "node": the node id it tests.

Reply with only JSON: {"questions":[...]}`;
}
function repairPrompt(info, gaps) {
  return `${HOUSE}
Level: ${depthLine()}

The learner has these knowledge gaps on ${topicLine(info)}:
${gapLines(gaps)}

Write a targeted repair. For each gap: start from the wrong or missing mental model that most likely produced it, show exactly why it fails, then build the correct model with a concrete contrasting example.
Then write 2 questions per gap that test whether the repair worked.

${QSCHEMA}
Each question must also include "gapIndex": the 1-based number of the gap it targets.

Reply with only JSON: {"lesson":"Markdown, 200-500 words, one ### heading per gap, math in real notation (x², √, ≤, →), never keyboard forms","questions":[...]}`;
}
function gradePrompt(q, answer, info) {
  return `You are grading a free-response answer in a rigorous study app. Topic: ${info ? topicLine(info) : 'general'}.
Question: ${q.prompt}
Rubric, the key ideas a complete answer contains:
${q.rubric.map((r, i) => `${i + 1}. ${r}`).join('\n')}
Model answer: ${q.model}

Learner's answer:
"""
${String(answer).slice(0, 6000)}
"""

Grade strictly but fairly. Credit correct paraphrases and valid reasoning the rubric didn't anticipate. Don't credit vague gestures toward an idea. If the answer contains a factual error or a wrong causal model, say so directly.
${info ? rootSnippet(info.key) : ''}
Reply with only JSON:
{"hits":[true or false for each rubric item, in order],"score":<0.0 to 1.0>,"verdict":"correct" | "partial" | "incorrect","feedback":"2-4 sentences to the learner: what was right, what was missing or wrong, and the key correction","gaps":[{"concept":"short label, max 6 words","detail":"one sentence on what the learner doesn't yet understand"}],"misconception":"the specific wrong model the answer reveals, or null","root_topic":null,"root_reason":null}
"gaps" is empty when the answer is complete. List at most 2 gaps. ${NOTATION}`;
}
function curriculumPrompt(topic) {
  return `Design a rigorous self-study course on: "${topic}".
Level: ${depthLine()}
Lessons should build on each other and run from foundations to current debates or frontier questions. Give each lesson a specific title that names its actual content (never "Introduction to X" or "Overview").
Reply with only JSON:
{"name":"short subject name, max 28 characters","blurb":"one sentence on what the course covers","units":[{"t":"unit title","n":["lesson title","lesson title","lesson title","lesson title"]}]}
Use 3 or 4 units with 3 to 5 lessons each.`;
}

/* ---- problem sets (plain-text block format: no JSON, so LaTeX survives) */
const DIFF_TEXT = {1:'1 = direct application of one technique', 2:'2 = multi-step, combines two ideas', 3:'3 = exam-hard: several steps, the learner must choose the method, may combine topics'};
function problemsPrompt(opts) {
  const topics = opts.topics;
  const tlist = topics.map(i => `- ${i.key}: ${i.title} (${i.unit})`).join('\n');
  const mistakes = [];
  topics.forEach(i => { const n = Store.nodes[i.key]; (n && n.miss || []).slice(0, 3).forEach(m => mistakes.push(`- [${i.key}] ${m.p} (learner answered ${m.a || 'nothing'}; correct: ${m.e})`)); });
  const gaps = [];
  topics.forEach(i => openGapsFor(i.key).slice(0, 3).forEach(g => gaps.push(`- [${i.key}] ${g.concept}: ${g.detail}`)));
  return `You write problem sets for "Deep Recall", a rigorous self-study app. Level: ${depthLine()}
${opts.intro || ''}
Topic ids:
${tlist}

Write ${opts.n} problems. ${opts.distribution || ''}
Difficulty: ${opts.difficultyText}. Scale: ${DIFF_TEXT[1]}; ${DIFF_TEXT[2]}; ${DIFF_TEXT[3]}.
${opts.kp || ''}
${gaps.length ? `Open knowledge gaps to target:\n${gaps.join('\n')}\n` : ''}${mistakes.length ? `Recent mistakes (write fresh problems that exercise the same skills):\n${mistakes.join('\n')}\n` : ''}${opts.extra || ''}
Problems must be solvable by hand, have one unambiguous answer, and practice real technique. Vary the skills. Use realistic numbers.
${opts.skills ? 'This is a hands-on track: mix component and circuit calculations with troubleshooting scenarios (describe the symptom and the measurements, and ask for the most likely fault or the next measurement to take, as a choice problem) and safety judgments. Low-voltage DC only.\n' : ''}A PROMPT or SOLUTION may include one graph when it genuinely helps (use it in at most a third of the problems).
${PLOT_DOC}

Answer TYPE rules:
- expression: the answer is an algebraic expression in VARS. Write ANSWER in plain ASCII math that a calculator parser reads: * ^ / sqrt() exp() ln() sin() cos() tan() asin() acos() atan() abs() pi e, with explicit parentheses. Example: 2*x*cos(x^2)
- antiderivative: an indefinite integral. ANSWER is one antiderivative without "+ C".
- number: one numeric value. ANSWER as a number or ASCII expression (3/4, sqrt(2)/2, 4.9). If it has units, state in PROMPT which units to answer in. TOLERANCE is the allowed relative error: 0.0001 for exact values, 0.01 to 0.02 for values computed from measured data or constants.
- numbers: several values (e.g. all solutions); ANSWER comma-separated, order ignored.
- choice: 3 to 5 options listed under OPTIONS as "A) ...", ANSWER is the letter. Use only when the answer is not numeric or symbolic (a concept, a sign, a classification, which test applies).
- proof: a short proof or justification, graded against RUBRIC.
${topics.some(i => i.code) ? `- code: the learner writes Python (standard library only). STARTER is the skeleton they start from (function signature and docstring). TESTS are 5 to 8 plain Python assert statements, including edge cases, that call their code. REFERENCE is a complete correct solution that passes every test. ANSWER: code. Most problems in this track should be code; use choice or number for "what does this print / what is the complexity" questions.\n` : 'Prefer expression, antiderivative, number, and numbers. Use choice and proof sparingly.'}

Write each problem exactly in this format, with no other text before, between, or after problems:
=== PROBLEM
TOPIC: <topic id from the list>
SKILL: <the specific technique, 2-5 words, lowercase, e.g. chain rule>
DIFFICULTY: <1, 2, or 3>
TYPE: <expression | antiderivative | number | numbers | choice | proof${topics.some(i => i.code) ? ' | code' : ''}>
VARS: <comma-separated variables; expression and antiderivative only>
TOLERANCE: <number and numbers only>
${opts.kp ? 'KP: <knowledge point id>\n' : ''}${opts.gapField ? 'GAP: <the number of the gap this problem targets>\n' : ''}PROMPT:
<the problem in Markdown; math in \\( \\) and \\[ \\]; never $>
OPTIONS:
<choice only>
ANSWER: <per the rules above>
RUBRIC:
<proof only: 2-4 lines, each "- key step">
${topics.some(i => i.code) ? 'STARTER:\n<code only>\nTESTS:\n<code only>\nREFERENCE:\n<code only>\n' : ''}HINT: <one sentence that points toward the method without giving the answer away>
SOLUTION:
<complete worked solution as numbered steps, one step per line starting "1. ", "2. ", …, every step shown, Markdown with \\( \\) math; the last step states the final answer>
=== END`;
}
const P_FIELDS = ['TOPIC', 'KP', 'SKILL', 'DIFFICULTY', 'TYPE', 'VARS', 'TOLERANCE', 'GAP', 'PROMPT', 'OPTIONS', 'ANSWER', 'RUBRIC', 'STARTER', 'TESTS', 'REFERENCE', 'HINT', 'SOLUTION'];
const P_RE = new RegExp('^\\s*(?:#+\\s*)?(?:\\*\\*)?(' + P_FIELDS.join('|') + ')(?:\\*\\*)?\\s*:(?:\\*\\*)?\\s?(.*)$');
function parseProblemBlocks(text) {
  const out = [], re = /={3,}[ \t]*PROBLEM[ \t]*=*[^\n]*\n([\s\S]*?)\n[ \t]*={3,}[ \t]*END(?![ \t]*LESSON)[^\n]*/g;
  let m;
  while ((m = re.exec(text))) {
    const f = {}; let cur = null;
    m[1].split('\n').forEach(line => {
      const h = line.match(P_RE);
      if (h) { cur = h[1]; f[cur] = h[2] || ''; }
      else if (cur) f[cur] += '\n' + line;
    });
    Object.keys(f).forEach(k => { f[k] = f[k].trim(); });
    out.push(f);
  }
  return out;
}
const P_TYPES = ['expression', 'antiderivative', 'number', 'numbers', 'choice', 'proof', 'code'];
const unfence = t => str(t).replace(/^\s*```[a-z]*\s*\n?/i, '').replace(/\n?\s*```\s*$/, '');
function toProblem(f, allowed, fallbackKey) {
  if (!f.PROMPT || !f.SOLUTION) return null;
  const type = String(f.TYPE || '').toLowerCase().trim();
  if (!P_TYPES.includes(type)) return null;
  const node = allowed.includes(f.TOPIC) ? f.TOPIC : (fallbackKey || allowed[0]);
  const q = {type:'problem', ptype:type, node, prompt:f.PROMPT, skill:(str(f.SKILL).toLowerCase().replace(/[.]+$/, '').slice(0, 40) || 'general'),
    difficulty:Math.max(1, Math.min(3, parseInt(f.DIFFICULTY, 10) || 2)), hint:str(f.HINT), solution:f.SOLUTION,
    gapIndex:parseInt(f.GAP, 10) || null, kp:(str(f.KP).match(/k\d+/) || [null])[0], answer:str(f.ANSWER).replace(/^`|`$/g, '').trim()};
  q.answerText = q.answer;
  if (type === 'choice') {
    const opts = [];
    str(f.OPTIONS).split('\n').forEach(l => { const mm = l.match(/^\s*\(?([A-F])[).:]\s*(.*)$/); if (mm) opts.push({k:mm[1], t:mm[2].trim()}); else if (opts.length && l.trim()) opts[opts.length - 1].t += ' ' + l.trim(); });
    const ans = (q.answer.match(/[A-F]/) || [''])[0];
    if (opts.length < 2 || !opts.some(o => o.k === ans)) return null;
    q.options = opts; q.answer = ans; q.answerText = ans + ') ' + opts.find(o => o.k === ans).t;
  } else if (type === 'code') {
    q.tests = unfence(f.TESTS); if (!q.tests || !/assert/.test(q.tests)) return null;
    q.starter = unfence(f.STARTER); q.reference = unfence(f.REFERENCE) || null; q.answerText = 'passes all tests';
  } else if (type === 'proof') {
    q.rubric = str(f.RUBRIC).split('\n').map(l => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean).slice(0, 6);
    if (!q.rubric.length) q.rubric = ['A complete, correct argument'];
  } else {
    if (!q.answer) return null;
    q.vars = str(f.VARS).split(/[,\s]+/).map(v => v.trim()).filter(v => /^[a-zA-Z]\w*$/.test(v));
    q.tol = parseFloat(f.TOLERANCE); if (!(q.tol > 0 && q.tol < 0.2)) q.tol = type === 'number' || type === 'numbers' ? 0.001 : 1e-6;
    if (MX.ok()) {
      const parts = type === 'numbers' ? q.answer.split(/[,;]/) : [q.answer];
      if (!parts.every(p => MX.parses(p))) q.claudeCheck = true;
      if ((type === 'number' || type === 'numbers') && !parts.every(p => isFinite(MX.evalStr(p)))) q.claudeCheck = true;
    }
  }
  return q;
}
function diagPrompt(q, attempts) {
  return `A learner got this problem wrong in a study app.
Problem: ${q.prompt}
Correct answer: ${q.answerText}
Worked solution: ${q.solution}
Learner's attempts, in order: ${attempts.map(a => '"' + a + '"').join(', ')}

Infer the most likely specific error behind their answers (for example: dropped the inner derivative in the chain rule; sign error when distributing; used degrees instead of radians). Compare their answer with the correct one to reverse-engineer it.
${rootSnippet(q.node)}
Reply with only JSON: {"error":"one or two sentences to the learner naming the likely mistake and the fix; use real math notation (x², √, ≤), never keyboard forms","detail":"one sentence on the underlying misunderstanding","root_topic":null,"root_reason":null}`;
}
function equivPrompt(q, input) {
  return `Check a learner's answer in a math study app.
Problem: ${q.prompt}
Expected answer: ${q.answerText}
Learner's answer: ${input}
Is the learner's answer mathematically equivalent to the expected answer (same value, or an equivalent form; for an indefinite integral, differing only by a constant)? Be strict about signs, factors, and domains.
Reply with only JSON: {"equivalent": true or false, "note":"one sentence; real math notation (x², √), not keyboard forms"}`;
}
function photoPrompt(q) {
  return `The image shows a learner's handwritten work on this problem.
Problem: ${q.prompt}
Correct answer: ${q.answerText}
Reference solution:
${q.solution}

Check their work step by step. If it is all correct, say so in one or two sentences. If not, identify the FIRST incorrect step: describe what they wrote, explain exactly what went wrong, and give the correct step. Don't redo the whole solution. If the photo is unreadable, say what you can't read. Markdown; math in \\( \\).`;
}

/* independent answer-key check: solve first, then compare */
function verifyPrompt(q) {
  return `You are checking the answer key of a practice problem before a learner sees it. Solve the problem yourself, independently and carefully, BEFORE looking at the stated answer. Then compare.
Problem:
${q.prompt}
${q.ptype === 'choice' ? 'Options:\n' + q.options.map(o => o.k + ') ' + o.t).join('\n') + '\n' : ''}Answer type: ${q.ptype}${q.vars && q.vars.length ? ' in ' + q.vars.join(', ') : ''}
Stated answer: ${q.answer}

Reply in exactly this format and nothing else:
WORK:
<your own solution, concise>
VERDICT: <correct | wrong | ambiguous>
ANSWER: <if wrong: the correct answer in the same form as the stated one (${q.ptype === 'choice' ? 'a letter' : 'plain ASCII math: * ^ sqrt() ln() pi'}); otherwise repeat the stated answer>
NOTE: <one sentence: if wrong, what the key got wrong; if ambiguous, why the problem has no single answer>
SOLUTION:
<only if wrong: a corrected complete worked solution in Markdown with \\( \\) math>`;
}
function tiebreakPrompt(q, a, b) {
  return `Two careful solvers disagree about the answer to this practice problem. Work it out from scratch with great care, then decide.
Problem:
${q.prompt}
${q.ptype === 'choice' ? 'Options:\n' + q.options.map(o => o.k + ') ' + o.t).join('\n') + '\n' : ''}Answer A: ${a}
Answer B: ${b}

Reply in exactly this format:
WORK:
<your solution>
VERDICT: <A | B | neither | ambiguous>
ANSWER: <the correct final answer, plain ASCII math${q.ptype === 'choice' ? ' (a letter)' : ''}>
SOLUTION:
<complete worked solution in Markdown with \\( \\) math>`;
}
function parseFields(text, fields) {
  const re = new RegExp('^\\s*(?:#+\\s*)?(?:\\*\\*)?(' + fields.join('|') + ')(?:\\*\\*)?\\s*:(?:\\*\\*)?\\s?(.*)$');
  const f = {}; let cur = null;
  String(text).split('\n').forEach(line => { const h = line.match(re); if (h) { cur = h[1]; f[cur] = h[2] || ''; } else if (cur) f[cur] += '\n' + line; });
  Object.keys(f).forEach(k => { f[k] = f[k].trim(); });
  return f;
}

function validateQs(arr, allowed, fallbackKey) {
  if (!Array.isArray(arr)) throw {code:'invalid_json'};
  const out = [];
  for (const q of arr) {
    if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) continue;
    const node = allowed.includes(q.node) ? q.node : (fallbackKey || allowed[0]);
    const base = {type:q.type, prompt:q.prompt, gap:str(q.gap).slice(0, 80) || 'Core concept', node, gapIndex:Number.isInteger(q.gapIndex) ? q.gapIndex : null, kp:/^k\d+$/.test(str(q.kp)) ? str(q.kp) : null};
    if (q.type === 'mcq' && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length) {
      const idx = shuffle(q.options.map((_, i) => i));
      out.push(Object.assign(base, {options:idx.map(i => str(q.options[i])), traps:idx.map(i => Array.isArray(q.traps) && q.traps[i] ? str(q.traps[i]) : null), answer:idx.indexOf(q.answer), explanation:str(q.explanation)}));
    } else if ((q.type === 'recall' || q.type === 'apply') && Array.isArray(q.rubric) && q.rubric.length) {
      out.push(Object.assign(base, {rubric:q.rubric.map(str).slice(0, 6), model:str(q.model)}));
    } else if (q.type === 'order' && Array.isArray(q.items) && q.items.length >= 3 && q.items.length <= 7) {
      out.push(Object.assign(base, {items:q.items.map(str), explanation:str(q.explanation)}));
    }
  }
  if (!out.length) throw {code:'invalid_json'};
  return out;
}


/* ---- independent checks on generated content */
function mcqVerifyPrompt(qs) {
  return `Answer each multiple-choice question below independently and carefully, as an expert would. Don't assume any option is intended.
${qs.map((q, i) => `Q${i + 1}. ${q.prompt}\n${q.options.map((o, j) => `  ${j}) ${o}`).join('\n')}`).join('\n\n')}
Reply with only JSON: {"answers":[<the index of the correct option for each question, in order; -1 if no option is correct or two are>]}`;
}
function lessonAuditPrompt(info, md, o) {
  return `You are the independent fact-checker for a lesson in a rigorous self-study app, reviewing it before learners rely on it. Topic: ${topicLine(info)}. Level: ${depthLine()}
${o ? `The lesson must cover these knowledge points:\n${o.kps.map(k => `${k.id}: ${k.t}: ${k.d}`).join('\n')}\n` : ''}LESSON:
"""
${String(md).slice(0, 36000)}
"""
Find: factual errors; claims that are misleading or oversimplified in a way that would produce a wrong mental model; mislabeled epistemic tags (e.g. [Established] on something contested); wrong math or numbers.${o ? ' Also list the knowledge points the lesson fails to teach adequately.' : ''} Don't nitpick style. If it is sound, return no issues.
Reply with only JSON: {"issues":[{"severity":"error" | "misleading" | "imprecise","quote":"an EXACT substring of the lesson (under 200 characters) that is wrong","fix":"replacement text for exactly that substring, same format","why":"one sentence"}],"uncovered":[${o ? '"knowledge point ids"' : ''}],"verdict":"one sentence"}
At most 8 issues.`;
}
function readinessPrompt(target, infos) {
  return `${HOUSE}
Level: ${depthLine()}
The learner is about to start ${topicLine(target)}. Write a 5-question readiness check on the prerequisite topics below, testing exactly the prior knowledge that topic depends on (not the new topic itself).
Prerequisites (node ids):
${infos.map(i => `- "${i.key}": ${topicLine(i)}`).join('\n')}
Mix about 3 mcq and 2 recall or apply.
${QSCHEMA}
Every question must also include "node": the prerequisite node id it tests.
Reply with only JSON: {"questions":[...]}`;
}
