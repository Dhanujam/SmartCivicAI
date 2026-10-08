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
## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| UI Icons | Lucide Icons |
| HTTP Client | Axios |
| Backend | Python, FastAPI |
| Server | Uvicorn |
| Validation | Pydantic |
| Database | MongoDB Atlas |
| Database Driver | Motor |
| AI | Google Gemini API |
| Maps | OpenStreetMap |
| Security | Log Sentinel |
| Deployment | Render |


## Key Features

- **Text & Image Complaints**  
  Citizens can report civic issues using written descriptions and supporting photographs.

- **AI-Powered Classification**  
  Google Gemini analyzes complaint content and identifies the relevant civic issue category.

- **Urgency Assessment**  
  Complaints are evaluated for urgency and potential safety impact.

- **Priority Scoring**  
  AI-assisted prioritization helps authorities focus on high-impact complaints first.

- **Department Routing**  
  Complaints can be directed toward the appropriate civic department.

- **Duplicate Complaint Handling**  
  Similar complaints can be identified and managed to reduce repetitive work.

- **Location-Aware Complaints**  
  Reported locations can be associated with complaints for better civic operations and analysis.

- **Analytics Dashboard**  
  Complaint information can be viewed through summarized metrics and analytics.

- **Security Monitoring**  
  The platform integrates **Cyber Log Sentinel** as a security layer for monitoring application activity and identifying suspicious behavior.

---

## Cybersecurity Integration

Security is integrated into the SmartCivic AI platform as an additional monitoring layer.

### Security Flow

```text
Application Activity
        ↓
Security Monitoring
        ↓
Log Sentinel
        ↓
Threat Detection
        ↓
Gemini Security Analysis
        ↓
Security Center

## Problem

Municipal grievance portals receive large numbers of unstructured complaints every day.

Complaints may contain:

- Free-form text
- Photographs
- Different languages
- Incomplete location information
- Repeated reports of the same issue

Traditional manual processing requires staff to read, classify, prioritize, and route each complaint individually.

This can result in:

- Delayed responses
- Incorrect department routing
- Repeated manual work
- Important safety issues being overlooked
- Duplicate complaints

---

## Our Solution

SmartCivic AI introduces an intelligent AI-based triage layer between citizens and civic authorities.

```text
Citizen Complaint
       ↓
Text + Image Analysis
       ↓
Gemini AI
       ↓
Category + Urgency + Safety
       ↓
Priority Evaluation
       ↓
Department Assignment
       ↓
Government Dashboard
       ↓
Faster Civic Resolution
