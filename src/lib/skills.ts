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
  /** A specific tool that also counts as a general skill, e.g. HubSpot counts as CRM. */
  counts?: string[];
}

export const SKILL_CATALOGUE: SkillDef[] = [
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
  { name: "AI coding tools", aliases: ["claude code", "cursor", "github copilot", "ai coding agents", "ai assisted coding", "ai coding"], counts: ["AI tools"] },
  { name: "Python", aliases: ["python 3", "python scripting"] },
  { name: "pandas", aliases: ["python pandas", "data analysis in python"] },
  { name: "SQL", aliases: ["mysql", "postgresql", "postgres", "sql server", "databases"] },
  { name: "JavaScript", aliases: ["js", "node", "node js", "nodejs"] },
  { name: "TypeScript", aliases: ["ts"] },
  { name: "Git", aliases: ["github", "gitlab", "version control", "bitbucket"] },
  { name: "APIs", aliases: ["api", "rest apis", "rest api", "api integration", "api integrations", "restful apis"] },
  { name: "Workflow automation", aliases: ["automation", "process automation", "business process automation", "cron", "cron jobs", "scheduled jobs"] },
  { name: "n8n", counts: ["Workflow automation"] },
  { name: "Zapier", counts: ["Workflow automation"] },
  { name: "Make.com", aliases: ["make", "integromat"], counts: ["Workflow automation"] },
  { name: "Docker", aliases: ["containers", "docker compose"] },
  { name: "AWS", aliases: ["amazon web services"] },
  { name: "Azure", aliases: ["microsoft azure"] },
  { name: "Terraform", aliases: ["infrastructure as code", "iac"] },
  { name: "Command line", aliases: ["linux", "terminal", "bash", "shell", "cli", "unix"] },
  // "Networking" on its own could mean people or computers, so it's left to match loosely.
  { name: "Computer networking", aliases: ["tcp ip", "network fundamentals", "network administration", "tcp ip dns"] },
  { name: "MCP", aliases: ["model context protocol", "mcp servers", "mcp tools"] },
  { name: "Data analysis", aliases: ["data analytics", "analysing data", "analyzing data", "analytics"] },
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
  { name: "Business development", aliases: ["biz dev", "bd", "new business development", "growing new business"] },
  { name: "Lead generation", aliases: ["prospecting", "outbound sales", "lead gen", "finding new clients", "new business"] },
  { name: "Cold calling", aliases: ["outbound calling", "telesales", "outbound calls"] },
  { name: "Account management", aliases: ["key account management", "client management", "managing accounts", "account manager"] },
  { name: "Relationship building", aliases: ["building relationships", "relationship management", "client relationships"] },
  { name: "Negotiation", aliases: ["negotiating", "negotiation skills", "closing deals", "closing"] },
  { name: "Pipeline management", aliases: ["sales pipeline", "managing a pipeline", "pipeline"] },
  { name: "Quoting", aliases: ["quotes", "quotations", "preparing quotes", "quoting workflows"] },
  { name: "CRM", aliases: ["crm systems", "customer relationship management", "crm software"] },
  { name: "HubSpot", aliases: ["hub spot", "hubspot crm"], counts: ["CRM"] },
  { name: "Salesforce", aliases: ["sales force"], counts: ["CRM"] },
  { name: "Cin7", aliases: ["cin 7", "cin7 core", "dear inventory"] },
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
  { name: "Meta Business Suite", aliases: ["meta business", "facebook business suite", "meta ads", "facebook ads", "meta business manager", "meta ads manager", "ads manager", "facebook ads manager"], counts: ["Paid media"] },
  { name: "Canva" },
  { name: "Graphic design", aliases: ["design", "graphic designer"] },
  { name: "Adobe Photoshop", aliases: ["photoshop"] },
  { name: "Adobe Illustrator", aliases: ["illustrator"] },
  { name: "Adobe InDesign", aliases: ["indesign"] },
  { name: "Adobe Premiere Pro", aliases: ["premiere", "premiere pro"] },
  { name: "Adobe After Effects", aliases: ["after effects", "ae"] },
  {
    name: "Adobe Creative Cloud",
    aliases: ["adobe", "adobe creative suite", "adobe suite", "creative cloud", "adobe cc"],
    covers: ["Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "Adobe Premiere Pro", "Adobe After Effects"],
  },
  { name: "DaVinci Resolve", aliases: ["davinci", "resolve", "da vinci resolve"] },
  { name: "Colour grading", aliases: ["color grading", "grading", "colour correction", "color correction"] },
  { name: "Sound design", aliases: ["audio mixing", "sound mixing", "audio editing", "sound editing", "audio post production"] },
  { name: "Motion graphics", aliases: ["motion design", "animation", "2d animation"] },
  { name: "AI video tools", aliases: ["ai video", "generative video", "runway", "sora", "veo", "ai video editing"] },
  { name: "Photography", aliases: ["photos", "product photography", "photographer"] },
  { name: "Video editing", aliases: ["editing videos", "capcut", "video production", "videography"] },
  { name: "Market research", aliases: ["research", "competitor research", "consumer research", "marketing research"] },
  { name: "Digital marketing", aliases: ["online marketing"] },
  { name: "SEO", aliases: ["search engine optimisation", "search engine optimization"] },
  { name: "Google Analytics", aliases: ["ga4", "web analytics"] },
  { name: "Email marketing", aliases: ["mailchimp", "newsletters", "email campaigns"] },
  { name: "WordPress", aliases: ["word press"] },
  { name: "Shopify", aliases: ["shopify admin"] },
  { name: "Shopify Plus", counts: ["Shopify"] },
  { name: "Shopify POS", counts: ["Shopify"] },
  { name: "Liquid", aliases: ["shopify liquid", "liquid templating"] },
  { name: "HTML and CSS", aliases: ["html", "css", "html css", "html5", "css3"] },
  { name: "Paid media", aliases: ["performance marketing", "paid social", "ppc", "paid advertising", "paid ads", "media buying"] },
  { name: "Google Ads", aliases: ["adwords", "google adwords", "google ads manager"], counts: ["Paid media"] },
  { name: "TikTok Ads", aliases: ["tiktok ads manager", "tiktok advertising"], counts: ["Paid media"] },
  { name: "CRO", aliases: ["conversion rate optimisation", "conversion rate optimization", "conversion optimisation"] },
  { name: "A/B testing", aliases: ["ab testing", "a b testing", "split testing"] },
  { name: "Klaviyo", counts: ["Email marketing"] },
  { name: "Briefing", aliases: ["writing briefs", "creative briefs", "creative briefing", "brief writing"] },
  { name: "Social media strategy", aliases: ["social strategy", "content strategy", "social media strategist"] },
  { name: "Social media analytics", aliases: ["social analytics", "tiktok studio", "youtube studio", "instagram insights", "meta insights"] },
  { name: "Influencer marketing", aliases: ["creator marketing", "influencer management", "creator programme", "creator program", "influencers"] },
  { name: "Social listening" },
  { name: "YouTube", aliases: ["youtube shorts"] },
  { name: "Asana" },

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
for (const def of SKILL_CATALOGUE) {
  for (const k of [def.name, ...(def.aliases ?? [])]) BY_KEY.set(skillKey(k), def);
}
const BY_NAME = new Map(SKILL_CATALOGUE.map((d) => [d.name, d]));

export const SKILL_NAMES = SKILL_CATALOGUE.map((d) => d.name);

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
  if (mine.some((s) => BY_NAME.get(s)?.covers?.includes(target) || BY_NAME.get(s)?.counts?.includes(target))) return true;
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
  for (const def of SKILL_CATALOGUE) {
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
