import { formatDateOnly } from "../lib/dateUtils.js";
import { formatChinesePrimary } from "../lib/formatLabels.js";
import { extractJsonObject } from "../lib/jsonUtils.js";
import {
  buildPersonalizationFingerprint,
  buildPersonalizationPromptBlock,
  finalizePlansWithProfile,
} from "../lib/planPersonalization.js";
import { getPeriodDaysInChallenge } from "../lib/periodSchedule.js";
import { normalizeGoalsFromProfile, roleDisplayLabel } from "../lib/preferenceUtils.js";
import { formatWeeklyActivitiesText } from "../lib/weeklyActivities.js";

const MODEL = "claude-haiku-4-5-20251001";
const DAYS = 21;
const MAX_WORKOUTS_PER_DAY = 4;
const MAX_FEMALE_GLUTE_LEG_WORKOUTS = 5;
const CHUNK_MAX_TOKENS = 8192;

const FEMALE_GLUTE_LEG_TEMPLATE = [
  "腿举（Leg Press）",
  "深蹲（Squat）",
  "罗马尼亚硬拉（Romanian Deadlift）",
  "山羊挺身（Hyperextension，公羊挺身）",
  "臀外展（Hip Abduction）",
];

const FITNESS_LEVEL_LABELS = {
  beginner: "L1 新手（0-6个月）",
  novice: "L2 初级（6个月-2年）",
  intermediate: "L3 中级（2-5年）",
  advanced: "L4 高级（5年以上）",
  recovery: "伤后恢复",
};

const FITNESS_LEVEL_GUIDE = {
  beginner:
    "L1新手：优先固定器械、史密斯机、自重训练；每个动作note写清楚要点，组数≤3，避免高难度自由重量",
  novice: "L2初级：器械+自由重量结合，逐步增加负荷，动作质量优先",
  intermediate: "L3中级：适合PPL、Upper/Lower、力量周期，可安排复合动作超级组",
  advanced: "L4高级：高容量训练、周期化安排，组数4-5组，可挑战大重量",
  recovery: "伤后恢复：低强度、关节友好（legacy）",
};

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

const GOAL_GUIDE = {
  muscle_gain: "偏重增肌：孤立+复合结合，渐进超负荷，蛋白质充足",
  fat_loss: "偏重减脂：复合动作为主、有氧辅助，控制热量缺口",
  strength: "偏重力量：深蹲/卧推/硬拉为主项，低次数高负荷",
  posture: "偏重体态：肩胛稳定、核心激活、圆肩骨盆矫正类动作",
  athletic: "偏重运动表现：爆发力、敏捷、核心抗旋",
  rehab: "偏重康复：低强度、关节友好、动作质量优先",
  glute_shape: "偏重翘臀：臀推、RDL、外展，控制股四主导",
  slim_legs: "偏重瘦腿：臀主导下肢、降低股四刺激",
  abs_line: "偏重马甲线：核心+体脂管理，腹部线条",
  full_body_shape: "偏重全身塑形：臀肩背协调，线条感",
  postpartum: "偏重产后恢复：骨盆底、核心重建、低冲击",
};

const MEAL_KEYS = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner", "postWorkout"];
const MEAL_LABELS = {
  breakfast: "早餐",
  morningSnack: "上午茶",
  lunch: "午餐",
  afternoonSnack: "下午茶",
  dinner: "晚餐",
  postWorkout: "练后餐",
};

const EQUIPMENT_LABELS = {
  bodyweight: "仅徒手",
  home: "家里有哑铃/弹力带",
  gym: "健身房",
};

const TRAINING_SPLIT_LABELS = {
  full_body: "全身训练（Full Body）",
  upper_lower: "二分化（Upper / Lower）",
  push_pull_legs: "三分化（Push / Pull / Legs）",
  bro_4: "四分化",
  bro_5: "五分化（Bro Split）",
  bro_6: "六分化",
};

const TRAINING_SPLIT_GUIDE = {
  full_body: "每次训练覆盖全身主要肌群，适合新手和减脂；21天内按全身循环安排，避免连续两天同一部位",
  upper_lower: "上肢日 + 下肢日轮换（Upper / Lower），21天内交替出现",
  push_pull_legs: "推（胸肩三头）/ 拉（背二头）/ 腿（臀腿）三天循环，21天内严格按 PPL 顺序",
  bro_4: "四分化：例如胸背 / 肩臂 / 腿 / 核心或推拉腿+专项，21天内按4天周期循环",
  bro_5: "五分化 Bro Split：胸 / 背 / 肩 / 腿 / 手臂各一天，21天内按5天周期循环",
  bro_6: "六分化：更细部位划分（高容量），21天内按6天周期循环",
};

