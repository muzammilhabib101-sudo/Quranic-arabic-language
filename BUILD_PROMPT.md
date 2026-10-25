# Build Prompt — Quranic Arabic Learning Website

You are a senior web engineer. Build a production-ready, dark-themed, bilingual (Urdu + English) website that teaches Quranic Arabic word by word, with practice exercises after every lesson. The course content comes from a 521-page source PDF of scanned PowerPoint slides (Urdu explanations of Quranic Arabic: word breakdowns, sarf patterns, roots, verb signs, and verse-by-verse analysis). Build the content pipeline so every slide can be brought in, but never invent or hand-type Quranic text.

## About the source PDF (read before planning)

- 521 landscape pages (842×512 pt), each one a PowerPoint slide exported as an **image**. There is **no text layer** — text extraction returns nothing; the original .pptx files are not available.
- Content types seen in the slides:
  - **Word breakdowns** — e.g. بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ split into words; ابن explained (why the alif is added before a sakin ب).
  - **Sarf patterns** — e.g. رَحِيْمٌ ← فَعِيْلٌ with related words عَلِيْمٌ, عَظِيْمٌ and the shared meaning (قدرِ مشترک).
  - **Verb anatomy** — e.g. يَبِيْتُوْنَ = ي (مضارع کی علامت) + بيت + ون (علامتِ جمع), with meaning and Urdu usage.
  - **Verse slides** — surah name, ayah number, the verse with key words highlighted, and an Urdu translation (e.g. Al-Hujurat 49:12, Al-Furqan 25:77).
- Slides have bright pastel backgrounds and a "Created with PowerFlashPoint" watermark.

## Tech stack (use exactly this unless you have a strong reason, and explain it if you deviate)

- **Next.js** (latest, App Router) with **static export**, TypeScript strict mode
- **Tailwind CSS** with design tokens as CSS variables; logical properties (`ms-`, `pe-`, `start-`) everywhere so RTL works
- **Next.js built-in i18n pattern** (`app/[lang]` + JSON dictionaries in `src/i18n/messages`) instead of next-intl — fewer moving parts and fully compatible with static export. Routes `/ur/...` (RTL, default) and `/en/...` (LTR); `/` forwards to the saved language. Urdu digits (۰–۹) when Urdu is active
- **Zod** schemas for all content; content stored as JSON in `/content`, validated at build time
- Fonts (self-hosted via `next/font`): **KFGQPC Uthmanic Hafs** v18 for verses, **Amiri** for other Arabic, **Noto Nastaliq Urdu** for Urdu, **Inter** for English
- Quran data, downloaded once by `npm run quran-data` into `/content/quran/` (never fetched at runtime; see `content/quran/SOURCES.md`):
  - **Display text: KFGQPC Hafs** (via Quran.com API v4) — the KFGQPC font only renders this text correctly
  - **Reference text: Tanzil.net** Uthmani — for search and to cross-check the KFGQPC text letter by letter
  - Morphology (root, lemma, noun/verb/particle, segments) from the **Quranic Arabic Corpus** v0.4 (corrected fork)
  - Word-by-word English/Urdu, transliteration, verse translations (Saheeh International, Jalandhari) and audio paths from the **Quran.com API v4**
- Audio: real recitations (EveryAyah / Quran.com), verse-level and word-level. **Never use text-to-speech for Quranic text.**
- **ts-fsrs** for spaced repetition of practice items
- **Zustand** (with `persist` to `localStorage`) for progress, settings, saved words and review cards — no account, no database
  - Store key `qa-store` (`src/lib/store.ts`). A slide-mode lesson is finished when every one of its slides has been viewed. Components read the store only after hydration (`useHydrated`) so the static HTML never mismatches; anything date-based renders in the browser only.
- **Pagefind** for static full-text search (Arabic, Urdu, English)
- **Phosphor icons**
- Testing: **Vitest** + Testing Library, **Playwright** for E2E
- Hosting: **Vercel** or **Cloudflare Pages** (static)

