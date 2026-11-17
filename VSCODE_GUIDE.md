# MotherTalk — VS Code guide: run it and update it with the terminal

Everything below happens in the terminal inside VS Code. Open it with
`Ctrl + backtick` (the key under Esc). Type each command exactly as
shown, then press Enter. No brackets, no placeholders: what you see is
what you type.

## First, check you have what you need

```sh
git --version
python --version
```

Both should print a version number. If Git is missing, install it from
https://git-scm.com/download/win. If Python is missing, install it from
https://www.python.org/downloads/ and tick **Add Python to PATH**
during the install.

## Step 1 — Get the project (only once)

If you do not have the MotherTalk folder on your computer yet, clone
it. Pick a place first, for example your Documents folder:

```sh
cd Documents
git clone https://github.com/andrewshedrack-ddg/Mother-Talk.git
cd Mother-Talk
```

## Step 2 — Open it in VS Code

```sh
code .
```

That opens the Mother-Talk folder in VS Code. If `code .` says the
command is not found, open VS Code yourself and use File, Open Folder,
then pick the Mother-Talk folder.

## Step 3 — Run the site on your computer

In the VS Code terminal, from inside the Mother-Talk folder:

```sh
python -m http.server 8000
```

Then open your browser and go to:

```text
http://localhost:8000
```

That is the site running from your own files. The learner home is the
main page. The contributor and admin sides are hidden: open them by
typing their addresses after the main one:

```text
http://localhost:8000/frontend/contributor/index.html
http://localhost:8000/frontend/admin/index.html
```

To stop the server, go back to the terminal and press `Ctrl + C`.

## Step 4 — Get the newest work from GitHub (before you edit)

Lisa pushes new work to GitHub. Before you start editing, always pull
it down first, so you do not clash with her changes:

```sh
cd Mother-Talk
git pull
```

If it says `Already up to date`, you have the newest work. If it says
something about a conflict, stop and tell Lisa. Do not force anything.

## Step 5 — Save your own changes to GitHub (after you edit)

Edit the files in VS Code, save them, then run these three commands
in the terminal:

```sh
git add .
git commit -m "describe what you changed"
git push
```

For the commit message, write your own short words inside the quotes,
for example `git commit -m "Fix hero text"`. The first time you push,
GitHub may open a browser window to sign you in. That is normal.

About one to two minutes after a push, the live site updates by
itself:

```text
https://andrewshedrack-ddg.github.io/Mother-Talk/
```

## Step 6 — The everyday routine

```sh
cd Mother-Talk
git pull
```

Edit, test at `http://localhost:8000`, then:

```sh
git add .
git commit -m "describe what you changed"
git push
```

## If something goes wrong

- `python is not recognized`: Python is not on your PATH. Reinstall it
  from python.org and tick **Add Python to PATH**.
- `Address already in use`: something is already running on port 8000.
  Use another port: `python -m http.server 8001`, then open
  `http://localhost:8001`.
- `git pull` reports a conflict: stop. Tell Lisa what the message says.
  Do not run any command with `--force`.
- The live site still shows the old version after a push: wait two
  minutes, then refresh the page with `Ctrl + F5`.
- Never edit the same file on the GitHub website and in VS Code at the
  same time. Pick one place, then pull before you edit again.
