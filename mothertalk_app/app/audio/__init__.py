import os
from flask import Blueprint, send_from_directory, current_app, abort
from flask_login import login_required

bp = Blueprint("audio", __name__)


@bp.route("/<filename>")
@login_required
def clip(filename):
    """Serve one native-speaker MP3 from the audio folder (login required)."""
    folder = current_app.config["AUDIO_DIR"]
    path = os.path.join(folder, filename)
    if not os.path.isfile(path) or not filename.lower().endswith(".mp3"):
        abort(404)
    return send_from_directory(folder, filename)
