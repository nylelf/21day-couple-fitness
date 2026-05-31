/**
 * Shared plan personalization rules (used by API + client fallback templates).
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

const EQUIPMENT_LABELS = {
  bodyweight: "仅徒手",
  home: "哑铃/弹力带（居家）",
  gym: "健身房（全器械）",
};

const SPLIT_LABELS = {
  full_body: "全身训练",
  upper_lower: "二分化 Upper/Lower",
  push_pull_legs: "三分化 PPL",
  bro_4: "四分化",
  bro_5: "五分化 Bro",
  bro_6: "六分化",
};

const SPLIT_DAY_LABELS = {
  full_body: ["全身训练A", "全身训练B", "全身训练C", "全身训练A", "全身训练B", "全身训练C", "主动恢复"],
  upper_lower: ["上肢日", "下肢日", "上肢日", "下肢日", "上肢日", "下肢日", "主动恢复"],
  push_pull_legs: ["推日", "拉日", "腿日", "推日", "拉日", "腿日", "主动恢复"],
  bro_4: ["胸日", "背日", "肩臂日", "腿日", "胸日", "背日", "主动恢复"],
  bro_5: ["胸日", "背日", "肩日", "腿日", "手臂日", "胸日", "主动恢复"],
  bro_6: ["胸日", "背日", "肩日", "腿日", "手臂日", "核心日", "主动恢复"],
};

const FEMALE_SPLIT_DAY_LABELS = {
  full_body: ["全身塑形A", "全身塑形B", "全身塑形C", "全身塑形A", "全身塑形B", "全身塑形C", "主动恢复"],
  upper_lower: ["上肢塑形", "臀腿日", "上肢塑形", "臀腿日", "上肢塑形", "臀腿日", "主动恢复"],
  push_pull_legs: ["上肢推日", "上肢拉日", "臀腿日", "上肢推日", "上肢拉日", "臀腿日", "主动恢复"],
  bro_4: ["胸肩日", "背日", "臀腿日", "核心有氧", "胸肩日", "背日", "主动恢复"],
  bro_5: ["胸日", "背日", "肩日", "臀腿日", "手臂核心", "胸日", "主动恢复"],
  bro_6: ["胸日", "背日", "肩日", "臀腿日", "手臂日", "核心恢复", "主动恢复"],
};

/** Template keys per calendar weekday (0=Mon) — maps training split to fallback library keys */
const MALE_TEMPLATE_CYCLES = {
  full_body: ["chestTriA", "backBiA", "shoulderLegA", "recoveryCore", "upperHypertrophy", "chestTriA", "recoveryCore"],
  upper_lower: ["chestTriA", "backBiA", "shoulderLegA", "chestTriA", "backBiA", "shoulderLegA", "recoveryCore"],
  push_pull_legs: ["chestTriA", "backBiA", "shoulderLegA", "chestTriA", "backBiA", "shoulderLegA", "recoveryCore"],
  bro_4: ["chestTriA", "backBiA", "shoulderLegA", "recoveryCore", "chestTriA", "backBiA", "recoveryCore"],
  bro_5: ["chestTriA", "backBiA", "shoulderLegA", "chestTriA", "backBiA", "recoveryCore", "recoveryCore"],
  bro_6: ["chestTriA", "backBiA", "shoulderLegA", "chestTriA", "backBiA", "recoveryCore", "recoveryCore"],
};

const FEMALE_TEMPLATE_CYCLES = {
  full_body: ["lowerA", "upperA", "lowerB", "cardioRecovery", "lowerA", "upperA", "activeRecovery"],
  upper_lower: ["upperA", "lowerA", "upperA", "lowerB", "upperA", "lowerA", "activeRecovery"],
  push_pull_legs: ["upperA", "upperA", "lowerA", "upperA", "upperA", "lowerB", "activeRecovery"],
  bro_4: ["lowerA", "upperA", "lowerB", "cardioRecovery", "lowerA", "upperA", "activeRecovery"],
  bro_5: ["lowerA", "upperA", "lowerA", "lowerB", "upperA", "lowerA", "activeRecovery"],
  bro_6: ["lowerA", "upperA", "lowerA", "lowerB", "upperA", "cardioRecovery", "activeRecovery"],
};

