# Deep Recall: handoff

A personal study app, published as a claude.ai artifact: https://claude.ai/artifact/BZiByjQAQSjPHEmb6Sej1T.

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
  - Lint: `npx -y eslint@8 --no-eslintrc -c .eslintrc.json main.js` (eslint 10 dropped this config format).
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

## Textbook chapters (built; first wave written)
**What exists now.**
- Chapters: all 33 first-wave topics are written and fact-checked, in `content/topics/<key>.json`:
  - `mth-6` Proof & Discrete Math: 9 chapters.
  - `mth-2` Calculus II: 12 chapters.
  - `phy-0` Mechanics: 12 chapters.
- How they were made:
  - One writer per 4–5 topics, following `content/AUTHORING.md`.
  - Every answer computed with sympy; counting and graph claims brute-forced.
  - Then an independent fact-check pass on every chapter: recompute everything, check statements against sources, fix in place.
- Research caveat: the environment's proxy blocked most direct page fetches (openstax.org, lamar.edu, ocw.mit.edu, libretexts). Several chapters' statements were therefore checked against search excerpts of the cited pages, not the full text. The mathematics itself was verified by computation.

**Build.** `python3 build.py`:
- groups the chapters by course into `packs/<sid>-<ui>.json`;
- compiles `PACK_INDEX` (which topics have a chapter) into the page;
- builds `deep-recall.html` and `main.js`.

Publish the packs with the page as artifact `files` (`packs/<course>.json`). The page fetches them by relative URL.

**App side** (`src/17g-book.js`, plus hooks in 08b, 08c, 12, 15, 17b, 17e):
- **Reader** (`book` view): intro and contents; sections with inline questions.
  - Answer boxes are checked by mathjs, with two attempts.
  - Written answers are graded by Claude against the rubric. Attempt 1 gets a hint only; after the last attempt he sees the corrections and the model answer.
  - Answering again after seeing the solution is capped at 0.6.
  - Each section shows the terms it introduces; there is a chapter review page.
- **Teacher panel**: a side drawer, or a bottom sheet on phones. It works under his protocol, and its chat is saved as `lessons/<key>~teacher`.
- **Flashcards** (`cards` view): per-chapter deck, unlocked by finished sections, FSRS-scheduled in `node.cards`. Due cards count in the Review badge.
- **Question sources**: practice, reviews and course exams draw from the chapter's banks (`packProblem`).
  - Chapter test (`packTest`): strict, one attempt, no hints, no partial credit, pass at 80%.
  - Course exams and chapter tests score written answers right or wrong.
- **Outlines and toolkits**: a chapter's knowledge points replace any generated outline. Old generated-outline progress moves to `node.kpPrev`.
- **Fallback**: topics without a chapter still generate on demand. Those prompts now use the serious register and mostly open-response questions.

**Checks**
- `node content/validate.mjs <key>|all`: schema and coverage, answers parse, LaTeX, register. It also rejects stray backslashes before quotes and control characters.
- `node content/plots.mjs`: every chapter graph draws.
- `python3 content/fixquotes.py <keys>`: removes stray backslash-quotes.
- `node book.mjs`: end-to-end test of the reader, teacher panel, cards, practice, strict test and course exam.
- The other suites (`ut2.js`, `e2e.mjs`, `mkseed.py` then `seed.mjs`, `qa.mjs`, `qa2.mjs`) still apply. `qa2`'s "no gap to repair in crawl" predates this work.
- The tests serve the page from a routed `http://dr.test/` origin, so pack fetches work.

**Answer-checking notes**
- Expression answers fall back to integer sampling when real sampling can't evaluate them, e.g. \( (-2)^n \).
- Physics answers are compared on positive values only.
- Greek letters typed in an answer read as their names (θ → theta).

## Next
1. Continue course by course through the other 97 courses. Philosophy comes next; he flagged its first lesson.
   - Generate each course spec with the `SUBJECTS` extraction (top of `ut2.js`).
   - Run writers with `content/AUTHORING.md`, then a fact-check pass.
   - Then `python3 build.py`, run the checks above, and publish the page with all packs.
   - For non-math subjects the question mix is mostly `written`.
2. Verify, inside claude.ai, that pack files load next to the page. If a pack fails to load, that topic falls back to generation.
