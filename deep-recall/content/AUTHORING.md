# Deep Recall: authoring a topic

You are writing one chapter of a textbook that a single serious adult learner will study. He is a math major (community college, transferring to a university), currently taking Logic & Proof (MHF 3302), Calculus II (MAC 2312) and calculus-based Physics I (PHY 2048). He wants to be taught, rigorously, and to write his own answers. He has said plainly:

- "Entertaining does not mean it reduces the standard. The aim is to teach me, not make humorous statements." No jokes, no cute or clickbait titles, no rhetorical gimmicks, no "fun facts".
- A first encounter with a topic must not be a paragraph of disconnected facts to memorize. It must be **logically constructed**: start from the problem the topic exists to solve, then build the ideas in the order in which each one is needed.
- Use the discipline's real nomenclature, so he learns the words the field uses. Every technical term is introduced precisely (bold on first use), and every one also goes in `terms`.
- Answers should mostly be written by him. Multiple choice is the exception, not the rule.
- Everything must be correct. You research each topic individually and verify every claim, formula and answer.

## Process for each topic (do all of it)

1. **Research.** Before writing, consult at least two authoritative sources for this specific topic with WebSearch/WebFetch. Good sources: OpenStax (Calculus Vol. 2, University Physics Vol. 1), Hammack's *Book of Proof* (free), MIT OpenCourseWare notes, Paul's Online Math Notes, HyperPhysics, the Stanford Encyclopedia of Philosophy, standard syllabi for the matching university course. Use them to decide scope, ordering, standard notation, standard definitions, and typical problem types. **Do not copy text**; write your own. List what you consulted in `sources`.
2. **Outline.** Break the topic into 6–14 knowledge points (`kps`): atomic, testable units in teaching order.
3. **Write** the sections (see register rules below).
4. **Verify.** Every numeric or symbolic answer must be computed, not recalled: use Python with sympy (`python3 -c ...`; sympy is installed). Check every definition and theorem statement against a source. Check that every worked example's arithmetic is right.
5. **Validate**: `node /home/user/vibe-code/deep-recall/content/validate.mjs <key>`. Fix everything it reports until it prints `OK`. Then `node /home/user/vibe-code/deep-recall/content/plots.mjs` to confirm every graph draws. Don't put `\\"` in strings (a raw-string artifact that renders as a visible backslash): write plain `"`.

## Register and pedagogy

- Serious, precise, scholarly, readable. The voice of an excellent university lecturer writing their own lecture notes. Second person is fine. No exclamation marks, no "fascinating", "amazing", "mind-blowing", "let's dive in", no jokes.
- `intro` (80–180 words): the problem this topic addresses and why the discipline needed these ideas, stated plainly and concretely. It may pose the central question, but seriously, not as a teaser. No definitions dump.
- Sections: each opens with what it is for (the question it answers or the task it enables), then develops the idea: precise definition or statement, the reasoning or proof sketch behind it, at least one fully worked example with every step, the common mistake and why it happens. 300–750 words per section, 4–7 sections per topic.
- Build logically: nothing is used before it is introduced; later sections rely on earlier ones explicitly ("Using the product rule from the previous section…").
- Math: LaTeX only, inline `\( ... \)`, display `\[ ... \]`. Never `$`. Never keyboard notation (x^2, sqrt(), *, <=, ->) in prose. Markdown for structure: `**bold**` for a term on first use, lists where they help, `> ` for a formal definition or theorem statement is fine.
- Graphs: where a picture genuinely helps (functions, areas, series partial sums, vectors, motion graphs), include a fenced block:
  ````
  ```plot
  x: -1, 4
  y: -1, 6
  f: x^2 | y = x²
  shade: x^2, 0, 2 | area
  slider: a, 0, 3, 1 | a
  f: 2*a*(x - a) + a^2 | tangent at x = a
  point: a, a^2
  ```
  ````
  Keys: `x`, `y` (ranges), `f` (curve, mathjs ASCII: `*`, `^`, `sqrt()`, `sin()`, `exp()`, `log()` natural log, `pi`), `point: x, y`, `vline`, `hline`, `shade: expr, a, b`, `vector: (x0,y0) -> (x1,y1)`, `param: fx; fy` with `t: a, b`, `field: dy/dx expr`, `slider: name, min, max, start` (a single letter other than x, y, t; usable in any other line). Text after `|` is a label. At most 4 curves. Use a slider when the point is how something changes, and say in the text what to drag and what to watch.
- Epistemic status: where a claim is not settled, say so.

