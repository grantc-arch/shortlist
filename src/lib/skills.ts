/**
 * Skills: one standard name per skill, so "MS Excel", "Excel" and "spreadsheets" all mean
 * Microsoft Excel, on both sides. Employers and candidates pick from these names as they type,
 * and anything typed freely is mapped to a standard name where one fits.
 * Skills not in the list still work: they're kept as typed and matched loosely.
 */

interface SkillDef {
  name: string;
  aliases?: string[];
  /** A suite that covers other skills, e.g. Microsoft Office covers Excel. */
  covers?: string[];
}

const CATALOGUE: SkillDef[] = [
  // Office software
  { name: "Microsoft Excel", aliases: ["excel", "spreadsheets", "spreadsheet", "excel spreadsheets", "advanced excel"] },
  { name: "Microsoft Word", aliases: ["word", "word processing"] },
  { name: "Outlook", aliases: ["microsoft outlook"] },
  { name: "PowerPoint", aliases: ["microsoft powerpoint", "ppt", "powerpoint presentations"] },
  { name: "Microsoft Teams", aliases: ["teams"] },
  {
    name: "Microsoft Office",
    aliases: ["office", "office 365", "microsoft 365", "m365", "o365", "microsoft office suite", "microsoft suite", "office suite"],
    covers: ["Microsoft Word", "Microsoft Excel", "Outlook", "PowerPoint", "Microsoft Teams"],
  },
  {
    name: "Google Workspace",
    aliases: ["g suite", "gsuite", "google suite", "google docs", "google sheets", "google drive", "gmail", "google calendar", "google slides"],
  },
  { name: "AI tools", aliases: ["ai", "chatgpt", "chat gpt", "claude", "gemini", "copilot", "microsoft copilot", "generative ai", "ai tools chatgpt claude"] },

  // Admin
  { name: "Diary management", aliases: ["diary", "calendar management", "managing diaries", "diary and calendar management", "executive diary management", "calendar"] },
  { name: "Inbox management", aliases: ["email management", "managing inboxes", "managing emails"] },
  { name: "Minute taking", aliases: ["minutes", "taking minutes", "meeting minutes"] },
  { name: "Filing", aliases: ["records management", "record keeping", "document management", "filing and records"] },
  { name: "Data capturing", aliases: ["data capture", "data entry", "typing"] },
  { name: "Travel coordination", aliases: ["travel arrangements", "travel booking", "booking travel", "travel management", "travel planning"] },
  { name: "Event coordination", aliases: ["event planning", "event management", "events", "event logistics", "event coordinator"] },
  { name: "Project coordination", aliases: ["project management", "project admin", "project administration", "projects"] },
  { name: "Process documentation", aliases: ["sops", "sop", "standard operating procedures", "writing sops", "process improvement", "documentation"] },
  { name: "Client onboarding", aliases: ["customer onboarding", "onboarding clients", "client setup"] },
  { name: "Report writing", aliases: ["reports", "reporting", "business writing"] },
  { name: "Reception", aliases: ["front desk", "receptionist", "switchboard", "front of house"] },
  { name: "Telephone etiquette", aliases: ["phone etiquette", "answering phones", "telephone skills", "telephone"] },
  { name: "Appointment booking", aliases: ["bookings", "booking appointments", "appointment scheduling", "scheduling appointments"] },

  // Customer-facing and retail
  { name: "Customer service", aliases: ["client service", "customer care", "customer support", "client relations", "customer relations", "client liaison"] },
  { name: "Sales", aliases: ["selling", "retail sales", "sales experience", "b2b sales"] },
  { name: "Cash handling", aliases: ["cashier", "till operation", "point of sale", "pos", "till"] },
  { name: "Stock control", aliases: ["inventory", "inventory management", "stock management", "stock taking", "stocktaking"] },
  { name: "Visual merchandising", aliases: ["merchandising"] },

  // Finance
  { name: "Bookkeeping", aliases: ["book keeping", "accounts", "debtors and creditors"] },
  { name: "Pastel", aliases: ["sage pastel", "pastel accounting", "pastel partner"] },
  { name: "Xero" },
  { name: "Payroll", aliases: ["payroll administration", "vip payroll"] },
  { name: "Medical aid claims", aliases: ["medical claims", "medical billing", "medical aid billing"] },

  // Marketing and content
  { name: "Copywriting", aliases: ["copy writing", "content writing", "writing copy", "social copy"] },
  { name: "Social media management", aliases: ["social media", "social media marketing", "community management", "managing social media"] },
  { name: "Social media scheduling", aliases: ["content scheduling", "scheduling posts", "post scheduling"] },
  { name: "Content creation", aliases: ["content creator", "creating content", "content production"] },
  { name: "Instagram" },
  { name: "TikTok", aliases: ["tik tok"] },
  { name: "Facebook" },
  { name: "LinkedIn", aliases: ["linked in"] },
  { name: "Meta Business Suite", aliases: ["meta business", "facebook business suite", "meta ads", "facebook ads", "meta business manager"] },
  { name: "Canva" },
  { name: "Graphic design", aliases: ["design", "graphic designer"] },
  { name: "Adobe Photoshop", aliases: ["photoshop"] },
  { name: "Adobe Illustrator", aliases: ["illustrator"] },
  { name: "Adobe InDesign", aliases: ["indesign"] },
  { name: "Adobe Premiere Pro", aliases: ["premiere", "premiere pro"] },
  {
    name: "Adobe Creative Cloud",
    aliases: ["adobe", "adobe creative suite", "adobe suite", "creative cloud", "adobe cc"],
    covers: ["Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "Adobe Premiere Pro"],
  },
  { name: "Photography", aliases: ["photos", "product photography", "photographer"] },
  { name: "Video editing", aliases: ["editing videos", "capcut", "video production", "videography"] },
  { name: "Market research", aliases: ["research", "competitor research", "consumer research", "marketing research"] },
  { name: "Digital marketing", aliases: ["online marketing"] },
  { name: "SEO", aliases: ["search engine optimisation", "search engine optimization"] },
  { name: "Google Analytics", aliases: ["ga4", "web analytics"] },
  { name: "Email marketing", aliases: ["mailchimp", "newsletters", "email campaigns"] },
  { name: "WordPress", aliases: ["word press"] },
  { name: "Shopify" },

  // Hospitality
  { name: "Barista", aliases: ["coffee making", "barista skills"] },
  { name: "Waitering", aliases: ["waiter", "waitress", "waitron", "table service", "serving"] },
  { name: "Food preparation", aliases: ["cooking", "kitchen", "food prep", "chef"] },

  // General
  { name: "Communication", aliases: ["communication skills", "written communication", "verbal communication", "written and verbal communication"] },
  { name: "Presentation skills", aliases: ["presenting", "public speaking", "presentations"] },
  { name: "Organisation", aliases: ["organisational skills", "organizational skills", "organised", "organized", "organisation skills"] },
  { name: "Time management" },
  { name: "Attention to detail", aliases: ["detail oriented", "detail orientated"] },
  { name: "Driver's licence", aliases: ["drivers licence", "drivers license", "driver's license", "driving licence", "code 8", "code b", "valid drivers licence", "valid driver's licence"] },
  { name: "Afrikaans" },
  { name: "isiXhosa", aliases: ["xhosa"] },
  { name: "isiZulu", aliases: ["zulu"] },
];

/** Lower-case, punctuation and filler words removed: the form used for comparing. */
export function skillKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9+#' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(proficient in|proficiency in|knowledge of|experience (in|with)|familiar with|strong) /, "")
    .replace(/ (skills?|proficiency)$/, "")
    .replace(/^ms /, "microsoft ")
    .trim();
}

