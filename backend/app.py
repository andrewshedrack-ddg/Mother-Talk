import os
from flask import Flask, render_template, redirect, url_for, request, jsonify, session, abort, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import json

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'mother-talk-dev-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/mother_talk')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, supports_credentials=True, origins=['http://localhost:5173'])

db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ─── Models ──────────────────────────────────────────────────────────────

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, index=True)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='learner')  # learner, contributor, admin
    created_at = db.Column(db.DateTime, default=db.func.now)
    progress = db.relationship('Progress', backref='user', lazy='dynamic')


class Progress(db.Model):
    __tablename__ = 'progress'
    id = db.Column(db.Integer, primary_key=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    story_id = db.Column(db.String(50), nullable=False)
    current_node = db.Column(db.String(50), nullable=False, default='start')
    choices_made = db.Column(db.Text, default='[]')
    completed = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.now)
    updated_at = db.Column(db.DateTime, default=db.func.now, onupdate=db.func.now)

    __table_args__ = (db.UniqueConstraint('user_id', 'story_id', name='uq_user_story'),)


# ─── Login Manager ───────────────────────────────────────────────────────


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ─── Authentication Routes ───────────────────────────────────────────────


@app.route('/')
def home():
    """Home page - redirect to login if not authenticated, else story list."""
    if current_user.is_authenticated:
        return redirect(url_for('story_list'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login/register page. Handles both login and new registration."""
    if request.method == 'GET':
        if current_user.is_authenticated:
            return redirect(url_for('story_list'))
        return render_template('auth.html', is_login=True, error='')

    email = request.form.get('email', '').strip()
    password = request.form.get('password', '')

    # If email already has a @, treat as login; otherwise treat as register
    if '@' in email:
        # Login flow
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('story_list'))
        return render_template('auth.html', is_login=True, error='Invalid credentials')
    else:
        # Register flow - create new user
        if User.query.filter_by(email=email).first():
            return render_template('auth.html', is_login=True, error='Email already registered')
        password_hash = generate_password_hash(password)
        user = User(email=email, password_hash=password_hash, role='learner')
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for('story_list'))


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ─── Role decorators ────────────────────────────────────────────────────


def role_required(allowed_roles):
    def decorator(func):
        @login_required
        def wrapper(*args, **kwargs):
            if current_user.role not in allowed_roles:
                abort(403)
            return func(*args, **kwargs)
        return wrapper
    return decorator


# ─── Story API Routes ───────────────────────────────────────────────────


@app.route('/api/stories')
def api_stories():
    """Return list of all story JSON files."""
    stories_dir = os.path.join(basedir, 'stories')
    stories = []
    if os.path.isdir(stories_dir):
        for f in sorted(os.listdir(stories_dir)):
            if f.endswith('.json'):
                with open(os.path.join(stories_dir, f)) as fp:
                    stories.append(json.load(fp))
    return jsonify(stories)


@app.route('/api/stories/<story_id>')
def api_story(story_id):
    """Return a single story's JSON scene graph."""
    story_path = os.path.join(basedir, 'stories', f'{story_id}.json')
    if not os.path.exists(story_path):
        abort(404)
    with open(story_path) as f:
        return jsonify(json.load(f))


# ─── Progress / Choice recording ────────────────────────────────────────


@app.route('/api/progress', methods=['GET'])
@login_required
def api_progress():
    """Return progress for all stories for the current user."""
    progresses = Progress.query.filter_by(user_id=current_user.id).all()
    return jsonify([
        {
            'story_id': p.story_id,
            'current_node': p.current_node,
            'choices_made': json.loads(p.choices_made),
            'completed': bool(p.completed),
        }
        for p in progresses
    ])


@app.route('/api/progress', methods=['POST'])
@login_required
def api_progress_save():
    """Save or update progress for a story scene/choice."""
    data = request.get_json()
    story_id = data.get('story_id')
    current_node = data.get('current_node')
    choices_made = data.get('choices_made', [])

    if not story_id or not current_node:
        return jsonify({'error': 'story_id and current_node required'}), 400

    prog = Progress.query.filter_by(user_id=current_user.id, story_id=story_id).first()
    if prog:
        prog.current_node = current_node
        prog.choices_made = json.dumps(choices_made)
        prog.updated_at = db.func.now()
    else:
        prog = Progress(
            user_id=current_user.id,
            story_id=story_id,
            current_node=current_node,
            choices_made=json.dumps(choices_made),
        )
        db.session.add(prog)

    db.session.commit()
    return jsonify({
        'story_id': prog.story_id,
        'current_node': prog.current_node,
        'choices_made': prog.choices_made,
        'completed': bool(prog.completed),
    })


@app.route('/api/progress/<story_id>', methods=['GET'])
@login_required
def api_progress_story(story_id):
    """Return progress for a specific story."""
    prog = Progress.query.filter_by(user_id=current_user.id, story_id=story_id).first()
    if not prog:
        # Seed progress if not exists (for demo stories)
        prog = Progress(
            user_id=current_user.id,
            story_id=story_id,
            current_node='start',
            choices_made='[]',
        )
        db.session.add(prog)
        db.session.commit()
    return jsonify({
        'story_id': prog.story_id,
        'current_node': prog.current_node,
        'choices_made': prog.choices_made,
        'completed': bool(prog.completed),
    })


# ─── Admin: Content approval ────────────────────────────────────────────


@app.route('/admin')
@login_required
@role_required('admin')
def admin_panel():
    """Admin panel - pending content approvals."""
    stories_dir = os.path.join(basedir, 'stories')
    pending = []
    if os.path.isdir(stories_dir):
        for f in sorted(os.listdir(stories_dir)):
            if f.endswith('.json'):
                pending.append(f.replace('.json', ''))
    return jsonify(pending) if request.headers.get('Accept') == 'application/json' else render_template('admin.html', pending=pending)


# Use explicit endpoint name to avoid conflict
app.add_url_rule('/admin/approve', 'admin_approve_endpoint', 
                 view_func=lambda: admin_approve(), methods=['POST'])
@app.route('/admin/approve', methods=['POST'])
@login_required
@role_required('admin')
def admin_approve():
    """Approve a contributor's story submission."""
    data = request.get_json()
    story_id = data.get('story_id')
    # Copy from uploads dir to stories dir, or create the JSON file
    # For now, just acknowledge
    return jsonify({'status': 'approved', 'story_id': story_id})


# ─── Contributor: Upload ────────────────────────────────────────────────

@app.route('/contributor/upload', methods=['GET', 'POST'])
@login_required
@role_required('contributor')
def contributor_upload():
    """Contributor upload page - story script (JSON) and audio (MP3)."""
    if request.method == 'GET':
        return render_template('contributor.html')
    # Handle upload
    story_title = request.form.get('story_title', '').strip()
    language = request.form.get('language', '').strip()
    story_script = request.files.get('story_script')
    audio_file = request.files.get('audio')

    if not story_title or not language or not story_script or not audio_file:
        return jsonify({'error': 'All fields required'}), 400

    # Save story JSON
    story_id = story_title.lower().replace(' ', '_')
    story_path = os.path.join(basedir, 'stories', f'{story_id}.json')
    story_data = {
        'id': story_id,
        'title': story_title,
        'description': request.form.get('story_description', ''),
        'start_node': 'start',
        'nodes': json.loads(story_script.read()),
    }
    with open(story_path, 'w') as fp:
        json.dump(story_data, fp, ensure_ascii=False, indent=2)

    # Save audio
    audio_path = os.path.join(basedir, 'static', 'audio', f'{story_id}.mp3')
    os.makedirs(os.path.dirname(audio_path), exist_ok=True)
    audio_file.save(audio_path)

    return jsonify({'status': 'uploaded', 'story_id': story_id})


# ─── Static file serving ────────────────────────────────────────────────

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(os.path.join(basedir, 'static'), filename)


# ─── Database seeding ───────────────────────────────────────────────────


def seed_database():
    """Seed the database on first run with demo accounts and a demo story."""
    db.create_all()

    # Create demo accounts if they don't exist
    demo_learner = User.query.filter_by(email='learner@mothertalk.test').first()
    if not demo_learner:
        demo_learner = User(
            email='learner@mothertalk.test',
            password_hash=generate_password_hash('password123'),
            role='learner',
        )
        db.session.add(demo_learner)

    demo_contributor = User.query.filter_by(email='contributor@mothertalk.test').first()
    if not demo_contributor:
        demo_contributor = User(
            email='contributor@mothertalk.test',
            password_hash=generate_password_hash('password123'),
            role='contributor',
        )
        db.session.add(demo_contributor)

    demo_admin = User.query.filter_by(email='admin@mothertalk.test').first()
    if not demo_admin:
        demo_admin = User(
            email='admin@mothertalk.test',
            password_hash=generate_password_hash('password123'),
            role='admin',
        )
        db.session.add(demo_admin)

    db.session.commit()

    # Seed demo story if no stories exist
    stories_dir = os.path.join(basedir, 'stories')
    if not os.path.exists(stories_dir) or len(os.listdir(stories_dir)) == 0:
        os.makedirs(stories_dir, exist_ok=True)

        # Create a simple demo story with 3 scenes
        demo_story = {
            'id': 'welcome',
            'title': 'Welcome',
            'description': 'Your first story in Mother Talk',
            'start_node': 'start',
            'nodes': [
                {
                    'id': 'start',
                    'text': 'Hello! Welcome to Mother Talk. You are sitting with a mother figure who has something to share.',
                    'choices': [
                        {'text': 'Tell me more', 'next_node': 'more'},
                        {'text': 'I want to listen', 'next_node': 'listen'},
                    ],
                },
                {
                    'id': 'more',
                    'text': 'She smiles and begins her story about the garden and the first rains.',
                    'choices': [
                        {'text': 'What happened next?', 'next_node': 'ending'},
                    ],
                },
                {
                    'id': 'ending',
                    'text': 'The story ends, and you feel a little wiser.',
                    'choices': [],
                },
            ],
        }

        with open(os.path.join(stories_dir, 'welcome.json'), 'w') as fp:
            json.dump(demo_story, fp, ensure_ascii=False, indent=2)

    db.session.commit()


# ─── Initialize on import ───────────────────────────────────────────────


seed_database()

# ─── Run ────────────────────────────────────────────────────────────────


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)