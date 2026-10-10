# MotherTalk

A story-driven platform for learning indigenous African languages.
DBIT Information Systems project by Andrew Shedrack Anderson (227177) and Anita Mwaura Njuguini (227310).

## Live demo

https://andrewshedrack-ddg.github.io/Mother-Talk/

## Features

- **Stories**: interactive visual-novel stories in Kikuyu, Kamba, Swahili, Dholuo and Luganda,
  from Kenya, Uganda and Tanzania. Read scenes, make choices, hear pronunciation,
  read culture notes and answer quizzes.
- **Colouring Studio**: paint traditional African artwork (tribal mask, baobab savanna,
  Adinkra symbols) with fill and brush tools.
- **Gamification, Duolingo-style**: XP for quizzes, stories and artwork, daily streaks,
  Swahili level titles (Mgeni → Mzee), a daily XP goal and a leaderboard.
- Progress is saved in the browser (localStorage).

## Project structure

- `index.html`, `styles.css`, `app.js` — the static web app served by GitHub Pages.
- `coloring-art-1.js`, `coloring-art-2.js` — colouring artworks (embedded images).
- `data/` — the story catalogue (`stories.json`) and story files. Stories are plain JSON:
  scenes with native text, translations, choices, quizzes and culture notes.
  Flags are loaded from flagcdn.com so they render on every device.
- `backend/` — the Flask version with user accounts and a database. It needs a Python
  server (for example Render) and cannot run on GitHub Pages.

## Adding a story

Add a JSON file under `data/` following the `wanjiru.json` format, then list it in
`data/stories.json` with its language and ISO flag code. No backend changes needed.

## Note

Story phrases are demos and will be reviewed by native speakers.
