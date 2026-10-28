/** Addresses on the reserved example domains (the demo accounts) can't receive mail, so they're skipped. */
export function isUndeliverable(address: string): boolean {
  const domain = address.split("@").pop()?.toLowerCase() ?? "";
  return /(^|\.)example\.(com|org|net)$/.test(domain);
}
