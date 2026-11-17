# config: settings for the app. Secrets come from the environment, never from this file.
import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # SECRET_KEY comes from the environment only. create_app() refuses to
    # start when it is missing, unless MOTHERTALK_ALLOW_DEV_SECRET=1 is
    # set for local development. Never commit a real secret.
    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "instance", "mothertalk.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    STORIES_DIR = os.path.join(BASE_DIR, "stories")
    AUDIO_DIR = os.path.join(BASE_DIR, "audio")
    DATA_DIR = os.path.join(BASE_DIR, "data")

    # Session cookies: HttpOnly + SameSite=Lax always; Secure only in
    # production (PythonAnywhere serves HTTPS), so local HTTP dev still works.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("MOTHERTALK_ENV") == "production"
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)
