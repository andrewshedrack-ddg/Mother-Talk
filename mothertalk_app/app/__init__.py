"""MotherTalk Flask app. One blueprint per SSAD process (Chapter 3)."""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = "auth.login"


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)
    login_manager.init_app(app)

    from app.models import User, Story  # noqa: F401  (registers models)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # One blueprint per SSAD process in the Chapter 3 data flow diagram.
    from app.auth import bp as auth_bp
    from app.story import bp as story_bp
    from app.audio import bp as audio_bp
    from app.assessment import bp as assessment_bp
    from app.contribute import bp as contribute_bp
    from app.admin import bp as admin_bp
    from app.api import bp as api_bp

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(story_bp)
    app.register_blueprint(audio_bp, url_prefix="/audio")
    app.register_blueprint(assessment_bp, url_prefix="/api/assessment")
    app.register_blueprint(contribute_bp, url_prefix="/contribute")
    app.register_blueprint(admin_bp, url_prefix="/admin")

    with app.app_context():
        db.create_all()
        seed_demo_data()

    return app


def seed_demo_data():
    """First-run seed: demo accounts and the demo Kikuyu story catalogue entry."""
    from app.models import User, Story
    if User.query.first():
        return  # already seeded, never run twice
    learner = User(username="learner", role="learner")
    learner.set_password("learn123")
    contributor = User(username="contributor", role="contributor")
    contributor.set_password("contrib123")
    admin = User(username="admin", role="admin")
    admin.set_password("admin123")
    db.session.add_all([learner, contributor, admin])
    db.session.flush()  # assigns user ids for the foreign keys below
    # Seed the whole story catalogue from data/catalogue.json so the
    # database and the JSON story files can never drift apart.
    import json
    import os
    from flask import current_app
    catalogue_path = os.path.join(current_app.config["DATA_DIR"], "catalogue.json")
    with open(catalogue_path, encoding="utf-8") as f:
        catalogue = json.load(f)
    for entry in catalogue:
        db.session.add(Story(
            id=entry["id"],
            title=entry["title"],
            language=entry["language"],
            description=entry["description"],
            status="approved",
            level="Beginner",
            script_file=entry["id"] + ".json",
            contributor_id=contributor.id,
        ))
    db.session.flush()
    # Seed AUDIO_RECORDING rows for clips that exist on disk (real sizes).
    from app.models import AudioRecording
    audio_dir = current_app.config["AUDIO_DIR"]
    if os.path.isdir(audio_dir):
        for file_name in sorted(os.listdir(audio_dir)):
            if not file_name.endswith(".mp3"):
                continue
            stem = file_name[:-4]
            story_id, _, scene_ref = stem.partition("_")
            if Story.query.get(story_id):
                db.session.add(AudioRecording(
                    story_id=story_id,
                    contributor_id=contributor.id,
                    scene_reference=scene_ref,
                    file_name=file_name,
                    file_size_kb=round(os.path.getsize(
                        os.path.join(audio_dir, file_name)) / 1024),
                ))
    db.session.commit()
