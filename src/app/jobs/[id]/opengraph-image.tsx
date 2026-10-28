import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getJob } from "@/lib/queries";
import { formatSalary } from "@/lib/format";
import { EMPLOYMENT_LABELS, WORKPLACE_LABELS } from "@/lib/constants";

// The preview card shown when a job link is shared on LinkedIn, WhatsApp, Slack and so on.
export const alt = "Job opening on Shortlist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const FIT = ["#1f5e57", "#4b978a", "#8cc4b6", "#d39d3c", "#6c7db6"];

// The site's typeface, as .woff (the image renderer can't read .woff2). Bundled via next.config.ts.
const fontDir = join(process.cwd(), "assets/fonts");
const font = (weight: 400 | 600 | 800) => readFile(join(fontDir, `schibsted-grotesk-latin-${weight}-normal.woff`));

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const [row, regular, semibold, extrabold] = await Promise.all([
    getJob((await params).id),
    font(400),
    font(600),
    font(800),
  ]);
  const title = row?.job.title ?? "Job opening";
  const company = row?.employer.companyName ?? "Shortlist";
  const facts = row
    ? [
        row.job.city,
        WORKPLACE_LABELS[row.job.workplace],
        EMPLOYMENT_LABELS[row.job.employmentType],
        formatSalary(row.job.salaryMin, row.job.salaryMax),
      ].filter(Boolean)
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f2f5f4",
          color: "#142b29",
          padding: "72px 80px",
          fontFamily: "Schibsted Grotesk",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, fontSize: 34, fontWeight: 800 }}>
          {FIT.map((c, i) => (
            <div key={c} style={{ width: 10, height: 18 + i * 7, background: c, borderRadius: 2 }} />
          ))}
          <div style={{ marginLeft: 14 }}>Shortlist</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 32 ? 64 : 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
          <div style={{ fontSize: 40, color: "#3c524f", marginTop: 18 }}>{company}</div>
          <div style={{ display: "flex", gap: 28, fontSize: 30, color: "#3c524f", marginTop: 28 }}>
            {facts.map((f) => (
              <div key={f}>{f}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#b3305b", fontWeight: 600 }}>
          See your match score before you apply
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Schibsted Grotesk", data: regular, weight: 400, style: "normal" },
        { name: "Schibsted Grotesk", data: semibold, weight: 600, style: "normal" },
        { name: "Schibsted Grotesk", data: extrabold, weight: 800, style: "normal" },
      ],
    },
  );
}
