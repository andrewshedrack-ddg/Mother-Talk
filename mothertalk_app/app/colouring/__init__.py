"""SSAD process 6.0: Manage Colouring Artwork (FR-46/47/48, store D6 ARTWORK).

Learners pick one of the 30 African colouring artworks, paint it with
fill or brush on a canvas, and save the finished painting. The first
finish of an artwork earns +15 XP; finishing the same artwork again
updates the saved painting but earns nothing more (the ARTWORK table's
unique constraint on (user_id, artwork_id) is what makes it once-only).

The artwork files are the transparent line-art webp images in
app/static/img/colouring/ (extracted from the static site's
colouring-art-*.js data URIs). The painting itself is the same layered
approach as the static site: the learner's paint lives on a separate
canvas UNDER the line art, so outlines are always drawn on top and
colour can never cover them.
"""
import json
import os

from flask import Blueprint, abort, current_app, jsonify, render_template, request
from flask_login import current_user, login_required

from app import db
from app import gamification
from app.extensions import csrf, limiter
from app.models import Artwork

bp = Blueprint("colouring", __name__)

MAX_IMAGE_DATA_BYTES = 2 * 1024 * 1024  # finished paintings are small PNGs


def load_catalogue():
    """The 30 artworks: id, title, file, from data/colouring.json."""
    path = os.path.join(current_app.config["DATA_DIR"], "colouring.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)["artworks"]


def find_artwork(artwork_id):
    for art in load_catalogue():
        if art["id"] == artwork_id:
            return art
    return None


@bp.route("/colouring")
@login_required
def gallery():
    """Colouring Studio gallery: all 30 artworks, finished ones marked."""
    arts = load_catalogue()
    finished = {a.artwork_id: a for a in
                Artwork.query.filter_by(user_id=current_user.id).all()}
    return render_template("colouring/gallery.html", arts=arts, finished=finished)


@bp.route("/colouring/<artwork_id>")
@login_required
def studio(artwork_id):
    """One artwork's painting page. The canvas work happens in static/js/colour.js."""
    art = find_artwork(artwork_id)
    if not art:
        abort(404)
    done = Artwork.query.filter_by(user_id=current_user.id,
                                   artwork_id=artwork_id).first()
    return render_template("colouring/studio.html", art=art, done=bool(done))


@bp.route("/colouring/finish", methods=["POST"])
@login_required
@limiter.limit("30 per minute")
@csrf.exempt
def finish():
    """Save a finished painting and award +15 XP the first time.

    Expects JSON: {artwork_id, image_data} where image_data is a PNG
    data URL from canvas.toDataURL(). CSRF-exempt because this is a
    strict JSON API: a cross-site form POST cannot produce a JSON body,
    so such a request fails closed here with 400.
    """
    data = request.get_json(force=True, silent=True) or {}
    art = find_artwork(data.get("artwork_id", ""))
    if not art:
        return jsonify({"error": "Unknown artwork."}), 400
    image_data = data.get("image_data", "")
    if (not isinstance(image_data, str)
            or not image_data.startswith("data:image/png;base64,")
            or len(image_data) > MAX_IMAGE_DATA_BYTES):
        return jsonify({"error": "A finished painting image is required."}), 400

    row = Artwork.query.filter_by(user_id=current_user.id,
                                  artwork_id=art["id"]).first()
    if row is None:
        row = Artwork(user_id=current_user.id, artwork_id=art["id"],
                      title=art["title"], image_data=image_data,
                      xp_awarded=gamification.XP_PER_ARTWORK)
        db.session.add(row)
        db.session.commit()
        return jsonify({"ok": True, "xp_awarded": row.xp_awarded,
                        "already": False,
                        "total_xp": gamification.total_xp(current_user.id)})
    # Already counted: keep the newest painting, award nothing more.
    row.image_data = image_data
    db.session.commit()
    return jsonify({"ok": True, "xp_awarded": 0, "already": True,
                    "total_xp": gamification.total_xp(current_user.id)})
