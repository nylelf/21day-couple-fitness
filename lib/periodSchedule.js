const CHALLENGE_DAYS = 21;

const CYCLE_LENGTH_LABELS = {
  25: "25天",
  28: "28天",
  30: "30天",
  32: "32天",
  irregular: "不规律（按28天估算）",
};

function parseDateOnly(dateValue) {
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateValue);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDateOnly(dateValue) {
  const d = parseDateOnly(dateValue);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateValue, days) {
  const d = parseDateOnly(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(fromDate, toDate) {
  const start = parseDateOnly(fromDate).getTime();
  const end = parseDateOnly(toDate).getTime();
  return Math.floor((end - start) / 86400000);
}

/**
 * Maps challenge days 1–21 that fall on menstrual period days 1–5 of a cycle.
 */
export function getPeriodDaysInChallenge(challengeStartDate, lastPeriodDate, cycleLength, totalDays = CHALLENGE_DAYS) {
  if (!lastPeriodDate) return [];

  const cycle = cycleLength === "irregular" ? 28 : Number(cycleLength) || 28;
  const challengeStart = parseDateOnly(challengeStartDate || formatDateOnly(new Date()));
  const challengeEnd = addDays(challengeStart, totalDays - 1);

  let periodStart = parseDateOnly(lastPeriodDate);
  while (addDays(periodStart, cycle) <= addDays(challengeStart, -cycle)) {
    periodStart = addDays(periodStart, cycle);
  }
  while (addDays(periodStart, -cycle) >= addDays(challengeStart, -cycle)) {
    periodStart = addDays(periodStart, -cycle);
  }

  const adjustments = [];
  for (let challengeDay = 1; challengeDay <= totalDays; challengeDay += 1) {
    const challengeDate = addDays(challengeStart, challengeDay - 1);
    let cursor = parseDateOnly(periodStart);

    while (cursor <= challengeEnd) {
      const periodDay = daysBetween(cursor, challengeDate) + 1;
      if (periodDay >= 1 && periodDay <= 5) {
        adjustments.push({
          challengeDay,
          periodDay,
          date: formatDateOnly(challengeDate),
        });
        break;
      }
      cursor = addDays(cursor, cycle);
    }
  }

  return adjustments;
}

export function getPeriodDaysInRange(challengeStartDate, lastPeriodDate, cycleLength, dayStart, dayEnd) {
  return getPeriodDaysInChallenge(challengeStartDate, lastPeriodDate, cycleLength).filter(
    (item) => item.challengeDay >= dayStart && item.challengeDay <= dayEnd
  );
}

export function formatCycleLengthLabel(cycleLength) {
  return CYCLE_LENGTH_LABELS[cycleLength] || `${cycleLength}天`;
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
  const allDays = getPeriodDaysInChallenge(challengeStartDate, lastPeriodDate, cycleLength);
  const rangeDays = getPeriodDaysInRange(challengeStartDate, lastPeriodDate, cycleLength, dayStart, dayEnd);

  return {
    hasPeriodData: true,
    lastPeriodDate,
    cycleLength,
    cycleLabel: formatCycleLengthLabel(cycleLength),
    allDaysInChallenge: allDays,
    daysInRange: rangeDays,
    message:
      rangeDays.length > 0
        ? `挑战第 ${rangeDays.map((d) => `${d.challengeDay}天(经期第${d.periodDay}天)`).join("、")} 落在本次生成范围内`
        : allDays.length > 0
          ? `21天挑战内有经期日：${allDays.map((d) => d.challengeDay).join("、")}，但不在本次 ${dayStart}-${dayEnd} 段`
          : "根据上次经期与周期推算，21天挑战期内无经期第1-5天重叠",
  };
}
