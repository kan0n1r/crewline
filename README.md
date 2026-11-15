# Team CRM

Lightweight CRM for small teams (up to ~10 people). Manage customers, deals, notes, and files. Built-in integrations with Slack, Power BI, and Google Drive.

## Features

- User authentication (JWT)
- Customer directory with notes
- Deal pipeline
- Search across customers and notes
- Document upload and report export
- Integrations: **Slack**, **Power BI**, **Google Drive**
- Team member management and diagnostics

## Requirements

- Node.js 18+ (recommended)
- npm 9+

## Quick start

```bash
cd team-crm
cp .env.example .env
npm install
npm start
```

Open **http://localhost:3000** in your browser.

### Demo accounts

| Username | Password  | Role  |
|----------|-----------|-------|
| admin    | admin123  | admin |
| alice    | alice123  | user  |
| bob      | bob123    | user  |

## Configuration

| Variable             | Description                 | Default             |
|----------------------|-----------------------------|---------------------|
| `PORT`               | HTTP port                   | `3000`              |
| `JWT_SECRET`         | Secret for signing tokens   | from `.env.example` |
| `SLACK_WEBHOOK`      | Slack incoming webhook URL  | —                   |
| `POWERBI_TOKEN`      | Power BI embed / API token  | —                   |
| `GOOGLE_DRIVE_TOKEN` | Google Drive access token   | —                   |

## Project structure

```
.
├── package.json
├── server.js          # Express API + static UI
├── .env.example
├── README.md
├── public/
│   └── index.html     # Single-page UI
└── uploads/           # Uploaded documents
```

## API overview

| Method | Path                         | Description              |
|--------|------------------------------|--------------------------|
| POST   | `/api/login`                 | Sign in                  |
| POST   | `/api/logout`                | Sign out                 |
| GET    | `/api/me`                    | Current user             |
| GET    | `/api/customers`             | List customers           |
| GET    | `/api/customers/:id`         | Customer by id           |
| POST   | `/api/customers/:id/notes`   | Update notes             |
| GET    | `/api/search?q=`             | Search customers         |
| GET    | `/api/deals`                 | List deals               |
| POST   | `/api/upload`                | Upload file (multipart)  |
| GET    | `/api/export?format=`        | Export report            |
| POST   | `/api/integrations/slack`    | Slack notification       |
| GET    | `/api/integrations/powerbi`  | Power BI dashboard info  |
| GET    | `/api/integrations/gdrive`   | Google Drive files       |
| POST   | `/api/integrations/fetch`    | Fetch external URL       |
| GET    | `/api/users`                 | Team members             |
| POST   | `/api/users/update`          | Update user profile      |
| GET    | `/api/health`                | Health check             |
| GET    | `/api/debug`                 | Diagnostics              |

## Tech stack

- **Runtime:** Node.js
- **Framework:** Express 4
- **Database:** SQLite (in-memory for demo)
- **Auth:** JSON Web Tokens (cookie + optional Bearer)
- **Uploads:** Multer
- **HTTP client:** Axios (integrations)

## Production notes

For a real deployment you should:

1. Use a persistent database (PostgreSQL / MySQL) instead of in-memory SQLite.
2. Store secrets only in environment variables or a secret manager.
3. Enable HTTPS and set secure cookie flags.
4. Restrict integration tokens and webhook URLs.
5. Run behind a reverse proxy (nginx, Caddy) with rate limiting.

## License

Internal use. Adjust as needed for your organization.
