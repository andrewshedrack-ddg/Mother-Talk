"""MotherTalk Flask app. One blueprint per SSAD process (Chapter 3)."""
import click
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from werkzeug.middleware.proxy_fix import ProxyFix

from app.extensions import csrf, limiter

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = "auth.login"


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    # Behind PythonAnywhere the real client IP arrives in X-Forwarded-For;
    # ProxyFix makes request.remote_addr (and therefore rate-limit keys)
    # use it instead of the proxy's own address. Harmless with no proxy.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

    # A missing SECRET_KEY is a hard stop, not a silent fallback: the old
    # default "dev-only-change-me" shipped in the repo. Local development
    # may opt out explicitly with MOTHERTALK_ALLOW_DEV_SECRET=1.
    import os
    if not app.config["SECRET_KEY"]:
        if os.environ.get("MOTHERTALK_ALLOW_DEV_SECRET") == "1":
            app.logger.warning(
                "SECRET_KEY is not set, using the dev-only default. "
                "Never run in production like this.")
            app.config["SECRET_KEY"] = "dev-only-change-me"
        else:
            raise RuntimeError(
                "SECRET_KEY is not set. Set the SECRET_KEY environment "
                "variable (or MOTHERTALK_ALLOW_DEV_SECRET=1 for local "
                "development only).")

    db.init_app(app)
    login_manager.init_app(app)
    limiter.init_app(app)
    csrf.init_app(app)

    from app.models import User, Story, Artwork  # noqa: F401  (registers models)

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
    from app.colouring import bp as colouring_bp

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(story_bp)
    app.register_blueprint(audio_bp, url_prefix="/audio")
    app.register_blueprint(assessment_bp, url_prefix="/api/assessment")
    app.register_blueprint(contribute_bp, url_prefix="/contribute")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(colouring_bp)

    # CSRF: the HTML forms are protected by Flask-WTF. The JSON API
    # endpoints below are exempt because they only accept JSON bodies.
    # A cross-site form POST cannot produce one, so such a request fails
    # closed with 400. (colouring.finish is exempted in its own module.)
    csrf.exempt(app.view_functions["story.record_choice"])
    csrf.exempt(app.view_functions["assessment.submit"])

    @app.cli.command("create-admin")
    @click.option("--username", prompt=True, help="Admin username.")
    @click.option("--password", prompt=True, hide_input=True,
                  confirmation_prompt=True, help="Admin password.")
    def create_admin(username, password):
        """Create the first admin account. Run once after first deploy."""
        if User.query.filter_by(username=username).first():
            click.echo(f"User '{username}' already exists.")
            return
        user = User(username=username, role="admin")
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        click.echo(f"Admin '{username}' created. Keep the password safe.")

    with app.app_context():
        # SQLite lives in the instance folder; create it or a fresh host
        # (PythonAnywhere, a new laptop) fails with "unable to open database file".
        import os
        os.makedirs(app.instance_path, exist_ok=True)
        db.create_all()
        ensure_user_active_column()
        seed_demo_data()

    return app


def ensure_user_active_column():
    """FR-16 upgrade guard: databases created before the is_active
    column existed gain it in place, so no saved data is ever lost."""
    from sqlalchemy import inspect, text
    columns = [c["name"] for c in inspect(db.engine).get_columns("user")]
    if "is_active" not in columns:
        db.session.execute(text(
            "ALTER TABLE user ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
        db.session.commit()


def seed_demo_data():
    """First-run seed: the story catalogue and the audio rows for clips
    on disk. No demo accounts are seeded any more. The old
    learner/contributor/admin accounts with published passwords
    (learn123/contrib123/admin123) were a security hole. Create the first
    admin with: flask --app run.py create-admin"""
    from app.models import Story
    if Story.query.first():
        return  # already seeded, never run twice
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
            contributor_id=None,
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
                    contributor_id=None,
                    scene_reference=scene_ref,
                    file_name=file_name,
                    file_size_kb=round(os.path.getsize(
                        os.path.join(audio_dir, file_name)) / 1024),
                ))
    db.session.commit()
