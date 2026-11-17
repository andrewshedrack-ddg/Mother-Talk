"""Public JSON API.

Languages and stories are served from the JSON data files in /data and
/stories, so new content is added by dropping in a file, never by
retyping content into code. The web pages and any future mobile app
all read from these same endpoints.
"""
import json
import os

from flask import Blueprint, abort, current_app, jsonify
from flask_login import current_user, login_required

from app import gamification
from app.models import QuizResult, Story, User
from app.story import load_story

bp = Blueprint("api", __name__)


def _load_data(name):
    path = os.path.join(current_app.config["DATA_DIR"], name)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@bp.route("/languages")
def languages():
    """Every language on the platform, straight from data/languages.json."""
    return jsonify(_load_data("languages.json"))


@bp.route("/languages/<code>")
def language(code):
    for lang in _load_data("languages.json")["languages"]:
        if lang["code"] == code.lower():
            return jsonify(lang)
    abort(404)


@bp.route("/stories")
def stories():
    """The story catalogue: metadata only, full text via /api/stories/<id>."""
    out = []
    for entry in _load_data("catalogue.json"):
        out.append({
            "id": entry["id"], "title": entry["title"],
            "language": entry["language"], "country": entry["country"],
            "flag": entry["flag"], "description": entry["description"],
            "url": "/api/stories/" + entry["id"],
        })
    return jsonify({"stories": out})


@bp.route("/stories/<story_id>")
def story(story_id):
    record = Story.query.filter_by(id=story_id, status="approved").first()
    data = load_story(story_id)
    if not record or not data:
        abort(404)
    return jsonify(data)


@bp.route("/leaderboard")
def leaderboard():
    """Top learners by XP. Usernames and levels only, no private data."""
    rows = []
    for user in User.query.filter_by(role="learner").all():
        xp = gamification.total_xp(user.id)
        if xp <= 0:
            continue
        rows.append({
            "username": user.username,
            "xp": xp,
            "level": gamification.level_for(xp)[0],
            "stories_played": len({a.story_id for a in
                                   QuizResult.query.filter_by(user_id=user.id)}),
        })
    rows.sort(key=lambda r: r["xp"], reverse=True)
    return jsonify({"leaderboard": rows[:10]})


@bp.route("/me")
@login_required
def me():
    """The signed-in learner's gamification summary."""
    data = gamification.summary(current_user.id)
    data["username"] = current_user.username
    return jsonify(data)
