import { dayKey } from "./challenge";

export function isStoredAiDayPlan(plan) {
  if (!plan || typeof plan !== "object") return false;
  if (plan.pending) return false;
  if (!Array.isArray(plan.workouts) || plan.workouts.length === 0) return false;
  return true;
}

export function inferGeneratedThrough(plans) {
  if (isStoredAiDayPlan(plans?.[dayKey(21)])) return 21;
  if (isStoredAiDayPlan(plans?.[dayKey(14)])) return 14;
  if (isStoredAiDayPlan(plans?.[dayKey(7)])) return 7;
  return 0;
}

export function getPlanMetaForRole(challenge, role) {
  const stored = challenge?.planMeta?.[role];
  if (stored && typeof stored.generatedThrough === "number") {
    return { generating: null, lastError: null, lastGeneratedAt: "", ...stored };
  }
  return {
    generatedThrough: inferGeneratedThrough(challenge?.plans?.[role]),
    generating: null,
    lastError: null,
    lastGeneratedAt: "",
  };
}

export const PLAN_CHUNKS = [
  { start: 1, end: 7, label: "第 1–7 天", weekNumber: 1 },
  { start: 8, end: 14, label: "第 8–14 天", weekNumber: 2 },
  { start: 15, end: 21, label: "第 15–21 天", weekNumber: 3 },
];

export function getNextChunkToGenerate(currentDay, generatedThrough) {
  if (generatedThrough >= 21) return null;
  if (generatedThrough < 7) return PLAN_CHUNKS[0];
  if (generatedThrough < 14 && currentDay > 7) return PLAN_CHUNKS[1];
  if (generatedThrough < 21 && currentDay > 14) return PLAN_CHUNKS[2];
  return null;
}
