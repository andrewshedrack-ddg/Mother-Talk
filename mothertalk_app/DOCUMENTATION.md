# MotherTalk — System Documentation

Complete technical documentation for the MotherTalk Flask application.
It follows the project design documents detail for detail: the Chapter 3
methodology (SSAD, lightweight Scrum, Flask + Jinja2 + SQLite + JSON + MP3,
Progressive Web App) and the Chapter 4 System Analysis and Design
(36 functional requirements, 8 non-functional requirements, five-entity ERD).

---

## 1. Architecture

One Flask blueprint per SSAD process from the Chapter 3 data flow diagram:

| Blueprint | SSAD process | Responsibility |
|---|---|---|
| `auth` | 1.0 Authenticate Users | Register, log in, log out, role checks |
| `contribute` | 2.0 Manage Story Content | Contributor uploads of story scripts and audio |
| `admin` | 2.0 and 5.0 | Approve or reject content, user roles, reports |
| `story` | 3.0 Play Story and Audio, 5.0 Track Progress and Reports | Landing page, story selection, story player pages, learner dashboard, leaderboard page |
| `audio` | 3.0 Play Story and Audio | Serves native-speaker MP3 files |
| `assessment` | 4.0 Assess Learner | Quiz marking API |
| `api` | Supporting | Public JSON API: languages, stories, leaderboard, my progress |

Request flow for one scene: the play page loads a scene from
`GET /api/story/<id>/scene/<scene_id>`; a choice posts to `POST /api/choice`
(PROGRESS is updated); a quiz posts to `POST /api/assessment/submit`
(a QUIZ_RESULT is stored and the score returns immediately).

## 2. Data model (ERD implementation)

The database implements the Chapter 4 ERD entity for entity:

| ERD entity | Table | Key columns | Notes |
|---|---|---|---|
| USER | `user` | id (PK), username (unique), full_name, email (unique, optional), password_hash, role, created | Roles: learner, contributor, admin |
| STORY | `story` | id (PK), contributor_id (FK), title, language, level, status, script_file, description, created | Status: pending or approved |
| AUDIO_RECORDING | `audio_recording` | id (PK), story_id (FK), contributor_id (FK), scene_reference, file_name, file_size_kb | One MP3 per story scene |
| PROGRESS | `progress` | id (PK), user_id (FK), story_id (FK), scenes_completed, completion_status, current_streak, last_accessed | One row per learner and story; unique together |
| QUIZ_RESULT | `quiz_result` | id (PK), user_id (FK), story_id, scene_id, score, total, created | One row per marked quiz |

Relationships: a USER uploads many STORY; a STORY contains many
AUDIO_RECORDING; PROGRESS resolves the many-to-many between USER (learner)
and STORY; a USER records many QUIZ_RESULT against a STORY.

Documented deviations from the ERD, each deliberate:

1. `story.id` is TEXT (the story slug, for example `wanjiru`), not INTEGER,
   because it must match the story's JSON script file name exactly.
2. `quiz_result` carries one extra column, `scene_id`, because quizzes live
   inside scenes (FR-22) and a result must name its scene.
3. `progress` carries one extra bookkeeping column, `scenes_seen` (a JSON
   list), so `scenes_completed` counts distinct scenes exactly.
4. `user` logs in with a unique `username`; `email` follows the ERD and is
   optional at registration but unique when given.

## 3. JSON data files (single source of truth)

Content is data, never retyped into code:

- `data/catalogue.json` — the story catalogue: id, title, language,
  country, flag code and description for every story.
- `data/languages.json` — every language with its country, a greeting
  (phrase and meaning) and its stories. This file is generated from the
  story scripts themselves, so it cannot drift from the content.
- `stories/<id>.json` — one story script per file.

Story script schema:

