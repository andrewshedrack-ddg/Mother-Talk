"""Contributor uploads: story JSON scripts plus native-speaker MP3s. Admins approve them."""
import json
import os
import re
from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from app import db
from app.models import AudioRecording, Story
from app.auth import roles_required

bp = Blueprint("contribute", __name__)

ALLOWED_STORY = {".json"}
ALLOWED_AUDIO = {".mp3"}


def slug(text):
    """Turn a title into a safe file id: 'Wanjiru's Day' -> 'wanjirus-day'."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "story"


@bp.route("/", methods=["GET", "POST"])
@roles_required("contributor", "admin")
def upload():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        language = request.form.get("language", "").strip()
        description = request.form.get("description", "").strip()
        story_file = request.files.get("story_file")

        if not title or not language or not story_file:
            flash("Title, language and a story JSON file are required.")
            return render_template("contribute/upload.html", uploads=my_uploads())

        name = secure_filename(story_file.filename or "")
        if not any(name.lower().endswith(ext) for ext in ALLOWED_STORY):
            flash("The story script must be a .json file.")
            return render_template("contribute/upload.html", uploads=my_uploads())

        try:
            data = json.load(story_file.stream)
        except json.JSONDecodeError:
            flash("That JSON file is broken and could not be read.")
            return render_template("contribute/upload.html", uploads=my_uploads())

        if not isinstance(data, dict) or "scenes" not in data or "start" not in data:
            flash("The JSON needs at least 'scenes' and 'start'.")
            return render_template("contribute/upload.html", uploads=my_uploads())

        story_id = slug(data.get("id") or title)
        if Story.query.get(story_id):
            flash("A story with that id already exists. Change the title slightly.")
            return render_template("contribute/upload.html", uploads=my_uploads())

        data["id"] = story_id
        stories_dir = current_app.config["STORIES_DIR"]
        os.makedirs(stories_dir, exist_ok=True)
        with open(os.path.join(stories_dir, story_id + ".json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Native-speaker audio clips. Filenames are referenced from the story JSON.
        audio_dir = current_app.config["AUDIO_DIR"]
        os.makedirs(audio_dir, exist_ok=True)
        saved = 0
        recordings = []
        for clip in request.files.getlist("audio_files"):
            clip_name = secure_filename(clip.filename or "")
            if clip_name and clip_name.lower().endswith(".mp3"):
                path = os.path.join(audio_dir, clip_name)
                clip.save(path)
                saved += 1
                stem = clip_name[:-4]
                _, _, scene_ref = stem.partition("_")
                recordings.append(AudioRecording(
                    story_id=story_id, contributor_id=current_user.id,
                    scene_reference=scene_ref, file_name=clip_name,
                    file_size_kb=round(os.path.getsize(path) / 1024)))

        db.session.add(Story(id=story_id, title=title, language=language,
                             description=description, status="pending",
                             script_file=story_id + ".json",
                             contributor_id=current_user.id))
        db.session.flush()
        db.session.add_all(recordings)
        db.session.commit()
        flash(f"Story submitted for review ({saved} audio clip(s) saved). An admin will approve it.")
        return redirect(url_for("contribute.upload"))

    return render_template("contribute/upload.html", uploads=my_uploads())


def my_uploads():
    if current_user.role == "admin":
        return Story.query.order_by(Story.created.desc()).all()
    return Story.query.filter_by(contributor_id=current_user.id).order_by(Story.created.desc()).all()
