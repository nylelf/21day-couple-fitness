/**
 * Deterministic parsing of「每周其他运动」→ challenge days (calendar weekdays).
 */

import { detectActivityDays } from "./planPersonalization.js";

const WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function getDetectedActivityDaysInRange(
  profile,
  challengeStartDate,
  dayStart,
  dayEnd,
  totalDays = 21
) {
  const text = (profile?.otherActivities || "").trim();
  if (!text) return [];

  return detectActivityDays(text, challengeStartDate, totalDays).filter(
    (item) => item.day >= dayStart && item.day <= dayEnd
  );
}

export function buildActivityHintForProfile(profile, challengeStartDate, dayStart, dayEnd) {
  const text = (profile?.otherActivities || "").trim();
  if (!text) {
    return "【每周其他运动】未填写。";
  }

  const inRange = getDetectedActivityDaysInRange(profile, challengeStartDate, dayStart, dayEnd);
  const allInChallenge = detectActivityDays(text, challengeStartDate, 21);

  const rangeLines =
    inRange.length > 0
      ? inRange
          .map(
            (item) =>
              `第 ${item.day} 天（${WEEKDAY_NAMES[item.weekdayIndex]}）· ${item.label}`
          )
          .join("\n  - ")
      : "本次生成区间内未识别到星期几（请检查是否写了 周一～周日）";

  const fullLines =
    allInChallenge.length > 0
      ? allInChallenge.map((item) => `第${item.day}天(${WEEKDAY_NAMES[item.weekdayIndex]}·${item.label})`).join("、")
      : "21天内未识别到";

  return `【每周其他运动 — 系统已从原文解析（必须与 activitySchedule 一致）】
- 用户原文：「${text}」
- 挑战开始日：${challengeStartDate}
- 本段 ${dayStart}-${dayEnd} 内的运动日：
  - ${rangeLines}
- 21天全挑战内：${fullLines}

规则：上述日期在 App 内计划须为「运动日恢复」— title 含运动名、仅拉伸/泡沫轴、不做力量主训；用户当天主要进行原文中的外部运动。`;
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
      sourceText: item.label,
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
