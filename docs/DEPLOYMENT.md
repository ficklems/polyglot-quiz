# Deployment

The game runs on free plans: **Render** hosts the web app and the API, **Neon** hosts the
Postgres database that keeps the leaderboard. Everything is described in
[`render.yaml`](../render.yaml) (a Render Blueprint), so the setup below is done once.

```
Browser ──► polyglot-quiz.onrender.com      static site (Render CDN, always on)
   └──────► polyglot-quiz-api.onrender.com  Fastify API (Render free web service, Frankfurt)
                ├─ questions: loaded from content/ on every start
                ├─ rounds: SQLite file in /tmp (wiped on restart; a round lasts minutes)
                └─ leaderboard: Neon Postgres (DATABASE_URL), survives restarts
```

## Free-plan limits and what they mean here

| Limit                                                                    | Effect on the game                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| The API sleeps after 15 idle minutes, wakes in ~1 min                    | The first visitor waits; the home screen says the server is waking up after 4 s |
| The API's disk is wiped on every restart or deploy                       | A round in progress during a deploy is lost; leaderboard entries are not (Neon) |
| 512 MB RAM                                                               | The API uses ~330 MB with 24k questions loaded; `NODE_OPTIONS` caps the heap    |
| Neon: 1 GB storage, 100 compute-hours/month, sleeps after 5 idle minutes | Far more than a leaderboard needs; the first save after a pause takes ~1 s      |

## First-time setup (owner)

Before starting, merge the PR that adds `render.yaml`: Render reads it from `main`.

### 1. Neon (database)

1. Sign up at <https://neon.com> (no card needed; "Continue with GitHub" is fine).
2. Create a project: name `polyglot-quiz`, region **AWS Europe Central 1 (Frankfurt)**, the
   default Postgres version.
3. On the project page click **Connect** and copy the **connection string**. It looks like
   `postgresql://user:password@ep-something-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Keep it private: it is a password.

The API creates its table on the first start; nothing else to do in Neon.

### 2. Render (hosting)

1. Sign up at <https://render.com> with GitHub.
2. **New → Blueprint**, connect the `ficklems/polyglot-quiz` repository, branch `main`.
3. Render lists two services from `render.yaml` and asks for `DATABASE_URL`: paste the
   Neon connection string. Click **Apply** / **Deploy Blueprint**.
4. Wait for both deploys to turn green (the first build takes a few minutes).

### 3. Check

1. Open `https://polyglot-quiz.onrender.com`. The first load may show "waking up the server".
2. Play a round of one category with the default settings and save the score.
3. In Render, restart the API (**Manual Deploy → Restart service**), reload the leaderboard:
   the entry must still be there.

If Render had to give a service a different address (the name was taken), set the real
addresses in the dashboard: `CORS_ORIGINS` on the API, `VITE_API_URL` on the static site,
then redeploy the static site.

## Day to day

- Every merge to `main` redeploys both services (`autoDeploy: true`).
- Secrets live only in the Render dashboard; `render.yaml` holds none.
- Logs: Render → service → **Logs**. The API logs `content loaded` and
  `leaderboard store ready {"store":"postgres"}` on start.

## Local equivalent

```bash
DATABASE_URL=postgres://… DB_PATH=/tmp/quiz.db HOST=0.0.0.0 npm run start:api
VITE_API_URL=http://localhost:3000 npm run build
```

Postgres store tests run with `TEST_DATABASE_URL` pointing at a throwaway database; CI starts
a Postgres 16 service for them.
