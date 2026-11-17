// progress.js
// XP, levels, streaks and the daily goal. All numbers come from
// localStorage (see storage.js) and are shown in the page header.

// Levels are Swahili titles. Each pair is [XP needed, title].
const LEVELS = [
  [0, "Mgeni"], [50, "Mwanafunzi"], [150, "Msomi"],
  [300, "Mpenda Lugha"], [500, "Shujaa"], [800, "Mzee"]
];
const DAILY_GOAL = 30;

function levelFor(xp) {
  let name = LEVELS[0][1];
  for (const [min, levelName] of LEVELS) {
    if (xp >= min) name = levelName;
  }
  return name;
}

function nextLevel(xp) {
  for (const [min, levelName] of LEVELS) {
    if (xp < min) return [min, levelName];
  }
  return null;
}

// How far through the current level, as a percentage for the bar.
function levelProgress(xp) {
  let current = LEVELS[0];
  let next = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i][0]) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  if (!next) return 100;
  return Math.round(100 * (xp - current[0]) / (next[0] - current[0]));
}

// Give XP and update the daily total at the same time, so the two
// numbers can never disagree.
function addXP(n) {
  store.set("mt_xp", store.get("mt_xp", 0) + n);
  const daily = store.get("mt_daily", { date: "", xp: 0 });
  const today = todayKey();
  if (daily.date !== today) { daily.date = today; daily.xp = 0; }
  daily.xp += n;
  store.set("mt_daily", daily);
  refreshBadges();
  renderGoal();
}

// One streak point per day. A gap of a day or more restarts the count.
function updateStreak() {
  const streak = store.get("mt_streak", { count: 0, last: "" });
  const today = todayKey();
  if (streak.last === today) return; // already counted today
  streak.count = (streak.last === yesterdayKey()) ? streak.count + 1 : 1;
  streak.last = today;
  store.set("mt_streak", streak);
}

function refreshBadges() {
  document.getElementById("xp-badge").textContent = store.get("mt_xp", 0) + " XP";
  document.getElementById("streak-badge").innerHTML = "&#128293; " + store.get("mt_streak", { count: 0 }).count;
}

function renderGoal() {
  const daily = store.get("mt_daily", { date: "", xp: 0 });
  const xp = (daily.date === todayKey()) ? daily.xp : 0;
  document.getElementById("goal-text").textContent = Math.min(xp, DAILY_GOAL) + " / " + DAILY_GOAL + " XP";
  document.getElementById("goal-fill").style.width = Math.min(100, xp / DAILY_GOAL * 100) + "%";
}
