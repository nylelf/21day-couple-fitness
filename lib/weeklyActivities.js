/**
 * Structured weekly other-activities (Mon–Sun) + challenge-day scheduling.
 */

import { cleanActivityLabel, parseActivityClauses } from "./activityParsing.js";
import { addDays, formatDateOnly, getWeekdayIndex, parseDateOnly } from "./dateUtils.js";

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

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

export function detectActivityDaysFromProfile(profile, challengeStartDate, totalDays = 21) {
  const weekly = normalizeWeeklyActivities(
    profile?.weeklyActivities,
    profile?.otherActivities
  );
  const start = parseDateOnly(challengeStartDate || formatDateOnly(new Date()));
  const days = [];
  const seen = new Set();

  for (let day = 1; day <= totalDays; day += 1) {
    const d = addDays(start, day - 1);
    const weekdayIndex = getWeekdayIndex(d);
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

export function getDetectedActivityDaysInRange(
  profile,
  challengeStartDate,
  dayStart,
  dayEnd,
  totalDays = 21
) {
  return detectActivityDaysFromProfile(profile, challengeStartDate, totalDays).filter(
    (item) => item.day >= dayStart && item.day <= dayEnd
  );
}

export function buildActivityHintForProfile(profile, challengeStartDate, dayStart, dayEnd) {
  const weekly = normalizeWeeklyActivities(profile?.weeklyActivities, profile?.otherActivities);
  const summary = formatWeeklyActivitiesText(weekly);

  if (!summary) {
    return "【每周其他运动】未勾选任何日期。";
  }

  const inRange = getDetectedActivityDaysInRange(profile, challengeStartDate, dayStart, dayEnd);
  const allInChallenge = detectActivityDaysFromProfile(profile, challengeStartDate, 21);

  const rangeLines =
    inRange.length > 0
      ? inRange
          .map(
            (item) =>
              `第 ${item.day} 天（${WEEKDAY_LABELS[item.weekdayIndex]}）· ${item.label}`
          )
          .join("\n  - ")
      : "本次生成区间内无勾选的运动日";

  const fullLines =
    allInChallenge.length > 0
      ? allInChallenge.map((item) => `第${item.day}天(${WEEKDAY_LABELS[item.weekdayIndex]}·${item.label})`).join("、")
      : "21天内未识别到";

  return `【每周其他运动 — 用户勾选（activitySchedule 必须与下列推算一致）】
- 挑战开始日：${challengeStartDate}
- 用户填写：
  - ${buildWeeklyActivitiesPromptLines(weekly)}
- 本段 ${dayStart}-${dayEnd} 内的运动日：
  - ${rangeLines}
- 21天全挑战内：${fullLines}

规则：上述日期在 App 内计划须为「运动日恢复」— title 含运动名、仅拉伸/泡沫轴、不做力量主训。`;
}

export function mergeDetectedIntoActivitySchedule(analysis, detectedInRange) {
  if (!detectedInRange?.length) return analysis;

  const merged = detectedInRange.map((item) => ({
    challengeDay: item.day,
    activity: item.label,
    sourceText: `${WEEKDAY_LABELS[item.weekdayIndex]}：${item.label}`,
    planDirective: `第${item.day}天用户进行「${item.label}」，App 内仅安排拉伸恢复，不做力量训练。`,
  }));

  const base = analysis || {
    summary: "",
    levelStrategy: {},
    periodSchedule: [],
    dailyDirectives: [],
  };

  return {
    ...base,
    activitySchedule: merged.sort((a, b) => a.challengeDay - b.challengeDay),
  };
}
