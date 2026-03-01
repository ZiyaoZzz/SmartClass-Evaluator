# SmartClass Evaluator

Next.js quiz app: admin sets up tests and views results; students take quizzes via shareable links.

## Run locally

```bash
cp .env.example .env
# Edit .env: set ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SECRET, DATABASE_URL
npm install
npm run dev
```

The first time (or after adding migrations), create the DB and apply migrations:

```bash
npx prisma migrate dev
```

## Database

Quiz **submissions** are stored in a **SQLite** database (Prisma). The DB file is at `.data/submissions.db` by default (see `DATABASE_URL` in `.env.example`).

- **Local:** `cp .env.example .env` and set `DATABASE_URL="file:./.data/submissions.db"`. Run `npx prisma migrate dev` once to create the DB and apply migrations.
- **Render:** In the dashboard, set `DATABASE_URL="file:./.data/submissions.db"`. The build runs `prisma migrate deploy`, so the DB is created/updated on deploy. Note: on Render’s free tier the filesystem can be ephemeral; the SQLite file may be lost on redeploy. For durable storage, use a persistent disk or switch to Render Postgres later.

Chapters and quiz config stay in `.data/*.json` (file-based).

## Deploy on Render

1. Create a **Web Service**, connect this GitHub repo.
2. **Build command:** `npm install && npm run build`  
   **Start command:** `npm start`
3. In **Environment**, add:
   - `AUTH_SECRET` — long random string (required in production)
   - `ADMIN_USERNAME` — admin login
   - `ADMIN_PASSWORD` — admin password
   - `DATABASE_URL` — e.g. `file:./.data/submissions.db` (for SQLite; build creates `.data` and runs migrations)
