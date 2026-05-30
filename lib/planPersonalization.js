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
  if (level === "advanced") return { min: 4, max: 5 };
  if (level === "intermediate") return { min: 3, max: 4 };
  if (level === "novice") return { min: 3, max: 3 };
  return { min: 2, max: 3 };
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

export function detectActivityDays(otherActivities, challengeStartDate, totalDays = 21) {
  const text = String(otherActivities || "").trim();
  if (!text) return [];

  const start = parseDateOnly(challengeStartDate);
  const days = [];
  const sportHint = text.replace(/周[一二三四五六日天]/g, "").trim() || "其他运动";

  for (let day = 1; day <= totalDays; day += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + day - 1);
    const weekday = d.getDay();
    const monBased = weekday === 0 ? 6 : weekday - 1;

    for (const entry of WEEKDAY_DETECT) {
      const hit = entry.tokens.some((token) => text.toLowerCase().includes(token.toLowerCase()));
      if (hit && entry.index === monBased) {
        days.push({ day, label: sportHint });
        break;
      }
    }
  }
  return days;
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
  const range = getSetsRangeForLevel(level);
  const label = LEVEL_LABELS[level] || level;
  return `${label}：每个动作 ${range.min}-${range.max} 组；${level === "beginner" || level === "novice" ? "note 必须写清动作要领" : ""}${level === "advanced" ? "可安排递减组/超级组" : ""}`;
}

export function buildPersonalizationPromptBlock(profile, role, challengeStartDate, dayStart, dayEnd) {
  const goals = normalizeGoals(profile);
  const goalText = goals.map((g) => GOAL_LABELS[g] || g).join("、") || "未指定";
  const equipment = profile?.equipment || "gym";
  const duration = Number(profile?.sessionDuration) || 60;
  const split = profile?.trainingSplit || "push_pull_legs";
  const level = profile?.fitnessLevel || "beginner";
  const maxExercises = getMaxExercisesForDuration(duration);
  const activityDays = detectActivityDays(profile?.otherActivities, challengeStartDate);

  const scheduleLines = [];
  for (let day = dayStart; day <= dayEnd; day += 1) {
    const splitLabel = getSplitDayLabel(role, split, day);
    const activity = activityDays.find((item) => item.day === day);
    if (activity) {
      scheduleLines.push(`第${day}天：【运动日恢复】仅15分钟拉伸，title 必须含「${activity.label}」且不得安排力量训练`);
    } else {
      scheduleLines.push(`第${day}天：${splitLabel}（title 与 workouts 必须对应该分化日，不得写成无关部位）`);
    }
  }

  const genderGuide =
    role === "female"
      ? "女生：臀腿日主训优先臀主导动作；若目标含翘臀/瘦腿，下肢日动作选择必须明显不同于男生胸肩日模板"
      : "男生：按胸/背/肩腿分化安排，力量目标日主项为深蹲卧推硬拉类";

  return `
【★ 个人配置锁定 — 以下每一条都必须体现在计划中，禁止输出通用模板 ★】
- 性别：${role === "female" ? "女生" : "男生"}（${genderGuide}）
- 训练等级：${LEVEL_LABELS[level] || level}
- 训练目标：${goalText}
- 可用器材：${EQUIPMENT_LABELS[equipment] || equipment}
- 单次训练时长：${duration} 分钟 → 每个训练日 workouts 数量必须为 ${duration <= 30 ? "2-3" : duration <= 45 ? "3" : "3-4"} 个（不超过 ${maxExercises}；女生臀腿主训日可 5 个见专项规则）
- 训练分化：${SPLIT_LABELS[split] || split} → 严格按下表每日部位生成，不得全部写成相同的「推/拉/腿」套话

${buildEquipmentRules(equipment)}
${buildLevelRules(level)}

【目标导向】
${buildGoalActionGuide(goals, role)}

【${dayStart}-${dayEnd} 天每日分化日程（必须逐日遵守）】
${scheduleLines.join("\n")}

【差异化自检 — 生成前请确认】
1. 若器材=仅徒手，计划中不得出现任何器械/杠铃名称
2. 若时长=30分钟，不得出现 5 个动作（除女生臀腿 5 动作日）
3. 若分化=全身/五分化/二分化，每日 title 必须与上表一致，不能 7 天全是「推日」
4. 若填写了每周其他运动，对应天只能拉伸恢复
5. 不同训练日的动作名称不得 7 天高度重复（至少换 40% 动作或变式）
${profile?.healthNotes ? `\n【伤病备注 — 必须规避】\n${profile.healthNotes}` : ""}
`.trim();
}

export function applyProfileToPlan(plan, profile, role) {
  if (!plan || plan.pending) return plan;

  const goals = normalizeGoals(profile);
  const equipment = profile?.equipment || "gym";
  const duration = Number(profile?.sessionDuration) || 60;
  const level = profile?.fitnessLevel || "beginner";
  const maxExercises = getMaxExercisesForDuration(duration);
  const setsRange = getSetsRangeForLevel(level);
  const rest = getRestForGoals(goals, level);

  let workouts = [...(plan.workouts || [])];

  if (equipment === "bodyweight") {
    workouts = workouts
      .map((item) => ({
        ...item,
        name: item.name
          .replace(/杠铃|哑铃|器械|腿举|绳索|Cable|Smith|Leg Press|Bench Press/gi, "自重")
          .replace(/（[^）]*）/g, "（Bodyweight）"),
        note: `${item.note || ""} 徒手完成，无器械。`.trim(),
      }))
      .filter((item) => !/(腿举|Leg Press|高位下拉|器械|Cable|杠铃)/i.test(item.name));
  } else if (equipment === "home") {
    workouts = workouts.map((item) => ({
      ...item,
      name: item.name.replace(/杠铃|腿举|Leg Press|史密斯|Cable/gi, "哑铃"),
      note: `${item.note || ""} 居家哑铃/弹力带替代。`.trim(),
    }));
  }

  workouts = workouts.slice(0, maxExercises).map((item) => {
    let sets = typeof item.sets === "number" ? item.sets : Number(item.sets) || 3;
    sets = Math.min(Math.max(sets, setsRange.min), setsRange.max);
    return {
      ...item,
      sets,
      rest: item.rest || rest,
      reps:
        goals.includes("strength") && /蹲|推|拉|硬拉|squat|press|deadlift/i.test(item.name)
          ? "4-6"
          : goals.includes("fat_loss")
            ? "12-15"
            : item.reps,
    };
  });

  const goalTags = goals.map((g) => GOAL_LABELS[g]).filter(Boolean).slice(0, 2);
  const suffix = goalTags.length ? ` · ${goalTags.join("/")}` : "";
  const equipTag =
    equipment === "bodyweight" ? " · 徒手" : equipment === "home" ? " · 居家" : "";

  return {
    ...plan,
    title: `${plan.title}${suffix}${equipTag}`,
    workouts,
    meals: plan.meals,
    habits: plan.habits,
  };
}

export function buildPersonalizationFingerprint(profile, role) {
  const goals = normalizeGoals(profile).sort().join(",");
  return [role, profile?.fitnessLevel, goals, profile?.equipment, profile?.sessionDuration, profile?.trainingSplit]
    .filter(Boolean)
    .join("|");
}
