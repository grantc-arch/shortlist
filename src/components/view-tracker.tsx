"use client";

import { useEffect } from "react";

/** Tells the server this job was viewed, once per browser tab. */
export function ViewTracker({ jobId }: { jobId: string }) {
  useEffect(() => {
    const key = `viewed:${jobId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage can be blocked; count the view anyway.
    }
    const url = `/api/jobs/${jobId}/view`;
    if (!navigator.sendBeacon?.(url)) fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [jobId]);
  return null;
}
