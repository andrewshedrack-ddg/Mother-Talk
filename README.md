# MotherTalk

A story-driven platform for learning indigenous African languages.
DBIT Information Systems project by Andrew Shedrack Anderson (227177) and Anita Mwaura Njuguini (227310).

## Live site

https://andrewshedrack-ddg.github.io/Mother-Talk/

This GitHub Pages site is the main public showcase, in the same Cream & Clay
design as the Flask app (cream and brown, woven patterns, pill buttons,
centred Swahili-tree artwork, footer "© 2026 MotherTalk. All rights reserved.").
The Flask app in `mothertalk_app/` in this repository is kept for local running
and marking, because GitHub Pages cannot run Python, a database, or a shared login.

## The three sides

MotherTalk has three sides, one per actor in the Chapter 4 design. The login
page at the site root asks who you are and sends you to your own side. Each
side has its own pages, and the sides talk to each other through the browser:

- **Learner** (`frontend/learner/`): plays stories, answers quizzes, colours
  art and earns XP. Pages: `index.html` (stories, Colouring Studio, Board,
  My progress), `languages.html` (stories by language), `login.html` and
  `signup.html` (learner accounts on this device).
- **Contributor** (`frontend/contributor/`): writes new stories and sends them
  for review. Pages: `index.html` (my uploads and their status) and
  `upload.html` (three scenes, each with a quiz).
- **Admin** (`frontend/admin/`): approves or rejects submissions, manages
  accounts and reads reports. Page: `index.html`.

How the sides link: a contributor's upload is saved as "pending". The admin
sees it in the pending queue and approves or rejects it. An approved story is
published, and the learner side adds it to the story list, where it can be
played like any built-in story. On the demo site this runs on localStorage
(`mt_contrib_submissions` and `mt_approved_stories`); the Flask app does the
same flow through its database.

## Features

- **Stories**: interactive visual-novel stories in Kikuyu, Kamba, Swahili, Dholuo and Luganda,
  from Kenya, Uganda and Tanzania. Read scenes, make choices, hear pronunciation,
  read culture notes and answer quizzes.
- **Colouring Studio**: paint traditional African artwork (tribal mask, baobab savanna,
  Adinkra symbols) with fill and brush tools.
- **Gamification, Duolingo-style**: XP for quizzes, stories and artwork, daily streaks,
  Swahili level titles (Mgeni 0, Mwanafunzi 50, Msomi 150, Mpenda Lugha 300,
  Shujaa 500, Mzee 800), a 30 XP daily goal, level progress and a leaderboard.
  Rules match `mothertalk_app/app/gamification.py`: 1 quiz point = 10 XP,
  story completion adds 25 XP, a finished artwork adds 15 XP.
- **Voice**: Listen at normal speed and Practise slowly (rate 0.6), the same
  Web Speech model as Flask FR-20 and FR-21. Recorded native-speaker MP3s stay
  primary in the Flask app; the story JSON files already name those MP3s per scene.
- Progress is saved in the browser (localStorage).

## Project structure

- `index.html`: the login page at the site root. It asks for a name and a side
  (learner, contributor or admin) and routes to that side's pages.
- `styles.css`: the shared Cream & Clay styles for every page.
- `js/`: the app code, one job per file: `storage.js` (saving on the device),
  `progress.js` (XP, levels, streak, daily goal), `stories.js` (story player,
  quizzes, speech), `colouring.js` (Colouring Studio), `board.js` (leaderboard,
  progress), `roles.js` (the three sides: login, role checks, submissions),
  `main.js` (tabs, buttons, startup).
- `frontend/learner/`, `frontend/contributor/`, `frontend/admin/`: the three
  sides' pages. Pages inside `frontend/` set `<base href="../../">`, so every
  relative path in them (styles, scripts, story data) is written from the
  site root, and works both on GitHub Pages and on a local server.
- `coloring-art-1.js`, `coloring-art-2.js`: colouring artworks (embedded images).
- `data/`: the story catalogue (`stories.json`) and story files. Stories are plain JSON:
  scenes with native text, translations, choices, quizzes and culture notes.
  Flags are loaded from flagcdn.com so they render on every device.
- `mothertalk_app/` at the repository root: the Flask version with user accounts,
  a database, a public JSON API and the admin panel. It needs a Python server
  and cannot run on GitHub Pages. Keeping it in the repo is deliberate: Pages
  is the showcase, Flask is the full system described in the documentation.
  Its login also routes by role: learners to stories, contributors to their
  uploads, admins to the panel.

## Adding a story

Add a JSON file under `data/` following the `wanjiru.json` format, then list it in
`data/stories.json` with its language and ISO flag code. No backend changes needed.
Or use the contributor side: write it in the upload form and let the admin approve it.

## Note

Story phrases are demos and will be reviewed by native speakers.