const WEEKDAY_DETECT = [
  { tokens: ["周一", "星期一", "monday"], index: 0 },
  { tokens: ["周二", "星期二", "tuesday"], index: 1 },
  { tokens: ["周三", "星期三", "wednesday"], index: 2 },
  { tokens: ["周四", "星期四", "thursday"], index: 3 },
  { tokens: ["周五", "星期五", "friday"], index: 4 },
  { tokens: ["周六", "星期六", "saturday"], index: 5 },
  { tokens: ["周日", "星期天", "星期日", "周天", "sunday"], index: 6 },
];

function normalizeGoals(profile) {
  const raw = profile?.goals !== undefined ? profile.goals : profile?.goal;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.filter(Boolean);
}

export function getMaxExercisesForDuration(minutes) {
  if (minutes <= 30) return 3;
  if (minutes <= 45) return 3;
  if (minutes <= 60) return 4;
  return 4;
}

export function getSetsRangeForLevel(level) {
  return getLevelPrescription(level);
}

/** Fixed prescription per tier — post-process FORCES these values (AI output is not trusted for intensity). */
export function getLevelPrescription(level) {
  const table = {
    beginner: {
      sets: 2,
      reps: "12-15",
      rest: "75-90s",
      tierTag: "L1新手",
      noteSuffix: "L1：留2–3次余力，轻重量或自重，先学标准动作。",
      promptLine: "L1：每个动作固定2组×12-15次，组间休息75-90秒，禁止4-5组或大重量",
    },
    novice: {
      sets: 3,
      reps: "10-12",
      rest: "60-75s",
      tierTag: "L2初级",
      noteSuffix: "L2：动作稳定后小幅加重。",
      promptLine: "L2：每个动作固定3组×10-12次，组间休息60-75秒",
    },
    intermediate: {
      sets: 4,
      reps: "8-12",
      rest: "60s",
      tierTag: "L3中级",
      noteSuffix: "L3：最后一组可接近力竭，仍保持动作质量。",
      promptLine: "L3：每个动作固定4组×8-12次，组间休息约60秒",
    },
    advanced: {
      sets: 5,
      reps: "6-10",
      rest: "90-120s",
      tierTag: "L4高级",
      noteSuffix: "L4：主项大重量，可做递减组/超级组。",
      promptLine: "L4：每个动作固定5组×6-10次，主项休息90-120秒，高容量",
    },
    recovery: {
      sets: 2,
      reps: "10-12",
      rest: "90s",
      tierTag: "恢复",
      noteSuffix: "恢复：低冲击、关节友好。",
      promptLine: "恢复：每个动作2组，轻负荷",
    },
  };
  return table[level] || table.beginner;
}

export function getRestForGoals(goals, level) {
  const list = goals || [];
  if (list.includes("fat_loss")) return "45-60s";
  if (list.includes("strength") || list.includes("muscle_gain")) return "75-90s";
  if (level === "beginner" || level === "novice") return "60-75s";
  return "60s";
}

export function getTemplateKeyForDay(role, trainingSplit, weekdayIndex) {
  const split = SPLIT_DAY_LABELS[trainingSplit] ? trainingSplit : "push_pull_legs";
  const cycles = role === "female" ? FEMALE_TEMPLATE_CYCLES : MALE_TEMPLATE_CYCLES;
  const cycle = cycles[split] || cycles.push_pull_legs;
  return cycle[weekdayIndex % 7];
}

export function getSplitDayLabel(role, trainingSplit, dayNumber) {
  const split = trainingSplit && (SPLIT_DAY_LABELS[trainingSplit] || FEMALE_SPLIT_DAY_LABELS[trainingSplit])
    ? trainingSplit
    : "push_pull_legs";
  const labels = role === "female" ? FEMALE_SPLIT_DAY_LABELS[split] : SPLIT_DAY_LABELS[split];
  const cycle = labels || SPLIT_DAY_LABELS.push_pull_legs;
  return cycle[(dayNumber - 1) % 7];
}

const WEEKDAY_CHAR_TO_INDEX = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 };
const INDEX_TO_CHAR = ["一", "二", "三", "四", "五", "六", "日"];