const SYSTEM_PROMPT = `你必须用中文回复，所有内容包括动作名称、note、meals、title都必须是中文。动作名称与每日 title 格式必须是：中文名（English），英文只能放在括号内，禁止 English（中文）这种反写格式。禁止输出纯英文句子。
你是一位专业健身教练，擅长为情侣制定科学的个性化训练计划与一日六餐饮食方案。
【核心原则】
1. 必须综合理解学员全部偏好（性别、等级、目标、器材、时长、分化、每周其他运动原文、女生经期数据、伤病备注），禁止套用固定模板
2. 「每周其他运动」为自由文本；系统会解析星期几并落地为运动日恢复计划，对应日 title 须含运动名、仅拉伸恢复
3. L1 与 L4（及其他等级）在组数、次数、休息、动作难度上必须明显不同
请严格只返回 JSON，不要任何解释、标题或 markdown 格式。
title 示例："推日 · 胸+三头（Push Day · Chest + Triceps）"、"篮球日（Basketball Day）"、"第8天 · 拉日 · 背部（Pull Day）"。
动作名称示例："杠铃卧推（Barbell Bench Press）"、"篮球（Basketball）"。`;

function isFemaleGluteLegDay(dayPlan, role) {
  if (role !== "female") return false;
  const title = String(dayPlan?.title || "");
  const isLegFocus = /臀腿|腿日|下肢|练腿|Leg Day|Glute|臀部|腿部/i.test(title);
  const isLightDay = /恢复|拉伸|经期|有氧|轻/i.test(title);
  return isLegFocus && !isLightDay;
}

function maxWorkoutsForDay(dayPlan, role) {
  return isFemaleGluteLegDay(dayPlan, role) ? MAX_FEMALE_GLUTE_LEG_WORKOUTS : MAX_WORKOUTS_PER_DAY;
}

function buildFemaleGluteLegGuide(role, level) {
  if (role !== "female") return "";
  const intensityByLevel = {
    beginner: "L1：史密斯深蹲/杯式深蹲替代自由重量深蹲，腿举轻重量找发力；RDL 哑铃轻负荷；组数 2–3 组",
    novice: "L2：可杠铃/史密斯深蹲，逐步加重；RDL 与腿举 3 组；山羊挺身自重或轻负重",
    intermediate: "L3：深蹲与 RDL 为主项加重，腿举作容量；4 组为主",
    advanced: "L4：大重量深蹲/RDL，腿举高容量，组数 4–5 组，可加入递减组",
    recovery: "伤后恢复：减半组数与重量，关节友好变式",
  };
  const intensity = intensityByLevel[level] || intensityByLevel.beginner;
  return `
【女生臀腿训练日特别规则（仅 role=女生 且当天为臀/腿主训日）】
- 当天 workouts 固定优先采用以下 5 个动作（顺序可微调，但不得替换为无关动作）：
  ${FEMALE_GLUTE_LEG_TEMPLATE.map((name, i) => `${i + 1}. ${name}`).join("\n  ")}
- 此日允许 **5 个动作**（唯一例外；其余训练日仍不超过 4 个）
- 强度按训练等级调整：${intensity}
- 若用户目标是翘臀塑形/瘦腿/全身塑形，此日 note 强调臀主导、控制膝关节内扣
- 若器材为徒手/居家：腿举→深蹲变式，RDL→单腿 RDL，臀外展→弹力带侧抬腿，山羊挺身→超人式`;
}

function buildGoalPrompt(profile) {
  const goals = normalizeGoalsFromProfile(profile);
  if (!goals.length) return { goalText: "未填写", goalGuide: "围绕用户目标安排训练与饮食" };

  const labels = goals.map((value) => GOAL_LABELS[value] || value);
  const guides = goals.map((value) => GOAL_GUIDE[value]).filter(Boolean);
  return {
    goalText: labels.join("、"),
    goalGuide: guides.length ? guides.join("；") : "综合多个目标平衡安排训练与饮食",
  };
}

