import { DAYS } from "./constants";
import { dayKey } from "./challenge";
import { getBasePlan } from "./plans";
import { normalizePreferenceProfile } from "./preferenceProfile";
import { finalizePlansWithProfile } from "../lib/planPersonalization.js";
import {
  buildWeekReview,
  formatPriorPlansForPrompt,
  formatWeekReviewForPrompt,
  summarizePriorPlans,
} from "./weekReview";
import { isStoredAiDayPlan, PLAN_CHUNKS } from "./planMeta";

/** Shown when the partner role has not joined yet (empty plan slot). */
const PLAN_PARTNER_JOIN_PLACEHOLDER = {
  pending: true,
  title: "等你的搭子加入后，这里会出现 TA 的专属计划；你先专注完成自己的第 1–7 天就好 ✨",
  workouts: [],
  habits: [],
};

const PLAN_API_RETRIES = 2;
const PLAN_API_RETRY_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Encouraging copy for days not yet generated (week 2 / week 3). */
export function createFuturePendingPlan(day) {
  if (day <= 7) {
    return {
      pending: true,
      title: "正在根据你的偏好准备第 1–7 天计划，请稍候…",
      workouts: [],
      habits: [],
    };
  }
  if (day <= 14) {
    return {
      pending: true,
      title:
        "坚持得很好！完成第 1 周打卡后，第 8–14 天会根据你的训练表现自动生成，越认真越懂你 💪",
      workouts: [],
      habits: [],
    };
  }
  return {
    pending: true,
    title:
      "第 2 周打卡满后，第 15–21 天将为你进阶定制。继续冲，终点就在前面！🎯",
    workouts: [],
    habits: [],
  };
}

export function getPendingPlanForDay(day) {
  const safeDay = Math.min(DAYS, Math.max(1, Number(day) || 1));
  return createFuturePendingPlan(safeDay);
}

export function createPendingPlan() {
  return { ...PLAN_PARTNER_JOIN_PLACEHOLDER };
}

export function buildPendingPlansFromDay(fromDay) {
  const plans = {};
  const start = Math.min(DAYS, Math.max(1, Number(fromDay) || 8));
  for (let day = start; day <= DAYS; day += 1) {
    plans[dayKey(day)] = createFuturePendingPlan(day);
  }
  return plans;
}

export function buildAllPendingPlans() {
  const plans = {};
  for (let day = 1; day <= DAYS; day += 1) {
    plans[dayKey(day)] = createPendingPlan();
  }
  return plans;
}

function buildFallbackPlansForRange(role, challengeStartDate, dayStart, dayEnd, preferenceProfile) {
  const normalizedProfile = normalizePreferenceProfile(preferenceProfile, "", role);
  const plans = {};
  for (let day = dayStart; day <= dayEnd; day += 1) {
    plans[dayKey(day)] = getBasePlan(role, day, challengeStartDate, normalizedProfile);
  }
  return finalizePlansWithProfile(plans, normalizedProfile, role, challengeStartDate, dayStart, dayEnd);
}

function fillMissingPlanDaysInRange(plans, role, challengeStartDate, dayStart, dayEnd, preferenceProfile) {
  const normalizedProfile = normalizePreferenceProfile(preferenceProfile, "", role);
  const filled = { ...(plans || {}) };
  for (let day = dayStart; day <= dayEnd; day += 1) {
    const key = dayKey(day);
    if (!isStoredAiDayPlan(filled[key])) {
      filled[key] = getBasePlan(role, day, challengeStartDate, normalizedProfile);
    }
  }
  return finalizePlansWithProfile(filled, normalizedProfile, role, challengeStartDate, dayStart, dayEnd);
}

function mergeWeekOnePlans(role, challengeStartDate, chunkPlans, usedFallback, preferenceProfile) {
  const weekOne = usedFallback
    ? buildFallbackPlansForRange(role, challengeStartDate, 1, 7, preferenceProfile)
    : fillMissingPlanDaysInRange(chunkPlans, role, challengeStartDate, 1, 7, preferenceProfile);
  return { ...buildPendingPlansFromDay(8), ...weekOne };
}

