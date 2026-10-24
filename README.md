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
- **Admin portal (demo)**: a top-level Admin tab demonstrates the Chapter 4
  decisions, approve or reject submissions, deactivate or reactivate accounts,
  change role, and the Learners plus Scenes completed report. On Pages this is
  saved in the browser only; the Flask admin panel uses a real database.
- **Voice**: Listen at normal speed and Practise slowly (rate 0.6), the same
  Web Speech model as Flask FR-20 and FR-21. Recorded native-speaker MP3s stay
  primary in the Flask app; the story JSON files already name those MP3s per scene.
- Progress is saved in the browser (localStorage).

## Project structure

- `index.html`, `styles.css`, `app.js` — the static web app served by GitHub Pages.
- `coloring-art-1.js`, `coloring-art-2.js` — colouring artworks (embedded images).
- `data/` — the story catalogue (`stories.json`) and story files. Stories are plain JSON:
  scenes with native text, translations, choices, quizzes and culture notes.
  Flags are loaded from flagcdn.com so they render on every device.
- `mothertalk_app/` at the repository root — the Flask version with user accounts,
  a database, a public JSON API and the admin panel. It needs a Python server
  and cannot run on GitHub Pages. Keeping it in the repo is deliberate: Pages
  is the showcase, Flask is the full system described in the documentation.

## Adding a story

Add a JSON file under `data/` following the `wanjiru.json` format, then list it in
`data/stories.json` with its language and ISO flag code. No backend changes needed.

## Note

Story phrases are demos and will be reviewed by native speakers.
