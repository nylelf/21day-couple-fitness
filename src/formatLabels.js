function hasCJK(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function isMostlyLatin(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed || hasCJK(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed);
}

function normalizeParens(text) {
  return String(text || "").replace(/\(/g, "（").replace(/\)/g, "）");
}

export function formatChinesePrimary(text) {
  const raw = String(text || "").trim();
  if (!raw) return raw;

  const normalized = normalizeParens(raw);
  const prefixMatch = normalized.match(/^((?:Day\s*\d+|第\s*\d+\s*天)\s*[·•\-]\s*)(.+)$/i);
  const prefix = prefixMatch ? prefixMatch[1] : "";
  const body = prefixMatch ? prefixMatch[2] : normalized;

  const match = body.match(/^(.+?)（([^）]+)）$/);
  if (!match) return raw;

  const left = match[1].trim();
  const right = match[2].trim();

  if (isMostlyLatin(left) && hasCJK(right)) {
    const swapped = `${right}（${left}）`;
    return prefix ? `${prefix}${swapped}` : swapped;
  }

  return raw;
}

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
