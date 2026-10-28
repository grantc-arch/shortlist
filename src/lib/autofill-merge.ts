/**
 * Merges CV suggestions into the profile form. Only empty fields are filled,
 * so nothing a candidate typed is ever overwritten; skills are added to.
 */
import type { CvSuggestions } from "./cv-extraction";
import { parseList, skillsMatch, type Qualification } from "./matching";

export interface ProfileDraft {
  fullName: string;
  phone: string;
  city: string;
  availableFrom: string;
  willingToRelocate: boolean;
  hasOwnTransport: boolean;
  qualificationLevel: Qualification;
  fieldOfStudy: string;
  yearsExperience: number;
  skills: string; // comma-separated, as typed in the form
  summary: string;
}

export type DraftField = keyof ProfileDraft;

export function mergeSuggestions(draft: ProfileDraft, s: CvSuggestions): { draft: ProfileDraft; filled: DraftField[] } {
  const next = { ...draft };
  const filled: DraftField[] = [];
  const fillText = (key: "fullName" | "phone" | "city" | "fieldOfStudy" | "summary") => {
    const value = s[key];
    if (value && !draft[key].trim()) {
      next[key] = value;
      filled.push(key);
    }
  };

  fillText("fullName");
  fillText("phone");
  fillText("city");
  fillText("fieldOfStudy");
  fillText("summary");

  if (s.qualificationLevel && s.qualificationLevel !== "none" && draft.qualificationLevel === "none") {
    next.qualificationLevel = s.qualificationLevel;
    filled.push("qualificationLevel");
  }
  if (s.yearsExperience && s.yearsExperience > 0 && !draft.yearsExperience) {
    next.yearsExperience = s.yearsExperience;
    filled.push("yearsExperience");
  }
  if (s.hasOwnTransport === true && !draft.hasOwnTransport) {
    next.hasOwnTransport = true;
    filled.push("hasOwnTransport");
  }

  const current = parseList(draft.skills);
  const added = s.skills.filter((skill) => !current.some((c) => skillsMatch(c, skill)));
  if (added.length > 0) {
    next.skills = [...current, ...added].slice(0, 30).join(", ");
    filled.push("skills");
  }

  return { draft: next, filled };
}
