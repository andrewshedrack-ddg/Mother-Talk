// roles.js
// The three sides of MotherTalk on the static demo site: Learner,
// Contributor and Admin. Who you are is kept on this device only
// (localStorage), the same way the learner's name and XP are kept.
// The Flask app does the same checks against its database instead.
//
// The learner side IS the main site: the home page at the root is
// public, no login needed. The contributor and admin sides are
// hidden: they are not linked from the learner pages, they open only
// by direct link, and each one asks for a name on its own page
// (gateRole below) before it shows anything.

const ROLES = ["learner", "contributor", "admin"];

// The site root, worked out from the page's own address, so links
// work both on GitHub Pages (/Mother-Talk/...) and on a local server.
function siteRoot() {
  const p = window.location.pathname;
  const i = p.indexOf("/frontend/");
  if (i >= 0) return p.slice(0, i + 1);
  return p.slice(0, p.lastIndexOf("/") + 1);
}

function roleHome(role) {
  if (role === "learner") return siteRoot() + "index.html";
  return siteRoot() + "frontend/" + role + "/index.html";
}

function currentRole() { return store.get("mt_role", ""); }
function currentName() { return store.get("mt_name", ""); }

// The login page calls this after the visitor picks a name and a
// role. It sends them straight to that side's home page.
function loginAs(name, role) {
  store.set("mt_name", name || "Guest");
  store.set("mt_role", role);
  window.location.replace(roleHome(role));
}

// Call at the top of a hidden side's page (contributor or admin).
// If the stored role is already this side's role, show the page.
// If not, hide the page and show the name gate on that page instead:
// the visitor types a name, becomes that role on this device, and
// the page reloads. Nothing is linked from the learner pages, so
// the gate is only reached by the direct link.
function gateRole(role) {
  const gate = document.getElementById("role-gate");
  const app = document.getElementById("app");
  if (currentRole() === role) {
    if (gate) gate.hidden = true;
    renderRoleBadge();
    return true;
  }
  if (app) app.style.display = "none";
  if (gate) {
    gate.hidden = false;
    const form = document.getElementById("gate-form");
    const input = document.getElementById("gate-name");
    const err = document.getElementById("gate-error");
    if (form) form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const name = input ? input.value.trim() : "";
      if (!name) { if (err) err.textContent = "Please type your name."; return; }
      loginAs(name, role);
    });
  }
  return false;
}

function logout() {
  store.set("mt_role", "");
  window.location.replace(siteRoot() + "index.html");
}

// Show "Learner · Name" and a Log out button in the top bar.
function renderRoleBadge() {
  const badge = document.getElementById("role-badge");
  if (badge) badge.textContent = currentRole() + " · " + currentName();
  const out = document.getElementById("btn-logout");
  if (out) out.addEventListener("click", logout);
}

// ---- Submissions: how the three sides talk to each other. ----
// A contributor's upload is saved here as "pending". The admin side
// reads the same list, approves or rejects it, and an approved story
// is published to the list the learner side reads. That is the whole
// link between the three sides on the demo site.
function getSubmissions() { return store.get("mt_contrib_submissions", []); }
function saveSubmissions(list) { store.set("mt_contrib_submissions", list); }
function getApprovedStories() { return store.get("mt_approved_stories", []); }
function saveApprovedStories(list) { store.set("mt_approved_stories", list); }
