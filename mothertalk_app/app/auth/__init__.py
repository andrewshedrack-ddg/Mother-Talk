from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models import User

bp = Blueprint("auth", __name__)


def roles_required(*roles):
    """Role check for every protected route (Chapter 3 security requirement)."""
    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role not in roles:
                flash("You do not have permission for that page.")
                return redirect(url_for("story.select"))
            return view(*args, **kwargs)
        return wrapped
    return decorator


@bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if not username or not password:
            flash("Username and password are required.")
            return render_template("auth/register.html")
        if User.query.filter_by(username=username).first():
            flash("That username is taken.")
            return render_template("auth/register.html")
        user = User(username=username, full_name=username)
        user.set_password(password)  # hashed with Werkzeug, never stored raw
        db.session.add(user)
        db.session.commit()
        flash("Account created. Please log in.")
        return redirect(url_for("auth.login"))
    return render_template("auth/register.html")


@bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = User.query.filter_by(username=request.form.get("username", "").strip()).first()
        if user and user.check_password(request.form.get("password", "")):
            login_user(user)
            return redirect(url_for("story.select"))
        flash("Wrong username or password.")
    return render_template("auth/login.html")


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))
