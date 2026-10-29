/**
 * Posts jobs from a JSON file under an existing employer account, using the same rules as
 * the Post a job form. Jobs that account already has open with the same title are skipped,
 * so running it twice doesn't post duplicates.
 *
 *   npm run jobs:import -- imports/old-school.json --employer hiring@company.co.za
 *   npm run jobs:import -- imports/old-school.json --employer hiring@company.co.za --dry-run
 *
 * Against the live site, set DATABASE_URL first, as for db:migrate.
 */
import { readFileSync } from "node:fs";
import { and, eq, isNull } from "drizzle-orm";
import { closeDb, db, schema } from "../src/db";
import { jobSchema } from "../src/lib/job-input";
import { DEFAULT_WEIGHTS, normaliseWeights, type Weights } from "../src/lib/matching";
import { coordsFor } from "../src/lib/places";
import { normaliseSkills } from "../src/lib/skills";

interface JobFile {
  employer?: string;
  jobs: (Record<string, unknown> & {
    title: string;
    location: string | { label: string; lat?: number; lng?: number };
    weights?: Partial<Weights>;
  })[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = process.argv.slice(2).find((a) => a.endsWith(".json"));
  if (!file) throw new Error("Give the JSON file to import, e.g. npm run jobs:import -- imports/old-school.json --employer you@example.com");
  const dryRun = process.argv.includes("--dry-run");
  const data = JSON.parse(readFileSync(file, "utf8")) as JobFile;
  const email = (arg("--employer") ?? data.employer ?? "").trim().toLowerCase();
  if (!email) throw new Error("Say which employer account to post under: --employer their@email.address");

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) throw new Error(`There's no account for ${email}. Sign up on the site as an employer with that address first.`);
  if (user.role !== "employer") throw new Error(`${email} is a candidate account. Jobs can only be posted under an employer account.`);
  const employer = await db.query.employers.findFirst({ where: eq(schema.employers.userId, user.id) });
  console.log(`Posting as ${employer?.companyName} (${email})${dryRun ? ": dry run, nothing will be saved" : ""}\n`);

  let posted = 0;
  for (const raw of data.jobs) {
    const { location, weights, ...rest } = raw;
    const parsed = jobSchema.safeParse({
      salaryMin: null,
      salaryMax: null,
      startDate: null,
      closesOn: null,
      responsibilities: [],
      fieldKeywords: [],
      minYearsExperience: 0,
      skills: [],
      mustHaves: [],
      benefits: [],
      ...rest,
    });
    if (!parsed.success) {
      console.log(`✗ ${raw.title}: ${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`);
      process.exitCode = 1;
      continue;
    }
    const place = typeof location === "string" ? { label: location } : location;
    // Use the coordinates given, or a main city's if the place names one.
    const [lat, lng] = place.lat != null && place.lng != null ? [place.lat, place.lng] : (coordsFor({ city: place.label }) ?? [null, null]);
    if (!place.label || place.label.length > 120) {
      console.log(`✗ ${raw.title}: give it a location`);
      process.exitCode = 1;
      continue;
    }

    const existing = await db.query.jobs.findFirst({
      where: and(
        eq(schema.jobs.employerId, user.id),
        eq(schema.jobs.title, parsed.data.title),
        eq(schema.jobs.status, "open"),
        isNull(schema.jobs.hiddenAt),
      ),
    });
    if (existing) {
      console.log(`– ${parsed.data.title}: already posted, skipped (/jobs/${existing.id})`);
      continue;
    }
    if (dryRun) {
      console.log(`✓ ${parsed.data.title}: ready to post`);
      continue;
    }
    const [job] = await db
      .insert(schema.jobs)
      .values({
        ...parsed.data,
        skills: normaliseSkills(parsed.data.skills),
        city: place.label,
        lat,
        lng,
        weights: normaliseWeights(weights ?? DEFAULT_WEIGHTS),
        employerId: user.id,
      })
      .returning({ id: schema.jobs.id });
    posted++;
    console.log(`✓ ${parsed.data.title}: posted (/jobs/${job.id})`);
  }
  console.log(`\n${dryRun ? "Checked" : `Posted ${posted} of`} ${data.jobs.length} job${data.jobs.length === 1 ? "" : "s"}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
