"""Shared Flask extensions, created here so blueprints can import them
without circular imports (app/__init__.py initialises them in create_app)."""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect

# Flood protection: generous defaults for a class demo, strict where it
# matters (login is limited per-route in app/auth). In-memory storage is
# right for PythonAnywhere free tier, which runs a single worker.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "60 per minute"],
)

# CSRF protection for the HTML forms (login, register, contribute,
# admin actions). JSON API endpoints are exempted individually, because
# they only accept JSON bodies and fail closed on anything else.
csrf = CSRFProtect()
