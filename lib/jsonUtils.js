/** Parse JSON from LLM responses (may include markdown fences). */

export function extractJsonObject(text, emptyError = "AI 返回为空") {
  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error(emptyError);

  try {
    if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1].trim());

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));

  throw new Error("无法解析 JSON");
}
