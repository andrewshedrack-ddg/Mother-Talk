# MotherTalk

A story-driven platform for learning indigenous African languages.
DBIT Information Systems project by Andrew Shedrack Anderson (227177) and partner (227310).

## Live demo

https://andrewshedrack-ddg.github.io/Mother-Talk/

## How it works

- Pick a story, for example "Wanjiru's Market Day" in Kikuyu.
- Read each scene, make choices that branch the story, hear pronunciation,
  read culture notes, and answer quizzes to earn points.
- Progress and points are saved in the browser.

## Project structure

- `index.html`, `styles.css`, `app.js` — the static web app served by GitHub Pages.
- `data/` — the story catalogue (`stories.json`) and story files. Stories are
  plain JSON: scenes with native text, translations, choices, quizzes and culture notes.
- `backend/` — the Flask version with user accounts and a database. It needs a
  Python server (for example Render) and cannot run on GitHub Pages.
- `frontend/` — a Vite and Tailwind experiment.

## Adding a story

Add a JSON file under `data/` following the `wanjiru.json` format, then list it
in `data/stories.json`. No backend changes needed.
