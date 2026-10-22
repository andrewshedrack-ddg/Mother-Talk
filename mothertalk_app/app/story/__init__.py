"""SSAD process 2: story engine. Stories live as JSON files; the catalogue lives in the DB."""
import json
import os
from datetime import date
from flask import Blueprint, render_template, jsonify, request, current_app, abort, send_file
from flask_login import login_required, current_user
from app import db
from app.models import QuizResult, Progress, Story

bp = Blueprint("story", __name__)


def load_story(story_id):
    """Read one story JSON file. Returns None if the file is missing or broken."""
    path = os.path.join(current_app.config["STORIES_DIR"], story_id + ".json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def approved_or_404(story_id):
    """Learners may only open stories an admin has approved."""
    record = Story.query.filter_by(id=story_id, status="approved").first()
    story = load_story(story_id)
    if not record or not story:
        abort(404)
    return story


def _load_json_data(name):
    path = os.path.join(current_app.config["DATA_DIR"], name)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@bp.route("/")
def landing():
    """Public home page: the pitch, the languages, how it works."""
    languages = _load_json_data("languages.json")["languages"]
    catalogue = _load_json_data("catalogue.json")
    countries = sorted({e["country"] for e in catalogue})
    return render_template("landing.html", languages=languages,
                           story_count=len(catalogue),
                           language_count=len(languages),
                           countries=countries)


@bp.route("/stories")
@login_required
def select():
    """Story selection screen: language chips, story cards, progress bars."""
    meta = {e["id"]: e for e in _load_json_data("catalogue.json")}
    records = Story.query.filter_by(status="approved").order_by(Story.title).all()
    stories, progress = [], {}
    for r in records:
        data = load_story(r.id)
        if not data:
            continue
        total_possible = sum(len(s.get("quizzes", [])) for s in data["scenes"].values())
        attempts = QuizResult.query.filter_by(user_id=current_user.id, story_id=r.id).all()
        got = sum(a.score for a in attempts)
        stories.append({"id": r.id, "title": r.title, "language": r.language,
                        "description": r.description,
                        "country": meta.get(r.id, {}).get("country", ""),
                        "flag": meta.get(r.id, {}).get("flag", ""),
                        "cover": data.get("cover", "")})
        progress[r.id] = (got, total_possible)
    languages = sorted({s["language"] for s in stories})
    return render_template("story/select.html", stories=stories,
                           progress=progress, languages=languages)


@bp.route("/leaderboard")
def leaderboard():
    """Public board: top learners by XP, Duolingo style."""
    from app import gamification
    from app.models import User
    rows = []
    for user in User.query.filter_by(role="learner").all():
        xp = gamification.total_xp(user.id)
        if xp <= 0:
            continue
        rows.append({"username": user.username, "xp": xp,
                     "level": gamification.level_for(xp)[0],
                     "streak": gamification.streak_days(user.id)})
    rows.sort(key=lambda r: r["xp"], reverse=True)
    return render_template("leaderboard.html", rows=rows[:10])


@bp.route("/story/<story_id>")
@login_required
def play(story_id):
    """Story play screen. Scenes load through the JSON API below."""
    story = approved_or_404(story_id)
    return render_template("story/play.html", story=story)


@bp.route("/api/story/<story_id>")
@login_required
def story_json(story_id):
    return jsonify(approved_or_404(story_id))


@bp.route("/api/story/<story_id>/scene/<scene_id>")
@login_required
def scene_json(story_id, scene_id):
    story = approved_or_404(story_id)
    if scene_id not in story["scenes"]:
        abort(404)
    return jsonify(story["scenes"][scene_id])


@bp.route("/api/choice", methods=["POST"])
@login_required
def record_choice():
    """Record one learner choice in PROGRESS (ERD: one row per learner
    and story). Expects JSON: {story_id, scene_id, choice_index}."""
    from datetime import datetime

    from app import gamification

    data = request.get_json(force=True, silent=True) or {}
    story = approved_or_404(data.get("story_id", ""))
    scene_id = data.get("scene_id", "")
    scene = story["scenes"].get(scene_id, {})
    choices = scene.get("choices", [])
    idx = int(data.get("choice_index", 0))
    next_id = choices[idx].get("next") if 0 <= idx < len(choices) else None

    row = Progress.query.filter_by(user_id=current_user.id,
                                   story_id=data["story_id"]).first()
    if row is None:
        row = Progress(user_id=current_user.id, story_id=data["story_id"])
        db.session.add(row)
    seen = set(json.loads(row.scenes_seen or "[]"))
    seen.add(scene_id)
    if next_id:
        seen.add(next_id)
    row.scenes_seen = json.dumps(sorted(seen))
    row.scenes_completed = len(seen)
    next_scene = story["scenes"].get(next_id, {}) if next_id else {}
    row.completion_status = ("completed" if next_id and not next_scene.get("choices")
                             else "in_progress")
    row.current_streak = gamification.streak_days(current_user.id)
    row.last_accessed = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True, "scenes_completed": row.scenes_completed,
                    "status": row.completion_status})


@bp.route("/dashboard")
@login_required
def dashboard():
    """Learner dashboard: points, stories started, per-story scores, learning streak."""
    attempts = QuizResult.query.filter_by(user_id=current_user.id).order_by(QuizResult.created).all()
    total_points = sum(a.score for a in attempts)
    total_possible = sum(a.total for a in attempts)

    per_story = {}
    for a in attempts:
        row = per_story.setdefault(a.story_id, {"got": 0, "total": 0})
        row["got"] += a.score
        row["total"] += a.total
    story_rows = []
    for sid, row in per_story.items():
        rec = Story.query.get(sid)
        story_rows.append({"title": rec.title if rec else sid,
                           "got": row["got"], "total": row["total"],
                           "pct": round(100 * row["got"] / row["total"]) if row["total"] else 0})

    from app import gamification
    game = gamification.summary(current_user.id)

    return render_template("story/dashboard.html", total_points=total_points,
                           total_possible=total_possible, story_rows=story_rows,
                           stories_started=len(per_story), game=game)


@bp.route("/sw.js")
def service_worker():
    """Serve the service worker from the site root so its scope covers every page."""
    return send_file(os.path.join(current_app.static_folder, "sw.js"),
                     mimetype="application/javascript")
