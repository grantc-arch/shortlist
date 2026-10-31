"use client";

import { useRef, useState, useTransition } from "react";
import { removeCompanyLogo, uploadCompanyLogo } from "@/app/actions/employer";
import { CompanyLogo } from "@/components/company-logo";
import { LOGO_SIZE } from "@/lib/logos";

const MAX_PICK_BYTES = 5 * 1024 * 1024;

/** Draws the picked image at most LOGO_SIZE px on its longest side and returns it as WebP (or PNG if the browser can't). */
async function resize(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // Some SVGs have no size of their own; treat them as square.
    const w = img.naturalWidth || LOGO_SIZE;
    const h = img.naturalHeight || LOGO_SIZE;
    const scale = Math.min(1, LOGO_SIZE / Math.max(w, h)) || 1;
    const fit = file.type === "image/svg+xml" ? LOGO_SIZE / Math.max(w, h) : scale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * fit));
    canvas.height = Math.max(1, Math.round(h * fit));
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.9));
    if (!blob) throw new Error("encode");
    const ext = blob.type === "image/webp" ? "webp" : "png";
    return new File([blob], `logo.${ext}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LogoField({
  employerId,
  companyName,
  initialVersion,
}: {
  employerId: string;
  companyName: string;
  initialVersion: number | null;
}) {
  const [hasLogo, setHasLogo] = useState(initialVersion !== null);
  // Changes on every upload or removal, so the preview reloads.
  const [version, setVersion] = useState<number>(initialVersion ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSaved(null);
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return setError("Use a PNG, JPG, WebP or SVG image.");
    if (file.size > MAX_PICK_BYTES) return setError("That image is over 5 MB. Try a smaller file.");
    let small: File;
    try {
      small = await resize(file);
    } catch {
      return setError("That image couldn't be read. Try saving it as a PNG or JPG.");
    }
    const data = new FormData();
    data.set("logo", small);
    startTransition(async () => {
      const res = await uploadCompanyLogo(data);
      if (res?.error) return setError(res.error);
      setHasLogo(true);
      setVersion(res?.updatedAt ?? Date.now());
      setSaved("Logo saved. It now shows on your jobs and company page.");
    });
  };

  return (
    <section className="section mt-8" aria-labelledby="logo-heading">
      <h2 id="logo-heading" className="text-lg font-semibold">Logo</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <CompanyLogo employerId={employerId} name={companyName} size="lg" version={version || null} />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={pending} onClick={() => input.current?.click()}>
              {pending ? "Saving…" : hasLogo ? "Change logo" : "Upload logo"}
            </button>
            {hasLogo && (
              <button
                type="button"
                className="btn"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    await removeCompanyLogo();
                    setHasLogo(false);
                    setVersion(Date.now());
                    setSaved("Logo removed. Your initials show instead.");
                  })
                }
              >
                Remove
              </button>
            )}
          </div>
          <p className="hint">PNG, JPG, WebP or SVG. Square logos with a transparent or white background look best.</p>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          tabIndex={-1}
          aria-label="Logo file"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-bad" role="alert">{error}</p>}
      {saved && <p className="mt-3 text-sm text-good" role="status">{saved}</p>}
    </section>
  );
}
