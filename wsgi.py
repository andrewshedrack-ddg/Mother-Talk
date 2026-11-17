"""WSGI entry point for production hosts (e.g. `gunicorn wsgi:application`).

NEVER use run.py's debug server for deployment. It is for local
development only.

PythonAnywhere: in the Web tab, set the WSGI configuration file to the
following (edit the paths and secret to match your account):

    import sys
    sys.path.insert(0, '/home/<username>/Mother-Talk/mothertalk_app')
    import os
    os.environ['SECRET_KEY'] = '<a long random secret>'  # generate one, never commit it
    os.environ['MOTHERTALK_ENV'] = 'production'
    from app import create_app
    application = create_app()
"""
import os

os.environ.setdefault("MOTHERTALK_ENV", "production")

from app import create_app

application = create_app()