function parseWeekdayIndicesFromText(text) {
  const indices = new Set();
  const lower = text.toLowerCase();

  for (const match of text.matchAll(/周([一二三四五六日天])/g)) {
    const idx = WEEKDAY_CHAR_TO_INDEX[match[1]];
    if (idx !== undefined) indices.add(idx);
  }
  for (const match of text.matchAll(/星期([一二三四五六日])/g)) {
    const idx = WEEKDAY_CHAR_TO_INDEX[match[1]];
    if (idx !== undefined) indices.add(idx);
  }
  for (const match of text.matchAll(/礼拜([一二三四五六日])/g)) {
    const idx = WEEKDAY_CHAR_TO_INDEX[match[1]];
    if (idx !== undefined) indices.add(idx);
  }

  for (const entry of WEEKDAY_DETECT) {
    for (const token of entry.tokens) {
      if (/^周|星期|礼拜/.test(token)) continue;
      if (lower.includes(token.toLowerCase())) indices.add(entry.index);
    }
  }

  return [...indices];
}

/** Split "周五打篮球；周日爬山" or "周五周日打篮球" into weekday + label pairs. */
function parseActivityClauses(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/[；;，,、\n]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts
      .map((clause) => ({
        weekdayIndices: parseWeekdayIndicesFromText(clause),
        label: cleanActivityLabel(clause),
      }))
      .filter((clause) => clause.weekdayIndices.length > 0);
  }

  const weekdayIndices = parseWeekdayIndicesFromText(trimmed);
  if (!weekdayIndices.length) return [];

  return [{ weekdayIndices, label: cleanActivityLabel(trimmed) }];
}

export function cleanActivityLabel(raw) {
  let label = String(raw || "")
    .replace(/周[一二三四五六日天]/g, " ")
    .replace(/星期[一二三四五六日]/g, " ")
    .replace(/礼拜[一二三四五六日]/g, " ")
    .replace(/每周|每个|固定|去|有|和|与|及/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  label = label.replace(/^(晚上|傍晚|下午|早上|上午|中午|课后|后)\s*/g, "").trim();
  label = label.replace(/[、，,；;。\s]+$/g, "").trim();
  return label || "其他运动";
}

function extractLabelNearWeekday(text, weekdayChar) {
  const patterns = [
    new RegExp(`周${weekdayChar}[^周一二三四五六日天]{0,30}`),
    new RegExp(`星期${weekdayChar}[^周一二三四五六日]{0,30}`),
    new RegExp(`礼拜${weekdayChar}[^周一二三四五六日]{0,30}`),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return cleanActivityLabel(match[0].replace(/^周./, "").replace(/^星期./, "").replace(/^礼拜./, ""));
    }
  }
  return cleanActivityLabel(text);
}

export function detectActivityDays(otherActivities, challengeStartDate, totalDays = 21) {
  const text = String(otherActivities || "").trim();
  if (!text) return [];

  const clauses = parseActivityClauses(text);
  if (!clauses.length) return [];

  const start = parseDateOnly(challengeStartDate);
  const days = [];
  const seen = new Set();

  for (let day = 1; day <= totalDays; day += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + day - 1);
    const monBased = d.getDay() === 0 ? 6 : d.getDay() - 1;

    for (const clause of clauses) {
      if (!clause.weekdayIndices.includes(monBased) || seen.has(day)) continue;
      days.push({ day, weekdayIndex: monBased, label: clause.label });
      seen.add(day);
      break;
    }
  }

  return days;
}

export function buildActivityRecoveryPlan(day, activityLabel) {
  const label = cleanActivityLabel(activityLabel);
  return {
    title: `第 ${day} 天 · ${label} · 运动日恢复（App 内仅拉伸）`,
    workouts: [
      {
        name: "泡沫轴放松（Foam Rolling）",
        sets: 1,
        reps: "8-10分钟",
        rest: "-",
        note: `今日已安排「${label}」，本计划仅做恢复拉伸，不做力量训练或技术课。`,
      },
      {
        name: "髋屈肌拉伸（Hip Flexor Stretch）",
        sets: 2,
        reps: "30秒/侧",
        rest: "20s",
        note: "配合今日运动，缓慢呼吸。",
      },
      {
        name: "腘绳肌拉伸（Hamstring Stretch）",
        sets: 2,
        reps: "30秒/侧",
        rest: "20s",
        note: "无疼痛范围内进行。",
      },
    ],
    meals: {
      breakfast: "全麦吐司 + 鸡蛋 + 水果（运动日适量碳水）",
      morningSnack: "酸奶一小杯",
      lunch: "均衡正餐，七分饱",
      afternoonSnack: "香蕉或坚果少量",
      dinner: "清淡蛋白质 + 蔬菜（运动日后补充）",
      postWorkout: `今日主项为「${label}」，练后以轻量蛋白质+碳水为主，避免油腻`,
    },
    habits: [],
  };
}

