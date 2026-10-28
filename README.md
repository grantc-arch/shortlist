# Shortlist

A two-sided job board that scores every candidate against every job, and shows both sides exactly where the score comes from.

- **Candidates** build one profile (qualification, experience, skills, location, availability, CV), browse open jobs and see their match score on each before applying.
- **Employers** post a role, list must-haves, and decide how much each criterion counts. Applicants arrive ranked, with the reasons beside every score. The employer makes every decision; nobody is auto-rejected.
- **Finding candidates:** open jobs can be listed on Google for Jobs, and every job link shows a preview card when shared on LinkedIn or WhatsApp.
- **Fast sign-up:** candidates can upload their CV and have Claude fill in their profile for them to check.

![Ranked applicants](docs/applicants.png)

## How matching works

Each job is scored on five criteria. The employer sets a weight for each (the weights are turned into a share of 100 points):

| Criterion | How it's scored |
| --- | --- |
| Qualification | 60% for meeting the minimum level (partial credit below it), 40% for a field of study matching the job's keywords |
| Experience | Years of relevant experience against the minimum, capped at full marks |
| Skills | Share of the job's listed skills the candidate has (loose matching, so "Excel" matches "Microsoft Excel") |
| Location | Straight-line distance: within 25 km 100%, within 60 km (commutable) 75%, further away 50% if willing to relocate, otherwise 0%. Remote roles always 100%. Places without coordinates fall back to comparing names |
| Availability | Can start by the start date 100%, within 2 weeks 70%, within a month 40%, later 10% |

**Must-haves** are yes/no questions the candidate answers when applying. A "no" is flagged and sorts the applicant below everyone who meets all must-haves, but they stay visible.

The score is drawn as one bar split into five coloured lanes. Each lane's width is the employer's weight; how much of it is filled is how well the candidate meets that criterion, so the gaps show exactly where points were lost.

The engine is a pure function in [`src/lib/matching.ts`](src/lib/matching.ts) with unit tests in [`src/lib/matching.test.ts`](src/lib/matching.test.ts).

| Job page with match breakdown | Posting a job and setting weights |
| --- | --- |
| ![Job page](docs/job.png) | ![Post a job](docs/post-job.png) |

## Google for Jobs

Each open job page carries [JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting), and open jobs are listed in `/sitemap.xml`, so Google can show them in its job search panel. The markup is built in [`src/lib/job-posting.ts`](src/lib/job-posting.ts).

- **Off by default.** It's switched on with `LIST_JOBS_ON_GOOGLE=true`, because Google doesn't allow fake or test postings, and anyone can sign up and post a job on a public demo.
- **Demo companies are never listed**, and their job pages are labelled as demos and marked `noindex`.
- **Closed jobs drop out.** A job leaves the sitemap and returns a 404 to visitors once it's closed or its closing date passes (in South African time). Closing dates set `validThrough`.
- Fully remote jobs are marked `TELECOMMUTE` with applicants limited to South Africa, and the description says so, as Google requires. Hybrid jobs aren't marked remote.

Employers see whether each job is listed, and get a copy-link button and LinkedIn, WhatsApp and email share links. Shared links show a preview image with the job title, company, location and salary:

![Share preview](docs/share-preview.png)

## CV auto-fill

On the profile page, a candidate can upload their CV and press **Fill in from my CV**. The PDF is sent to Claude (`claude-haiku-5-5` by default) using [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), so the reply always matches a fixed schema: name, phone, city, highest completed qualification, field of study, years of experience, skills, a draft summary, and whether they mention their own transport.

