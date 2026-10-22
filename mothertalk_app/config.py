import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Change this before any public deployment. Keep it secret.
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "instance", "mothertalk.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    STORIES_DIR = os.path.join(BASE_DIR, "stories")
    AUDIO_DIR = os.path.join(BASE_DIR, "audio")
    DATA_DIR = os.path.join(BASE_DIR, "data")
