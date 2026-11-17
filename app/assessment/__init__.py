"""SSAD process 4: quiz scoring. Answers are checked against the story JSON."""
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models import QuizResult
from app.story import load_story

bp = Blueprint("assessment", __name__)


@bp.route("/submit", methods=["POST"])
@login_required
def submit():
    """Score a quiz scene. Expects JSON: {story_id, scene_id, answers: [indexes]}."""
    data = request.get_json(force=True, silent=True) or {}
    story = load_story(data.get("story_id", ""))
    scene = (story or {}).get("scenes", {}).get(data.get("scene_id", ""))
    if not story or not scene:
        return jsonify({"error": "Unknown story or scene."}), 400
    quizzes = scene.get("quizzes", [])
    answers = data.get("answers", [])

    score = sum(1 for q, a in zip(quizzes, answers) if a == q["answer"])
    attempt = QuizResult(user_id=current_user.id, story_id=story["id"],
                      scene_id=data["scene_id"], score=score, total=len(quizzes))
    db.session.add(attempt)
    db.session.commit()
    return jsonify({"score": score, "total": len(quizzes)})
