from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import json, os

SECRET_KEY = "mother-talk-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

DATABASE_URL = "sqlite:///./mother_talk.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Progress(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    story_id = Column(String, index=True, nullable=False)
    current_node = Column(String, nullable=False)
    choices_made = Column(Text, default="[]")
    completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint('user_id', 'story_id', name='uq_user_story'),)
    user = relationship("User")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mother Talk API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def hash_pw(pw): return pwd_context.hash(pw)
def verify_pw(pw, hpw): return pwd_context.verify(pw, hpw)
def create_token(data): 
    return jwt.encode({**data, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)
def decode_token(token):
    try: return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except: return None

def get_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload: raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user: raise HTTPException(401, "User not found")
    return user

class RegisterIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProgressIn(BaseModel):
    story_id: str
    current_node: str
    choices_made: list = []

class ProgressOut(BaseModel):
    story_id: str
    current_node: str
    choices_made: list
    completed: bool
    updated_at: datetime

STORIES_DIR = os.path.join(os.path.dirname(__file__), "stories")

@app.post("/auth/register", response_model=TokenOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(email=data.email, hashed_password=hash_pw(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_token({"sub": user.email})}

@app.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_pw(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_token({"sub": user.email})}

@app.get("/stories/")
def list_stories():
    stories = []
    for f in os.listdir(STORIES_DIR):
        if f.endswith(".json"):
            with open(os.path.join(STORIES_DIR, f)) as fp:
                stories.append(json.load(fp))
    return stories

@app.get("/stories/{story_id}")
def get_story(story_id: str):
    path = os.path.join(STORIES_DIR, f"{story_id}.json")
    if not os.path.exists(path): raise HTTPException(404, "Story not found")
    with open(path) as f: return json.load(f)

@app.post("/progress/", response_model=ProgressOut)
def create_progress(data: ProgressIn, db: Session = Depends(get_db), user: User = Depends(get_user)):
    if db.query(Progress).filter(Progress.user_id == user.id, Progress.story_id == data.story_id).first():
        raise HTTPException(400, "Progress exists")
    p = Progress(user_id=user.id, story_id=data.story_id, current_node=data.current_node, choices_made=json.dumps(data.choices_made))
    db.add(p); db.commit(); db.refresh(p)
    return {"story_id": p.story_id, "current_node": p.current_node, "choices_made": json.loads(p.choices_made), "completed": bool(p.completed), "updated_at": p.updated_at}

@app.get("/progress/", response_model=list[ProgressOut])
def list_progress(db: Session = Depends(get_db), user: User = Depends(get_user)):
    return [{"story_id": p.story_id, "current_node": p.current_node, "choices_made": json.loads(p.choices_made), "completed": bool(p.completed), "updated_at": p.updated_at} for p in db.query(Progress).filter(Progress.user_id == user.id).all()]

@app.get("/progress/{story_id}", response_model=ProgressOut)
def get_progress(story_id: str, db: Session = Depends(get_db), user: User = Depends(get_user)):
    p = db.query(Progress).filter(Progress.user_id == user.id, Progress.story_id == story_id).first()
    if not p: raise HTTPException(404, "Progress not found")
    return {"story_id": p.story_id, "current_node": p.current_node, "choices_made": json.loads(p.choices_made), "completed": bool(p.completed), "updated_at": p.updated_at}

@app.patch("/progress/{story_id}", response_model=ProgressOut)
def update_progress(story_id: str, data: ProgressIn, db: Session = Depends(get_db), user: User = Depends(get_user)):
    p = db.query(Progress).filter(Progress.user_id == user.id, Progress.story_id == story_id).first()
    if not p: raise HTTPException(404, "Progress not found")
    p.current_node = data.current_node
    p.choices_made = json.dumps(data.choices_made)
    p.updated_at = datetime.utcnow()
    db.commit(); db.refresh(p)
    return {"story_id": p.story_id, "current_node": p.current_node, "choices_made": json.loads(p.choices_made), "completed": bool(p.completed), "updated_at": p.updated_at}

@app.get("/")
def root(): return {"message": "Mother Talk API running"}