| Field | Meaning |
|---|---|
| `id` | Story slug; matches the file name and the STORY row |
| `title`, `language`, `description` | Display metadata |
| `cover` | Optional cover image path under `static/` |
| `start` | Id of the first scene |
| `scenes` | Map of scene id to scene |
| scene `character` | Who is speaking |
| scene `native` | The phrase in the language |
| scene `translation` | English meaning |
| scene `culture` | Optional culture note |
| scene `audio` | Optional MP3 file name in `audio/` |
| scene `image`, `character_img` | Optional artwork under `static/` |
| scene `choices` | List of `{label, reply, next}`; `next` is the branching (FR-18) |
| scene `quizzes` | List of `{question, options, answer}`; `answer` is the correct option index |

## 4. API reference

Pages (HTML):

| Route | Auth | Purpose |
|---|---|---|
| `GET /` | Public | Landing page: problem, how it works, languages, roadmap |
| `GET /stories` | Learner | Story selection with language filter chips and progress bars |
| `GET /story/<id>` | Learner | Story player (scenes load through the JSON API) |
| `GET /dashboard` | Learner | XP, level, streak, daily goal, per-story scores (FR-34) |
| `GET /leaderboard` | Public | Top learners by XP |
| `GET /auth/register`, `GET /auth/login`, `GET /auth/logout` | Public | Account flows (FR-01, FR-02, FR-03) |
| `GET, POST /contribute/` | Contributor, admin | Upload story script and audio (FR-08, FR-09) |
| `GET /admin/` | Admin | Approvals, user roles, popularity and score reports (FR-14, FR-15, FR-35, FR-36) |
| `POST /admin/approve/<id>`, `POST /admin/reject/<id>`, `POST /admin/role/<user_id>` | Admin | Content and user management |
| `GET /audio/<file>` | Public | Native-speaker MP3 delivery (FR-19, FR-25) |

JSON:

| Route | Auth | Returns |
|---|---|---|
| `GET /api/languages` | Public | All languages from `data/languages.json` |
| `GET /api/languages/<code>` | Public | One language and its stories |
| `GET /api/stories` | Public | Story catalogue metadata |
| `GET /api/stories/<id>` | Public | Full story script for an approved story |
| `GET /api/story/<id>` | Learner | Same story script (player route) |
| `GET /api/story/<id>/scene/<scene_id>` | Learner | One scene |
| `POST /api/choice` | Learner | Body `{story_id, scene_id, choice_index}`; updates PROGRESS; returns scenes completed and status |
| `POST /api/assessment/submit` | Learner | Body `{story_id, scene_id, answers}`; marks against the script; stores QUIZ_RESULT; returns `{score, total}` |
| `GET /api/leaderboard` | Public | Top 10: username, XP, level, stories played |
| `GET /api/me` | Learner | Own XP, level, level progress, streak, daily goal progress |

## 5. Gamification rules

Implemented in `app/gamification.py`, always derived from QUIZ_RESULT rows,
never stored as a drifting counter:

- XP: 1 quiz point = 10 XP.
- Levels: Mgeni (0 XP), Mwanafunzi (50), Msomi (150), Mpenda Lugha (300),
  Shujaa (500), Mzee (800).
- Daily goal: 30 XP per day.
- Streak: consecutive days with at least one quiz attempt, counting back
  from today; a streak earned yesterday is still alive today.
- PROGRESS.current_streak snapshots the streak at the learner's last choice.

## 6. Functional requirements coverage (Chapter 4)

