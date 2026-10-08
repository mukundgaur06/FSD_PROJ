# HackElite AI: An Intelligent Technical Opportunity Discovery, Recommendation & Analytics Platform

[![Course](https://img.shields.io/badge/Course-24CIE554%20--%20Full%20Stack%20Development-blue.svg)](https://github.com)
[![Architecture](https://img.shields.io/badge/Architecture-MERN%20Stack%20(React%20%2B%20Node%20%2B%20Express%20%2B%20MongoDB)-61DAFB.svg)](https://reactjs.org)
[![Security](https://img.shields.io/badge/Auth-JWT%20%2B%20RBAC%20(Student%20%26%20Admin)-green.svg)](https://jwt.io)
[![Design](https://img.shields.io/badge/UI%2FUX-SaaS%20Glassmorphism%20%2B%20Dual%20Theme-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
[![Code Quality](https://img.shields.io/badge/Code%20Quality-SonarLint%20%2F%20SonarQube%20Ready-brightgreen.svg)](https://www.sonarqube.org/)

---

## 1. Project Overview & Abstract

### 1.1 Abstract
University students face severe friction when seeking career-defining technical opportunities—such as global hackathons, high-stipend corporate internships, algorithmic coding competitions, and academic research grants. These opportunities are currently fragmented across disparate Discord servers, transient WhatsApp groups, closed Telegram channels, and unstructured job boards. This fragmentation leads to missed application deadlines, the "resume black hole" (where applicants receive zero status visibility), and disorganized team formation for hackathons.

**HackElite AI** is an intelligent, full-stack web application engineered on the **MERN stack** (MongoDB, Express.js, React, Node.js) specifically for course **24CIE554 - Full Stack Development**. The platform centralizes, curates, and monitors technical opportunities with:
1. **Intelligent Opportunity Discovery & Multi-Attribute Filtering** (by domain, location modality, sponsoring organization, and deadline).
2. **Contextual AI Assistant & Recommendation Engine** grounded in live MongoDB data collections to match student skills with optimal listings.
3. **Collaborative Team Formation Module** with project deck uploads and teammate recruitment.
4. **End-to-End Application Tracking Pipeline** featuring visual 4-stage Kanban progression and transparent evaluation feedback.
5. **Real-Time Ecosystem Analytics & Aggregation Dashboards** computing key performance indicators (KPIs) and domain distribution metrics.
6. **Administrator Management Console** with complete CRUD authority, applicant dossier review, and status lifecycle control.
7. **Academic Audit Telemetry & Logging Middleware** for runtime request-response inspection during laboratory and viva evaluations.

---

### 1.2 Academic Course & Team Information
* **Course Code**: `24CIE554`
* **Course Title**: Full Stack Development
* **Degree / Semester**: B.Tech. Computer Science & Engineering
* **Project Title**: *HackElite AI: An Intelligent Technical Opportunity Discovery, Recommendation and Analytics Platform*
* **Project Team**:
  * **Lead Full Stack Engineer & Systems Architect**: Student Developer (Roll / ID: 24CIE554-FSD-01)
  * **Team Collaborator & UI/UX Specialist**: Student Developer (Roll / ID: 24CIE554-FSD-02)
  * **Evaluation Faculty / Course Instructor**: Department of Computer Science & Engineering

---

## 2. System Architecture & Work of Flow

The platform implements a multi-tier, decoupled architecture adhering to RESTful service-oriented design patterns. The diagram below illustrates the end-to-end data lifecycle from user interactions in the browser through validation, role-based protection, business logic, persistence, and AI inference.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (Browser)                                       │
│                                                                                                │
│   ┌────────────────────────────┐               ┌───────────────────────────────────────────┐   │
│   │   Student Engineer         │               │   Administrator / Faculty                 │   │
│   │   (Discovery, Teams, Apps) │               │   (Opportunity CRUD, Candidate Dossiers)  │   │
│   └─────────────┬──────────────┘               └─────────────────────┬─────────────────────┘   │
└─────────────────┼────────────────────────────────────────────────────┼─────────────────────────┘
                  │                                                    │
                  ▼                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND APPLICATION (React + Vite)                             │
│                                                                                                │
│  • Single Page Application (SPA) with React 18 / 19 + Vite                                     │
│  • High-End SaaS Glassmorphism (Backdrop Blur, Razor Micro-Borders, Ambient Drop Shadows)      │
│  • Instant Light/Dark Mode Switching via Root Custom Properties (`[data-theme]`)               │
│  • Context API State Management:                                                               │
│    ├── AuthContext.jsx       ── Session persistence & JWT extraction                           │
│    ├── ThemeContext.jsx      ── Dark / Light mode switching & OS preference sync               │
│    └── ToastContext.jsx      ── Non-blocking feedback notifications                            │
│  • Centralized Axios API Service Layer with Request & Response Interceptors                    │
└───────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                │  JSON Payloads via HTTP / HTTPS
                                                │  `Authorization: Bearer <JWT_TOKEN>`
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API GATEWAY (Node.js + Express)                           │
│                                                                                                │
│  1. CORS & Body Parsers (`express.json()`, `express.urlencoded()`)                             │
│  2. Static Asset Hosting (`/uploads` for resumes and team project decks)                       │
│  3. Academic Audit Logging Middleware (`loggerMiddleware.js`):                                 │
│     ├── Console ANSI formatted output with execution latency (ms)                              │
│     └── Persistent JSON Lines append file (`logs/server_audit.log`)                            │
│  4. Route Dispatchers:                                                                         │
│     ├── /api/auth             ── Registration, Login, Profile State                            │
│     ├── /api/opportunities    ── Discovery, Search, CRUD, Bookmarks                            │
│     ├── /api/applications     ── Submission, Stepper Stages, Reviews                           │
│     ├── /api/teams            ── Creation, Join Requests, Approvals                            │
│     ├── /api/analytics        ── Aggregation Pipelines, Domain Breakdown                       │
│     ├── /api/ai               ── Contextual Gemini AI Grounding Engine                         │
│     └── /api/logs/view        ── Telemetry inspector endpoint for viva demos                   │
└───────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
┌────────────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│     SECURITY & CONTROLLER LAYER                │   │        INTELLIGENT AI ENGINE            │
│                                                │   │                                         │
│ • JWT Verification (`authMiddleware.js`)       │   │ • Vector & Skill Intersection Matching  │
│ • Role-Based Access Control (RBAC):            │   │ • Database Grounding Query Synthesizer  │
│   ├── `protect`: Validates signature & expiry  │   │ • Google Gemini Flash Model Integration │
│   └── `adminOnly`: Restricts CRUD to Admins    │   │ • Autonomous Fallback Context System    │
│ • Multer File Disk Storage for PDF Documents   │   │                                         │
│ • Centralized Error Handler (HTTP 400/401/500) │   │                                         │
└───────────────────────┬────────────────────────┘   └────────────────────┬────────────────────┘
                        │                                                 │
                        ▼                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                               DATABASE LAYER (MongoDB + Mongoose)                             │
│                                                                                               │
│  • Schema-Driven Document Store (`hackelite_db`):                                             │
│    ├── `users`          ── Credentials (bcrypt), roles, colleges, skills arrays               │
│    ├── `opportunities`  ── Domains, deadlines, rewards, status flags, compound text indexes   │
│    ├── `applications`   ── Opportunity refs, candidate refs, stage audits, feedback notes     │
│    ├── `saveditems`     ── Bookmark relationships with unique compound keys                   │
│    └── `teams`          ── Leader refs, member rosters, max capacity, proposal links          │
│  • MongoDB Aggregate Pipelines for Real-Time KPI Generation (`$group`, `$facet`, `$sort`)     │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Breakdown

| Layer | Technology | Version | Purpose & Architectural Role |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js | `^19.2.0` | Declarative component-based UI rendering, state management, and virtual DOM diffing. |
| **Build Tool & Bundler** | Vite | `^8.3.0` | Ultra-fast Hot Module Replacement (HMR) and optimized Rollup production asset bundling. |
| **Styling & Physics** | Vanilla CSS3 + Design Tokens | Custom | SaaS-grade glassmorphism with dynamic CSS custom properties, backdrop filters, and dual-mode theme support. |
| **Iconography** | Lucide React | `^1.52.0` | Modern, lightweight, customizable SVG icon set for technical dashboards. |
| **Client Routing** | React Router DOM | `^7.18.0` | Declarative client-side routing, navigation state, and single-page application workflow. |
| **HTTP Client** | Axios | `^1.20.0` | Promise-based asynchronous HTTP client with custom request/response interceptors. |
| **Backend Runtime** | Node.js | `v18+` / `v20+` | Non-blocking event-driven runtime handling concurrent API requests. |
| **Web API Framework** | Express.js | `^5.2.0` | Routing engine, middleware pipeline, and RESTful micro-service endpoints. |
| **Object Data Modeling** | Mongoose | `^9.3.0` | Strict schema definition, data validation, middleware hooks, and aggregation pipeline abstraction. |
| **Database** | MongoDB | `v6.0+` / `v7.0+` | High-performance document-oriented NoSQL database with flexible JSON-like BSON storage. |
| **Authentication & Tokens**| JSON Web Tokens (JWT) | `^9.0.0` | Stateless cryptographic bearer tokens for role-based session authorization. |
| **Password Security** | bcryptjs | `^3.0.0` | Adaptive salted hashing algorithm preventing rainbow-table credential attacks. |
| **File Handling** | Multer | `^2.0.0` | Multipart/form-data handler for resume uploads and project pitch attachments. |
| **Artificial Intelligence**| Google Gemini API / Heuristic AI | `1.5/2.0 Flash` | Multimodal and contextual natural language inference grounded on live database opportunities. |
| **Code Quality** | SonarLint & Oxlint | `^1.81.0` | Static code analysis, vulnerability scanning, code smells mitigation, and linting. |
| **Version Control** | Git & GitHub | `Latest` | Distributed version control, branch management, pull requests, and commit tracking. |

---

## 4. Comprehensive Feature Breakdown

### 4.1 Authentication & Role-Based Authorization (Module 1)
* **Secure Registration & Login**: Validates email format, enforces password complexity, and hashes passwords via `bcryptjs` with salt rounds.
* **Stateless JWT Tokens**: Issues signed JSON Web Tokens containing the user's `id` and `role`. Tokens expire after 7 days (`JWT_EXPIRES_IN=7d`).
* **Strict Role Separation**:
  * **Students**: Can explore opportunities, submit applications, upload resumes, save/bookmark items, create teams, and interact with the AI Advisor.
  * **Administrators**: Possess exclusive rights to create, edit, and delete opportunities (`/api/opportunities`), and review/evaluate student candidate dossiers (`/api/applications/review/:id`).
* **Session Interception**: Client automatically attaches the bearer token via Axios request interceptors and handles graceful recovery on token expiration (HTTP 401).

### 4.2 High-Converting Landing Page & Refined Glassmorphism UI
* **SaaS Glassmorphism Physics**:
  * Heavy backdrop blur (`backdrop-filter: blur(24px)` to `blur(28px)`).
  * Razor-thin micro-borders (`border: 1px solid rgba(255, 255, 255, 0.12)`).
  * Layered inner 3D highlights (`inset 0 1px 0 0 ...`) creating beveled edges catching ambient light.
  * Ambient elevation drop shadows (`box-shadow: 0 8px 32px 0 rgba(0,0,0,0.35)`).
* **Dual Theme Engine (Dark & Light Mode)**:
  * Default **Obsidian Dark Mode** with deep slate canvas, neon glowing indigo/emerald accents, and high-contrast typography.
  * Clean **Pearl Light Mode** with crisp off-white canvas, translucent white-glass cards, and deep slate text.
  * Instant toggling without page reload via root CSS variables and `.dark` / `.light` class synchronization with `localStorage` and system preference detection.
* **Interactive Hero Components**:
  * **AI Contextual Match Simulator**: Clickable skill tags dynamically animate candidate match scores with smooth counter effects.
  * **Live Backend Telemetry Ticker**: Terminal window displaying mock and live API audit logs with pulsing status lights.

### 4.3 Opportunity CRUD & Admin Dashboard (Module 2)
* **Full CRUD Lifecycle**: Administrators can post new hackathons, internships, coding contests, or grants, update existing parameters, or remove obsolete records.
* **Comprehensive Metadata Attributes**: Title, company/sponsor, description, technical domain, location type (Remote, Hybrid, On-site), reward/stipend, application deadline, and required skill tags.
* **Applicant Review Console**: Administrators evaluate applicant dossiers, examine submitted resumes, update application stages, and leave constructive feedback notes.

### 4.4 Multi-Attribute Search, Filtering & Application Tracker (Module 3)
* **Dynamic Search & Filtering**: Multi-condition querying on title, company, domain, opportunity type, and modality without page refresh.
* **1-Click Application Workflow**: Modal-based application form supporting candidate pitch notes and PDF resume upload.
* **Visual 4-Stage Application Stepper**: Real-time progress visualization across four explicit phases:
  1. `Applied`
  2. `Under Review`
  3. `Shortlisted`
  4. `Accepted / Rejected`
* **Application Withdrawal**: Students can withdraw submitted applications at any time.

### 4.5 Collaborative Team Formation & Document Attachments (Module 4)
* **Hackathon Team Creation**: Students can initiate teams tied to specific hackathon opportunities, define required roles, and set member limits.
* **Member Discovery & Join Requests**: Other students can browse active teams and submit membership requests with their skill summaries.
* **Project Pitch Deck & Deck Uploads**: Teams can attach presentation decks or architecture diagrams using Multer disk storage.

### 4.6 Analytics Dashboard & Aggregation Engine (Module 5)
* **Real-Time KPIs**: Total opportunities, active listings, enrolled students, total applications, and overall acceptance percentage.
* **MongoDB Aggregation Pipelines**:
  * `$group` and `$facet` queries compute category distributions across technical domains (`AI/ML`, `Web Development`, `Cloud & DevOps`, `Cybersecurity`, etc.).
  * Candidate funnel conversion rates across application lifecycle stages.
  * Hiring company league table listing top recruiters and upcoming deadlines within 30 days.

### 4.7 AI Assistant & Contextual Recommendation Engine (Module 6)
* **Database Grounding**: Connects to the local database to find live opportunities matching user queries.
* **Skill Vector Intersection**: Intersects user profile skills with opportunity requirements to score relevance.
* **Interactive Drawer**: Slide-out assistant providing recommendation mini-cards, application pitch drafting tips, and deadline reminders.

---

## 5. Implementation Details & Logging System

### 5.1 Custom Request-Response Lifecycle Logging Middleware
A core requirement of **Course 24CIE554** is robust server-side auditing. HackElite AI implements an audit logging middleware in `backend/middleware/loggerMiddleware.js`:

```javascript
const requestLogger = (req, res, next) => {
  const reqId = ++reqCounter;
  const startTime = process.hrtime();
  const timestamp = new Date().toISOString();
  
  // Intercept the response completion
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const diff = process.hrtime(startTime);
    const durationMs = ((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2);
    
    // Structured audit line written to logs/server_audit.log
    const fileLogEntry = {
      reqId,
      timestamp,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      ip: req.ip,
      user: req.user ? { id: req.user._id, role: req.user.role } : null,
      query: req.query,
      body: sanitizeData(req.body),
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs)
    };
    fs.appendFile(logFilePath, JSON.stringify(fileLogEntry) + '\n', ...);
    originalEnd.apply(this, arguments);
  };
  next();
};
```

#### Key Capabilities of the Logging Middleware:
1. **High-Resolution Execution Latency**: Measures processing time via `process.hrtime()` in milliseconds (`ms`).
2. **Credential & Secret Masking**: Automatically detects and replaces sensitive payload attributes (`password`, `token`, `authorization`) with `***MASKED***`.
3. **Dual-Destination Output**:
   * **Terminal Console**: Outputs colored ANSI logs with request IDs, client IP, user context, query params, and HTTP status codes.
   * **Persistent Disk Storage**: Appends structured JSON Lines to `backend/logs/server_audit.log`.
4. **Live In-App Audit Inspector**: Accessible directly in the UI via the top navigation bar (`Navbar.jsx` -> `Audit Logs`), invoking `GET /api/logs/view` for viva defense.

### 5.2 Frontend-to-Backend Service Layer
All network communication is centralized in `frontend/src/services/api.js`:
* **Base URL Configuration**: Configured to target `http://localhost:5000/api`.
* **Automatic Bearer Injection**: Injects `Authorization: Bearer <token>` on every request.
* **Automatic Session Cleanup**: On HTTP 401 Unauthorized responses, clears `localStorage` and prompts re-authentication.

---

## 6. Installation & Setup Instructions

Follow these step-by-step instructions to clone, install, configure, and execute HackElite AI on your local environment.

### 6.1 Prerequisites
* **Node.js**: `v18.0.0` or higher installed ([Download Node.js](https://nodejs.org/))
* **npm**: `v9.0.0` or higher (bundled with Node.js)
* **MongoDB**: Local MongoDB Community Server running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI ([Download MongoDB](https://www.mongodb.com/try/download/community))
* **Git**: Installed and configured ([Download Git](https://git-scm.com/))

---

### 6.2 Step 1: Clone the Repository
```bash
git clone https://github.com/mukundgaur06/FSD_PROJ.git
cd FSD_PROJ
```

---

### 6.3 Step 2: Backend Configuration & Dependency Installation
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install all required Node.js dependencies:
   ```bash
   npm install
   ```
3. Configure the backend environment file. A `.env` file should be located in `backend/.env`. If not present, create it with the following configuration:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/hackelite_db
   JWT_SECRET=hackelite_super_secret_jwt_key_2026
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   ```

---

### 6.4 Step 3: Seed Database with Initial Data
Run the database seeder to populate sample users (Admin and Students), pre-configured hackathons, internships, coding contests, and sample applications:
```bash
npm run seed
```
*Expected Console Output:*
```
Connected to MongoDB: 127.0.0.1 / hackelite_db
Cleaning existing collections...
Seeding default users (Admin & Students)...
Seeding technical opportunities...
Creating sample applications...
Creating sample teams...
Database seeding completed successfully!
```

---

### 6.5 Step 4: Frontend Installation
1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install frontend packages:
   ```bash
   npm install
   ```

---

### 6.6 Step 5: Start the Development Servers
1. **Start the Backend API Server** (in the `backend` terminal):
   ```bash
   npm start
   ```
   *The Express API will boot on `http://localhost:5000` with MongoDB connected.*

2. **Start the Frontend Client Server** (in the `frontend` terminal):
   ```bash
   npm run dev
   ```
   *The Vite dev server will launch at `http://localhost:5173`.*

3. Open your web browser and navigate to:
   ```
   http://localhost:5173
   ```

---

### 6.7 Demo Login Credentials for Evaluation & Testing

You can use the 1-Click login buttons on the Sign In modal or manually use the following credentials:

| Account Type | Email Address | Password | Permissions & Role |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@hackelite.ai` | `AdminPassword123` | Full CRUD access, candidate evaluation dossier, feedback authoring |
| **Student (Full Stack)** | `alex@student.edu` | `StudentPassword123` | Opportunity browsing, application tracker, resume upload, team formation |
| **Student (AI / ML)** | `priya@student.edu` | `StudentPassword123` | AI skill recommendations, team roster exploration |
| **Student (Cloud / DevOps)** | `marcus@student.edu` | `StudentPassword123` | Application tracking, collaborative team proposals |

---

## 7. API Endpoint Reference

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new student or admin account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue signed JWT token |
| `GET` | `/api/auth/me` | Protected | Retrieve authenticated profile information |
| `GET` | `/api/opportunities` | Public | Filtered search across opportunities |
| `GET` | `/api/opportunities/:id` | Public | Retrieve detailed opportunity by ID |
| `POST` | `/api/opportunities` | Admin Only | Create a new technical opportunity listing |
| `PUT` | `/api/opportunities/:id` | Admin Only | Update an existing opportunity listing |
| `DELETE`| `/api/opportunities/:id` | Admin Only | Remove an opportunity listing |
| `POST` | `/api/opportunities/:id/save` | Student | Toggle bookmark on an opportunity |
| `GET` | `/api/opportunities/user/saved` | Student | Retrieve user's bookmarked opportunities |
| `POST` | `/api/applications/:opportunityId` | Student | Submit application with pitch & resume upload |
| `GET` | `/api/applications/my` | Student | Retrieve user's active application submissions |
| `DELETE`| `/api/applications/:id` | Student | Withdraw an active application |
| `GET` | `/api/applications/admin/all` | Admin Only | Retrieve all applicant dossiers for evaluation |
| `PATCH` | `/api/applications/review/:id` | Admin Only | Update application review stage & feedback notes |
| `GET` | `/api/teams` | Public | List all collaborative teams |
| `POST` | `/api/teams` | Student | Create new hackathon team with deck attachment |
| `POST` | `/api/teams/:id/join` | Student | Submit join request to a team |
| `PATCH` | `/api/teams/:id/respond` | Student (Leader) | Accept or reject membership requests |
| `GET` | `/api/analytics/overview` | Public | Retrieve aggregated KPIs, domain breakdown, funnel data |
| `POST` | `/api/ai/chat` | Public | Query AI assistant for contextual opportunity recommendations |
| `GET` | `/api/logs/view` | Public | Retrieve recent server request-response audit records |

---

## 8. Code Quality & Standards

* **Static Code Analysis**: Inspected with **SonarLint** and **Oxlint** to eliminate dead code, enforce camelCase conventions, and prevent unsafe object mutations.
* **Cross-Browser Verification**: Verified across Chromium (Google Chrome, Microsoft Edge, Brave) and Gecko (Mozilla Firefox) engines.
* **Accessible Semantics**: Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`), appropriate ARIA attributes (`aria-label`), and contrast ratios conforming to WCAG AA guidelines in both light and dark themes.

---

## 9. Academic Declaration & License

This project was conceived, designed, developed, and tested by the project team for academic fulfillment in course **24CIE554 - Full Stack Development**.

Distributed under the **ISC License**. See `LICENSE` for more information.

&copy; 2026 **HackElite AI Project Team** — Course 24CIE554: Full Stack Development.
