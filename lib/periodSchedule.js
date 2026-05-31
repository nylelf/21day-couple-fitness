import { addDays, daysBetween, formatDateOnly, parseDateOnly } from "./dateUtils.js";

const CHALLENGE_DAYS = 21;
const PERIOD_BLEED_DAYS = 5;

const CYCLE_LENGTH_LABELS = {
  25: "25天",
  28: "28天",
  30: "30天",
  32: "32天",
  irregular: "不规律（按28天估算）",
};

function getCycleDays(cycleLength) {
  return cycleLength === "irregular" ? 28 : Number(cycleLength) || 28;
}

export function getNextPeriodStartOnOrAfter(challengeStartDate, lastPeriodDate, cycleLength) {
  const cycle = getCycleDays(cycleLength);
  const lastStart = parseDateOnly(lastPeriodDate);
  const challengeStart = parseDateOnly(challengeStartDate);

  let nextStart = addDays(lastStart, cycle);
  while (addDays(nextStart, PERIOD_BLEED_DAYS - 1) < challengeStart) {
    nextStart = addDays(nextStart, cycle);
  }
  return formatDateOnly(nextStart);
}

export function getPeriodDaysInChallenge(challengeStartDate, lastPeriodDate, cycleLength, totalDays = CHALLENGE_DAYS) {
  if (!lastPeriodDate) return [];

  const cycle = getCycleDays(cycleLength);
  const challengeStart = parseDateOnly(challengeStartDate || formatDateOnly(new Date()));
  const challengeEnd = addDays(challengeStart, totalDays - 1);

  let periodStart = addDays(parseDateOnly(lastPeriodDate), cycle);
  const adjustments = [];
  const seen = new Set();

  while (periodStart <= challengeEnd) {
    const periodEnd = addDays(periodStart, PERIOD_BLEED_DAYS - 1);

    if (periodEnd >= challengeStart) {
      for (let challengeDay = 1; challengeDay <= totalDays; challengeDay += 1) {
        const challengeDate = addDays(challengeStart, challengeDay - 1);
        if (challengeDate < periodStart || challengeDate > periodEnd) continue;

        const periodDay = daysBetween(periodStart, challengeDate) + 1;
        if (periodDay >= 1 && periodDay <= PERIOD_BLEED_DAYS && !seen.has(challengeDay)) {
          adjustments.push({
            challengeDay,
            periodDay,
            date: formatDateOnly(challengeDate),
            periodStartDate: formatDateOnly(periodStart),
          });
          seen.add(challengeDay);
        }
      }
    }

    periodStart = addDays(periodStart, cycle);
    if (daysBetween(challengeStart, periodStart) > totalDays + cycle) break;
  }

  return adjustments.sort((a, b) => a.challengeDay - b.challengeDay);
}

export function getPeriodDaysInRange(challengeStartDate, lastPeriodDate, cycleLength, dayStart, dayEnd) {
  return getPeriodDaysInChallenge(challengeStartDate, lastPeriodDate, cycleLength).filter(
    (item) => item.challengeDay >= dayStart && item.challengeDay <= dayEnd
  );
}

export function formatCycleLengthLabel(cycleLength) {
  return CYCLE_LENGTH_LABELS[cycleLength] || `${cycleLength}天`;
}

export function mergeDetectedIntoPeriodSchedule(analysis, detectedInRange) {
  const base = analysis || {
    summary: "",
    levelStrategy: {},
    activitySchedule: [],
    dailyDirectives: [],
  };

  if (!detectedInRange?.length) {
    return { ...base, periodSchedule: [] };
  }

  const merged = detectedInRange.map((item) => ({
    challengeDay: item.challengeDay,
    periodDay: item.periodDay,
    planDirective: `预测经期第${item.periodDay}天：瑜伽/散步/轻度拉伸，温热补铁饮食，不做大强度臀腿训练。`,
  }));

  return {
    ...base,
    periodSchedule: merged.sort((a, b) => a.challengeDay - b.challengeDay),
  };
}

export function buildPeriodHintForProfile(profile, role, challengeStartDate, dayStart, dayEnd) {
  if (role !== "female") return null;

  const lastPeriodDate = profile?.lastPeriodDate?.trim();
  if (!lastPeriodDate) {
    return {
      hasPeriodData: false,
      message: "未填写经期数据，生成时若接近经期仍适当降低强度",
    };
  }

  const cycleLength = profile?.cycleLength ?? 28;
  const nextPeriodStart = getNextPeriodStartOnOrAfter(challengeStartDate, lastPeriodDate, cycleLength);
  const allDays = getPeriodDaysInChallenge(challengeStartDate, lastPeriodDate, cycleLength);
  const rangeDays = getPeriodDaysInRange(challengeStartDate, lastPeriodDate, cycleLength, dayStart, dayEnd);

  return {
    hasPeriodData: true,
    lastPeriodDate,
    cycleLength,
    cycleLabel: formatCycleLengthLabel(cycleLength),
    nextPeriodStart,
    allDaysInChallenge: allDays,
    daysInRange: rangeDays,
    message:
      rangeDays.length > 0
        ? `挑战第 ${rangeDays.map((d) => `${d.challengeDay}天(预测经期第${d.periodDay}天)`).join("、")} 落在本次生成范围内`
        : allDays.length > 0
          ? `21天内有预测经期：${allDays.map((d) => d.challengeDay).join("、")}，但不在本次 ${dayStart}-${dayEnd} 段`
          : `推算下一次经期约从 ${nextPeriodStart} 开始，21天挑战期内无经期第1-5天重叠，本段不做经期调整`,
  };
}
