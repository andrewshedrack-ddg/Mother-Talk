"""Data model. Mirrors the ERD in the Chapter 4 design document
(System Analysis and Design): USER, STORY, AUDIO_RECORDING, PROGRESS,
QUIZ_RESULT, with the same relationships: a contributor uploads stories,
a story contains audio recordings, PROGRESS resolves the many-to-many
between learner and story, and QUIZ_RESULT stores every marked quiz.

Documented implementation choices (kept honest, on purpose):
- story_id is TEXT (the story slug, e.g. "wanjiru"), not INTEGER,
  because it must match the story's JSON script file name exactly.
- QUIZ_RESULT carries one extra column, scene_id: quizzes live inside
  scenes (FR-22), so a result must name its scene.
- PROGRESS carries one extra bookkeeping column, scenes_seen (a JSON
  list), so scenes_completed counts distinct scenes exactly.
- USER logs in with a unique username; full_name and email follow the
  ERD, and email is optional at registration but unique when given.
"""
from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app import db


class User(UserMixin, db.Model):
    """ERD: USER. Learner, contributor (native speaker) or admin.
    Passwords are only ever stored hashed (FR-11)."""
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)               # user_id
    username = db.Column(db.String(64), unique=True, nullable=False)
    full_name = db.Column(db.String(128), default="")
    email = db.Column(db.String(128), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(16), default="learner")  # learner | contributor | admin
    created = db.Column(db.DateTime, default=datetime.utcnow)  # created_at

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Story(db.Model):
    """ERD: STORY. Catalogue entry for one story JSON script file.
    Only 'approved' stories are shown to learners (FR-14)."""
    __tablename__ = "story"

    id = db.Column(db.String(64), primary_key=True)            # story_id (slug)
    contributor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    title = db.Column(db.String(128), nullable=False)
    language = db.Column(db.String(64), nullable=False)
    level = db.Column(db.String(32), default="Beginner")
    status = db.Column(db.String(16), default="pending")  # pending | approved
    script_file = db.Column(db.String(128), default="")   # e.g. "wanjiru.json"
    description = db.Column(db.String(256), default="")
    created = db.Column(db.DateTime, default=datetime.utcnow)


class AudioRecording(db.Model):
    """ERD: AUDIO_RECORDING. One native-speaker MP3 for one story scene (D3)."""
    __tablename__ = "audio_recording"

    id = db.Column(db.Integer, primary_key=True)               # audio_id
    story_id = db.Column(db.String(64), db.ForeignKey("story.id"), nullable=False)
    contributor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    scene_reference = db.Column(db.String(64), default="")
    file_name = db.Column(db.String(128), nullable=False)
    file_size_kb = db.Column(db.Integer, default=0)


class Progress(db.Model):
    """ERD: PROGRESS. One row per learner and story: how far they got.
    Updated every time the learner makes a story choice (FR-31)."""
    __tablename__ = "progress"
    __table_args__ = (db.UniqueConstraint("user_id", "story_id"),)

    id = db.Column(db.Integer, primary_key=True)               # progress_id
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)   # learner_id
    story_id = db.Column(db.String(64), db.ForeignKey("story.id"), nullable=False)
    scenes_completed = db.Column(db.Integer, default=0)
    completion_status = db.Column(db.String(16), default="in_progress")  # in_progress | completed
    current_streak = db.Column(db.Integer, default=0)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    scenes_seen = db.Column(db.Text, default="[]")  # bookkeeping for scenes_completed


class QuizResult(db.Model):
    """ERD: QUIZ_RESULT. One marked quiz: score out of total_questions (FR-32)."""
    __tablename__ = "quiz_result"

    id = db.Column(db.Integer, primary_key=True)               # result_id
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)   # learner_id
    story_id = db.Column(db.String(64), nullable=False)
    scene_id = db.Column(db.String(64), default="")  # extra column, see module docstring
    score = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Integer, nullable=False)              # total_questions
    created = db.Column(db.DateTime, default=datetime.utcnow)  # date_taken
