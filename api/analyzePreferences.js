import {
  buildPreferenceAnalysisPrompt,
  normalizePreferenceAnalysis,
} from "../lib/preferenceAnalysisPrompt.js";

const MODEL = "claude-haiku-4-5-20251001";

function extractJsonObject(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error("AI 返回为空");

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

  throw new Error("无法解析偏好分析 JSON");
}

export async function analyzePreferencesWithAI({
  apiKey,
  role,
  preferenceProfile,
  challengeStartDate,
  dayStart,
  dayEnd,
}) {
  const prompt = buildPreferenceAnalysisPrompt(
    preferenceProfile || {},
    role,
    challengeStartDate,
    dayStart,
    dayEnd
  );

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.2,
      system:
        "你是偏好分析助手。只返回合法 JSON，不要解释。必须理解用户自然语言描述的其他运动（如爬山、羽毛球、芭蕾、篮球等），并映射到挑战第几天。女生须根据上次经期日期与周期推算 periodSchedule，经期日训练须轻于正常日。",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `偏好分析失败 (${response.status})`;
    throw new Error(message);
  }

  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  const parsed = extractJsonObject(text);
  return normalizePreferenceAnalysis(parsed, dayStart, dayEnd);
}
