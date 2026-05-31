/**
 * Structured weekly other-activities (Mon–Sun checkbox + activity name).
 */

import { cleanActivityLabel, parseActivityClauses } from "./planPersonalization.js";

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function parseDateOnlyLocal(dateValue) {
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateValue);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function addDaysLocal(dateValue, days) {
  const d = parseDateOnlyLocal(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

export function createEmptyWeeklyActivities() {
  return WEEKDAY_LABELS.map(() => ({ enabled: false, activity: "" }));
}

function normalizeSlot(raw, index) {
  if (raw && typeof raw === "object") {
    return {
      enabled: Boolean(raw.enabled),
      activity: String(raw.activity || "").trim(),
    };
  }
  if (typeof raw === "string" && raw.trim()) {
    return { enabled: true, activity: raw.trim() };
  }
  return createEmptyWeeklyActivities()[index];
}

/** Normalize to 7 slots; migrate legacy free-text otherActivities when needed. */
export function normalizeWeeklyActivities(weeklyRaw, legacyText = "") {
  let weekly = createEmptyWeeklyActivities();

  if (Array.isArray(weeklyRaw) && weeklyRaw.length) {
    for (let i = 0; i < 7; i += 1) {
      weekly[i] = normalizeSlot(weeklyRaw[i], i);
    }
    return weekly;
  }

  const text = String(legacyText || "").trim();
  if (text) {
    const clauses = parseActivityClauses(text);
    for (const clause of clauses) {
      for (const weekdayIndex of clause.weekdayIndices) {
        if (weekdayIndex >= 0 && weekdayIndex < 7) {
          weekly[weekdayIndex] = { enabled: true, activity: clause.label };
        }
      }
    }
  }

  return weekly;
}

function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Human-readable summary for prompts / profile summary (backward compatible). */
export function formatWeeklyActivitiesText(weekly) {
  const normalized = normalizeWeeklyActivities(weekly);
  return normalized
    .map((slot, index) => {
      if (!slot.enabled || !slot.activity) return "";
      return `${WEEKDAY_LABELS[index]}：${slot.activity}`;
    })
    .filter(Boolean)
    .join("；");
}

export function hasWeeklyActivities(weekly) {
  return normalizeWeeklyActivities(weekly).some((slot) => slot.enabled && slot.activity);
}

/** Map profile → challenge days with external sport (deterministic). */
export function detectActivityDaysFromProfile(profile, challengeStartDate, totalDays = 21) {
  const weekly = normalizeWeeklyActivities(
    profile?.weeklyActivities,
    profile?.otherActivities
  );
  const start = parseDateOnlyLocal(challengeStartDate || formatDateOnly(new Date()));
  const days = [];
  const seen = new Set();

  for (let day = 1; day <= totalDays; day += 1) {
    const d = addDaysLocal(start, day - 1);
    const weekdayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const slot = weekly[weekdayIndex];
    if (!slot?.enabled || !slot.activity.trim() || seen.has(day)) continue;

    days.push({
      day,
      weekdayIndex,
      label: cleanActivityLabel(slot.activity),
    });
    seen.add(day);
  }

  return days;
}

export function buildWeeklyActivitiesPromptLines(weekly) {
  const normalized = normalizeWeeklyActivities(weekly);
  const lines = normalized
    .filter((slot) => slot.enabled && slot.activity)
    .map((slot, index) => `${WEEKDAY_LABELS[index]}：${slot.activity}`);
  return lines.length ? lines.join("\n  - ") : "（未勾选）";
}
