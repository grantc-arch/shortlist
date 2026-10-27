# Shortlist

A two-sided job board that scores every candidate against every job, and shows both sides exactly where the score comes from.

- **Candidates** build one profile (qualification, experience, skills, location, availability, CV), browse open jobs and see their match score on each before applying.
- **Employers** post a role, list must-haves, and decide how much each criterion counts. Applicants arrive ranked, with the reasons beside every score. The employer makes every decision; nobody is auto-rejected.

![Ranked applicants](docs/applicants.png)

## How matching works

Each job is scored on five criteria. The employer sets a weight for each (the weights are turned into a share of 100 points):

| Criterion | How it's scored |
| --- | --- |
| Qualification | 60% for meeting the minimum level (partial credit below it), 40% for a field of study matching the job's keywords |
| Experience | Years of relevant experience against the minimum, capped at full marks |
| Skills | Share of the job's listed skills the candidate has (loose matching, so "Excel" matches "Microsoft Excel") |
| Location | Same city 100%, commutable (e.g. Stellenbosch to Cape Town) 75%, willing to relocate 50%, remote roles always 100% |
| Availability | Can start by the start date 100%, within 2 weeks 70%, within a month 40%, later 10% |

**Must-haves** are yes/no questions the candidate answers when applying. A "no" is flagged and sorts the applicant below everyone who meets all must-haves, but they stay visible.

The score is drawn as one bar split into five coloured lanes. Each lane's width is the employer's weight; how much of it is filled is how well the candidate meets that criterion, so the gaps show exactly where points were lost.

The engine is a pure function in [`src/lib/matching.ts`](src/lib/matching.ts) with unit tests in [`src/lib/matching.test.ts`](src/lib/matching.test.ts).

| Job page with match breakdown | Posting a job and setting weights |
| --- | --- |
| ![Job page](docs/job.png) | ![Post a job](docs/post-job.png) |

## Tech stack

- [Next.js](https://nextjs.org) (App Router, server components and server actions), TypeScript, Tailwind CSS
- [Drizzle ORM](https://orm.drizzle.team) on PostgreSQL
- [PGlite](https://pglite.dev) for local development: real Postgres running inside Node, so there is nothing to install
- Email and password login with bcrypt-hashed passwords and a signed, HTTP-only session cookie (`jose`)
- CVs stored in the database (PDF only, 2 MB cap), downloadable only by the candidate and employers they applied to
- Vitest for the matching engine

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run setup     # creates the local database in .data/ and adds demo data
npm run dev       # http://localhost:3000
```

Demo logins (password `demo-password` for both):

- `employer@example.com`: Lion's Head Marketing, hiring the Administrator role
- `candidate@example.com`: a marketing graduate who hasn't applied for the Administrator role yet

Other commands:

```bash
npm test                    # matching engine tests
npm run db:seed -- --reset  # wipe all data and reload the demo data
npm run db:reset            # delete the local database entirely and set it up again
```

## Deploy it (Vercel + hosted Postgres)

1. **Put the code on GitHub.** Create an empty repository, then:
   ```bash
   git remote add origin https://github.com/<your-username>/shortlist.git
   git push -u origin main
   ```
2. **Create a Postgres database** with [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its connection string.
3. **Create the tables and demo data** from your computer, pointing at that database:
   ```bash
   DATABASE_URL="postgres://..." npm run setup
   ```
   (On Windows PowerShell: `$env:DATABASE_URL="postgres://..."; npm run setup`)
4. **Import the repository on [Vercel](https://vercel.com/new)** and add two environment variables:
   - `DATABASE_URL`: the connection string from step 2
   - `AUTH_SECRET`: a long random string. Generate one with
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
5. Deploy. Every push to `main` redeploys.

When you change `src/db/schema.ts`, run `npm run db:generate` to create a migration, then `npm run db:migrate` locally and against production.

## Project layout

```
src/
  app/
    actions/          server actions: auth, candidate, employer
    jobs/             job board, job page, apply flow
    candidate/        candidate dashboard and profile
    employer/         employer dashboard, post/edit job, ranked applicants
    cv/[candidateId]/ access-controlled CV download
  components/         fit bar, job list, form helpers
  db/                 schema and connection (PGlite locally, Postgres in production)
  lib/                matching engine, auth, queries, ranking
scripts/              migrate and seed
drizzle/              SQL migrations
```

## Known limitations and next steps

- Must-have answers and profile details are self-reported. Interviews and reference checks still matter.
- Field-of-study matching is keyword based, so "Marketing Management" matches "marketing" but "Brand Strategy" wouldn't unless the employer adds that keyword.
- No email notifications yet (new applicant, status change). [Resend](https://resend.com) would be a simple addition.
- No password reset or email verification yet.
- CVs live in the database, which is fine at demo scale. At larger scale they should move to object storage (Supabase Storage, Vercel Blob or S3).
- POPIA basics are covered (consent before sharing, CV access control, self-service account deletion), but a live product would also need a privacy policy and a data retention period for closed jobs.
