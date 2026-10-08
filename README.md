# SmartCivic AI — Intelligent Civic Complaint Triage & Municipal Operations Platform

> **Problem Statement:** HN-AI-02 — Smart Complaint Triage for Civic Bodies.

**SmartCivic AI** is an enterprise-grade civic complaint triage, automated municipal operations, and cybersecurity management platform. When citizens submit civic issues with text descriptions and photographic evidence, the platform leverages **Google Gemini Multimodal AI** to instantly classify complaints, assess urgency, calculate priority scores, intelligently identify duplicates, enforce resolution SLAs, and formulate actionable, step-by-step resolution plans for civic field officers.

Built with **Defense-in-Depth** security principles, SmartCivic AI safeguards municipal infrastructure against prompt injection, cross-site scripting (XSS), malicious file uploads, and unauthorized access while automatically redacting sensitive citizen personally identifiable information (PII) to comply with data protection regulations.

---

## 📌 Problem Statement

Municipal grievance portals receive large numbers of unstructured complaints every day. Traditional manual processing requires staff to read, classify, prioritize, and route each complaint individually.

Complaints may contain:
- Free-form unstructured text descriptions
- Photographic evidence requiring visual inspection
- Different languages and varied terminology
- Incomplete or ambiguous location information
- Repeated and duplicate reports of the same civic issue

### Core Challenges:
- **Delayed Responses**: Overwhelmed municipal officers take days to triage backlogged tickets.
- **Incorrect Department Routing**: Mismatched classification delays civic repair crews.
- **Repeated Manual Work**: Multiple citizens reporting the same pothole or broken water pipe floods the queue.
- **Overlooked Safety Hazards**: Severe hazards (sparking transformers, open manholes) get lost in non-urgent queues without priority scoring.
- **Cybersecurity & Privacy Risks**: Exposure to prompt injection attacks against LLMs, stored XSS in user submissions, malicious file uploads, and lack of citizen PII protection.

---

## 💡 Our Solution & System Workflow

SmartCivic AI introduces an intelligent, secure, AI-powered triage layer between citizens and civic authorities.

```text
Citizen Complaint (Text + Photographic Evidence)
       ↓
Input Sanitization & Security Shield (XSS / Prompt Injection / Magic Bytes / PII Redaction)
       ↓
Google Gemini Multimodal AI Triage (Category + Urgency + Safety + Priority + Action Plan)
       ↓
Duplicate Detection Engine & SLA Timeline Calculation
       ↓
Department Routing & Escalation (Government Triage Dashboard)
       ↓
Civic Field Crew Action & Verified Citizen Resolution
```

---

## 🏛️ Key Features & Platform Modules

### 1. Citizen Portal
- **Complaint Submission**: Citizen-friendly submission interface supporting descriptions, locations, and photographic evidence.
- **Multimodal AI Analysis Preview**: Instant visibility into AI triage results (assigned department, priority score, urgency, and step-by-step resolution plan).
- **Personal Complaint Tracker**: Dedicated citizen dashboard to view real-time status updates, SLA timers, and municipal progress.
- **Privacy Assurance**: Automatic DPDP/GDPR-compliant citizen PII masking notification before submission.

