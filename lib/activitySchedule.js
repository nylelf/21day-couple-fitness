/**
 * Deterministic parsing of「每周其他运动」→ challenge days (calendar weekdays).
 */

import {
  detectActivityDaysFromProfile,
  formatWeeklyActivitiesText,
  normalizeWeeklyActivities,
  WEEKDAY_LABELS,
  buildWeeklyActivitiesPromptLines,
} from "./weeklyActivities.js";

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

  const existing = new Set(
    (analysis?.activitySchedule || []).map((item) => item.challengeDay)
  );

  const merged = [...(analysis?.activitySchedule || [])];
  for (const item of detectedInRange) {
    if (existing.has(item.day)) continue;
    merged.push({
      challengeDay: item.day,
      activity: item.label,
      sourceText: `${WEEKDAY_LABELS[item.weekdayIndex]}：${item.label}`,
      planDirective: `第${item.day}天用户进行「${item.label}」，App 内仅安排拉伸恢复，不做力量训练。`,
    });
  }

  if (!analysis) {
    return {
      summary: "",
      levelStrategy: {},
      periodSchedule: [],
      activitySchedule: merged,
      dailyDirectives: [],
    };
  }

  return { ...analysis, activitySchedule: merged.sort((a, b) => a.challengeDay - b.challengeDay) };
}
