/**
 * Legacy free-text + label cleanup for weekly sports (used by weeklyActivities migration).
 */

import { addDays, getWeekdayIndex, parseDateOnly } from "./dateUtils.js";

const WEEKDAY_DETECT = [
  { tokens: ["周一", "星期一", "monday"], index: 0 },
  { tokens: ["周二", "星期二", "tuesday"], index: 1 },
  { tokens: ["周三", "星期三", "wednesday"], index: 2 },
  { tokens: ["周四", "星期四", "thursday"], index: 3 },
  { tokens: ["周五", "星期五", "friday"], index: 4 },
  { tokens: ["周六", "星期六", "saturday"], index: 5 },
  { tokens: ["周日", "星期天", "星期日", "周天", "sunday"], index: 6 },
];

const WEEKDAY_CHAR_TO_INDEX = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 };

function parseWeekdayIndicesFromText(text) {
  const indices = new Set();
  const lower = text.toLowerCase();

  for (const match of text.matchAll(/周([一二三四五六日天])/g)) {
    const idx = WEEKDAY_CHAR_TO_INDEX[match[1]];
    if (idx !== undefined) indices.add(idx);
  }
  for (const match of text.matchAll(/星期([一二三四五六日])/g)) {
    const idx = WEEKDAY_CHAR_TO_INDEX[match[1]];
    if (idx !== undefined) indices.add(idx);
  }
  for (const match of text.matchAll(/礼拜([一二三四五六日])/g)) {
    const idx = WEEKDAY_CHAR_TO_INDEX[match[1]];
    if (idx !== undefined) indices.add(idx);
  }

  for (const entry of WEEKDAY_DETECT) {
    for (const token of entry.tokens) {
      if (/^周|星期|礼拜/.test(token)) continue;
      if (lower.includes(token.toLowerCase())) indices.add(entry.index);
    }
  }

  return [...indices];
}

export function cleanActivityLabel(raw) {
  let label = String(raw || "")
    .replace(/周[一二三四五六日天]/g, " ")
    .replace(/星期[一二三四五六日]/g, " ")
    .replace(/礼拜[一二三四五六日]/g, " ")
    .replace(/每周|每个|固定|去|有|和|与|及/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  label = label.replace(/^(晚上|傍晚|下午|早上|上午|中午|课后|后)\s*/g, "").trim();
  label = label.replace(/[、，,；;。\s]+$/g, "").trim();
  return label || "其他运动";
}

export function parseActivityClauses(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/[；;，,、\n]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts
      .map((clause) => ({
        weekdayIndices: parseWeekdayIndicesFromText(clause),
        label: cleanActivityLabel(clause),
      }))
      .filter((clause) => clause.weekdayIndices.length > 0);
  }

  const weekdayIndices = parseWeekdayIndicesFromText(trimmed);
  if (!weekdayIndices.length) return [];

  return [{ weekdayIndices, label: cleanActivityLabel(trimmed) }];
}
