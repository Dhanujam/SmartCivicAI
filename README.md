# SmartCivic AI — Smart Complaint Triage & Resolution Platform

**Problem Statement:** HN-AI-02 — Smart Complaint Triage for Civic Bodies.

SmartCivic AI is an intelligent civic triage and resolution management platform. When citizens submit municipal complaints with text descriptions and photographs, the system leverages Google Gemini multimodal AI to instantly classify the issue, assess urgency, calculate a priority score, route it to the appropriate civic department, and generate practical, step-by-step resolution plans for civic field officers.

---

## Architecture Overview

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Axios
- **Backend:** Python 3.13, FastAPI, Uvicorn, Pydantic v2
- **Database:** MongoDB Atlas (via Motor async driver)
- **AI Engine:** Google Gemini API (`google-genai` SDK)

---

## Directory Structure

```
SmartCivicAI/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── complaint.py     # Pydantic schemas
│   │   ├── routes/
│   │   │   ├── complaints.py    # Complaint submission & retrieval API
│   │   │   └── analytics.py     # High-level metrics API
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # Async MongoDB connection (Motor)
│   │   └── main.py              # FastAPI app with CORS & static upload mount
│   ├── requirements.txt         # Python dependencies
│   ├── run.py                   # Local Uvicorn runner
│   ├── .env.example
│   └── uploads/                 # Local image storage
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx       # Header with live system indicators
│   │   ├── services/
│   │   │   └── api.js           # Axios API client
│   │   ├── App.jsx              # Application root
│   │   ├── index.css            # Tailwind directives and styling
│   │   └── main.jsx             # React entrypoint
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## Setup & Running Locally

### Prerequisites
- Node.js (v20+ or v22+)
- Python (v3.11+)
- MongoDB Atlas cluster or local MongoDB instance

---

### 1. Backend Setup

1. Open a terminal in the root directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Update `MONGODB_URI` and `GEMINI_API_KEY` in `backend/.env`.
5. Start the backend:
   ```powershell
   python run.py
   ```
   The backend API will be available at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

---

### 2. Frontend Setup

1. Open a new terminal in the root directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```powershell
     Copy-Item .env.example .env
     ```
4. Start the Vite dev server:
   ```powershell
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.