## Design system (dark theme by default)

The site is dark first. A light theme may be added later but is not required.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0f1115` | Page background |
| `--surface` | `#171a21` | Cards |
| `--surface-2` | `#1f232c` | Raised cards, sheets |
| `--border` | `#2a2f3a` | 1px borders |
| `--text` | `#ece9e2` | Body text |
| `--muted` | `#a3a8b3` | Secondary text |
| `--accent` | `#d4a64a` | Gold — primary actions, highlights |
| `--accent-2` | `#4fb3a5` | Teal — progress, success |
| `--noun` | `#5fbf8f` | Grammar role: noun |
| `--verb` | `#6fa8dc` | Grammar role: verb |
| `--particle` | `#d4a64a` | Grammar role: particle |
| `--wrong` | `#e07a6b` | Gentle "not quite" feedback (never harsh red) |

- Rounded cards (12–14px radius), soft borders, calm tone, generous spacing.
- **Readability first**: verse text 32–40px, other Arabic 26–32px, Urdu body 18–20px with line-height ≥ 2 (Nastaliq needs room), English 16–17px.
- Grammar role colours are used consistently on word chips, diagrams, tags and exercises.
- **Slide images on a dark page**: show inside a dark framed card, with `filter: brightness(.88)` and rounded corners, so they don't glare. Tap to open full-screen.
- Mobile-first (most learners use phones); works on tablets and desktop. No horizontal scroll at 360px width.

## Bilingual rules

- UI strings live in `/messages/ur.json` and `/messages/en.json`; every string is translated — no hard-coded text in components.
- Language switch flips `dir` and the whole layout. **Arabic always stays Arabic and always RTL**, in either language.
- Course explanations exist in Urdu in the source. English explanations are **AI-drafted translations** and carry the draft badge until reviewed.
- Each content field is `{ ur: string, en?: string }`; if `en` is missing, show the Urdu with a small "English coming soon" note.

## Pages and features

1. **Home**: greeting ("السلام علیکم / Assalamu alaikum"), course progress ring, lessons done (x of N), streak, "Continue lesson" card, today's practice ("N items due"), recently learnt words.
2. **Course** (`/course`): units → lessons, each with lesson count, estimated time, % complete, and a format tag (Slides / Text). Search box (Pagefind) across words, roots, topics and meanings.
3. **Lesson player** (`/lesson/[id]`) — works in two modes:
   - **Slides mode** (lesson not yet transcribed): slide viewer with Previous/Next, keyboard arrows, swipe, slide counter, full-screen, then the lesson's practice set.
   - **Text mode** (transcribed lesson), 6 steps with a progress bar:
     1. What you will learn — goal + concept cards
     2. Read it first — verse (Tanzil text), surah:ayah reference, translation, audio with 0.75× / 1× / 1.25× speed
     3. Word by word — tappable colour-coded word chips → sheet with meaning, root, pattern (وزن), grammar role, "Why it is like this", Save word, play word audio
     4. How the words connect — breakdown diagram (e.g. ي + بيت + ون with labelled signs) and "In plain words"
     5. Remember this — key rule + 3 bullet points
     6. Practice — the lesson's exercise set (see below)
   - Header: Exit, step counter, Save lesson, **"Draft · awaiting review"** badge when unreviewed, **"View original slide"** opening the source slide image(s).
4. **Practice hub** (`/practice`): today's FSRS review queue, practice by lesson or unit, and each exercise type as its own mode.
5. **Dictionary** (`/words`): every word met in the course, filterable by root (e.g. all words from ر ح م), pattern (e.g. فَعِيْلٌ) and role; each word links back to its lessons.
6. **Progress** (`/progress`): lessons finished, words learnt, day streak, practice accuracy, review queue with due dates (Today / Tomorrow / In N days), a short plain-language summary of strong and weak topics.
7. **Settings / You** (`/me`): language, large text, high contrast, reduced motion, show transliteration, audio speed; saved words list with remove; export/import progress as a JSON file (backup without an account); privacy note ("Your progress is stored in this browser. No account is needed.").

