/** A company's logo (or its initials tile) in a square frame. Works in server and client components. */
export function CompanyLogo({
  employerId,
  name,
  size = "md",
  version,
  className = "",
}: {
  employerId: string;
  name: string;
  size?: "sm" | "md" | "lg";
  /** When the logo last changed. Pass it on the company's own pages so a new logo shows straight away. */
  version?: Date | number | null;
  className?: string;
}) {
  const px = { sm: 40, md: 48, lg: 72 }[size];
  const box = { sm: "size-10 rounded-md", md: "size-12 rounded-lg", lg: "size-[72px] rounded-xl" }[size];
  const v = version ? `?v=${new Date(version).getTime()}` : "";
  return (
    // A plain <img>: the route already serves small, cached files.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/logos/${employerId}${v}`}
      alt={`${name} logo`}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      className={`${box} shrink-0 border border-line bg-white object-contain ${className}`}
    />
  );
}
