# MotherTalk

A story-driven visual-novel web app for learning indigenous African
languages, built for a DBIT IS project at Strathmore University.
Learners play short stories in the language, answer a quiz after each
scene, colour art and earn XP. Contributors write new stories, an
admin reviews them, and approved stories appear for learners to play.

Two languages first: **Swahili and Kikuyu**. The other story files
stay in `data/` for later; the choice is made in one place
(`FIRST_LANGUAGES` in `js/stories.js` and
`frontend/learner/languages.html`).

## How the files are arranged

Frontend pages first, then the shared code, then the story data, then
the backend and its database:

- `index.html` — the main site. The learner home: stories, Colouring
  Studio, leaderboard and My progress. Public, no login needed.
- `frontend/learner/` — the other public learner pages: `login.html`
  and `signup.html` (learner accounts on this device) and
  `languages.html` (stories by language). The old
  `frontend/learner/index.html` only redirects to the main page now.
- `frontend/contributor/` — the contributor side, hidden: `index.html`
  (my uploads and their status) and `upload.html` (three scenes, each
  with a quiz). Not linked from the learner pages; it opens by direct
  link and asks for a name on its own page.
- `frontend/admin/` — the admin side, hidden: `index.html` (approve or
  reject submissions, manage accounts, read reports). Same as the
  contributor side: direct link only, with its own name gate.
- `styles.css` — the shared look for every page: Duolingo-lively,
  bright green 3D buttons, big rounded type, responsive down to small
  phones.
- `js/` — the app code, one job per file: `storage.js` (saving on the
  device), `progress.js` (XP, levels, streak, daily goal),
  `stories.js` (story player, quizzes, speech), `colouring.js`
  (Colouring Studio), `board.js` (leaderboard, progress), `roles.js`
  (the three sides: login, name gates, submissions),
  `main.js` (tabs, buttons, startup). Pages inside `frontend/` set
  `<base href="../../">`, so every relative path in them (styles,
  scripts, story data) is written from the site root, and works both
  on GitHub Pages and on a local server.
- `data/` — the story catalogue (`stories.json`) and story files.
  Stories are plain JSON:
  `{"title": ..., "start": "s1", "scenes": {"s1": {...}, ...}}`.
  Each scene has a character, native text, translation, an optional
  culture note, a list of choices, and a quiz with three options.
  The learner side only shows Swahili and Kikuyu for now.
- `coloring-art-1.js`, `coloring-art-2.js` — colouring artworks
  (embedded images).
- `frontend/img/` — logo and hero art.
- `mothertalk_app/` — the Flask version with user accounts, a real
  database, roles, rate limiting and CSRF protection. The full
  admin panel lives there. Deployment steps are in its
  `DOCUMENTATION.md`.
- `mothertalk_app/instance/mothertalk.db` — the SQLite database
  (created when the Flask app runs; not kept in the repository).
- `backend/` — an older Flask attempt, kept for reference. The live
  backend is `mothertalk_app/`.
- `app.js` — the old single-file app, no longer used (replaced by
  `js/`). Kept so nothing that still references it breaks.
- `VSCODE_GUIDE.md` — how to run this project and update it from
  GitHub using only the VS Code terminal.

## How the three sides talk to each other

A contributor's upload is saved as "pending". The admin sees it in
the pending queue and approves or rejects it. An approved story is
published, and the learner side adds it to the story list, where it
can be played like any built-in story. On the demo site this runs on
localStorage (`mt_contrib_submissions` and `mt_approved_stories`); the
Flask app does the same flow through its database.

The hidden sides are not linked anywhere on the learner pages. Their
addresses are:

- Contributor: `frontend/contributor/index.html`
- Admin: `frontend/admin/index.html`

Each one asks for a name the first time it opens on a device, and
remembers it after that.

## Features

- **Stories**: six built-in stories across five languages (Swahili
  and Kikuyu shown for now). Each scene has its native text,
  English translation, a culture note, choices that change what
  happens next, and a quiz.
- **Colouring Studio**: 30 artworks to paint by fill or brush.
  Finished pictures give +15 XP, once per picture, and can be saved.
- **Leaderboard**: device-local top learners with names, XP and levels
  (Swahili level titles from Mgeni to Mzee).
- **Speech**: the Web Speech API reads each scene aloud (Swahili
  `sw-KE`; other languages use the device default voice). Native
  speaker review of the phrases is still open.
- **Progress**: daily streak, 30 XP daily goal and per-story progress,
  all kept in localStorage. No server needed.

## Running it locally

From the repository root:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000> in a browser. The full
step-by-step for VS Code (clone, run, pull new work, push your own
changes) is in `VSCODE_GUIDE.md` in this repository.

## Stories

To add a story, use the contributor side: write it in the upload form
and let the admin approve it. Or add it to `data/stories.json` by
hand, following the structure of an existing story. Stories are
language-specific: the Kikuyu story has the only audio in the project
(three MP3s).

## Status

- Live demo: <https://andrewshedrack-ddg.github.io/Mother-Talk/>
- Backend: Flask 3, SQLite, local only until deployment. The demo
  site has no server; learner accounts and submissions live in the
  browser only, and the demo login stores learner passwords in plain
  text. The Flask app hashes them properly.