function buildUserPrompt({
  role,
  preferenceProfile,
  challengeStartDate,
  dayStart = 1,
  dayEnd = DAYS,
  iterativeContext = null,
}) {
  const profile = preferenceProfile || {};
  const gender = roleDisplayLabel(role);
  const level = FITNESS_LEVEL_LABELS[profile.fitnessLevel] || profile.fitnessLevel || "未填写";
  const levelGuide = FITNESS_LEVEL_GUIDE[profile.fitnessLevel] || "按训练等级匹配难度与动作选择";
  const { goalText, goalGuide } = buildGoalPrompt(profile);
  const equipment = EQUIPMENT_LABELS[profile.equipment] || profile.equipment || "未填写";
  const duration = profile.sessionDuration ? `${profile.sessionDuration}分钟` : "未填写";
  const trainingSplit = TRAINING_SPLIT_LABELS[profile.trainingSplit] || profile.trainingSplit || "未填写";
  const trainingSplitGuide = TRAINING_SPLIT_GUIDE[profile.trainingSplit] || "按用户选择的训练分化安排每日训练部位";
  const otherActivities =
    formatWeeklyActivitiesText(profile?.weeklyActivities) ||
    profile.otherActivities?.trim() ||
    "无";
  const healthNotes = profile.healthNotes?.trim() || "无";
  const dayKeys = [];
  for (let day = dayStart; day <= dayEnd; day += 1) {
    dayKeys.push(`day-${day}`);
  }
  const dayRangeLabel = dayStart === dayEnd ? `day-${dayStart}` : `day-${dayStart} 到 day-${dayEnd}`;
  const femaleGluteLegGuide = buildFemaleGluteLegGuide(role, profile.fitnessLevel || "beginner");
  const personalizationBlock = buildPersonalizationPromptBlock(
    profile,
    role,
    challengeStartDate,
    dayStart,
    dayEnd
  );

  const iterativeSection =
    dayStart > 1 && iterativeContext?.weekReviewText
      ? `
${iterativeContext.weekReviewText}
${iterativeContext.priorPlansText || ""}

【迭代生成要求（第 ${dayStart}–${dayEnd} 天）】
- 必须延续前一周的分化顺序与主要动作选择，在此基础上递进
- 严格按「前一周训练回顾」中的完成率与备注调整组数、次数、重量描述
- 完成率 ≥85%：可加重 5–10% 或 reps +1–2，组数最多 +1
- 完成率 65–84%：小幅递进
- 完成率 <50%：保持或略降强度，note 强调动作质量
- 用户备注提到伤病/疲劳：必须替换或降强度相关动作
`
      : dayStart > 1
        ? `
【迭代生成要求（第 ${dayStart}–${dayEnd} 天）】
- 无详细打卡数据，按 21 天标准周期递进（第 8–14 天强度提升，第 15–21 天巩固加重）
- 仍需与第 1–7 天分化顺序保持连贯
`
        : "";

  let periodInfo = "";
  if (role === "female" && !preferenceAnalysis) {
    if (profile.lastPeriodDate) {
      const adjustments = getPeriodDaysInChallenge(
        challengeStartDate,
        profile.lastPeriodDate,
        profile.cycleLength
      );
      const inRange = adjustments.filter(
        (item) => item.challengeDay >= dayStart && item.challengeDay <= dayEnd
      );
      if (inRange.length > 0) {
        const detail = inRange
          .map((item) => `第${item.challengeDay}天（经期第${item.periodDay}天）`)
          .join("、");
        periodInfo = `【经期特别安排（预测的下一次经期与本段重叠）】\n本段 ${detail} 须：瑜伽/散步/轻度拉伸；经期友好饮食；title「经期调整日」；禁止大重量臀腿冲击`;
      } else if (adjustments.length > 0) {
        periodInfo = `\n【经期信息】21天内有经期日（第 ${adjustments.map((a) => a.challengeDay).join("、")} 天），但不在本段 ${dayStart}-${dayEnd}；若接近经期仍适当降低强度。`;
      } else {
        periodInfo = `\n【经期信息】已根据上次经期与周期推算：21天挑战内无预测经期重叠，本段按正常训练生成（勿自行添加经期调整日）。`;
      }
    } else {
      periodInfo = "\n【经期】未填写上次经期日期；若计划期间可能临近经期，适当降低强度。";
    }
  }

  return `${personalizationBlock}

请为以下用户生成 21 天挑战中 **${dayRangeLabel}** 的训练计划（共 ${dayKeys.length} 天，键名必须是 ${dayKeys.join("、")}）。

这是完整 21 天计划的分段生成（第 ${dayStart}–${dayEnd} 天）。必须与前后分段在分化顺序、强度递进上保持连贯。

请根据上方偏好数据制定计划：

【基本信息摘要】
- 性别：${gender}
- 训练等级：${level}（${levelGuide}）
- 训练目标：${goalText}（${goalGuide}；用户可能选择了多个目标，计划需综合兼顾，不能只顾其一）
- 可用器材：${equipment}（只能用这些器材，不能出现没有的器材）
- 每次训练时间：${duration}（动作数量和组数必须符合这个时间）
- 训练部位分化：${trainingSplit}（${trainingSplitGuide}；每天 title 必须标明当天训练部位/分化日）

【特殊安排】
- 每周其他运动（用户原文，请你理解后安排对应日期）：${otherActivities}
- 身体状况备注：${healthNotes}（有伤病或特殊情况的动作必须规避或替换）

${periodInfo}
${femaleGluteLegGuide}
${iterativeSection}

【强制执行规则，不可忽略】
- 器材是"仅徒手"：21天内绝对不能出现哑铃、杠铃、器械类动作
- 器材是"家里有哑铃/弹力带"：只能用哑铃和弹力带，不能出现健身房器械
- 器材是"健身房"：可以用所有器械
- 时间是30分钟：每天 2–3 个动作
- 时间是60分钟：每天 3–4 个动作
- 时间是90分钟以上：每天 4 个动作（不超过 4 个，女生臀腿主训日除外见下）
- 每天 workouts 数量：**2、3、4 个均可，一般不超过 4 个**；唯一例外见上方「女生臀腿训练日」可 5 个
- 组数/重量/次数随训练等级与 21 天周期递进（第 1–7 天偏低，8–14 天提升，15–21 天巩固加重）
- 训练分化必须严格执行：21天计划的每日训练部位排列必须符合所选分化体系，title 中注明如「推日」「拉日」「腿日」「胸日」等

计划要求：
1. 第 1-7 天：基础适应期（动作规范、中等偏低强度）
2. 第 8-14 天：强度提升期（逐步加重/加量）
3. 第 15-21 天：巩固强化期（挑战更高强度，仍注意安全）
4. 每天包含 title、workouts、meals 三个字段（不要输出 habits、睡眠、拉伸恢复等恢复类条目）
5. workouts 每项包含 name、sets、reps、rest、note（note 必须中文；**多数日子 2–4 个动作，不超过 4 个**）
6. reps 字段：次数用 "12" 或 "10-12"；时长用 "45秒" 或 "45-60s"；不要混用 "45秒 次"
7. 动作名称与 title 格式："中文名（English）"，中文在前、英文在括号内；禁止 "English（中文）" 反写
8. 若有每周其他运动，避免同天安排冲突的大强度训练
9. 若有身体状况备注，相关动作 note 中给出保护提示

【meals 一日六餐饮食规则】
每天必须输出 meals 对象，且仅包含饮食建议（禁止睡眠、拉伸、泡沫轴、恢复训练等恢复类内容）。
meals 必须包含且仅包含以下 6 个键，每个键的值必须是具体可执行的中文饮食建议（含食物名称与大致份量）：
- breakfast（早餐）
- morningSnack（上午茶）
- lunch（午餐）
- afternoonSnack（下午茶）
- dinner（晚餐）
- postWorkout（练后餐：结合当天训练部位与强度，写清蛋白质/碳水来源与时机）

要求：
- 必须先根据当天 title 与 workouts 判断训练类型（如推日/拉日/腿日/恢复日/有氧日），再生成该日专属 6 餐
- 21 天内任意两天的 meals 不得完全相同；至少 breakfast、lunch、dinner、postWorkout 要有明显差异
- postWorkout 必须点名当天主要训练部位（从 workouts 动作推断），并写清蛋白质与碳水来源、摄入时机
- 大肌群/高强度日（腿、背、胸）：午餐和练后餐增加优质碳水与蛋白质
- 恢复日/低强度日：总热量略降，练后餐改为轻量恢复
- 减脂目标：控制油脂与精制糖，晚餐偏清淡
- 增肌/力量目标：练后餐蛋白质充足，全天蛋白质分配均匀
- 女生经期调整日：6 餐改为温热易消化、补铁食物，减少生冷刺激

meals 示例（day-1 腿日训练）：
{
  "breakfast": "燕麦50g + 水煮蛋2个 + 蓝莓一小把",
  "morningSnack": "无糖希腊酸奶150g + 杏仁10粒",
  "lunch": "糙米饭半碗 + 鸡胸肉150g + 西兰花",
  "afternoonSnack": "香蕉1根 + 黑咖啡（可选）",
  "dinner": "清蒸鲈鱼150g + 大份时蔬沙拉",
  "postWorkout": "乳清蛋白30g + 白米饭80g（训练后45分钟内）"
}

返回 JSON 格式（**仅包含** ${dayKeys.join("、")}，每天必须有 meals 对象）：
{
  "day-${dayStart}": {
    "title": "...",
    "workouts": [{ "name": "...", "sets": 3, "reps": "10-12", "rest": "60s", "note": "..." }],
    "meals": {
      "breakfast": "...",
      "morningSnack": "...",
      "lunch": "...",
      "afternoonSnack": "...",
      "dinner": "...",
      "postWorkout": "..."
    }
  }${dayEnd > dayStart ? ',\n  ...' : ''}
}`;
}

