/** Shared date helpers (API + lib + src). */

export function parseDateOnly(dateValue) {
  if (dateValue instanceof Date) {
    return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
  }
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateValue);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatDateOnly(dateValue) {
  const d = parseDateOnly(dateValue);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateValue, days) {
  const d = parseDateOnly(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

export function getChallengeDateForDay(challengeStartDate, day) {
  return addDays(challengeStartDate, day - 1);
}

/** Monday-based weekday index: 0=Mon … 6=Sun */
export function getWeekdayIndex(date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function daysBetween(fromDate, toDate) {
  const start = parseDateOnly(fromDate).getTime();
  const end = parseDateOnly(toDate).getTime();
  return Math.floor((end - start) / 86400000);
}
