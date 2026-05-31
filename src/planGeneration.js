import { DAYS } from "./constants";
import { dayKey } from "./challenge";
import { getBasePlan } from "./plans";
import { normalizePreferenceProfile, createDefaultPreferenceProfileForRole } from "./preferenceProfile";
import { applyLightPlanGuards } from "../lib/planPersonalization.js";
import {
  buildWeekReview,
  formatPriorPlansForPrompt,
  formatWeekReviewForPrompt,
  summarizePriorPlans,
} from "./weekReview";
import { isStoredAiDayPlan, PLAN_CHUNKS } from "./planMeta";

const PLAN_PENDING_PLACEHOLDER = {
  pending: true,
  title: "等待对方加入后生成专属计划",
  workouts: [],
  habits: [],
};

function createFuturePendingPlan(fromDay) {
  if (fromDay <= 7) {
    return { pending: true, title: "等待生成第 1–7 天计划", workouts: [], habits: [] };
  }
  if (fromDay <= 14) {
    return {
      pending: true,
      title: "第 8–14 天计划将在第 1 周结束后根据你的打卡数据自动生成",
      workouts: [],
      habits: [],
    };
  }
  return {
    pending: true,
    title: "第 15–21 天计划将在第 2 周结束后根据你的打卡数据自动生成",
    workouts: [],
    habits: [],
  };
}

export function createPendingPlan() {
  return { ...PLAN_PENDING_PLACEHOLDER };
}

export function buildPendingPlansFromDay(fromDay) {
  const plans = {};
  for (let day = fromDay; day <= DAYS; day += 1) {
    plans[dayKey(day)] = createFuturePendingPlan(fromDay);
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
  const plans = {};
  for (let day = dayStart; day <= dayEnd; day += 1) {
    plans[dayKey(day)] = getBasePlan(role, day, challengeStartDate, preferenceProfile);
  }
  return plans;
}

function fillMissingPlanDaysInRange(plans, role, challengeStartDate, dayStart, dayEnd, preferenceProfile) {
  const filled = { ...(plans || {}) };
  for (let day = dayStart; day <= dayEnd; day += 1) {
    const key = dayKey(day);
    if (!isStoredAiDayPlan(filled[key])) {
      filled[key] = getBasePlan(role, day, challengeStartDate, preferenceProfile);
    }
  }
  return filled;
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
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role,
      preferenceProfile: normalizePreferenceProfile(preferenceProfile, "", role),
      challengeStartDate,
      dayStart,
      dayEnd,
      iterativeContext,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "计划生成失败");
  }
  if (!data.plans || typeof data.plans !== "object") {
    throw new Error("计划生成失败");
  }
  if (!isStoredAiDayPlan(data.plans[dayKey(dayStart)])) {
    throw new Error(`第 ${dayStart}–${dayEnd} 天计划不完整`);
  }
  const normalizedProfile = normalizePreferenceProfile(preferenceProfile, "", role);
  return applyLightPlanGuards(data.plans, normalizedProfile, role, dayStart, dayEnd);
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
      plans: fillMissingPlanDaysInRange(plans, role, challenge.challengeStartDate, chunk.start, chunk.end, preferenceProfile),
      usedFallback: false,
    };
  } catch {
    return {
      plans: buildFallbackPlansForRange(
        role,
        challenge.challengeStartDate,
        chunk.start,
        chunk.end,
        preferenceProfile
      ),
      usedFallback: true,
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
    return { plans: merged, usedFallback: false, generatedThrough: 7 };
  } catch {
    const fallback = mergeWeekOnePlans(role, challengeStartDate, null, true, preferenceProfile);
    onProgressUpdate?.(100, chunk, { ...fallback });
    await onChunkComplete?.(chunk, fallback, { ...fallback });
    return { plans: fallback, usedFallback: true, generatedThrough: 7 };
  }
}

export async function resolveRolePlans(role, preferenceProfile, challengeStartDate, callbacks = {}) {
  try {
    return await resolveRolePlansInitial(role, preferenceProfile, challengeStartDate, callbacks);
  } catch {
    return {
      plans: mergeWeekOnePlans(role, challengeStartDate, null, true, preferenceProfile),
      usedFallback: true,
      generatedThrough: 7,
    };
  }
}
