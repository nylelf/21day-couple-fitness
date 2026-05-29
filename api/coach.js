const MODEL = "claude-sonnet-4-6";

function roleDisplay(role) {
  return role === "male" ? "男生" : role === "female" ? "女生" : "学员";
}

function buildUserPrompt({ role, completion, dayNumber, preferences, stats, noteText }) {
  const malePct = stats?.male ?? stats?.malePercent ?? 0;
  const femalePct = stats?.female ?? stats?.femalePercent ?? 0;

  return `你是一位专业、温暖的情侣健身私教。请根据以下数据，用中文写一段约100字的个性化教练建议（可略多或略少，但不要超过150字）。

要求：
- 语气鼓励、具体、实用，适合情侣互相打气
- 结合今日完成率给出1-2条可执行的小建议
- 若有训练记录笔记，可简要回应；若无笔记可提醒记录感受
- 可适度提及双方整体进度，但不要批评或比较谁更好
- 只输出建议正文，不要标题、列表符号或「教练说：」等前缀

【学员身份】${roleDisplay(role)}
【挑战进度】第 ${dayNumber} 天 / 共 21 天
【今日完成率】${completion}%
【训练偏好】${preferences || "未填写"}
【双方整体进度】男生 ${malePct}%｜女生 ${femalePct}%
【今日训练记录】${noteText?.trim() ? noteText.trim() : "（暂无记录）"}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "仅支持 POST 请求" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未配置 ANTHROPIC_API_KEY" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "请求体格式无效" });
  }

  const { role, completion, dayNumber, preferences, stats, noteText } = body;

  if (!role || dayNumber == null) {
    return res.status(400).json({ error: "缺少必要参数 role 或 dayNumber" });
  }

  const userPrompt = buildUserPrompt({
    role,
    completion: Number(completion) || 0,
    dayNumber: Number(dayNumber) || 1,
    preferences: preferences || "",
    stats: stats || {},
    noteText: noteText || "",
  });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 320,
        system:
          "你是21天情侣健身挑战的AI教练。回复简洁、亲切、专业，只用中文，不要输出 markdown 或编号列表。",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || `Anthropic API 错误 (${response.status})`;
      return res.status(response.status >= 500 ? 502 : 400).json({ error: message });
    }

    const text = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      return res.status(502).json({ error: "AI 未返回有效内容" });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error("coach API error:", err);
    return res.status(500).json({ error: "生成建议时出错，请稍后重试" });
  }
}
