import { DAYS } from "./constants";

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

export function getDateKey(date) {
  return formatDateOnly(date);
}

export function addDays(dateValue, days) {
  const d = parseDateOnly(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

export function getChallengeDateForDay(challengeStartDate, day) {
  return addDays(challengeStartDate, day - 1);
}

export function dateDiffDays(fromDate, toDate) {
  const start = parseDateOnly(fromDate).getTime();
  const end = parseDateOnly(toDate).getTime();
  return Math.floor((end - start) / 86400000);
}

export function calcCurrentDay(challengeStartDate, totalDays = DAYS) {
  const start = parseDateOnly(challengeStartDate);
  const today = parseDateOnly(formatDateOnly(new Date()));
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return Math.min(totalDays, Math.max(1, diff + 1));
}

export function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}
