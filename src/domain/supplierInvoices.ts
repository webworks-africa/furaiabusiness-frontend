export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s + "T00:00:00Z")) &&
    new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s
  );
}
export function dueFromTerms(s: string, days: number) {
  if (!validDate(s) || !Number.isInteger(days) || days < 0 || days > 180)
    throw Error("Enter a valid invoice date and 0–180 days.");
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
