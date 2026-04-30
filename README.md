# PaySlip Reader

White-label payslip extraction and Q&A tool.

## Stack
- **Frontend**: React + Vite + Tailwind → Vercel
- **Backend**: FastAPI + Python → Railway
- **AI**: Claude Vision API (extraction + agent)
- **DB / Storage**: Supabase

## Project structure
```
payslip-reader/
├── frontend/        # React + Vite
└── backend/         # FastAPI
```

## Setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### Supabase
- Create a new project
- Run `supabase_schema.sql` in the SQL editor
- Create a storage bucket named `payslips` (private)

## Phases
- [x] Phase 1 — Scaffold
- [ ] Phase 2 — PDF extraction engine
- [ ] Phase 3 — Excel generation + storage
- [ ] Phase 4 — Upload UI
- [ ] Phase 5 — AI Q&A agent
- [ ] Phase 6 — Auth + white-label
