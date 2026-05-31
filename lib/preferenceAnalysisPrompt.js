/**
 * Prompt builders for AI preference analysis (used by generate-plan API).
 */

import { buildPeriodHintForProfile } from "./periodSchedule.js";

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

function buildFemalePeriodSection(profile, role, challengeStartDate, dayStart, dayEnd) {
  if (role !== "female") {
    return "【经期】男生无经期字段，忽略。";
  }

  const hint = buildPeriodHintForProfile(profile, role, challengeStartDate, dayStart, dayEnd);
  if (!hint) return "";

  if (!hint.hasPeriodData) {
    return `【女生经期数据】未填写上次经期日期。若计划期间可能临近经期，应在分析中提醒适当降低强度。`;
  }

  const rangeDetail =
    hint.daysInRange.length > 0
      ? hint.daysInRange
          .map((d) => `第${d.challengeDay}天（日历${d.date}，经期第${d.periodDay}天）`)
          .join("、")
      : "本次生成区间内无经期第1-5天";

  const fullChallenge =
    hint.allDaysInChallenge.length > 0
      ? `21天全挑战内经期日：${hint.allDaysInChallenge.map((d) => `第${d.challengeDay}天`).join("、")}`
      : "21天挑战期内推算无经期第1-5天重叠";

  return `【女生经期数据 — 必须纳入综合分析】
- 上次经期第一天：${hint.lastPeriodDate}
- 经期周期：${hint.cycleLabel}
- 挑战开始日：${challengeStartDate}
- 系统推算（供你对照）：${rangeDetail}；${fullChallenge}

经期日训练原则（由你在 periodSchedule 中写清 planDirective，生成阶段须执行）：
- 经期第1-5天：降低强度，以瑜伽、散步、轻度拉伸、骨盆底放松为主，避免大重量臀腿冲击
- title 须注明「经期调整日」或类似
- meals 须温热易消化、补铁，减少生冷刺激
- 若经期日与「其他运动日」重叠，以身体恢复优先，避免双重高强度`;
}

export function buildPreferenceAnalysisPrompt(profile, role, challengeStartDate, dayStart, dayEnd) {
  const goals = normalizeGoals(profile);
  const goalText = goals.map((g) => GOAL_LABELS[g] || g).join("、") || "未指定";
  const periodSection = buildFemalePeriodSection(profile, role, challengeStartDate, dayStart, dayEnd);

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

${periodSection}

【每周其他运动 — 用户原文（自由填写，你必须自行读懂）】
"""
${(profile?.otherActivities || "").trim() || "无"}
"""

说明：
- 用户可能写任意内容，例如「周日爬山」「周一打羽毛球」「周四晚上芭蕾课」等
- 请从原文中识别运动、星期几，根据挑战开始日期换算 challengeDay（1-21）
- 只把落在 ${dayStart}-${dayEnd} 的运动日写入 activitySchedule

【综合分析要求】
- 须同时考虑：训练等级、目标、器材、时长、分化、其他运动、${role === "female" ? "经期推算" : ""}、伤病备注
- 经期日与其他运动日、力量训练日的优先级：经期 > 外部运动恢复 > 正常力量训练
- L1 与 L4 的强度策略必须明显不同

只返回 JSON（不要 markdown）：
{
  "summary": "一段话：如何综合所有偏好（含经期）安排本段计划",
  "levelStrategy": {
    "tier": "${profile?.fitnessLevel || "beginner"}",
    "setsGuidance": "...",
    "repsGuidance": "...",
    "restGuidance": "...",
    "coachingFocus": "..."
  },
  "periodSchedule": [
    {
      "challengeDay": 0,
      "periodDay": 1,
      "planDirective": "经期第N天具体怎么练、怎么吃（须比正常训练日轻）"
    }
  ],
  "activitySchedule": [
    {
      "challengeDay": 0,
      "activity": "运动名称",
      "sourceText": "用户原文片段",
      "planDirective": "当日 App 内计划如何配合该运动"
    }
  ],
  "dailyDirectives": [
    {
      "challengeDay": 0,
      "splitFocus": "分化或经期调整/恢复",
      "intensityNote": "强度说明"
    }
  ]
}

${role === "female" ? "女生必须输出 periodSchedule（落在本段内的经期日）；无经期重叠则 []。" : "男生 periodSchedule 固定 []。"}
activitySchedule 无则 []。dailyDirectives 尽量覆盖 ${dayStart}-${dayEnd} 每一天。`;
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

  const periodSchedule = (Array.isArray(raw.periodSchedule) ? raw.periodSchedule : [])
    .map((item) => ({
      challengeDay: Number(item.challengeDay),
      periodDay: Number(item.periodDay) || null,
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
    periodSchedule,
    activitySchedule,
    dailyDirectives,
  };
}

export function formatPreferenceAnalysisForPlanPrompt(analysis, dayStart, dayEnd) {
  if (!analysis) return "";

  const lines = [
    "【AI 偏好综合分析 — 生成计划时必须遵循】",
    analysis.summary ? `- 综合结论：${analysis.summary}` : "",
  ];

  const ls = analysis.levelStrategy;
  if (ls && Object.keys(ls).length) {
    lines.push(
      `- 训练等级（${ls.tier || ""}）：组数 ${ls.setsGuidance || ""}；次数 ${ls.repsGuidance || ""}；休息 ${ls.restGuidance || ""}；${ls.coachingFocus || ""}`
    );
  }

  if (analysis.periodSchedule?.length) {
    lines.push("- 女生经期安排（本段挑战日）：");
    analysis.periodSchedule.forEach((item) => {
      lines.push(
        `  · 第${item.challengeDay}天${item.periodDay ? `（经期第${item.periodDay}天）` : ""}：${item.planDirective}`
      );
    });
  } else {
    lines.push("- 本段无经期重叠日，或女生未提供经期数据");
  }

  if (analysis.activitySchedule?.length) {
    lines.push("- 其他运动日（本段）：");
    analysis.activitySchedule.forEach((item) => {
      lines.push(
        `  · 第${item.challengeDay}天：${item.activity} → ${item.planDirective}`
      );
    });
  } else {
    lines.push("- 本段无其他运动日，或未识别到");
  }

  if (analysis.dailyDirectives?.length) {
    lines.push(`- 每日指导（${dayStart}-${dayEnd}）：`);
    analysis.dailyDirectives
      .sort((a, b) => a.challengeDay - b.challengeDay)
      .forEach((item) => {
        lines.push(`  · 第${item.challengeDay}天：${item.splitFocus} — ${item.intensityNote}`);
      });
    }

  lines.push(
    "- 经期日、运动日、训练日由你根据上述 planDirective 自主设计动作与饮食；经期日不得安排大强度臀腿冲击"
  );

  return lines.filter(Boolean).join("\n");
}
