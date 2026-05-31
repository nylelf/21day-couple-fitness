import { extractJsonObject } from "../lib/jsonUtils.js";
import {
  buildPreferenceAnalysisPrompt,
  normalizePreferenceAnalysis,
} from "../lib/preferenceAnalysisPrompt.js";

const MODEL = "claude-haiku-4-5-20251001";

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
        "你是偏好分析助手。只返回合法 JSON，不要解释。activitySchedule 的 challengeDay 必须与 prompt 中「系统已从原文解析」的运动日完全一致。女生须推算 periodSchedule。",
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

  const parsed = extractJsonObject(text, "无法解析偏好分析 JSON");
  return normalizePreferenceAnalysis(parsed, dayStart, dayEnd);
}