### 2. Government Official Dashboard
- **Operational Triage Feed**: Real-time municipal complaint queue with search, department filtering, urgency filtering, and SLA status indicators.
- **Complaint Lifecycle Management**: Update complaint statuses (`PENDING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), reassign departments, and update priority.
- **Analytics & SLA Insights**: Real-time departmental performance metrics, resolution rate breakdown, urgency distributions, and SLA compliance analytics.

### 3. Google Gemini Multimodal AI Triage
- **Multimodal Vision & Text Analysis**: Directly evaluates photographic evidence alongside complaint descriptions using Google Gemini models (`gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-3.8-flash`).
- **Structured JSON Schema**: Guaranteed schema enforcement producing:
  - Official municipal category classification (Roads, Sanitation, Water, Electrical, Drainage, etc.)
  - Urgency level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - Calibrated priority score (0–100)
  - Actionable 3-to-5 step resolution action plan for civic field crews
  - Realistic estimated resolution timeframe

### 4. Duplicate Complaint Detection & Merging (Stretch Goal 1)
- **Automated Similarity Scoring**: Lexical and token overlap analysis cross-referenced with category and department matching.
- **Duplicate Cluster Discovery**: Identifies related civic reports submitted across nearby locations or identical incidents.
- **One-Click Complaint Merging**: Consolidates duplicate tickets under a master complaint while preserving linked citizen records and notifying all affected citizens upon resolution.

### 5. SLA Monitoring & Breach Alerts (Stretch Goal 2)
- **Configurable Urgency SLAs**:
  - `CRITICAL`: 12-hour resolution deadline
  - `HIGH`: 24-hour resolution deadline
  - `MEDIUM`: 48-hour resolution deadline
  - `LOW`: 72-hour resolution deadline
- **Dynamic SLA Statuses**:
  - `WITHIN_SLA`: Resolution timeline on schedule
  - `DUE_SOON`: Less than 20% SLA duration remaining (preventative visual alerts)
  - `BREACHED`: Overdue resolution triggering escalated alerts and timestamp logging (`sla_breached_at`)
  - `COMPLETED`: Resolved before deadline
- **Merged Complaint SLA Inheritance**: Duplicate tickets automatically inherit master complaint SLA timelines.

### 6. Cybersecurity Operations Center (SOC) & Defense-in-Depth Shield
Dedicated real-time security operations dashboard (`/admin/security`) with active defense shields:
- **AI Prompt Injection Firewall**: Scans and sanitizes inputs against system override attempts and jailbreak vectors before processing by Gemini AI.
- **Stored XSS Protection**: Neutralizes malicious `<script>`, `<iframe>`, `javascript:`, and DOM event handlers, safely encoding HTML entities.
- **Binary Magic Bytes Upload Inspector**: Verifies binary file headers for JPEG, PNG, GIF, WebP, and HEIC, rejecting spoofed extensions, webshells, and polyglots.
- **Automated PII Redaction Engine**: Masks Indian 12-digit Aadhaar numbers (`[REDACTED_AADHAAR: XXXX-XXXX-####]`) and 10-digit mobile phone numbers (`[REDACTED_PHONE: +91-XXXXX-####]`) to protect citizen privacy.
- **Sliding-Window Rate Limiting**: In-memory token bucket enforcement protecting against credential brute-forcing (10 req/min) and complaint submission flooding (25 req/min).
- **Security Audit Logging**: Persistent MongoDB collection (`security_audit_logs`) tracking incident timestamps, threat types, client IP, severity, and defense action.
- **Dynamic Threat Matrix**: Real-time system threat level calculation (`NORMAL`, `ELEVATED`, `HIGH`, `CRITICAL`).
- **Interactive Penetration Test Simulator**: Live in-browser sandbox for officials and auditors to test simulated attack vectors.
- **Strict Role-Based Access Control (RBAC)**: Enforces role isolation (`CITIZEN` vs `ADMIN`) backed by cryptographic JWT tokens.

```text
Application Activity
        ↓
Security Monitoring (Input Shields & Rate Limiting)
        ↓
Cyber Log Sentinel (Audit Collection)
        ↓
Threat Detection & Rule Engine
        ↓
Gemini Security Analysis & Triage
        ↓
Security Operations Center (SOC Dashboard)
```

---

## 🧪 Verified Test Results

The entire platform has undergone automated local validation:

| Test Suite | Tests Passed | Status |
|---|:---:|:---:|
| **Cybersecurity E2E Test Suite** (`test_cybersecurity_module.py`) | **12 / 12** | ✅ PASSED (100%) |
| **SLA & Full Platform Regression Suite** (`test_stretch_goal_2_sla.py`) | **20 / 20** | ✅ PASSED (100%) |
| **Duplicate Merging Test Suite** (`test_stretch_goal_1_merge.py`) | **All** | ✅ PASSED (100%) |
| **Two-Role Authentication & Access Control** (`test_e2e_two_role.py`) | **All** | ✅ PASSED (100%) |
| **Frontend Production Build** (`npm run build`) | **0 errors, 0 warnings** | ✅ PASSED (built in 11.00s) |

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 18, Vite | High-performance Single Page Application |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Responsive civic design system |
| **HTTP Client** | Axios | Configured with JWT interceptors |
| **Backend** | Python, FastAPI | Async REST API framework |
| **ASGI Server** | Uvicorn | Production-ready asynchronous runner |
| **Validation** | Pydantic v2 | Strict schema validation |
| **Database** | MongoDB Atlas | Cloud document database |
| **Database Driver** | Motor | Async Python driver for MongoDB |
| **AI Engine** | Google Gemini API | Multimodal vision & text models (`gemini-2.5-flash`) |
| **Maps** | OpenStreetMap / Leaflet | Location-aware civic reports |
| **Security** | Cyber Log Sentinel & SOC | Input sanitization, PII masking, rate limiting, audit logging |
| **Deployment** | Render | Managed cloud hosting (Static Site + Web Service) |

---

## 📁 Project Directory Structure

```
SmartCivicAI/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── complaint.py               # Pydantic complaint & SLA models
│   │   │   └── user.py                    # User authentication schemas
│   │   ├── routes/
│   │   │   ├── auth.py                    # Authentication & rate limiting
│   │   │   ├── complaints.py              # Citizen submission & AI triage
│   │   │   ├── admin.py                   # Government triage & merge operations
│   │   │   ├── analytics.py               # SLA & operational metrics
│   │   │   └── security.py                # SOC metrics, logs & test sandbox
│   │   ├── services/
│   │   │   ├── auth.py                    # JWT token creation & verification
│   │   │   ├── gemini.py                  # Google Gemini multimodal triage
│   │   │   ├── duplicate.py               # Duplicate complaint detection
│   │   │   ├── sla.py                     # SLA duration & breach calculations
│   │   │   └── security.py                # Security shields, PII, XSS & rate limit
│   │   ├── config.py                      # Pydantic BaseSettings configuration
│   │   ├── database.py                    # Async Motor MongoDB connection
│   │   └── main.py                        # FastAPI application & security middleware
│   ├── uploads/                           # Uploaded civic evidence storage
│   ├── .env.example                       # Safe environment template
│   ├── requirements.txt                   # Backend Python dependencies
│   ├── run.py                             # Local Uvicorn runner
│   ├── test_cybersecurity_module.py       # 12-step cybersecurity test suite
│   ├── test_stretch_goal_2_sla.py         # 20-step SLA regression test suite
│   ├── test_stretch_goal_1_merge.py       # Duplicate merge test suite
│   └── test_e2e_two_role.py               # Role-based workflow test suite
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIAnalysisCard.jsx         # Gemini triage & action plan card
│   │   │   ├── ComplaintForm.jsx          # Submission form with PII trust badge
│   │   │   └── Navbar.jsx                 # Navigation with SOC link & role badge
│   │   ├── context/
│   │   │   └── AuthContext.jsx            # User state & JWT persistence
│   │   ├── pages/
│   │   │   ├── CitizenPortal.jsx          # Citizen complaint submission
│   │   │   ├── MyComplaintsPage.jsx       # Citizen tracking dashboard
│   │   │   ├── ComplaintDetailsPage.jsx   # Detailed citizen complaint view
│   │   │   ├── LoginPage.jsx              # Role-aware login
│   │   │   ├── RegisterPage.jsx           # Citizen registration
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx     # Government triage center
│   │   │       ├── AdminComplaintsPage.jsx# Filterable complaints table
│   │   │       ├── AdminComplaintDetailPage.jsx # Lifecycle & merge actions
│   │   │       ├── AdminAnalyticsPage.jsx # SLA & performance breakdown
│   │   │       └── AdminSecurityPage.jsx  # Cybersecurity Operations Center (SOC)
│   │   ├── services/
│   │   │   └── api.js                     # Axios client with JWT interceptor
│   │   ├── App.jsx                        # Route definitions & protected routes
│   │   ├── index.css                      # Tailwind CSS styling
│   │   └── main.jsx                       # Application entrypoint
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
│
├── .gitignore                             # Secret & artifact ignore rules
└── README.md
```

---

## 🚀 Setup & Local Development

### Prerequisites
- Node.js (v20+ or v22+)
- Python (v3.11+)
- MongoDB Atlas cluster or local MongoDB instance
- Google Gemini API Key

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Set `MONGODB_URI` and `GEMINI_API_KEY` in `backend/.env`.

5. Start the backend server:
   ```bash
   python run.py
   ```
   Backend will run at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:5173`.

---

## ☁️ Planned Deployment Architecture (Render + MongoDB Atlas)

SmartCivic AI is prepared for production deployment on **Render**:

```
                       ┌────────────────────────────────────┐
                       │           Render Platform          │
                       │                                    │
 [ Citizen / Official ]──► Frontend: Render Static Site     │
                       │   (React 18 SPA built with Vite)   │
                       │                 │                  │
                       │                 ▼                  │
                       │   Backend: Render Web Service      │
                       │   (FastAPI / Uvicorn runner)       │
                       └─────────────┬───────────┬──────────┘
                                     │           │
                                     ▼           ▼
                      ┌──────────────────┐   ┌──────────────────┐
                      │  MongoDB Atlas   │   │ Google Gemini AI │
                      │  (Cloud Database)│   │ (Multimodal API) │
                      └──────────────────┘   └──────────────────┘
```

### Component Architecture:
1. **Frontend**: Render Static Site
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variable**: `VITE_API_BASE_URL` (points to the Render backend web service URL)
   - **Routing Rule**: Rewrite `/*` to `/index.html` (HTTP 200) for client-side React Router navigation.

2. **Backend**: Render Web Service (Python Environment)
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`

3. **Database**: MongoDB Atlas
   - Cloud cluster hosting `smartcivic` database with collections for complaints, users, counters, and security audit logs.

4. **AI Engine**: Google Gemini API
   - Secured via `GEMINI_API_KEY` configured in Render backend environment variables.

### Required Backend Environment Variables for Render:
- `PORT`: (Automatically set by Render)
- `HOST`: `0.0.0.0`
- `CORS_ORIGINS`: Deployed frontend Render URL (e.g., `https://smartcivic-ai.onrender.com,http://localhost:5173`)
- `MONGODB_URI`: MongoDB Atlas connection string
- `DATABASE_NAME`: `smartcivic`
- `GEMINI_API_KEY`: Google Gemini API key
- `GEMINI_MODEL`: `gemini-2.5-flash` (or `gemini-3.5-flash`)
- `JWT_SECRET`: Production secret string for JWT signing
- `DEFAULT_ADMIN_EMAIL`: `admin@smartcivic.gov`
- `DEFAULT_ADMIN_PASSWORD`: Secure initial admin password

---

## 🌟 Project Highlights

- **AI-Powered Multimodal Triage**: Evaluates text and image-based civic complaints using Google Gemini.
- **Automated Prioritization**: Instant urgency grading, 0-100 priority scoring, and field crew action plans.
- **Intelligent Routing**: Automated department classification directing complaints to relevant municipal teams.
- **Duplicate Complaint Management**: Detects similar civic issues across areas and enables one-click merging.
- **SLA Breach Monitoring**: Real-time resolution timers, alerts, and SLA compliance statistics.
- **Cybersecurity Operations Center**: Live SOC dashboard with prompt injection shields, XSS neutralization, magic bytes validation, and PII redaction.
- **Robust Role Isolation**: Citizen self-service portal alongside official administrative control.
- **Modular & Cloud-Ready**: Scalable architecture prepared for one-click deployment on Render.

---

## 🌐 Live Prototype

- [SmartCivic AI Live Prototype](YOUR_PROTOTYPE_LINK)

---

## 🎯 Conclusion

SmartCivic AI transforms traditional civic complaint handling into an intelligent, AI-assisted, and security-hardened workflow. By combining multimodal complaint analysis, automated prioritization, department routing, duplicate detection, SLA enforcement, and integrated cybersecurity monitoring, the platform empowers civic authorities to respond to citizen issues faster and with greater accountability.

The project demonstrates how artificial intelligence and defense-in-depth engineering can bridge the gap between citizen reporting and effective municipal action, creating a smarter, safer, and more responsive civic service ecosystem.

---

## 📄 License
This project is developed for the Smart India / Civic Hackathon initiative under problem statement **HN-AI-02**.