## Practice exercises

Exercises are the core of learning, not an extra. Every lesson ends with a practice set (5–10 items), every unit ends with a mixed review, and learnt items enter the spaced-repetition queue.

### Exercise types

Built around what the source course actually teaches:

| # | Type | What the learner does | Example from the course |
|---|---|---|---|
| 1 | `meaning` | Pick the meaning of an Arabic word (MCQ) | رَحِيْمٌ → "ہمیشہ رحم کرنے والا" |
| 2 | `match` | Match 4–5 Arabic words to their meanings | عَلِيْمٌ / عَظِيْمٌ / رَحِيْمٌ |
| 3 | `pattern` | Choose the pattern (وزن) of a word | رَحِيْمٌ → فَعِيْلٌ |
| 4 | `root` | Pick or tap the three root letters | يَبِيْتُوْنَ → ب ي ت |
| 5 | `anatomy` | Split a word into parts and label each part | يَبِيْتُوْنَ → ي (مضارع کی علامت) + بيت + ون (علامتِ جمع) |
| 6 | `role` | Tap whether each word in a verse is a noun, verb or particle | بِسْمِ / اللّٰهِ / … |
| 7 | `fill` | Choose the missing word in a verse | وَلَوْ أَنَّهُمْ ____ |
| 8 | `translate` | Arrange Urdu/English word tiles into the verse's translation | "اور اگر وہ صبر کرتے" |
| 9 | `listen` | Hear a word or verse recitation and choose what was recited | — |
| 10 | `flashcard` | Self-graded card (Again / Hard / Good / Easy) for FSRS review | Arabic ↔ meaning, root, pattern |

### Exercise rules

- **Quranic text in exercises comes only from Tanzil.** `fill` options are real words from the Quran; never show an altered or misspelled verse as if it were correct.
- **Never ask learners to reorder the Arabic words of a verse.** Sentence-building exercises (`translate`) work on the translation only.
- Distractors come from words the learner has already met (same lesson or unit first), from the same role or a similar pattern, so the choice is meaningful.
- **Gentle pedagogy**: no timers, no lives, no negative scores. Every answer, right or wrong, shows a short explanation (in the active language) and a "View in lesson" link.
- A wrong answer is re-asked later in the same session; the item's FSRS card is updated (wrong → Again).
- Every exercise has full keyboard and screen-reader support; tap and drag both work for `match`, `anatomy` and `translate`.
- Large touch targets (≥ 44px); Arabic options are shown at Arabic font sizes, not shrunk.

### As built in phase 6

- Word bank: `/data/practice.json`, generated at build time (`src/content/practice.ts`) from the verses of all 42 lessons — 556 words with KFGQPC text, word-by-word Urdu/English, root, role, Corpus segments and word audio. Practice never uses the hand-made slide tags.
- Patterns come from `content/practice/patterns.json`: only patterns the slides teach (فاعل، مفعول، فعلان، فعیل، افعل، فعّال), mapped by Corpus lemma. Broken plurals sharing a singular's lemma are left out. Draft until reviewed.
- Words whose Quran.com meaning is shared with a neighbour ("O you who believe") are never asked about alone.
- Sessions: `/[lang]/practice/lesson/<id>/` (9 items), `/unit/<id>/` (10, from studied lessons), `/mode/<type>/` (8 of one type), `/review/today/` (due words, flashcards alternating with recognition). Missed items come back once.
- Every answer updates the word's FSRS card (right → Good, wrong → Again); flashcards use the learner's own rating. Cards and practice stats live in the `qa-store` (`cards`, `practice`).
- All word audio (`npm run audio`, ~30 MB) is served from the site.