const BY_KEY = new Map<string, SkillDef>();
for (const def of CATALOGUE) {
  for (const k of [def.name, ...(def.aliases ?? [])]) BY_KEY.set(skillKey(k), def);
}
const BY_NAME = new Map(CATALOGUE.map((d) => [d.name, d]));

export const SKILL_NAMES = CATALOGUE.map((d) => d.name);

export const isKnownSkill = (name: string) => BY_NAME.has(name);

/** The standard name for a skill, or the skill tidied up as typed if it isn't in the list. */
export function canonicalSkill(text: string): string {
  const def = BY_KEY.get(skillKey(text));
  if (def) return def.name;
  const tidy = text.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return tidy.charAt(0).toUpperCase() + tidy.slice(1);
}

/** Standard names, duplicates removed, in the order given. */
export function normaliseSkills(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (!raw.trim()) continue;
    const name = canonicalSkill(raw);
    const k = skillKey(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(name);
  }
  return out;
}

const loosely = (a: string, b: string) => {
  const x = skillKey(a);
  const y = skillKey(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

/**
 * Whether two skills are the same. Standard skills match by name; a skill that isn't in the
 * list also matches when one name contains the other ("Excel" ~ "Advanced Excel modelling").
 */
export function sameSkill(a: string, b: string): boolean {
  const x = canonicalSkill(a);
  const y = canonicalSkill(b);
  if (x === y) return true;
  if (isKnownSkill(x) && isKnownSkill(y)) return false;
  return loosely(x, y);
}

/**
 * Whether someone with `have` has the `wanted` skill. A suite counts for each program in it
 * (Microsoft Office covers Excel), and asking for a suite is met by any two of its programs.
 */
export function hasSkill(have: string[], wanted: string): boolean {
  const target = canonicalSkill(wanted);
  const mine = normaliseSkills(have);
  if (mine.some((s) => sameSkill(s, target))) return true;
  if (mine.some((s) => BY_NAME.get(s)?.covers?.includes(target))) return true;
  const covers = BY_NAME.get(target)?.covers;
  if (covers && covers.filter((c) => mine.includes(c)).length >= 2) return true;
  return false;
}

/** Suggestions for the skill picker: names first, then matches on other wordings. */
export function searchSkills(query: string, exclude: string[] = [], limit = 8): string[] {
  const q = skillKey(query);
  if (!q) return [];
  const skip = new Set(exclude.map((e) => canonicalSkill(e)));
  const scored: { name: string; rank: number }[] = [];
  for (const def of CATALOGUE) {
    if (skip.has(def.name)) continue;
    const name = skillKey(def.name);
    const aliases = (def.aliases ?? []).map(skillKey);
    const rank = name.startsWith(q)
      ? 0
      : name.split(" ").some((w) => w.startsWith(q))
        ? 1
        : aliases.some((a) => a.startsWith(q))
          ? 2
          : name.includes(q) || aliases.some((a) => a.includes(q))
            ? 3
            : -1;
    if (rank >= 0) scored.push({ name: def.name, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.name.length - b.name.length)
    .slice(0, limit)
    .map((s) => s.name);
}
