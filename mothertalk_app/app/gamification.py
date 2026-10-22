"""Duolingo-style motivation layer: XP, levels, streaks and a daily goal.

One quiz point = 10 XP. Finishing every quiz in a scene also banks the
points in the QuizResult table, so XP is always derived from real work in
the database, never stored as a number that can drift.
"""
from datetime import date, timedelta

from app.models import QuizResult

XP_PER_POINT = 10
DAILY_GOAL_XP = 30

# (minimum XP, Swahili title) — climb from guest to elder.
LEVELS = [
    (0, "Mgeni"),          # guest
    (50, "Mwanafunzi"),    # student
    (150, "Msomi"),        # scholar
    (300, "Mpenda Lugha"), # language lover
    (500, "Shujaa"),       # hero
    (800, "Mzee"),         # elder
]


def total_xp(user_id):
    points = sum(a.score for a in QuizResult.query.filter_by(user_id=user_id).all())
    return points * XP_PER_POINT


def level_for(xp):
    """Return (title, xp_into_level, xp_needed_for_next, progress_percent)."""
    current = LEVELS[0]
    nxt = None
    for i, lvl in enumerate(LEVELS):
        if xp >= lvl[0]:
            current = lvl
            nxt = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
    if nxt is None:
        return current[1], xp - current[0], 0, 100
    span = nxt[0] - current[0]
    into = xp - current[0]
    return current[1], into, span - into, round(100 * into / span)


def streak_days(user_id):
    """Consecutive days with at least one quiz attempt, counting back from today."""
    days = sorted({a.created.date() for a in
                   QuizResult.query.filter_by(user_id=user_id).all()}, reverse=True)
    streak, cursor = 0, date.today()
    for d in days:
        if d == cursor:
            streak += 1
            cursor -= timedelta(days=1)
        elif d == cursor + timedelta(days=1) and streak == 0:
            # Last activity yesterday still keeps the streak alive today.
            streak += 1
            cursor = d - timedelta(days=1)
        else:
            break
    return streak


def xp_today(user_id):
    today = date.today()
    return sum(a.score for a in QuizResult.query.filter_by(user_id=user_id).all()
               if a.created.date() == today) * XP_PER_POINT


def summary(user_id):
    xp = total_xp(user_id)
    title, into, needed, pct = level_for(xp)
    today = xp_today(user_id)
    return {
        "xp": xp,
        "level": title,
        "level_progress_pct": pct,
        "xp_to_next_level": needed,
        "streak": streak_days(user_id),
        "daily_goal_xp": DAILY_GOAL_XP,
        "xp_today": today,
        "daily_goal_pct": min(100, round(100 * today / DAILY_GOAL_XP)),
    }
