# MotherTalk

**Learn a language by living a story.**

MotherTalk is a story-driven web app that teaches indigenous African languages the way children actually learn them: by living inside stories. Learners step into illustrated tales from Kenya, Uganda and Tanzania, hear real phrases, make choices that branch the plot, answer quizzes, earn XP, protect daily streaks and climb a leaderboard, the proven Duolingo loop, rebuilt around African storytelling.

Live demo (static build): https://andrewshedrack-ddg.github.io/Mother-Talk/
This repository folder is the full-stack Flask application: backend, database, API and pages.

---

## The problem

- A language dies somewhere in the world roughly every two weeks, and Africa holds a huge share of the world's living languages.
- UNESCO estimates 40% of people worldwide do not have access to education in a language they speak or understand.
- Mainstream language apps teach global languages. Indigenous African languages are almost entirely absent, so a generation is growing up unable to speak with its own grandparents.

## The solution

Interactive visual-novel stories in Kikuyu, Kamba, Swahili, Dholuo and Luganda, written as JSON, voiced by native speakers, and wrapped in a game loop (XP, levels, streaks, daily goals, leaderboard) that keeps learners returning daily. Content is data, not code: a new story or language ships by adding a JSON file.

## What is inside

- **Full Flask backend** — blueprints mapped one-to-one to the system's design processes: auth, story engine, audio, assessment, contribute, admin, plus a public JSON API.
- **Real database model** — SQLite via SQLAlchemy implementing the designed ERD exactly: `USER`, `STORY`, `AUDIO_RECORDING`, `PROGRESS`, `QUIZ_RESULT`.
- **Languages API** — `/api/languages`, `/api/stories`, `/api/leaderboard`, `/api/me`. The pages and any future mobile app read the same endpoints; nothing about a language is typed twice.
- **Duolingo-style motivation** — XP (1 quiz point = 10 XP), six levels from *Mgeni* (guest) to *Mzee* (elder), a 30 XP daily goal, day streaks, and a public leaderboard.
- **Roles and safety** — learners, contributors and admins; passwords hashed with Werkzeug; every protected page checks its role; only admin-approved stories reach learners.
- **PWA** — installable, with a service worker that caches stories and audio for offline play.
- **Content ready to grow** — 6 stories, 5 languages, 3 countries, native-speaker MP3s for the flagship Kikuyu story.

## Quickstart

```bash
cd mothertalk_app
python -m venv venv
venv\Scripts\activate        # Windows (source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
python run.py
```

Open http://127.0.0.1:5000 — the database is created and seeded automatically on first run.

Demo accounts (seeded on first run):

| Username | Password | Role |
|---|---|---|
| learner | learn123 | Learner |
| contributor | contrib123 | Contributor |
| admin | admin123 | Administrator |

## API at a glance

| Endpoint | What it returns |
|---|---|
| `GET /api/languages` | Every language, with a greeting and its stories, from `data/languages.json` |
| `GET /api/languages/<code>` | One language and its stories |
| `GET /api/stories` | The story catalogue (metadata) |
| `GET /api/stories/<id>` | One full story script (scenes, choices, quizzes) |
| `GET /api/leaderboard` | Top 10 learners by XP |
| `GET /api/me` | Signed-in learner's XP, level, streak and daily goal |
| `GET /api/story/<id>/scene/<scene>` | One scene for the story player |
| `POST /api/choice` | Record a story choice into PROGRESS |
| `POST /api/assessment/submit` | Mark a quiz, store a QUIZ_RESULT |

Full details: see `DOCUMENTATION.md`.

## Project structure

```
mothertalk_app/
  run.py                 entry point
  config.py              configuration (paths, database)
  app/
    __init__.py          app factory + first-run seeding
    models.py            the ERD as SQLAlchemy models
    gamification.py      XP, levels, streaks, daily goal
    auth/                register, login, role checks (Process 1.0)
    story/               landing, story engine, dashboard (Processes 3.0, 5.0)
    audio/               native-speaker MP3 serving (Process 3.0)
    assessment/          quiz marking API (Process 4.0)
    contribute/          contributor uploads (Process 2.0)
    admin/               approvals and reports (Processes 2.0, 5.0)
    api/                 public JSON API (languages, stories, board)
    templates/           Jinja2 pages (African culture theme)
    static/              CSS, JS, PWA manifest + service worker
  stories/               story scripts as JSON (one file per story)
  data/                  catalogue.json + languages.json (single source of truth)
  audio/                 native-speaker MP3 clips
  instance/              SQLite database (created on first run)
```

## Roadmap

- **Now** — MVP: 6 stories, 5 languages, audio, quizzes, gamification, API, PWA.
- **Next** — native-speaker recordings for every scene, 20+ stories, review of all demo phrases by native speakers, pilot with mother-tongue classes in schools.
- **Later** — community submissions from elders, offline language packs, mobile app reading the same API, more regions and languages.

## Team

Built by **Andrew Shedrack Anderson** and **Anita Mwaura Njuguini** — DBIT, Strathmore University. Information Systems project, September to December 2026.

*Story phrases in the current build are demos and will be reviewed by native speakers before any public launch.*
