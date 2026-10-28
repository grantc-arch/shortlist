import { timingSafeEqual } from "node:crypto";
import { runDailyEmails } from "@/lib/digests";

// Sending a few hundred emails can take a while.
export const maxDuration = 60;

/**
 * Called once a day by Vercel Cron (vercel.json). Vercel sends CRON_SECRET as a bearer token.
 * Locally, with no CRON_SECRET set, `npm run dev` lets you call it by visiting the URL.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const given = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return new Response("Set CRON_SECRET to switch on the daily emails.", { status: 401 });
  }
  const result = await runDailyEmails();
  console.log("Daily emails:", JSON.stringify(result));
  return Response.json(result);
}