### Where exercises come from

1. **Auto-generated** from word data (`meaning`, `match`, `pattern`, `root`, `role`, `listen`, `flashcard`): any word with a meaning, root, pattern and role can produce these without hand-writing.
2. **Authored** in lesson JSON (`anatomy`, `fill`, `translate`, and any custom MCQ): drafted from the slides during transcription, then reviewed.
3. **Slides-mode lessons** get a practice set too: during the course-mapping step, tag each slide's key words and verse references so auto-generated exercises are available before full transcription.

## Course structure

The PDF teaches verse by verse, introducing grammar where a word needs it. Every slide is tagged in `content/draft/slide-tags.txt` (`n|type|surah:ayah|topic|key words`, type = v verse, w word, g grammar, p pattern); `npm run course-map` turns the tags into `content/course-map.json` and the report `content/draft/course-map.md`. One verse = one lesson; one surah = one unit:

| # | Unit | Lessons | Slides |
|---|---|---|---|
| 1 | Bismillah — the first step | 1 | 1–12 |
| 2 | Surah Al-Hujurat (49:1–18) | 18 | 13–330 |
| 3 | Surah Al-Fatihah (1:2–7) | 6 | 331–366 |
| 4 | Surah Al-Furqan — Servants of the Most Merciful (25:61–77) | 17 | 367–521 |

42 lessons, about 8 hours. **Approved by the owner on 2026-10-25** as is: this order, long lessons not split.

The first fully implemented text lesson is the **Bismillah lesson** (slides 1–12: بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ, ابن, الرحمٰن ← فَعْلان, رحیم ← فعیل). It is the template for all others.

Some grammar slides repeat later (e.g. present-tense signs, idafa, فعلان/فعیل). Keep the repeats in their lessons — they are deliberate review — and link each to the lesson where the rule first appears.

## Content model

Content is data, not code. Define Zod schemas in `/src/content/schema.ts`; store content as JSON in `/content`.

- `Text { ur: string, en?: string }`
- `Unit { id, order, title: Text, description: Text, lessonIds[] }`
- `Lesson { id, unitId, order, title: Text, format: 'slides'|'text', status: 'draft'|'reviewed', reviewedBy?, sourceSlides: number[], estMinutes, goal?: Text, conceptCards?[], verseRefs: {surah, ayah}[], wordIds[], steps?[], exerciseIds[] }`
- `Word { id, arabic, transliteration?, root?, pattern?, role: 'noun'|'verb'|'particle', meaning: Text, parts?: {text, label: Text}[], why?: Text, verseRefs[], audioUrl? }`
- `Exercise { id, type, lessonId, prompt: Text, arabic?, verseRef?, options?[], answer, explanation: Text, source: 'auto'|'authored', status: 'draft'|'reviewed' }`
- `Slide { n, image: '/slides/NNN.webp', lessonId?, topic?, verseRef?, words?[] }`
- Browser state (Zustand, persisted): `progress`, `savedWords`, `reviewCards` (FSRS state), `exerciseLog`, `settings`, `streakLog`

### Text lessons (as built in phase 5)

- A lesson becomes a text lesson when `content/lessons/<id>.json` exists; the schema is `src/content/schema.ts` (Zod) and an invalid file fails the build.
- The lesson file holds only teaching text (Urdu, English) and short Arabic fragments (letters, word parts, patterns). Verse text, word Arabic, transliteration, root and audio paths are pulled from `content/quran` by word position — a lesson can never contain hand-typed verse text.
- Player route: `/[lang]/lesson/<id>/learn/`. Progress saves the furthest step reached; finishing the quick check completes the lesson. Missed questions are asked once more at the end.
- Audio: `npm run audio` downloads the verse (Mishary Alafasy, EveryAyah) and word recitations (Quran.com) for every text lesson into `public/audio/`, so the site makes no outside requests.
- Template: `content/lessons/u1-l1.json` (Bismillah, status `draft` until a teacher reviews the Urdu).

