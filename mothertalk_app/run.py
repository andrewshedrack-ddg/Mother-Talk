"""Local development entry point ONLY. Never use this in production:
it runs the Flask debug server. Deploy with wsgi.py instead.

Local run:
    MOTHERTALK_ALLOW_DEV_SECRET=1 SECRET_KEY=dev-only-change-me python run.py
(Or set a real SECRET_KEY in the environment and skip the dev flag.)
"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
