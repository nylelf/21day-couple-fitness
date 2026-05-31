/**
 * Prompt builders for AI preference analysis (used by generate-plan API).
 */

const GOAL_LABELS = {
  muscle_gain: "增肌",
  fat_loss: "减脂",
  strength: "力量",
  posture: "体态改善",
  athletic: "运动表现",
  rehab: "康复训练",
  glute_shape: "翘臀塑形",
  slim_legs: "瘦腿",
  abs_line: "马甲线",
  full_body_shape: "全身塑形",
  postpartum: "产后恢复",
};

const LEVEL_LABELS = {
  beginner: "L1新手",
  novice: "L2初级",
  intermediate: "L3中级",
  advanced: "L4高级",
  recovery: "伤后恢复",
};

function normalizeGoals(profile) {
  const raw = profile?.goals !== undefined ? profile.goals : profile?.goal;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.filter(Boolean);
}

export function buildPreferenceAnalysisPrompt(profile, role, challengeStartDate, dayStart, dayEnd) {
  const goals = normalizeGoals(profile);
  const goalText = goals.map((g) => GOAL_LABELS[g] || g).join("、") || "未指定";

  return `你是健身教练的「偏好理解模块」。请阅读学员全部偏好信息，用自然语言理解能力做综合分析（不要用固定模板套话）。

【挑战日历】
- 第 1 天日期：${challengeStartDate}
- 本次需要生成：第 ${dayStart} 天 ～ 第 ${dayEnd} 天（共 ${dayEnd - dayStart + 1} 天）

【结构化偏好字段】
- 性别 role：${role === "female" ? "女生" : "男生"}
- 训练等级：${LEVEL_LABELS[profile?.fitnessLevel] || profile?.fitnessLevel || "未填"}
- 训练目标：${goalText}
- 可用器材：${profile?.equipment || "未填"}
- 单次训练时长：${profile?.sessionDuration || "未填"} 分钟
- 训练部位分化：${profile?.trainingSplit || "未填"}
- 身体状况备注：${profile?.healthNotes?.trim() || "无"}

【每周其他运动 — 用户原文（自由填写，你必须自行读懂）】
"""
${(profile?.otherActivities || "").trim() || "无"}
"""

说明：
- 用户可能写任意内容，例如「周日爬山」「周一打羽毛球」「周四晚上芭蕾课」「周五和周日打篮球」等，不限于示例
- 请从原文中识别：有哪些运动、在星期几/每周哪几天、是户外还是有氧/技术课
- 根据挑战开始日期，换算成挑战第几天 challengeDay（1-21）
- 只把落在 ${dayStart}-${dayEnd} 范围内的运动日写入 activitySchedule

【训练等级要求】
- L1 与 L4 的计划必须在组数、次数、休息、动作难度上明显不同，不能看起来一样

只返回 JSON（不要 markdown）：
{
  "summary": "一段话：如何综合性别、等级、目标、器材、时长、分化、其他运动来安排本段计划",
  "levelStrategy": {
    "tier": "${profile?.fitnessLevel || "beginner"}",
    "setsGuidance": "本等级组数建议，须与其他等级明显区分",
    "repsGuidance": "次数建议",
    "restGuidance": "休息建议",
    "coachingFocus": "教学重点"
  },
  "activitySchedule": [
    {
      "challengeDay": 0,
      "activity": "运动名称",
      "sourceText": "用户原文对应片段",
      "planDirective": "当日在 App 内训练计划应如何安排（通常：仅轻度拉伸恢复，title 点明该运动，不安排与此外部运动重复的大强度力量课）"
    }
  ],
  "dailyDirectives": [
    {
      "challengeDay": 0,
      "splitFocus": "分化重点如推日/臀腿日",
      "intensityNote": "结合等级的强度说明"
    }
  ]
}

activitySchedule 若无运动则 []. dailyDirectives 尽量覆盖 ${dayStart}-${dayEnd} 每一天。`;
}

export function normalizePreferenceAnalysis(raw, dayStart, dayEnd) {
  if (!raw || typeof raw !== "object") return null;

  const activitySchedule = (Array.isArray(raw.activitySchedule) ? raw.activitySchedule : [])
    .map((item) => ({
      challengeDay: Number(item.challengeDay),
      activity: String(item.activity || "").trim(),
      sourceText: String(item.sourceText || "").trim(),
      planDirective: String(item.planDirective || "").trim(),
    }))
    .filter((item) => item.challengeDay >= dayStart && item.challengeDay <= dayEnd);

  const dailyDirectives = (Array.isArray(raw.dailyDirectives) ? raw.dailyDirectives : [])
    .map((item) => ({
      challengeDay: Number(item.challengeDay),
      splitFocus: String(item.splitFocus || "").trim(),
      intensityNote: String(item.intensityNote || "").trim(),
    }))
    .filter((item) => item.challengeDay >= dayStart && item.challengeDay <= dayEnd);

  return {
    summary: String(raw.summary || "").trim(),
    levelStrategy: raw.levelStrategy && typeof raw.levelStrategy === "object" ? raw.levelStrategy : {},
    activitySchedule,
    dailyDirectives,
  };
}

export function formatPreferenceAnalysisForPlanPrompt(analysis, dayStart, dayEnd) {
  if (!analysis) return "";

  const lines = [
    "【AI 偏好综合分析 — 生成计划时必须遵循，这是你理解用户原文后的结论】",
    analysis.summary ? `- 综合结论：${analysis.summary}` : "",
  ];

  const ls = analysis.levelStrategy;
  if (ls && Object.keys(ls).length) {
    lines.push(
      `- 训练等级策略（${ls.tier || ""}）：组数 ${ls.setsGuidance || ""}；次数 ${ls.repsGuidance || ""}；休息 ${ls.restGuidance || ""}；${ls.coachingFocus || ""}`
    );
  }

  if (analysis.activitySchedule?.length) {
    lines.push("- 用户「每周其他运动」识别结果（按挑战第几天）：");
    analysis.activitySchedule.forEach((item) => {
      lines.push(
        `  · 第${item.challengeDay}天：${item.activity}（原文：${item.sourceText || "—"}）→ ${item.planDirective}`
      );
    });
  } else {
    lines.push("- 用户未填写其他运动，或原文中未识别到具体运动日");
  }

  if (analysis.dailyDirectives?.length) {
    lines.push(`- 第 ${dayStart}-${dayEnd} 天每日指导：`);
    analysis.dailyDirectives
      .sort((a, b) => a.challengeDay - b.challengeDay)
      .forEach((item) => {
        lines.push(`  · 第${item.challengeDay}天：${item.splitFocus} — ${item.intensityNote}`);
      });
  }

  lines.push(
    "- 重要：其他运动日由你根据 planDirective 自主设计当日训练与饮食，不要用固定动作列表替换；非运动日须体现分化与等级差异"
  );

  return lines.filter(Boolean).join("\n");
}
