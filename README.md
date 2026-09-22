# Mother Talk

Interactive storytelling web app about mother-child conversations across cultures.

## Structure

```
Mother Talk/
├── backend/
│   ├── main.py          # FastAPI server (all-in-one)
│   ├── requirements.txt
│   ├── mother_talk.db   # SQLite database
│   └── stories/         # Story JSON files
└── frontend/
    ├── src/
    │   ├── main.jsx     # Entry point
    │   ├── App.jsx      # All components + routes
    │   ├── Auth.jsx     # Auth context + API
    │   └── index.css    # Tailwind + custom styles
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## Run

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Stories

- `first_conversation` - English kitchen table talk
- `maitu_na_mwana` - Kikuyu (Kenya) evening wisdom
- `mama_gi_nyathi` - Dholuo (Kenya) lakeside tales
- `mama_na_mtoto` - Swahili (East Africa) dinner stories

## Features

- JWT authentication (register/login)
- Interactive choice-based stories
- Progress saved per user per story
- Journey history view
- Responsive Tailwind CSS design