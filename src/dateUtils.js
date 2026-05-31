import { DAYS } from "./constants";

export {
  addDays,
  formatDateOnly,
  getChallengeDateForDay,
  parseDateOnly,
} from "../lib/dateUtils.js";

import { formatDateOnly, parseDateOnly } from "../lib/dateUtils.js";

export function getDateKey(date) {
  return formatDateOnly(date);
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
