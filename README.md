# GoalPortal — Enterprise Performance Management System

A production-grade, full-stack Goal Setting & Tracking Portal with role-based access, real-time scoring, and automated escalations.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Netlify CDN   │────▶│  Render Backend  │────▶│  MongoDB Atlas  │
│  React + Vite   │     │  Express + Node  │     │   Free Tier     │
│   (Frontend)    │     │   JWT Auth       │     │                 │
└─────────────────┘     │   REST API       │     └─────────────────┘
                        │   node-cron      │
                        └──────────────────┘
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT (httpOnly cookies) |
| Jobs | node-cron |
| Deploy | Netlify (FE) + Render (BE) + MongoDB Atlas |

## Prerequisites (Windows — all free)

- [Node.js 20 LTS](https://nodejs.org/) — download installer
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) OR use MongoDB Atlas (free)
- [Git](https://git-scm.com/download/win)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional, for Docker setup)

---

## 🚀 Quick Start (Without Docker)

### 1. Clone / extract the project

```bash
cd C:\Users\YourName
# If git:
git clone <your-repo-url> goalportal
cd goalportal
# Or extract the zip and cd into it
```

### 2. Start MongoDB

Option A — MongoDB installed locally:
```bash
# MongoDB should auto-start as a Windows service after installation
# Or start manually:
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath C:\data\db
```

Option B — Use MongoDB Atlas (recommended, no install needed):
1. Go to https://atlas.mongodb.com → Create free account
2. Create free M0 cluster
3. Get connection string (replace `<password>`)
4. Use it as `MONGODB_URI` in backend `.env`

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file (already exists, edit if needed)
# Open backend\.env in Notepad and update MONGODB_URI if using Atlas

# Seed demo data
npm run seed

# Start backend
npm run dev
```

Backend runs at: http://localhost:5000

### 4. Setup Frontend

```bash
# Open a NEW terminal window
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

Frontend runs at: http://localhost:5173

### 5. Open Browser

Visit: **http://localhost:5173**

Use quick demo login buttons or:
| Role | Email | Password |
|------|-------|----------|
| Admin | neha@goalportal.com | password123 |
| Manager | ankit@goalportal.com | password123 |
| Employee | priya@goalportal.com | password123 |
| Employee | rahul@goalportal.com | password123 |

---

## 🐳 Quick Start (With Docker)

Requires Docker Desktop running.

```bash
# From project root
docker-compose up --build

# Seed data (first time only)
docker exec goalportal-backend node seed.js
```

All services start automatically. Visit http://localhost:5173

---

## Features

### Employee
- ✅ Set up to 8 goals with live weightage meter
- ✅ Smart goal title suggestions per thrust area
- ✅ Submit for manager approval (validates 100% total)
- ✅ Enter quarterly achievements with live score calculation
- ✅ View Q1–Q4 trend charts and score breakdown
- ✅ Goal lifecycle timeline on every goal card

### Manager
- ✅ Approve / return goals with comments
- ✅ Approve all goals for an employee in one click
- ✅ Quarterly check-ins with performance table
- ✅ AI-powered check-in comment suggestions (requires Claude API key)
- ✅ Team QoQ performance comparison charts
- ✅ Completion heatmap (employee × quarter)

### Admin
- ✅ Org-wide dashboard with stats and heatmap
- ✅ Full goal management: filter, unlock approved goals
- ✅ Push shared KPI goals to multiple employees
- ✅ Escalation center with automated rules
- ✅ Full audit trail with diff viewer and CSV export
- ✅ Achievement reports in CSV and formatted XLSX
- ✅ Analytics: QoQ trend, thrust area breakdown, UoM radar
- ✅ Cycle management: set active quarter and check-in windows

### System
- ✅ Role-based auth with JWT
- ✅ In-app notification bell with unread count
- ✅ Notification drawer with mark-read / clear-all
- ✅ Demo role-switcher in sidebar (one-click switch)
- ✅ Automated escalation cron job (every hour)
- ✅ Docker Compose for local dev
- ✅ GitHub Actions CI/CD

---

## Score Formulas

| UoM | Formula |
|-----|---------|
| numeric_max / percent_max | `min(Actual / Target × 100, 150)` |
| numeric_min / percent_min | `min(Target / Actual × 100, 150)` |
| timeline | `100 if days_late ≤ 0, else max(100 − days_late × 2, 0)` |
| zero | `100 if actual == 0, else 0` |

---

## Validation Rules

- Total weightage per employee = exactly **100%** (blocked otherwise)
- Min weightage per goal = **10%**
- Max goals per employee = **8**
- Goals lock on manager approval — no edit without admin unlock
- Shared goal title + target = read-only, only weightage editable

---

## Deployment

### Frontend → Netlify (Free)

```bash
cd frontend
npm run build
# Drag 'dist/' folder to netlify.com/drop
# OR connect GitHub repo:
# Build command: npm run build
# Publish directory: dist
# Environment variable: VITE_API_URL=https://your-render-url.onrender.com
```

### Backend → Render (Free)

1. Push code to GitHub
2. render.com → New Web Service → Connect GitHub repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables (copy from backend/.env, update MONGODB_URI and FRONTEND_URL)

### Database → MongoDB Atlas (Free)

1. atlas.mongodb.com → Create free M0 cluster
2. Database Access → Add user with password
3. Network Access → Add `0.0.0.0/0`
4. Connect → Drivers → copy connection string
5. Paste as `MONGODB_URI` in Render env vars

### GitHub Secrets (for CI/CD)

Add these in GitHub repo → Settings → Secrets:
- `NETLIFY_AUTH_TOKEN` — from Netlify User Settings → Applications
- `NETLIFY_SITE_ID` — from Netlify site settings
- `RENDER_DEPLOY_HOOK_URL` — from Render service settings
- `VITE_API_URL` — your Render backend URL

---

## Project Structure

```
goalportal/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Goal.js
│   │   ├── Achievement.js
│   │   └── index.js          (Checkin, AuditLog, Escalation, Notification, Cycle)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── goals.js
│   │   ├── achievements.js
│   │   ├── checkins.js
│   │   ├── admin.js
│   │   ├── escalations.js
│   │   ├── notifications.js
│   │   ├── audit.js
│   │   └── reports.js
│   ├── middleware/auth.js
│   ├── jobs/escalations.js   (cron job)
│   ├── utils/
│   │   ├── scoreUtils.js
│   │   └── notifyUtils.js
│   ├── server.js
│   ├── seed.js
│   └── .env
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── employee/     (Dashboard, GoalSheet, MyGoals, Achievements, MyAnalytics)
│       │   ├── manager/      (Dashboard, TeamGoals, Checkins, Analytics)
│       │   └── admin/        (Dashboard, GoalManagement, EscalationCenter, AuditTrail, Reports, Analytics, CycleManagement)
│       ├── components/common/ (Layout, UI)
│       ├── context/AuthContext.jsx
│       └── utils/            (api.js, scoreUtils.js)
├── docker-compose.yml
├── .github/workflows/deploy.yml
└── README.md
```

---

## Troubleshooting (Windows)

**MongoDB won't connect:**
```bash
# Check if MongoDB is running
Get-Service -Name MongoDB
# Start it
Start-Service -Name MongoDB
```

**Port 5000 in use:**
```bash
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

**npm not found after install:**
Close terminal and reopen (PATH refresh needed).

**CORS error in browser:**
Make sure `FRONTEND_URL=http://localhost:5173` in backend `.env`

---

## API Reference

Base URL: `http://localhost:5000`

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/goals | List goals |
| POST | /api/goals | Create goal |
| POST | /api/goals/:id/approve | Approve goal |
| POST | /api/goals/:id/return | Return with comment |
| POST | /api/goals/approve-all/:empId | Approve all pending |
| GET | /api/achievements | List achievements |
| PUT | /api/achievements | Upsert achievement |
| GET | /api/achievements/scores/:empId/:quarter | Scores with breakdown |
| GET | /api/checkins | List check-ins |
| POST | /api/checkins | Create check-in |
| GET | /api/admin/dashboard | Org stats |
| GET | /api/admin/completion-matrix | Heatmap data |
| POST | /api/admin/unlock/:goalId | Unlock approved goal |
| GET | /api/escalations | List escalations |
| GET | /api/notifications | User notifications |
| GET | /api/audit | Audit log |
| GET | /api/reports/achievement-csv | Download CSV |
| GET | /api/reports/achievement-xlsx | Download XLSX |
