"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CITIES } from "@/lib/constants";
import { CITY_COORDS, type Place } from "@/lib/places";
import type { PlaceSuggestion } from "@/app/api/places/route";

const PROVINCE: Record<string, string> = {
  "Cape Town": "Western Cape",
  Stellenbosch: "Western Cape",
  Paarl: "Western Cape",
  "Somerset West": "Western Cape",
  George: "Western Cape",
  Johannesburg: "Gauteng",
  Pretoria: "Gauteng",
  Durban: "KwaZulu-Natal",
  Gqeberha: "Eastern Cape",
  "East London": "Eastern Cape",
  Bloemfontein: "Free State",
};

// Main cities are suggested instantly, before (or without) the online search.
const LOCAL: PlaceSuggestion[] = CITIES.filter((c) => c !== "Other").map((c) => ({
  label: c,
  detail: PROVINCE[c] ?? "",
  lat: CITY_COORDS[c][0],
  lng: CITY_COORDS[c][1],
}));

/**
 * A location field with type-ahead suggestions for South African suburbs and towns.
 * Picking a suggestion stores its coordinates (in hidden `${name}Lat` / `${name}Lng`
 * fields) so distances can be worked out; typing your own place also works.
 */
export function PlaceInput({
  id,
  name,
  value,
  onChange,
  required,
  describedBy,
}: {
  id: string;
  name: string;
  value: Place;
  onChange: (place: Place) => void;
  required?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const abort = useRef<AbortController | null>(null);

  // Search as the person types, waiting for a short pause first.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { places: PlaceSuggestion[] };
        setRemote(data.places ?? []);
      } catch {
        // Aborted or offline: keep the instant suggestions.
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const q = query.trim().toLowerCase();
  const local = q.length >= 1 ? LOCAL.filter((p) => p.label.toLowerCase().includes(q)) : [];
  const seen = new Set<string>();
  const suggestions = [...(q.length >= 2 ? remote : []), ...local]
    .filter((p) => {
      const k = p.label.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 7);
  const showList = open && suggestions.length > 0;

  function pick(p: PlaceSuggestion) {
    onChange({ label: p.label, lat: p.lat, lng: p.lng });
    setOpen(false);
    setActive(-1);
    setQuery("");
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        className="input"
        value={value.label}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={describedBy}
        placeholder="Start typing a suburb or town"
        onChange={(e) => {
          // Typing replaces any picked place, so its coordinates no longer apply.
          onChange({ label: e.target.value, lat: null, lng: null });
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <input type="hidden" name={`${name}Lat`} value={value.lat ?? ""} />
      <input type="hidden" name={`${name}Lng`} value={value.lng ?? ""} />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border border-line bg-surface py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click, so the field doesn't lose focus and close the list first.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-sunken" : ""}`}
            >
              <span className="font-medium text-ink">{s.label}</span>
              {s.detail && <span className="text-muted"> {s.detail}</span>}
            </li>
          ))}
          <li role="presentation" className="px-3 pb-1 pt-2 text-xs text-muted">
            Places from OpenStreetMap
          </li>
        </ul>
      )}
    </div>
  );
}

/** PlaceInput that keeps its own state, for forms that don't need to read the value. */
export function PlaceField({
  id,
  name,
  defaultValue,
  required,
  describedBy,
}: {
  id: string;
  name: string;
  defaultValue?: Place;
  required?: boolean;
  describedBy?: string;
}) {
  const [value, setValue] = useState<Place>(defaultValue ?? { label: "", lat: null, lng: null });
  return <PlaceInput id={id} name={name} value={value} onChange={setValue} required={required} describedBy={describedBy} />;
}