- **Only empty fields are filled.** Nothing the candidate typed is overwritten; skills are added to, not replaced. Each filled field is tagged "From your CV" until they edit it.
- **Nothing is saved automatically.** The candidate checks the form and saves it themselves. The same file is set as their CV, so they don't choose it twice.
- **The CV is treated as data**, never as instructions, and the reply is cleaned up before use (unknown cities and qualification wordings are dropped or matched, years are capped, skills de-duplicated).
- **Limited to 10 reads per person per day**, so the API bill can't run away.
- **Hidden unless `ANTHROPIC_API_KEY` is set.** Get a key from the [Claude Console](https://console.anthropic.com). Reading a one or two page CV with Haiku costs a fraction of a cent; see [Anthropic's pricing](https://www.anthropic.com/pricing) for current rates.

![CV auto-fill](docs/cv-autofill.png)

The schema and clean-up live in [`src/lib/cv-extraction.ts`](src/lib/cv-extraction.ts), the API call in [`src/lib/cv-autofill.ts`](src/lib/cv-autofill.ts), and the merge rules in [`src/lib/autofill-merge.ts`](src/lib/autofill-merge.ts).

## Locations

Location fields (employer sign-up, company details, candidate profile, job form) suggest South African suburbs and towns as you type, using [Photon](https://photon.komoot.io), komoot's free geocoder for [OpenStreetMap](https://www.openstreetmap.org/copyright) data. No API key or billing is needed.

- Picking a suggestion stores its coordinates, which the match score uses for real distances. "Claremont, Cape Town" and "Claremont, Durban" are told apart.
- People can also type a place that isn't suggested. If it names a main city it still gets coordinates; otherwise location is scored by comparing names.
- Searches go through the app's own `/api/places` route, so visitors' typing isn't sent straight to a third party, and answers are cached for a day.
- The public Photon server is free under fair use. If the site grows, run your own Photon instance or switch providers by changing `PLACES_API_URL`.

## Forgot password

**Forgot your password?** on the log-in page emails a reset link.

- Links work once, for 60 minutes, and only a hash of each is stored.
- The form always says the same thing, so it can't be used to find out who has an account, and sends at most three emails an hour per account.
- Resetting signs the account out on every other device.
- Emails go through any SMTP server. Without one, `npm run dev` prints the link in the terminal, and the live site says password reset isn't available.

### Sending email with Gmail (free, no domain needed)

1. Turn on [2-Step Verification](https://myaccount.google.com/security) for the Google account.
2. Create an [app password](https://myaccount.google.com/apppasswords) and copy the 16-character code.
3. Add these environment variables (in `.env.local`, and in Vercel):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your.address@gmail.com
   SMTP_PASS=the app password, without spaces
   ```

Gmail allows about 500 emails a day and sends from your own address. Once the site has its own domain, a provider such as [Resend](https://resend.com) or Brevo is better: use its SMTP settings and set `EMAIL_FROM`, for example `Shortlist <no-reply@yourdomain.co.za>`.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, server components and server actions), TypeScript, Tailwind CSS
- [Drizzle ORM](https://orm.drizzle.team) on PostgreSQL
- [PGlite](https://pglite.dev) for local development: real Postgres running inside Node, so there is nothing to install
- Email and password login with bcrypt-hashed passwords and a signed, HTTP-only session cookie (`jose`)
- CVs stored in the database (PDF only, 2 MB cap), downloadable only by the candidate and employers they applied to
- [Claude API](https://platform.claude.com/docs) (`@anthropic-ai/sdk`) for CV auto-fill
- Nodemailer for password reset emails, Photon (OpenStreetMap) for place suggestions
- Vitest for the matching engine, distances, Google markup and CV auto-fill rules

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

To try CV auto-fill locally, create a file called `.env.local` in the project folder containing `ANTHROPIC_API_KEY=your-key`, then restart `npm run dev`. All the optional settings are listed in [`.env.example`](.env.example).

Other commands:

```bash
npm test                    # unit tests
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
6. **Optional: CV auto-fill.** Add `ANTHROPIC_API_KEY` in Vercel and redeploy.
7. **Optional: password reset emails.** Add the four `SMTP_` variables (see [Forgot password](#forgot-password)) and redeploy.
8. **Optional: Google for Jobs**, once real employers are posting:
   1. Add `LIST_JOBS_ON_GOOGLE` = `true` in Vercel and redeploy.
   2. In [Google Search Console](https://search.google.com/search-console), add a **URL prefix** property for your site address and choose the **HTML tag** method. Copy the `content` value into a `GOOGLE_SITE_VERIFICATION` variable, redeploy, then press Verify.
   3. Under **Sitemaps**, submit `sitemap.xml`.
   4. Check a job page with Google's [Rich Results Test](https://search.google.com/test/rich-results). Google usually takes a few days to start showing jobs.

When you change `src/db/schema.ts`, run `npm run db:generate` to create a migration, then `npm run db:migrate` locally and against production. If you set up your database before CV auto-fill and Google listing were added, run `DATABASE_URL="postgres://..." npm run db:migrate` once to add the new columns.

## Project layout

```
src/
  app/
    actions/          server actions: auth, candidate, employer
    jobs/             job board, job page (with Google markup and share image), apply flow
    candidate/        candidate dashboard and profile (with CV auto-fill)
    employer/         employer dashboard, post/edit job, ranked applicants
    cv/[candidateId]/ access-controlled CV download
    sitemap.ts        open jobs for search engines
    robots.ts         keeps dashboards and CVs out of search
  components/         fit bar, job list, form helpers
  db/                 schema and connection (PGlite locally, Postgres in production)
  lib/                matching engine, auth, queries, ranking, Google markup, CV auto-fill
assets/fonts/         Schibsted Grotesk (SIL Open Font License) for share images
scripts/              migrate and seed
drizzle/              SQL migrations
```

## Known limitations and next steps

- Must-have answers and profile details are self-reported. Interviews and reference checks still matter.
- Field-of-study matching is keyword based, so "Marketing Management" matches "marketing" but "Brand Strategy" wouldn't unless the employer adds that keyword.
- No email notifications yet (new applicant, status change), and no way for employers to invite someone to apply by email. [Resend](https://resend.com) would be a simple addition.
- Google listing has no moderation: once switched on, any employer's open job is offered to Google. A live product would want new employers approved first.
- CV auto-fill sends the CV to Anthropic's API. A live product should say so in its privacy policy.
- Email addresses aren't verified at sign-up.
- CVs live in the database, which is fine at demo scale. At larger scale they should move to object storage (Supabase Storage, Vercel Blob or S3).
- POPIA basics are covered (consent before sharing, CV access control, self-service account deletion), but a live product would also need a privacy policy and a data retention period for closed jobs.