### Dictionary, search and review (as built in phase 7)

- Dictionary `/[lang]/words/`: 268 entries (Corpus lemma + role) under 173 roots, plus particles/pronouns/names; filter by text, kind and pattern. Up to six course forms per entry, each with audio and a link to its lesson.
- Arabic search folds harakat and letter variants (`src/lib/arabic.ts`), so رحيم, رحیم and الرَّحِيْم all match. Pages carry a hidden bare-letter copy of their Arabic for the same reason.
- Site search `/[lang]/search/` uses Pagefind (run in `postbuild`), indexing only the Dictionary and lesson pages (`data-pagefind-body`), one index per language. It works on the built site, not under `next dev`.
- Review: `/[lang]/review/` and `/[lang]/review/<id>/` (noindex, not linked) show every field of a text lesson in Urdu and English beside its slides, flagging missing English. `npm run review-report` writes `content/draft/review-report.md`.
- Diagram blocks in "How the words connect" reference word positions (`"words": [4, 5]`) so phrases come from the Quran data; `text` is only for fragments like بِ.
- `npm run check-arabic` (also the `prebuild` step, so it blocks a build) compares every vowelled Arabic word typed in a lesson with the verified words and Corpus segments of that lesson's verse, letter by letter. It ignores spelling-convention differences (alif, sukun, the first letter's shadda after ال, the last letter's ending since lessons cite base forms like آمَنَ, and where the standing alif sits: عَلٰى / عَلَىٰ / عَلَى). A long vowel that one word has and the other lacks (قَتَلَ vs قَاتِلُ) marks two different words, so those are not compared. Pattern names (فَاعِل…) are never compared. Words not from the verse — grammar examples and patterns — are listed in the review report for a teacher to check by eye.

### Quality, tests and publishing (as built in phase 8)

- All 42 lessons are text lessons (status `draft` until a teacher reviews them).
- Review pages are dropped from the build by `tools/drop-review-pages.mjs` (postbuild); `npm run dev` always has them, and a build with `REVIEW=1` (PowerShell: `$env:REVIEW=1; npm run build`) keeps them for a private preview.
- Saving a word also puts it in the review queue (a new FSRS card, due at once); unsaving keeps its history.
- `/[lang]/credits/` names every data source with its licence terms (kept in step with `content/quran/SOURCES.md`); the site footer links to it.
- Accessibility: every control is at least 44×44px; a control's accessible name starts with its visible text (WCAG 2.5.3), with extra context as screen-reader text instead of `aria-label`; the slide viewer has a screen-reader `h1`. Lighthouse accessibility is 100 on home, lesson, player and practice pages.
- `npm test` — Vitest (jsdom): text folding and number formatting, the store (saving, progress, streaks, backup import), FSRS, the course map (every slide in exactly one lesson), every lesson file (word positions, quiz answers, `check-arabic`), every exercise type over every word, and the QuickCheck component.
- `npm run test:e2e` — builds, then Playwright on the installed Chrome (phone and desktop): the acceptance journey, axe scans of every page type in both languages (WCAG 2.1 AA + best practices), comfort settings, language switching, every slide published, review pages absent, credits, search.
- Deploy: `out/` is a plain static site (≈8,500 files, ≈170 MB, largest file < 20 MB). Chosen host: **GitHub Pages**, through `.github/workflows/deploy.yml` (unit tests, then a build with `BASE_PATH` from `actions/configure-pages`, then publish). `public/.nojekyll` keeps `_next/` from being dropped. `public/_headers` is ignored by GitHub Pages but sets caching and security headers if the site ever moves to Cloudflare Pages or Netlify.
- Base path: the site works at a domain root or under a sub-path such as `/quran-arabic`. `BASE_PATH` sets Next's `basePath`; `next/link` adds it by itself, and every other absolute file path (audio, slides, `/data/practice.json`, Pagefind, the `/` redirect) goes through `asset()` in `src/lib/base-path.ts`. Pagefind's `baseUrl` is `/` so search results aren't prefixed twice.

