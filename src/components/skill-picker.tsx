"use client";

import { useId, useRef, useState } from "react";
import { canonicalSkill, isKnownSkill, normaliseSkills, searchSkills, skillKey } from "@/lib/skills";

type Option = { name: string; custom: boolean };

/**
 * Skills as removable tags. Typing suggests standard skill names (so employers and
 * candidates use the same words); Enter or a comma adds what's typed, matched to a
 * standard name where one fits. The value is sent as a comma-separated `name` field.
 */
export function SkillPicker({
  id,
  name,
  value,
  onChange,
  max = 30,
  placeholder = "Start typing a skill, e.g. Excel",
  describedBy,
}: {
  id: string;
  name: string;
  value: string[];
  onChange: (skills: string[]) => void;
  max?: number;
  placeholder?: string;
  describedBy?: string;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const full = value.length >= max;
  const typed = query.trim();
  const exact = typed ? canonicalSkill(typed) : "";
  const chosen = new Set(value.map(skillKey));
  const options: Option[] = [];
  if (typed && isKnownSkill(exact) && !chosen.has(skillKey(exact))) options.push({ name: exact, custom: false });
  for (const s of searchSkills(typed, value, 7)) if (s !== exact) options.push({ name: s, custom: false });
  if (typed && !isKnownSkill(exact) && !chosen.has(skillKey(exact))) options.push({ name: exact, custom: true });
  const showList = open && options.length > 0 && !full;

  function add(raw: string[]) {
    const next = normaliseSkills([...value, ...raw]).slice(0, max);
    if (next.length !== value.length) onChange(next);
    setQuery("");
    setActive(-1);
  }
  const remove = (skill: string) => onChange(value.filter((s) => s !== skill));

  return (
    <div className="relative">
      <div
        className="input flex min-h-[2.75rem] cursor-text flex-wrap items-center gap-1.5 py-1.5 focus-within:border-ink-2 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_12%,transparent)]"
        onClick={() => input.current?.focus()}
      >
        {value.map((skill) => (
          <span key={skill} className="inline-flex items-center gap-1 rounded bg-sunken py-0.5 pr-1 pl-2 text-sm text-ink">
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              className="rounded px-1 leading-none text-muted hover:bg-line hover:text-ink"
              onClick={(e) => {
                e.stopPropagation();
                remove(skill);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={input}
          id={id}
          value={query}
          disabled={full}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={describedBy}
          placeholder={full ? `That's the maximum of ${max}` : value.length ? "Add another" : placeholder}
          className="skill-input min-w-[10rem] flex-1 border-0 bg-transparent p-0.5 text-[0.9375rem]"
          onChange={(e) => {
            const text = e.target.value;
            // Pasting or typing a comma adds everything before it.
            if (text.includes(",")) {
              const parts = text.split(",");
              add(parts.slice(0, -1));
              setQuery(parts.at(-1)!.trimStart());
            } else {
              setQuery(text);
            }
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          // Adding on blur means a typed skill isn't lost if the person moves straight on.
          onBlur={() => {
            setOpen(false);
            if (typed) add([typed]);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && showList) {
              e.preventDefault();
              setActive((a) => (a + 1) % options.length);
            } else if (e.key === "ArrowUp" && showList) {
              e.preventDefault();
              setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
            } else if (e.key === "Enter") {
              // Enter adds a skill rather than submitting the form.
              if (typed || (showList && active >= 0)) e.preventDefault();
              if (showList && active >= 0) add([options[active].name]);
              else if (typed) add([typed]);
            } else if (e.key === "Backspace" && !query && value.length) {
              remove(value[value.length - 1]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      <input type="hidden" name={name} value={value.join(", ")} />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line bg-surface py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        >
          {options.map((o, i) => (
            <li
              key={`${o.custom}-${o.name}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                add([o.name]);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-sunken" : ""}`}
            >
              {o.custom ? (
                <span className="text-ink-2">
                  Add “<span className="font-medium text-ink">{o.name}</span>” as written
                </span>
              ) : (
                <span className="font-medium text-ink">{o.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** SkillPicker that keeps its own state, for forms that don't need to read the value. */
export function SkillField({
  id,
  name,
  defaultValue = [],
  max,
  describedBy,
}: {
  id: string;
  name: string;
  defaultValue?: string[];
  max?: number;
  describedBy?: string;
}) {
  const [value, setValue] = useState(() => normaliseSkills(defaultValue));
  return <SkillPicker id={id} name={name} value={value} onChange={setValue} max={max} describedBy={describedBy} />;
}