function normalizeWorkout(item) {
  return {
    name: formatChinesePrimary(String(item?.name || "训练动作")),
    sets: typeof item?.sets === "number" ? item.sets : Number(item?.sets) || 3,
    reps: String(item?.reps || "10-12"),
    rest: String(item?.rest || "60s"),
    note: String(item?.note || ""),
  };
}

function normalizeMealText(item) {
  return String(item || "").trim();
}

function normalizeMeals(dayPlan) {
  if (!dayPlan?.meals || typeof dayPlan.meals !== "object") return null;

  const meals = {};
  for (const key of MEAL_KEYS) {
    const text = normalizeMealText(dayPlan.meals[key]);
    if (!text) return null;
    meals[key] = text;
  }
  return meals;
}

function mealsToHabits(meals) {
  return MEAL_KEYS.map((key) => `${MEAL_LABELS[key]}：${meals[key]}`);
}

function normalizeGeneratedPlan(raw, dayStart = 1, dayEnd = DAYS, role = "") {
  if (!raw || typeof raw !== "object") return null;

  const plans = {};
  for (let day = dayStart; day <= dayEnd; day += 1) {
    const key = `day-${day}`;
    const dayPlan = raw[key];
    if (!dayPlan || !Array.isArray(dayPlan.workouts) || !dayPlan.workouts.length) {
      return null;
    }
    const meals = normalizeMeals(dayPlan);
    if (!meals) {
      return null;
    }
    const limit = maxWorkoutsForDay(dayPlan, role);
    const workouts = dayPlan.workouts.slice(0, limit).map(normalizeWorkout);
    plans[key] = {
      title: formatChinesePrimary(String(dayPlan.title || `Day ${day}`)),
      workouts,
      meals,
      habits: mealsToHabits(meals),
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

  const {
    role,
    preferenceProfile,
    challengeStartDate,
    dayStart: rawDayStart,
    dayEnd: rawDayEnd,
    iterativeContext,
  } = body;
  if (!role || !preferenceProfile) {
    return res.status(400).json({ error: "缺少必要参数 role 或 preferenceProfile" });
  }

  const dayStart = Number(rawDayStart) || 1;
  const dayEnd = Number(rawDayEnd) || DAYS;
  if (
    !Number.isInteger(dayStart) ||
    !Number.isInteger(dayEnd) ||
    dayStart < 1 ||
    dayEnd > DAYS ||
    dayStart > dayEnd
  ) {
    return res.status(400).json({ error: "无效的天数范围 dayStart / dayEnd" });
  }

  const startDate = challengeStartDate || formatDateOnly(new Date());

  const userPrompt = buildUserPrompt({
    role,
    preferenceProfile,
    challengeStartDate: startDate,
    dayStart,
    dayEnd,
    iterativeContext: iterativeContext || null,
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
        max_tokens: CHUNK_MAX_TOKENS,
        temperature: 0.7,
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

    const parsed = extractJsonObject(text, "无法解析 AI 返回的 JSON");
    let plans = normalizeGeneratedPlan(parsed, dayStart, dayEnd, role);
    if (!plans) {
      return res.status(502).json({ error: "AI 返回的计划格式不完整" });
    }

    plans = finalizePlansWithProfile(
      plans,
      preferenceProfile,
      role,
      startDate,
      dayStart,
      dayEnd
    );

    return res.status(200).json({
      plans,
      meta: {
        source: "ai",
        fingerprint: buildPersonalizationFingerprint(preferenceProfile, role),
        fitnessLevel: preferenceProfile?.fitnessLevel,
        dayStart,
        dayEnd,
      },
    });
  } catch (err) {
    console.error("generate-plan API error:", err);
    return res.status(500).json({ error: err.message || "生成计划时出错，请稍后重试" });
  }
}