| FR | Requirement | Status | Where |
|---|---|---|---|
| FR-01 | Learner register account | Done | `auth.register` |
| FR-02 | Learner log in | Done | `auth.login` |
| FR-03 | Administrator log in to dashboard | Done | `auth.login` + `admin.panel` |
| FR-04 | Learner select language | Done | Filter chips on `/stories`; `/api/languages` |
| FR-05 | Learner select story | Done | `/stories` cards |
| FR-06 | Learner choose story branch | Done | Player choices |
| FR-07 | Learner answer quiz question | Done | Player quizzes |
| FR-08 | Contributor upload story script | Done | `contribute.upload` |
| FR-09 | Contributor upload audio recording | Done | `contribute.upload` + AUDIO_RECORDING rows |
| FR-10 | System authenticate credentials | Done | Flask-Login session auth |
| FR-11 | System hash password | Done | Werkzeug hashing in `User.set_password` |
| FR-12 | System restrict pages by role | Done | `roles_required`, `login_required` |
| FR-13 | System validate story script | Done | JSON parse and scenes/start check on upload |
| FR-14 | Administrator approve story | Done | `admin.approve` |
| FR-15 | Administrator reject story | Done | `admin.reject` |
| FR-16 | Administrator deactivate user account | Partial | Admin manages roles; a dedicated deactivate flag is future work |
| FR-17 | System parse story script | Done | `load_story` JSON parsing |
| FR-18 | System branch story path | Done | Choice `next` pointers |
| FR-19 | System retrieve scene audio | Done | `audio` blueprint |
| FR-20 | Web Speech API convert text to speech | Partial | Pronunciation is native-speaker MP3 in this build; speech synthesis fallback ships in the static PWA build |
| FR-21 | Learner practise pronunciation | Done | Play pronunciation per scene and repeat along; no voice capture, by design |
| FR-22 | System mark quiz answers | Done | `assessment.submit` |
| FR-23 | System update learner streak | Done | `gamification.streak_days`, PROGRESS snapshot |
| FR-24 | Learner view story scene | Done | Story player |
| FR-25 | Learner listen to native speaker audio | Done | MP3 clips (flagship story recorded; more in recording) |
| FR-26 | Learner view quiz score | Done | Instant score after each quiz |
| FR-27 | Contributor view approval status | Done | Upload page lists own stories with status |
| FR-28 | System store user account | Done | USER table |
| FR-29 | System store story script | Done | JSON file + STORY row |
| FR-30 | System store audio recording | Done | MP3 file + AUDIO_RECORDING row |
| FR-31 | System store learner progress | Done | PROGRESS upsert per choice |
| FR-32 | System store quiz result | Done | QUIZ_RESULT per marked quiz |
| FR-33 | System cache story content | Done | PWA service worker (`static/sw.js`) |
| FR-34 | Learner view progress dashboard | Done | `/dashboard` |
| FR-35 | Administrator view story popularity report | Done | Admin panel, from PROGRESS counts |
| FR-36 | Administrator view score analysis report | Done | Admin panel, from QUIZ_RESULT aggregates |

## 7. Non-functional requirements (Chapter 4)

| NFR | How the build addresses it |
|---|---|
| Security | Hashed passwords, session auth, role checks on every protected route, only approved content is public |
| Performance | Stories are small JSON files; scenes load one at a time; MP3s are compressed (about 12 KB per second) |
| Availability | PWA service worker caches pages, stories and audio for offline use |
| Usability | Mobile-first cultural theme, one-tap choices, a story is playable within a minute of opening the app |
| Compatibility | Runs in any modern mobile or desktop browser; installable as a PWA, no app store needed |
| Reliability | Broken story JSON is rejected at upload and at load with a safe error, never a crash; progress is written per choice so nothing is lost mid-story |
| Maintainability | New stories and languages are JSON files; the catalogue and language data are generated from the content itself |
| Data Integrity | Foreign keys tie every progress row and result to exactly one learner and one story; PROGRESS is unique per learner and story |

## 8. Running the app

```bash
python -m venv venv
venv\Scripts\activate        # Windows (source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
python run.py
```

First run creates `instance/mothertalk.db` and seeds demo accounts
(learner / learn123, contributor / contrib123, admin / admin123), the six
catalogue stories as approved, and AUDIO_RECORDING rows for the MP3 clips
on disk, with real file sizes.

## 9. Honest limitations of this build

- Demo story phrases await native-speaker review (stated in the app footer).
- Recorded audio currently covers the flagship Kikuyu story; other stories
  gain clips through the contributor flow.
- FR-16 (account deactivation) and FR-20 (speech synthesis in the Flask
  build) are partial, as marked in the coverage table.
- The SQLite database suits the MVP; the models migrate to a server
  database without code changes through SQLAlchemy.