## Questions (the learner answers these)

Each section has 1–3 `questions`; the topic also has `practice` (8–12, a question bank for later practice sessions) and `exam` (4–6, strict, used in the course exam). Every question tests a knowledge point (`kp`).

Types:
- `written`: he writes the answer (explanations, proofs, justifications, definitions in his own words, derivations). Give `rubric`: 2–5 specific points a fully correct answer must contain, and `model`: a complete model answer. **This is the default for proofs, logic, concepts, and anything philosophical or historical.**
- `expression`: he types a symbolic answer. `answer` in mathjs ASCII (e.g. `2*x*cos(x^2)`), `vars` (e.g. `"x"`). Used for derivatives, closed forms, simplified expressions. Verified by numeric equivalence.
- `antiderivative`: like expression, equivalence up to a constant.
- `number`: a single numeric answer; `answer` is an exact mathjs expression (`1/3`, `sqrt(2)`, `9.8*2`) or decimal; optional `tol` (relative tolerance, default 0.001 when decimals are involved).
- `numbers`: a set of numbers (roots etc.), `answer` comma-separated.
- `mcq`: only when every option is a plausible, diagnostic answer that reveals a specific misconception; 4 options, `answer` = zero-based index. At most 1 per section and at most 2 in practice. Never trivial options, never "none of these are different".

Every question has `why`: the worked solution or explanation shown after answering (markdown, LaTeX). Question prompts are specific and demanding: not "What is X?" but "State X precisely and explain why condition Y is needed", "Prove…", "Compute…, showing the substitution you use", "Explain why the following argument fails…". For `mth-6` (logic and proof) most questions are `written` proofs or truth-table/logic reasoning. For calculus and physics mix `expression`/`number` computations with `written` justifications (convergence arguments, free-body reasoning, why a method applies).

## Flashcards (`cards`)

12–25 per topic, spaced-repetition quality: one fact or skill per card, unambiguous, answerable from memory in under 30 seconds.
- `term`: front = the term (or "Define: …"), back = precise definition.
- `formula`: front = what the formula is for ("Integration by parts formula"), back = the formula in LaTeX.
- `concept`: front = a precise question ("Why does the ratio test say nothing when L = 1?"), back = the short answer.
- `problem`: front = a small computation ("\\( \\int x e^{x}\\,dx \\)"), back = the answer and the key step; also give `answer` (mathjs ASCII) and `vars` when it is machine-checkable, plus `check`: "expression" | "antiderivative" | "number".
Each card has `kp`.

## Toolkit (`kit`)

The reference card he checks when stuck: `rules` (5–12: `name`, `formula` (LaTeX or statement), `when`, `example`, `watch`), `stuck` (3–6 concrete moves). (Terms live in `terms`.)

## File format

Write **one JSON file per topic** at `/home/user/vibe-code/deep-recall/content/topics/<key>.json`. Generate it from a Python script with `json.dump(obj, f, ensure_ascii=False, indent=1)` so LaTeX backslashes are escaped correctly (write strings as Python raw strings `r"..."`). Schema:

```json
{
 "key": "mth-2-3", "title": "exact topic title", "v": 1,
 "scope": "one sentence: what is in and out of scope",
 "sources": [{"title": "...", "url": "https://..."}],
 "pre": ["optional prerequisite topic keys from the course spec, e.g. mth-1-4"],
 "kps": [{"id": "k1", "t": "short name (≤8 words)", "d": "what the learner must be able to do", "type": "concept|mechanism|procedure|fact|distinction|debate|skill"}],
 "intro": "markdown",
 "sections": [{"id": "s1", "title": "...", "kps": ["k1","k2"], "md": "markdown", "questions": [Q]}],
 "terms": [{"t": "term", "d": "precise definition", "ex": "optional usage note or example"}],
 "cards": [{"id": "c1", "type": "term|formula|concept|problem", "front": "...", "back": "...", "kp": "k1"}],
 "practice": [Q],
 "exam": [Q],
 "kit": {"rules": [{"name": "...", "formula": "...", "when": "...", "example": "...", "watch": "..."}], "stuck": ["..."]}
}
```
Q = `{"id": "q1", "kp": "k1", "type": "written|expression|antiderivative|number|numbers|mcq", "prompt": "markdown", "why": "markdown", ...type fields}`. Question ids must be unique within the topic (`s1q1`, `p3`, `e2` style is fine).

Every `kp` in the outline must be taught in some section and tested by at least one question somewhere.
