export { formatChinesePrimary } from "../lib/formatLabels.js";

import { formatChinesePrimary } from "../lib/formatLabels.js";

export function formatWorkoutName(name) {
  return formatChinesePrimary(name);
}

export function formatPlanTitle(title) {
  return formatChinesePrimary(title);
}

export function formatWorkoutVolume(exercise) {
  const sets = exercise?.sets ?? 3;
  const reps = String(exercise?.reps || "10-12").trim();

  if (!reps || reps === "-") return `${sets}组`;

  const isTimeBased = /秒|min|分钟|\/side|\/侧/i.test(reps) || /^\d+(\-\d+)?s$/i.test(reps);
  if (isTimeBased) {
    return `${sets}组 x ${reps}`;
  }

  return `${sets}组 x ${reps}次`;
}

export function formatRestTime(rest) {
  const value = String(rest ?? "").trim();
  if (!value || value === "-") return "";
  return `休息: ${value}`;
}