async function requestGeneratedPlanChunk(
  role,
  preferenceProfile,
  challengeStartDate,
  dayStart,
  dayEnd,
  iterativeContext = null
) {
  const normalizedProfile = normalizePreferenceProfile(preferenceProfile, "", role);
  let lastError = new Error("计划生成失败");

  for (let attempt = 0; attempt < PLAN_API_RETRIES; attempt += 1) {
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          preferenceProfile: normalizedProfile,
          challengeStartDate,
          dayStart,
          dayEnd,
          iterativeContext,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `计划生成失败 (${response.status})`);
      }
      if (!data.plans || typeof data.plans !== "object") {
        throw new Error("计划生成失败");
      }
      if (!isStoredAiDayPlan(data.plans[dayKey(dayStart)])) {
        throw new Error(`第 ${dayStart}–${dayEnd} 天计划不完整`);
      }
      return finalizePlansWithProfile(
        data.plans,
        normalizedProfile,
        role,
        challengeStartDate,
        dayStart,
        dayEnd
      );
    } catch (err) {
      lastError = err;
      if (attempt < PLAN_API_RETRIES - 1) {
        await sleep(PLAN_API_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

export async function generatePlanChunkForRole(challenge, role, chunk) {
  const preferenceProfile = challenge.users?.[role]?.preferenceProfile;
  let iterativeContext = null;

  if (chunk.start > 1) {
    const priorStart = chunk.start - 7;
    const priorEnd = chunk.start - 1;
    const weekReview = buildWeekReview(challenge, role, priorStart, priorEnd);
    const priorWeekPlans = summarizePriorPlans(challenge.plans?.[role], priorStart, priorEnd);
    iterativeContext = {
      weekReviewText: formatWeekReviewForPrompt(weekReview),
      priorPlansText: formatPriorPlansForPrompt(priorWeekPlans),
    };
  }

  try {
    const plans = await requestGeneratedPlanChunk(
      role,
      preferenceProfile,
      challenge.challengeStartDate,
      chunk.start,
      chunk.end,
      iterativeContext
    );
    return {
      plans: fillMissingPlanDaysInRange(
        plans,
        role,
        challenge.challengeStartDate,
        chunk.start,
        chunk.end,
        preferenceProfile
      ),
      usedFallback: false,
      fallbackError: null,
    };
  } catch (err) {
    return {
      plans: buildFallbackPlansForRange(
        role,
        challenge.challengeStartDate,
        chunk.start,
        chunk.end,
        preferenceProfile
      ),
      usedFallback: true,
      fallbackError: err?.message || "计划生成失败",
    };
  }
}

export async function resolveRolePlansInitial(role, preferenceProfile, challengeStartDate, callbacks = {}) {
  const chunk = PLAN_CHUNKS[0];
  const { onChunkComplete, onProgressUpdate } = callbacks;

  onProgressUpdate?.(30, chunk);

  try {
    const chunkPlans = await requestGeneratedPlanChunk(
      role,
      preferenceProfile,
      challengeStartDate,
      chunk.start,
      chunk.end
    );
    const merged = mergeWeekOnePlans(role, challengeStartDate, chunkPlans, false, preferenceProfile);
    onProgressUpdate?.(100, chunk, { ...merged });
    await onChunkComplete?.(chunk, chunkPlans, { ...merged });
    return { plans: merged, usedFallback: false, generatedThrough: 7, fallbackError: null };
  } catch (err) {
    const fallback = mergeWeekOnePlans(role, challengeStartDate, null, true, preferenceProfile);
    onProgressUpdate?.(100, chunk, { ...fallback });
    await onChunkComplete?.(chunk, fallback, { ...fallback });
    return {
      plans: fallback,
      usedFallback: true,
      generatedThrough: 7,
      fallbackError: err?.message || "计划生成失败",
    };
  }
}

export async function resolveRolePlans(role, preferenceProfile, challengeStartDate, callbacks = {}) {
  try {
    return await resolveRolePlansInitial(role, preferenceProfile, challengeStartDate, callbacks);
  } catch (err) {
    return {
      plans: mergeWeekOnePlans(role, challengeStartDate, null, true, preferenceProfile),
      usedFallback: true,
      generatedThrough: 7,
      fallbackError: err?.message || "计划生成失败",
    };
  }
}
