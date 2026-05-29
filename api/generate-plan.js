const MODEL = "claude-sonnet-4-6";
const DAYS = 21;

const FITNESS_LEVEL_LABELS = {
  beginner: "新手（0-6个月）",
  novice: "初级（6个月-2年）",
  intermediate: "中级（2-5年）",
  advanced: "高级（5年以上）",
  recovery: "伤后恢复",
};

const GOAL_LABELS = {
  fat_loss: "减脂塑形",
  muscle_gain: "增肌",
  maintain: "维持体能",
  rehabilitation: "伤后康复",
};

const EQUIPMENT_LABELS = {
  bodyweight: "仅徒手",
  home: "家里有哑铃/弹力带",
  gym: "健身房",
};

const SYSTEM_PROMPT = `你是一位专业健身教练，擅长为情侣制定科学的个性化训练计划与饮食/恢复方案。
请严格只返回 JSON，不要任何解释、标题或 markdown 格式。`;

function parseDateOnly(dateValue) {
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateValue);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDateOnly(dateValue) {
  const d = parseDateOnly(dateValue);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateValue, days) {
  const d = parseDateOnly(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(fromDate, toDate) {
  const start = parseDateOnly(fromDate).getTime();
  const end = parseDateOnly(toDate).getTime();
  return Math.floor((end - start) / 86400000);
}

function getPeriodAdjustmentDays(challengeStartDate, lastPeriodDate, cycleLength) {
  if (!lastPeriodDate) return [];

  const cycle = cycleLength === "irregular" ? 28 : Number(cycleLength) || 28;
  const challengeStart = parseDateOnly(challengeStartDate || formatDateOnly(new Date()));
  const challengeEnd = addDays(challengeStart, DAYS - 1);

  let periodStart = parseDateOnly(lastPeriodDate);
  while (addDays(periodStart, cycle) <= addDays(challengeStart, -cycle)) {
    periodStart = addDays(periodStart, cycle);
  }
  while (addDays(periodStart, -cycle) >= addDays(challengeStart, -cycle)) {
    periodStart = addDays(periodStart, -cycle);
  }

  const adjustments = [];
  for (let challengeDay = 1; challengeDay <= DAYS; challengeDay += 1) {
    const challengeDate = addDays(challengeStart, challengeDay - 1);
    let cursor = parseDateOnly(periodStart);

    while (cursor <= challengeEnd) {
      const periodDay = daysBetween(cursor, challengeDate) + 1;
      if (periodDay >= 1 && periodDay <= 5) {
        adjustments.push({ challengeDay, periodDay, date: formatDateOnly(challengeDate) });
        break;
      }
      cursor = addDays(cursor, cycle);
    }
  }

  return adjustments;
}

function roleDisplay(role) {
  return role === "male" ? "男生" : role === "female" ? "女生" : "学员";
}

function buildUserPrompt({ role, preferenceProfile, challengeStartDate }) {
  const profile = preferenceProfile || {};
  const fitnessLevel = FITNESS_LEVEL_LABELS[profile.fitnessLevel] || profile.fitnessLevel || "未填写";
  const goal = GOAL_LABELS[profile.goal] || profile.goal || "未填写";
  const equipment = EQUIPMENT_LABELS[profile.equipment] || profile.equipment || "未填写";
  const sessionDuration = profile.sessionDuration ? `${profile.sessionDuration}分钟` : "未填写";
  const otherActivities = profile.otherActivities?.trim() || "无";
  const healthNotes = profile.healthNotes?.trim() || "无";

  let periodSection = "";
  if (role === "female" && profile.lastPeriodDate) {
    const adjustments = getPeriodAdjustmentDays(
      challengeStartDate,
      profile.lastPeriodDate,
      profile.cycleLength
    );
    if (adjustments.length) {
      const lines = adjustments.map(
        (item) => `挑战第 ${item.challengeDay} 天（${item.date}，经期第 ${item.periodDay} 天）`
      );
      periodSection = `\n【经期调整】上次经期第一天：${profile.lastPeriodDate}，周期：${
        profile.cycleLength === "irregular" ? "不规律（按28天估算）" : `${profile.cycleLength}天`
      }\n以下挑战日需降低训练强度，改为轻度拉伸或散步，workouts 的 note 里注明「经期调整日」；habits 改为温和恢复类（热敷、瑜伽、补铁食物等），不要高强度训练建议：\n${lines.join("\n")}`;
    } else {
      periodSection = `\n【经期信息】上次经期第一天：${profile.lastPeriodDate}，21天挑战期内无完整经期第1-5天重叠；若接近经期仍适当降低强度。`;
    }
  }

  return `请为以下用户生成完整的 21 天训练计划（day-1 到 day-21）。

【性别】${roleDisplay(role)}
【训练年限】${fitnessLevel}
【训练目标】${goal}
【可用器材】${equipment}
【每次训练时间】${sessionDuration}
【每周其他运动】${otherActivities}
【身体状况备注】${healthNotes}${periodSection}

计划要求：
1. 第 1-7 天：基础适应期（动作规范、中等偏低强度）
2. 第 8-14 天：强度提升期（逐步加重/加量）
3. 第 15-21 天：巩固强化期（挑战更高强度，仍注意安全）
4. 每天包含 title、workouts、habits 三个字段
5. workouts 每项包含 name、sets、reps、rest、note（note 用中文，可含简短英文要点）
6. 动作名称格式："中文名（English）"
7. 总训练内容需匹配每次训练时间；器材选择需匹配可用器材
8. 若有每周其他运动，避免同天安排冲突的大强度训练
9. 若有身体状况备注，相关动作 note 中给出保护提示

【habits 饮食/恢复 checklist 规则】
每天必须根据当天 workouts 与训练强度，动态生成 4-5 条 habits（不要用固定模板，每天内容应不同）。
每条 habit 简洁，格式统一："动作/行为（补充说明）"，例如："补充30g蛋白质（训练后1小时内）"

按日类型选择内容：
- 训练日：必须包含 (1) 蛋白质摄入建议，结合当天训练部位/肌群 (2) 饮水量 (3) 睡眠 (4) 针对当天训练部位的拉伸或放松建议
- 大重量训练日（含深蹲、硬拉、卧推等大复合动作为主）：在上述基础上再加一条泡沫轴放松或冰敷建议
- 恢复日/轻训练日（训练量少、以有氧/核心/拉伸为主）：再加一条主动恢复建议（如散步、冥想、轻松骑行）
- 女生经期调整日：habits 全部换成温和恢复类，如热敷、阴瑜伽、补铁食物、早睡、温和散步；不要大强度补剂或高强度恢复要求

habits 示例（day-1 大重量腿日）：
[
  "补充30g蛋白质（训练后1小时内）",
  "饮水2.5L+（大重量训练日补充电解质）",
  "睡眠7小时+（肌肉修复关键期）",
  "股四头肌拉伸（每侧30秒×2组）",
  "泡沫轴滚压大腿（训练后10分钟）"
]

返回 JSON 格式（键名必须是 day-1 到 day-21，habits 为字符串数组）：
{
  "day-1": {
    "title": "...",
    "workouts": [{ "name": "...", "sets": 3, "reps": "10-12", "rest": "60s", "note": "..." }],
    "habits": [
      "补充30g蛋白质（训练后1小时内）",
      "饮水2.5L+（大重量训练日补充电解质）",
      "睡眠7小时+（肌肉修复关键期）",
      "股四头肌拉伸（每侧30秒×2组）",
      "泡沫轴滚压大腿（训练后10分钟）"
    ]
  },
  "day-2": { ... },
  ...
  "day-21": { ... }
}`;
}

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

  throw new Error("无法解析 AI 返回的 JSON");
}

function normalizeWorkout(item) {
  return {
    name: String(item?.name || "训练动作"),
    sets: typeof item?.sets === "number" ? item.sets : Number(item?.sets) || 3,
    reps: String(item?.reps || "10-12"),
    rest: String(item?.rest || "60s"),
    note: String(item?.note || ""),
  };
}

function normalizeHabit(item) {
  return String(item || "").trim();
}

function normalizeGeneratedPlan(raw) {
  if (!raw || typeof raw !== "object") return null;

  const plans = {};
  for (let day = 1; day <= DAYS; day += 1) {
    const key = `day-${day}`;
    const dayPlan = raw[key];
    if (!dayPlan || !Array.isArray(dayPlan.workouts) || !dayPlan.workouts.length) {
      return null;
    }
    const habits = Array.isArray(dayPlan.habits)
      ? dayPlan.habits.map(normalizeHabit).filter(Boolean)
      : [];
    if (habits.length < 4) {
      return null;
    }
    plans[key] = {
      title: String(dayPlan.title || `Day ${day}`),
      workouts: dayPlan.workouts.map(normalizeWorkout),
      habits: habits.slice(0, 5),
    };
  }
  return plans;
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

  const { role, preferenceProfile, challengeStartDate } = body;
  if (!role || !preferenceProfile) {
    return res.status(400).json({ error: "缺少必要参数 role 或 preferenceProfile" });
  }

  const userPrompt = buildUserPrompt({
    role,
    preferenceProfile,
    challengeStartDate: challengeStartDate || formatDateOnly(new Date()),
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
        max_tokens: 16384,
        system: SYSTEM_PROMPT,
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

    const parsed = extractJsonObject(text);
    const plans = normalizeGeneratedPlan(parsed);
    if (!plans) {
      return res.status(502).json({ error: "AI 返回的计划格式不完整" });
    }

    return res.status(200).json({ plans });
  } catch (err) {
    console.error("generate-plan API error:", err);
    return res.status(500).json({ error: err.message || "生成计划时出错，请稍后重试" });
  }
}