export function applyActivityDaysToPlans(plans, activityDays, dayStart = 1, dayEnd = 21) {
  if (!activityDays?.length || !plans) return plans;

  const next = { ...plans };
  for (const item of activityDays) {
    if (item.day < dayStart || item.day > dayEnd) continue;
    const key = `day-${item.day}`;
    const recovery = buildActivityRecoveryPlan(item.day, item.label);
    recovery.habits = recovery.meals
      ? [
          `早餐：${recovery.meals.breakfast}`,
          `上午茶：${recovery.meals.morningSnack}`,
          `午餐：${recovery.meals.lunch}`,
          `下午茶：${recovery.meals.afternoonSnack}`,
          `晚餐：${recovery.meals.dinner}`,
          `练后餐：${recovery.meals.postWorkout}`,
        ]
      : [];
    next[key] = recovery;
  }
  return next;
}

function parseDateOnly(dateValue) {
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateValue);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function buildGoalActionGuide(goals, role) {
  const lines = [];
  if (goals.includes("fat_loss")) lines.push("减脂优先：复合动作为主、组间休息偏短、有氧/代谢元素、晚餐与练后餐控脂");
  if (goals.includes("muscle_gain")) lines.push("增肌优先：孤立+复合结合、较高容量、练后高蛋白高碳水");
  if (goals.includes("strength")) lines.push("力量优先：主项深蹲/卧推/硬拉或等价变式，次数 4-6 次为主");
  if (goals.includes("glute_shape")) lines.push("翘臀优先：臀主导下肢、RDL/臀推/外展，控制股四过度发力");
  if (goals.includes("slim_legs")) lines.push("瘦腿优先：臀主导、少股四爆发动作，多后链与代谢");
  if (goals.includes("abs_line")) lines.push("马甲线：每日安排核心激活，控制精制碳水");
  if (goals.includes("postpartum") || goals.includes("rehab")) lines.push("恢复/康复：低冲击、关节友好、组数保守");
  if (role === "female" && goals.includes("full_body_shape")) lines.push("全身塑形：臀肩背协调，线条感训练");
  return lines.length ? lines.join("\n") : "综合体能与体态，按计划分化均衡安排";
}

function buildEquipmentRules(equipment) {
  if (equipment === "bodyweight") {
    return [
      "【器材锁定：仅徒手】禁止出现：杠铃、哑铃、史密斯、腿举机、绳索、器械、Cable、Leg Press、Bench Press 等器械名",
      "动作必须改为：俯卧撑、自重深蹲、弓步、臀桥、平板支撑、卷腹、超人式、弹力带侧抬腿（若完全徒手则写侧抬腿）等",
    ].join("\n");
  }
  if (equipment === "home") {
    return [
      "【器材锁定：居家】仅允许：哑铃、弹力带、自重；禁止：杠铃、腿举机、史密斯、大型固定器械",
      "动作名注明哑铃/弹力带变式，例如「哑铃卧推（Dumbbell Press）」",
    ].join("\n");
  }
  return "【器材锁定：健身房】可使用杠铃、哑铃、器械、绳索等健身房设备";
}

function buildLevelRules(level) {
  const rx = getLevelPrescription(level);
  return `${LEVEL_LABELS[level] || level}：${rx.promptLine}；title 或 note 须带「${rx.tierTag}」标识`;
}