## Content pipeline (`/tools`)

1. **`render-slides`** — PyMuPDF renders all 521 pages to WebP (≈1280px wide, quality ≈80) into `/public/slides/NNN.webp`, plus small thumbnails. Treat the PDF as untrusted input; run Python with `-I`.
2. **`quran-data`** — download Tanzil Uthmani text, Corpus morphology and Quran.com word-by-word (en/ur) + audio URLs into `/content/quran/`.
3. **`tag-slides`** — an AI vision model (Claude) reads each slide image and outputs `Slide` tags (topic, key words, verse reference). Output is a draft.
4. **`transcribe-lesson <id>`** — the vision model drafts the lesson JSON (words, breakdowns, Urdu explanations, authored exercises) from its slides; English is drafted as a translation. **Arabic verse text is never taken from the transcription**: detect the surah:ayah and use Tanzil. Word Arabic is cross-checked against Corpus/Quran.com where the word appears in the Quran.
5. **`validate`** — check all content against the schemas; fail the build on errors.
6. **`review-report`** — list every lesson with its source slides, status, unmatched words or verses, and exercises still in draft.
7. **Review page** (`/review`, development builds only): shows a transcribed lesson next to its original slides so the proofreader can correct the Urdu and mark it `reviewed`.

## Non-negotiable rules

- All Quranic text comes from verified sources (Tanzil) only; no AI-generated, OCR'd or hand-typed verses.
- Unreviewed content always shows the draft badge.
- Works offline after first visit is a nice-to-have (service worker), but the site must work fully without an account or backend.
- Privacy: no third-party tracking; any analytics must be anonymous and opt-in.
- Accessibility: WCAG AA contrast on the dark theme, screen-reader labels on every control (including Arabic words), touch targets ≥ 44px, respects `prefers-reduced-motion`, large-text setting actually scales text.
- RTL correctness: Urdu layout mirrors fully; Arabic and Urdu render with proper shaping and diacritics.
- Gentle pedagogy everywhere: no timers, no lost hearts, no negative scoring; every wrong answer explains why.
- Settings, progress and review cards survive reloads and browser restarts.

## Deliverables, in phases (stop and summarise after each phase)

1. Project scaffold, design tokens (dark), fonts, i18n + RTL, layout and navigation
2. `render-slides` + slide viewer; every slide reachable through a temporary flat course list (the whole course is usable in slides mode)
3. `quran-data` build script; `tag-slides`; proposed course map for approval
4. Course page, Home, Settings/You, Progress shell — driven by the approved course map
5. Lesson player (both modes) with the Bismillah text lesson end to end
6. Practice engine — all 10 exercise types, lesson practice sets, unit reviews, FSRS queue, Practice hub
7. Dictionary, Pagefind search, transcription + review tooling, then lesson-by-lesson transcription
8. Accessibility pass, tests (unit + E2E), deploy config

## Acceptance criteria

- A new visitor can switch to Urdu, open the Bismillah lesson, finish all 6 steps including its practice set, save a word, see it in Saved words, and find it in the review queue — with no account.
- Every one of the 521 slides is reachable from the course page.
- Every lesson, including slides-mode lessons, has a practice set; every exercise shows an explanation after answering.
- No exercise ever displays an altered verse or asks for the Arabic words of a verse to be reordered.
- Switching language flips layout direction and every UI string; Arabic is unchanged.
- Progress values in the course and home pages are computed from real state (no hard-coded numbers).
- `npm test` and Playwright flows pass; TypeScript has no errors; ESLint is clean; Lighthouse accessibility ≥ 95 on the home, lesson and practice pages.
