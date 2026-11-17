"""Admin panel: approve stories, manage users, read reports."""
import os
from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from sqlalchemy import func
from app import db
from app.models import User, Story, QuizResult, Progress
from app.auth import roles_required

bp = Blueprint("admin", __name__)


@bp.route("/")
@roles_required("admin")
def panel():
    pending = Story.query.filter_by(status="pending").order_by(Story.created.desc()).all()
    users = User.query.order_by(User.username).all()

    # Report 1: most played stories. PROGRESS holds one row per learner
    # and story (the design model), so popularity is counted in learners
    # plus the total scenes they completed.
    most_played = (db.session.query(Progress.story_id, func.count(Progress.id),
                                    func.coalesce(func.sum(Progress.scenes_completed), 0))
                   .group_by(Progress.story_id)
                   .order_by(func.count(Progress.id).desc()).all())

    # Report 2: weakest scores (lowest average quiz percentage per story).
    weak = (db.session.query(QuizResult.story_id,
                             func.sum(QuizResult.score).label("got"),
                             func.sum(QuizResult.total).label("total"))
            .group_by(QuizResult.story_id).all())
    weak_rows = []
    for sid, got, total in weak:
        rec = Story.query.get(sid)
        weak_rows.append({"title": rec.title if rec else sid,
                          "pct": round(100 * got / total) if total else 0,
                          "got": got, "total": total})
    weak_rows.sort(key=lambda r: r["pct"])

    return render_template("admin/panel.html", pending=pending, users=users,
                           most_played=most_played, weak_rows=weak_rows)


@bp.route("/approve/<story_id>", methods=["POST"])
@roles_required("admin")
def approve(story_id):
    story = Story.query.get_or_404(story_id)
    story.status = "approved"
    db.session.commit()
    flash(f"'{story.title}' is now live for learners.")
    return redirect(url_for("admin.panel"))


@bp.route("/reject/<story_id>", methods=["POST"])
@roles_required("admin")
def reject(story_id):
    story = Story.query.get_or_404(story_id)
    path = os.path.join(current_app.config["STORIES_DIR"], story_id + ".json")
    if os.path.isfile(path):
        os.remove(path)
    db.session.delete(story)
    db.session.commit()
    flash("Story rejected and removed.")
    return redirect(url_for("admin.panel"))


@bp.route("/deactivate/<int:user_id>", methods=["POST"])
@roles_required("admin")
def deactivate(user_id):
    """FR-16: a deactivated account keeps its data but cannot log in."""
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash("You cannot deactivate your own account.")
    else:
        user.is_active = False
        db.session.commit()
        flash(f"{user.username} has been deactivated.")
    return redirect(url_for("admin.panel"))


@bp.route("/activate/<int:user_id>", methods=["POST"])
@roles_required("admin")
def activate(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = True
    db.session.commit()
    flash(f"{user.username} has been reactivated.")
    return redirect(url_for("admin.panel"))


@bp.route("/role/<int:user_id>", methods=["POST"])
@roles_required("admin")
def set_role(user_id):
    user = User.query.get_or_404(user_id)
    role = request.form.get("role", "")
    if role not in ("learner", "contributor", "admin"):
        flash("Unknown role.")
    else:
        user.role = role
        db.session.commit()
        flash(f"{user.username} is now a {role}.")
    return redirect(url_for("admin.panel"))
