# Deep Recall: handoff

A personal study app, published as a claude.ai artifact: https://claude.ai/artifact/BZiByjQAQSjPHEmb6Sej1T (version 17 is live).

It is one self-contained HTML page. It runs inside claude.ai and uses the artifact runtime:
- `window.claude.use('sample')`: model calls, with `modelTier` quick/default/complex.
- `db` and `user`: per-user storage at `data/users/<uid>/profile/...`.
- the `mcp` capability: Parallel Search.

Outside claude.ai, the page loads but has no model and no saving. The tests mock all of this.

## Layout
- `src/*.js` and `src/*.css`: the source. `python3 build.py` concatenates the files, sorted by name, into `main.js` (wrapped in an IIFE) and `deep-recall.html`.
  - Any file that calls `Object.assign(ACT, …)` must sort after `17-actions.js`.
- `deep-recall.html`: the build output, which is what gets published.
- **Key files:**
  - `01*`: curriculum (24 subjects, 130 courses, 882 topics).
  - `08*`: the learning model: mastery, stages, FSRS per knowledge point, stats, tiers, and the habit layer.
  - `09-prompts.js`: generation prompts (`HOUSE` and `ENGAGE` style blocks).
  - `12-topic.js`: the topic page (Learn / Toolkit / Progress tabs).
  - `14-tutor.js`: the tutor and study sessions (hidden `<<record|gap|suggest|practice|vocab {json}>>` action lines).
  - `15-sessions.js`: practice, exams and summaries.
  - `17d-bits.js`: "Learn in bits", with the opener and predict-before-reading step.
  - `17e-toolkit.js`: topic toolkits.
  - `17f-habit.js`: study plan, weekly review, workload forecast.
  - `11c-dash.js`: Today, Library, Progress and Settings.
- **Tests** (Node 22 and Playwright with the bundled Chromium):
  - `node ut2.js` runs the unit tests.
  - `node e2e.mjs` runs the end-to-end flows against a mocked `window.claude`.
  - `python3 mkseed.py && node seed.mjs` runs the seeded-state flows (habit layer, sliders, solo cap, predict).
  - `node qa.mjs` crawls for layout overflow.
  - `node qa2.mjs` crawls every flow button.
  - The tests expect local copies of three libraries:
    - mathjs 13.2.0 at `/tmp/mj/package`
    - pyodide 0.26.4 at `/tmp/pyo/package`
    - mathjax 3.2.2 at `/tmp/mjx/package`

    To get them: `npm pack mathjs@13.2.0 pyodide@0.26.4 mathjax@3.2.2`, then untar each package into its folder.
  - Lint: `npx eslint --no-eslintrc -c .eslintrc.json main.js`.
- **Publishing:** re-publish `deep-recall.html` to the same artifact URL from a Claude session that has the Artifact tool. Keep the declared capabilities (`sample`, `db`, `user`, `mcp: Parallel Search`).

## Learner and standing preferences
- Math major, taking Logic & Proof (MHF 3302), Calculus II (MAC 2312) and Physics I (PHY 2048).
- Teaching protocol:
  - one step at a time
  - never give the answer
  - define terms precisely
  - compute the answer independently before judging his
- Proper math notation everywhere (LaTeX or Unicode, never keyboard notation).
- Serious register: rigorous, logically built, no jokes, no clickbait titles.

## Pending request (the next job)
1. **Pre-written textbook.** Every course is pre-written as a researched, fact-checked textbook instead of being generated on demand:
   - each topic is researched individually against at least two authoritative sources;
   - the lesson, its questions and their answers are fixed in advance;
   - it reads like a textbook he works through.
2. **He writes his answers.** Answers are mostly written by him, especially outside math.
   - Claude grades each written answer against a rubric and corrects what is wrong.
   - Math may use answer boxes (expression/number) and occasional multiple choice.
   - Exams are strict: correct or not, with no partial credit.
3. **A side panel in lessons** for asking the "teacher" about the lesson. The free-study conversation per subject already exists (tutor and study sessions).
4. **Field terminology.** Topic-specific terms are taught with precise definitions.
5. **A flashcard deck per topic** (Anki style, FSRS). Cards unlock as lessons are completed: definitions, formulas, small problems.
6. **Fix on-demand generation until content exists.** It still produces gimmicky hooks and weak multiple-choice guesses.
   - Serious register only.
   - Open-response prompts for non-math subjects.
   - A question mix that is mostly written for concept subjects.
7. **Order:** first wave is his current classes (`mth-6` Proof & Discrete Math, `mth-2` Calculus II, `phy-0` Mechanics); then continue course by course through all 130 (philosophy next, since he flagged its first lesson).

## Content pipeline (prepared, not yet run)
- **`content/AUTHORING.md`:** the full authoring spec for writer agents. It covers:
  - audience and register;
  - research and verification (sympy);
  - the per-topic JSON schema: `kps`, `intro`, `sections` with `questions`, `terms`, `cards`, `practice`, `exam`, `kit`;
  - question types: `written` with rubric and model answer, `expression`, `antiderivative`, `number`, `numbers`, and `mcq` (limited).
- **`content/validate.mjs <key>|all`:** checks one topic file or all of them:
  - schema, counts and ids;
  - that every knowledge point is both taught and tested;
  - that math answers parse in mathjs;
  - LaTeX delimiters and `$` misuse;
  - keyboard notation and register.
- **`content/specs/{mth-6,mth-2,phy-0}.json`:** course specs (topic keys, titles, references, sibling courses).
  - Regenerate for other courses with a small Node script that evaluates `main.js` and dumps `SUBJECTS[sid].units[ui]`. The `SUBJECTS` extraction pattern is at the top of `ut2.js`.
- **Plan:**
  - one writer per 4–6 topics writes `content/topics/<key>.json` and validates it;
  - an independent fact-check pass follows;
  - then build the app side:
    - load `content/<course>.json` packs published alongside the page (artifact `files`);
    - a textbook reader view with sections and inline questions, plus the teacher side panel;
    - written answers graded by the model against the rubric;
    - machine-checked math answers via the existing `MX.equiv` / `machineCheck`;
    - strict exam mode;
    - per-topic card decks on FSRS (`fsrsNext` exists in `08c-knowledge.js`);
    - when a pack exists for a topic, the topic flow uses it instead of bits or generated lessons.
