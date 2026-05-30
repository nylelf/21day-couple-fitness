import { getPlanMealItems } from "./mealPlan";
import { dayKey, normalizeCheckinEntry } from "./challenge";
import { isStoredAiDayPlan } from "./planMeta";

function summarizeWorkouts(workouts = []) {
  return workouts
    .map((item) => {
      const sets = item.sets != null ? `${item.sets}组` : "";
      const reps = item.reps ? ` x ${item.reps}` : "";
      return `${item.name}${sets || reps ? `（${sets}${reps}）` : ""}`;
    })
    .join("；");
}

export function summarizePriorPlans(rolePlans, dayStart, dayEnd) {
  const summary = {};
  for (let day = dayStart; day <= dayEnd; day += 1) {
    const key = dayKey(day);
    const plan = rolePlans?.[key];
    if (!isStoredAiDayPlan(plan)) continue;
    summary[key] = {
      title: plan.title || "",
      workouts: (plan.workouts || []).map((item) => ({
        name: item.name,
        sets: item.sets,
        reps: item.reps,
        rest: item.rest,
      })),
    };
  }
  return summary;
}

export function buildWeekReview(challenge, role, weekStart, weekEnd) {
  const rolePlans = challenge?.plans?.[role] || {};
  const roleCheckins = challenge?.checkins?.[role] || {};
  const roleNotes = challenge?.notes?.[role] || {};

  const dailySummaries = [];
  let totalWorkoutSlots = 0;
  let doneWorkoutSlots = 0;
  let totalMealSlots = 0;
  let doneMealSlots = 0;
  let daysWithAnyCheckin = 0;
  const noteSnippets = [];

  for (let day = weekStart; day <= weekEnd; day += 1) {
    const key = dayKey(day);
    const plan = rolePlans[key];
    if (!isStoredAiDayPlan(plan)) continue;

    const checkin = normalizeCheckinEntry(roleCheckins[key]);
    const mealItems = getPlanMealItems(plan);
    const workoutTotal = plan.workouts?.length || 0;
    const workoutDone = Object.values(checkin.workouts || {}).filter(Boolean).length;
    const mealDone = Object.values(checkin.habits || {}).filter(Boolean).length;
    const mealTotal = mealItems.length;
    const dayTotal = workoutTotal + mealTotal;
    const dayDone = workoutDone + mealDone;

    totalWorkoutSlots += workoutTotal;
    doneWorkoutSlots += workoutDone;
    totalMealSlots += mealTotal;
    doneMealSlots += mealDone;
    if (dayDone > 0) daysWithAnyCheckin += 1;

    const note = (roleNotes[key] || "").trim();
    if (note) noteSnippets.push(`第${day}天：${note.slice(0, 120)}`);

    dailySummaries.push({
      day,
      title: plan.title || "",
      completionPercent: dayTotal ? Math.round((dayDone / dayTotal) * 100) : 0,
      workoutsDone: workoutDone,
      workoutsTotal: workoutTotal,
      mealsDone: mealDone,
      mealsTotal: mealTotal,
      workoutSummary: summarizeWorkouts(plan.workouts),
      note: note || null,
    });
  }

  const avgCompletionPercent =
    totalWorkoutSlots + totalMealSlots
      ? Math.round(((doneWorkoutSlots + doneMealSlots) / (totalWorkoutSlots + totalMealSlots)) * 100)
      : 0;
  const workoutCompletionPercent = totalWorkoutSlots
    ? Math.round((doneWorkoutSlots / totalWorkoutSlots) * 100)
    : 0;
  const mealCompletionPercent = totalMealSlots ? Math.round((doneMealSlots / totalMealSlots) * 100) : 0;

  const progressionHints = [];
  if (avgCompletionPercent >= 85) {
    progressionHints.push("完成率很高：下一周可加重 5–10% 或每组 +1 次，组数最多 +1");
  } else if (avgCompletionPercent >= 65) {
    progressionHints.push("完成率良好：下一周小幅递进（加重 5% 或 reps 上限 +1–2）");
  } else if (avgCompletionPercent >= 40) {
    progressionHints.push("完成率一般：下一周保持类似容量，优先动作质量与分化连贯");
  } else if (daysWithAnyCheckin > 0) {
    progressionHints.push("完成率偏低：下一周略降组数或强度，动作更基础，note 强调恢复与坚持");
  } else {
    progressionHints.push("本周几乎无打卡：下一周按训练等级做标准递进，但避免突然大幅加量");
  }

  if (workoutCompletionPercent < mealCompletionPercent - 20) {
    progressionHints.push("训练完成明显低于饮食：下一周可略减单课动作数或缩短组间休息要求");
  }

  const injuryKeywords = /(膝|腰|肩|伤|痛|疼|不适|经期|累|疲劳|knee|back|pain)/i;
  const flaggedNotes = noteSnippets.filter((text) => injuryKeywords.test(text));
  if (flaggedNotes.length) {
    progressionHints.push(`用户备注提到不适或疲劳，相关部位动作需替换或降强度：${flaggedNotes.slice(0, 3).join("；")}`);
  }

  const weekNumber = weekStart <= 7 ? 1 : weekStart <= 14 ? 2 : 3;

  return {
    weekNumber,
    dayRange: `${weekStart}-${weekEnd}`,
    daysInWeek: weekEnd - weekStart + 1,
    daysWithAnyCheckin,
    avgCompletionPercent,
    workoutCompletionPercent,
    mealCompletionPercent,
    dailySummaries,
    progressionHints,
    notesSummary: noteSnippets.slice(0, 8).join("\n") || "无",
  };
}

export function formatWeekReviewForPrompt(weekReview) {
  if (!weekReview) return "";
  const lines = [
    `【前一周（第 ${weekReview.dayRange} 天）训练回顾 — 必须据此调整下一周】`,
    `- 有打卡的天数：${weekReview.daysWithAnyCheckin} / ${weekReview.daysInWeek}`,
    `- 综合完成率：${weekReview.avgCompletionPercent}%（训练 ${weekReview.workoutCompletionPercent}%，饮食 ${weekReview.mealCompletionPercent}%）`,
    `- 递进建议：${weekReview.progressionHints.join("；")}`,
  ];

  if (weekReview.dailySummaries.length) {
    lines.push("- 每日摘要：");
    weekReview.dailySummaries.forEach((day) => {
      lines.push(
        `  · 第${day.day}天「${day.title}」完成 ${day.completionPercent}%（训练 ${day.workoutsDone}/${day.workoutsTotal}）${day.workoutSummary ? `｜${day.workoutSummary}` : ""}${day.note ? `｜备注：${day.note.slice(0, 80)}` : ""}`
      );
    });
  }

  if (weekReview.notesSummary && weekReview.notesSummary !== "无") {
    lines.push(`- 用户备注汇总：\n${weekReview.notesSummary}`);
  }

  return lines.join("\n");
}

export function formatPriorPlansForPrompt(priorWeekPlans) {
  if (!priorWeekPlans || !Object.keys(priorWeekPlans).length) return "";
  const lines = ["【前一周计划摘要 — 保持分化顺序与动作选择连贯，在此基础上递进】"];
  Object.entries(priorWeekPlans)
    .sort(([a], [b]) => Number(a.replace("day-", "")) - Number(b.replace("day-", "")))
    .forEach(([key, plan]) => {
      const workoutText = (plan.workouts || [])
        .map((w) => `${w.name} ${w.sets}组 x ${w.reps}`)
        .join("；");
      lines.push(`- ${key} ${plan.title}：${workoutText}`);
    });
  return lines.join("\n");
}