export function buildPersonalizationPromptBlock(profile, role, challengeStartDate, dayStart, dayEnd) {
  const goals = normalizeGoals(profile);
  const goalText = goals.map((g) => GOAL_LABELS[g] || g).join("、") || "未指定";
  const equipment = profile?.equipment || "gym";
  const duration = Number(profile?.sessionDuration) || 60;
  const split = profile?.trainingSplit || "push_pull_legs";
  const level = profile?.fitnessLevel || "beginner";
  const maxExercises = getMaxExercisesForDuration(duration);
  const rx = getLevelPrescription(level);

  const genderGuide =
    role === "female"
      ? "女生：臀腿日主训优先臀主导动作；若目标含翘臀/瘦腿，下肢日动作选择必须明显不同于男生胸肩日模板"
      : "男生：按胸/背/肩腿分化安排，力量目标日主项为深蹲卧推硬拉类";

  const otherActivitiesRaw = (profile?.otherActivities || "").trim();

  return `
【学员偏好数据 — 请综合理解后生成计划，勿套用固定模板】
- 性别：${role === "female" ? "女生" : "男生"}（${genderGuide}）
- 训练等级：${LEVEL_LABELS[level] || level} → ${rx.promptLine}（L1/L4 组数次数休息必须肉眼可辨的不同）
- 训练目标：${goalText}
- 可用器材：${EQUIPMENT_LABELS[equipment] || equipment}
- 单次训练时长：${duration} 分钟（每训练日约 ${duration <= 30 ? "2-3" : "3-4"} 个动作，不超过 ${maxExercises}；女生臀腿主训日可 5 个）
- 训练分化：${SPLIT_LABELS[split] || split}
- 每周其他运动（用户原文，自行读懂其中所有运动与星期几）：${otherActivitiesRaw || "无"}

${buildEquipmentRules(equipment)}
${buildLevelRules(level)}

【目标导向】
${buildGoalActionGuide(goals, role)}

【生成原则】
1. 先理解「每周其他运动」原文，自行判断哪些挑战日有外部运动（如爬山、羽毛球、芭蕾、篮球等），再安排该日计划
2. 有外部运动的日子：App 内训练应与之配合（通常减量、拉伸恢复、title 点明该运动），具体动作由你设计，不要与此外部运动重复排大强度力量课
3. 训练日须符合分化；${dayStart}-${dayEnd} 每天 title/workouts/meals 应有区别
4. 组数次数休息必须体现所选训练等级
${profile?.healthNotes ? `\n【伤病备注】\n${profile.healthNotes}` : ""}
`.trim();
}

/** Apply equipment/duration guards + user「每周其他运动」to a plan chunk. */
export function finalizePlansWithProfile(plans, profile, role, challengeStartDate, dayStart, dayEnd) {
  if (!plans) return plans;

  let next = applyLightPlanGuards(plans, profile, role, dayStart, dayEnd);
  const activityDays = detectActivityDays(profile?.otherActivities, challengeStartDate, 21).filter(
    (item) => item.day >= dayStart && item.day <= dayEnd
  );
  if (activityDays.length) {
    next = applyActivityDaysToPlans(next, activityDays, dayStart, dayEnd);
  }
  return next;
}

/** Light guards only — does NOT replace AI plans with fixed templates. */
export function applyLightPlanGuards(plans, profile, role, dayStart, dayEnd) {
  if (!plans) return plans;
  const next = { ...plans };
  for (let day = dayStart; day <= dayEnd; day += 1) {
    const key = `day-${day}`;
    if (!next[key]) continue;
    next[key] = applyLightPlanGuard(next[key], profile, role);
  }
  return next;
}

/** @deprecated use applyLightPlanGuards */
export function shapePlansWithProfile(plans, profile, role, _challengeStartDate, dayStart, dayEnd) {
  return applyLightPlanGuards(plans, profile, role, dayStart, dayEnd);
}

export function applyLightPlanGuard(plan, profile, role) {
  if (!plan || plan.pending) return plan;

  const goals = normalizeGoals(profile);
  const equipment = profile?.equipment || "gym";
  const duration = Number(profile?.sessionDuration) || 60;
  const maxExercises = getMaxExercisesForDuration(duration);
  const rest = getRestForGoals(goals, profile?.fitnessLevel || "beginner");

  let workouts = [...(plan.workouts || [])];

  if (equipment === "bodyweight") {
    workouts = workouts.filter((item) => !/(腿举|Leg Press|高位下拉|Smith Machine)/i.test(item.name));
  }

  workouts = workouts.slice(0, maxExercises).map((item) => ({
    ...item,
    rest: item.rest || rest,
  }));

  return { ...plan, workouts, meals: plan.meals, habits: plan.habits };
}

/** @deprecated use applyLightPlanGuard */
export function applyProfileToPlan(plan, profile, role) {
  return applyLightPlanGuard(plan, profile, role);
}

export function buildPersonalizationFingerprint(profile, role) {
  const goals = normalizeGoals(profile).sort().join(",");
  const other = String(profile?.otherActivities || "").trim();
  return [
    role,
    profile?.fitnessLevel,
    goals,
    profile?.equipment,
    profile?.sessionDuration,
    profile?.trainingSplit,
    other,
  ]
    .filter(Boolean)
    .join("|");
}
