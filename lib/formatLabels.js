/** Chinese-primary label formatting for plans and workouts. */

function hasCJK(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function isMostlyLatin(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed || hasCJK(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed);
}

export function formatChinesePrimary(text) {
  const raw = String(text || "").trim();
  if (!raw) return raw;

  const normalized = raw.replace(/\(/g, "（").replace(/\)/g, "）");
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
