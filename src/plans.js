const ROLE_MALE = "male";
const ROLE_FEMALE = "female";

const dailyHabits = ["Protein Target（蛋白质达标）", "Water 2L+（饮水2L+）", "Sleep 7h+（睡眠7小时+）", "Stretching（拉伸恢复）"];

const maleTemplates = {
  chestTriA: {
    title: "Chest + Triceps（胸+三头）",
    workouts: [
      { name: "Barbell Bench Press（杠铃卧推）", sets: 4, reps: "6-8", rest: "90s", note: "Drive through feet and keep shoulder blades tucked." },
      { name: "Incline Dumbbell Press（上斜哑铃卧推）", sets: 3, reps: "8-10", rest: "75s", note: "Control lowering and avoid shrugging." },
      { name: "Cable Fly（绳索夹胸）", sets: 3, reps: "12-15", rest: "60s", note: "Soft elbows and squeeze chest at peak." },
      { name: "Rope Pushdown（绳索下压）", sets: 3, reps: "10-12", rest: "60s", note: "Lock elbows by sides, full extension." },
      { name: "Overhead DB Extension（过顶哑铃臂屈伸）", sets: 2, reps: "12-15", rest: "60s", note: "Brace core and avoid lower-back sway." },
    ],
  },
  backBiA: {
    title: "Back + Biceps（背+二头）",
    workouts: [
      { name: "Lat Pulldown（高位下拉）", sets: 4, reps: "8-10", rest: "90s", note: "Depress shoulders first, pull to upper chest." },
      { name: "Seated Cable Row（坐姿划船）", sets: 4, reps: "8-10", rest: "90s", note: "Keep chest proud and row with elbows." },
      { name: "Chest Supported Row（胸托划船）", sets: 3, reps: "10-12", rest: "75s", note: "No momentum, controlled squeeze." },
      { name: "Alternating DB Curl（交替哑铃弯举）", sets: 3, reps: "10-12", rest: "60s", note: "Neutral wrist and slow eccentric." },
    ],
  },
  shoulderLegA: {
    title: "Shoulders + Glutes/Legs（肩+臀腿）",
    workouts: [
      { name: "DB Shoulder Press（哑铃肩推）", sets: 4, reps: "8-10", rest: "90s", note: "Keep ribcage down and press smoothly." },
      { name: "Cable Lateral Raise（绳索侧平举）", sets: 4, reps: "12-15", rest: "45s", note: "Light load, constant tension." },
      { name: "Leg Press（腿举）", sets: 4, reps: "10-12", rest: "90s", note: "Push through heels and control lowering." },
      { name: "Romanian Deadlift（罗马尼亚硬拉）", sets: 3, reps: "8-10", rest: "90s", note: "Hinge at hips with neutral spine." },
      { name: "Cable Crunch（绳索卷腹）", sets: 3, reps: "12-15", rest: "45s", note: "Round spine slightly and exhale hard." },
    ],
  },
  recoveryCore: {
    title: "Recovery + Core（恢复+核心）",
    workouts: [
      { name: "Incline Treadmill Walk（跑步机上斜坡慢走）", sets: 1, reps: "20-30 min", rest: "-", note: "Easy pace, nose breathing preferred." },
      { name: "Dead Bug（死虫）", sets: 3, reps: "10/side", rest: "45s", note: "Keep lower back flat on bench/floor." },
      { name: "Plank（平板支撑）", sets: 3, reps: "45-60s", rest: "45s", note: "Brace abs and squeeze glutes." },
      { name: "Mobility Flow（全身灵活性）", sets: 1, reps: "10 min", rest: "-", note: "Focus hips, ankles, thoracic spine." },
    ],
  },
  basketball: {
    title: "Basketball Day（篮球日）",
    workouts: [
      { name: "Basketball（篮球）", sets: 1, reps: "60-90 min", rest: "-", note: "Warm up ankles/knees and hydrate well." },
      { name: "Post-game Stretch（赛后拉伸）", sets: 1, reps: "8-10 min", rest: "-", note: "Calves, quads, hips, lower back." },
    ],
  },
  upperHypertrophy: {
    title: "Upper Hypertrophy（上肢补量）",
    workouts: [
      { name: "Incline Machine Press（上斜器械推胸）", sets: 3, reps: "10-12", rest: "75s", note: "Smooth reps, stop 1-2 reps before failure." },
      { name: "Neutral Grip Pulldown（中立握高位下拉）", sets: 3, reps: "10-12", rest: "75s", note: "Elbows down and back, no swinging." },
      { name: "Cable Lateral Raise（绳索侧平举）", sets: 3, reps: "12-15", rest: "45s", note: "Control both up and down tempo." },
      { name: "Face Pull（面拉）", sets: 3, reps: "12-15", rest: "45s", note: "Pull toward eyebrows, elbows high." },
      { name: "Hanging Knee Raise（悬垂提膝）", sets: 3, reps: "12-15", rest: "45s", note: "Posterior pelvic tilt at the top." },
    ],
  },
  chestTriB: {
    title: "Chest + Triceps Variation（胸+三头变化）",
    workouts: [
      { name: "DB Flat Press（平板哑铃卧推）", sets: 4, reps: "8-10", rest: "90s", note: "Keep shoulder packed and wrists neutral." },
      { name: "Machine Chest Press（器械推胸）", sets: 3, reps: "10-12", rest: "75s", note: "Constant tension, no lockout bounce." },
      { name: "Pec Deck Fly（蝴蝶机夹胸）", sets: 3, reps: "12-15", rest: "60s", note: "Short pause at contraction." },
      { name: "Dip Assist Machine（辅助双杠臂屈伸）", sets: 3, reps: "8-12", rest: "75s", note: "Slight forward lean, controlled depth." },
    ],
  },
  backBiB: {
    title: "Back + Biceps Variation（背+二头变化）",
    workouts: [
      { name: "Reverse Grip Pulldown（反手高位下拉）", sets: 4, reps: "8-10", rest: "90s", note: "Lead with elbows, avoid jerking torso." },
      { name: "Single Arm Cable Row（单臂绳索划船）", sets: 3, reps: "10-12", rest: "75s", note: "Use full stretch and full squeeze." },
      { name: "Machine Row（器械划船）", sets: 3, reps: "10-12", rest: "75s", note: "Chest support to reduce cheating." },
      { name: "EZ Bar Curl（EZ杠弯举）", sets: 3, reps: "10-12", rest: "60s", note: "Keep elbows stable and tempo controlled." },
      { name: "Cable Hammer Curl（绳索锤式弯举）", sets: 2, reps: "12-15", rest: "45s", note: "Focus on forearm and brachialis." },
    ],
  },
  shoulderLegB: {
    title: "Shoulders + Glutes/Legs Variation（肩+臀腿变化）",
    workouts: [
      { name: "Machine Shoulder Press（器械肩推）", sets: 4, reps: "8-10", rest: "90s", note: "Back supported, no excessive arch." },
      { name: "DB Lateral Raise（哑铃侧平举）", sets: 3, reps: "12-15", rest: "45s", note: "Raise in scapular plane." },
      { name: "Hip Thrust（臀推）", sets: 4, reps: "8-10", rest: "90s", note: "Pause one second at the top." },
      { name: "Hack Squat Machine（哈克深蹲机）", sets: 3, reps: "10-12", rest: "90s", note: "Controlled depth, knees track toes." },
      { name: "Cable Crunch（绳索卷腹）", sets: 3, reps: "12-15", rest: "45s", note: "Keep hips fixed and crunch through abs." },
    ],
  },
  lightRecovery: {
    title: "Light Active Recovery（轻主动恢复）",
    workouts: [
      { name: "Incline Treadmill Walk（跑步机上斜坡慢走）", sets: 1, reps: "20-35 min", rest: "-", note: "Low intensity and conversational pace." },
      { name: "Hip Mobility Drill（髋部灵活性）", sets: 1, reps: "8-10 min", rest: "-", note: "Move smoothly, no pain range." },
      { name: "Thoracic Rotation（胸椎旋转）", sets: 2, reps: "10/side", rest: "30s", note: "Improve upper-back mobility for pressing." },
    ],
  },
};

const femaleTemplates = {
  lowerA: {
    title: "Glutes & Legs A（臀腿A）",
    workouts: [
      { name: "Leg Press（腿举）", sets: 4, reps: "10-12", rest: "90s", note: "Push through heels and control lowering." },
      { name: "Goblet Squat（壶铃深蹲）", sets: 3, reps: "10-12", rest: "75s", note: "Keep chest tall and core braced." },
      { name: "Romanian Deadlift（罗马尼亚硬拉）", sets: 3, reps: "10-12", rest: "90s", note: "Hinge from hips, neutral spine." },
      { name: "Back Extension（公羊挺身）", sets: 3, reps: "12-15", rest: "60s", note: "Stop at neutral and squeeze glutes." },
      { name: "Hip Abduction（臀外展）", sets: 3, reps: "15-20", rest: "45s", note: "Pause one second at outer range." },
    ],
  },
  upperA: {
    title: "Shoulder & Back Tone A（肩背塑形A）",
    workouts: [
      { name: "Wide Grip Lat Pulldown（宽距高位下拉）", sets: 4, reps: "10-12", rest: "75s", note: "Pull to upper chest, avoid shrugging." },
      { name: "Reverse Grip Lat Pulldown（反手高位下拉）", sets: 3, reps: "10-12", rest: "75s", note: "Lead with elbows, smooth tempo." },
      { name: "Seated Cable Row（坐姿划船）", sets: 4, reps: "10-12", rest: "75s", note: "Open chest and retract shoulder blades." },
      { name: "Cable Lateral Raise（绳索侧平举）", sets: 3, reps: "12-15", rest: "45s", note: "Light weight and controlled eccentric." },
      { name: "Face Pull（面拉）", sets: 3, reps: "12-15", rest: "45s", note: "Pull toward eye line with elbows high." },
    ],
  },
  cardioRecovery: {
    title: "Cardio & Recovery（有氧恢复）",
    workouts: [
      { name: "Incline Treadmill Walk（跑步机上斜坡慢走）", sets: 1, reps: "20-40 min", rest: "-", note: "Incline 8-12, speed 4.5-6, steady pace." },
      { name: "Stretch Routine（拉伸恢复）", sets: 1, reps: "8-10 min", rest: "-", note: "Focus hips, hamstrings, upper back." },
    ],
  },
  lowerB: {
    title: "Glutes Focus B（臀腿强化B）",
    workouts: [
      { name: "Leg Press（腿举）", sets: 4, reps: "12-15", rest: "90s", note: "Slightly higher reps for joint-friendly volume." },
      { name: "Goblet Squat（壶铃深蹲）", sets: 3, reps: "10-12", rest: "75s", note: "Sit between hips, keep knees tracking toes." },
      { name: "Romanian Deadlift（罗马尼亚硬拉）", sets: 3, reps: "10-12", rest: "90s", note: "Stretch hamstrings, no spinal rounding." },
      { name: "Hip Abduction（臀外展）", sets: 4, reps: "15-20", rest: "45s", note: "Control return phase for better glute burn." },
      { name: "Back Extension（公羊挺身）", sets: 2, reps: "12-15", rest: "60s", note: "Use glutes, avoid excessive lumbar extension." },
    ],
  },
  upperB: {
    title: "Upper Tone B（肩背塑形B）",
    workouts: [
      { name: "Wide Grip Lat Pulldown（宽距高位下拉）", sets: 3, reps: "10-12", rest: "75s", note: "Stay upright and pull with back." },
      { name: "Reverse Grip Lat Pulldown（反手高位下拉）", sets: 3, reps: "10-12", rest: "75s", note: "Use controlled range and tempo." },
      { name: "Seated Cable Row（坐姿划船）", sets: 3, reps: "10-12", rest: "75s", note: "Pause briefly at contraction." },
      { name: "Cable Lateral Raise（绳索侧平举）", sets: 3, reps: "12-15", rest: "45s", note: "Stay strict, avoid body sway." },
      { name: "Face Pull（面拉）", sets: 3, reps: "12-15", rest: "45s", note: "Great for shoulder health and posture." },
    ],
  },
  activeRecovery: {
    title: "Active Recovery（轻活动恢复）",
    workouts: [
      { name: "Incline Treadmill Walk（跑步机上斜坡慢走）", sets: 1, reps: "20-30 min", rest: "-", note: "Comfortable pace for fatigue management." },
      { name: "Glute Activation Band Walk（弹力带臀激活）", sets: 2, reps: "12/side", rest: "30s", note: "Small controlled steps, knees stable." },
      { name: "Mobility Flow（灵活性训练）", sets: 1, reps: "8 min", rest: "-", note: "Open hips and release lower-back tension." },
    ],
  },
  balletRecovery: {
    title: "Ballet Night Recovery（芭蕾日晚恢复）",
    workouts: [
      { name: "Ballet Class（芭蕾）", sets: 1, reps: "60-90 min", rest: "-", note: "Enjoy class and keep hydration steady." },
      { name: "Calf + Hip Flexor Stretch（小腿+髋屈肌拉伸）", sets: 1, reps: "8-10 min", rest: "-", note: "Reduce tightness after pointe/barre work." },
      { name: "Core Breathing Reset（核心呼吸恢复）", sets: 1, reps: "5 min", rest: "-", note: "Nasal breathing and gentle trunk control." },
    ],
  },
};

const maleWeekdayCycle = ["chestTriA", "backBiA", "shoulderLegA", "recoveryCore", "basketball", "upperHypertrophy", "basketball"];
const femaleWeekdayCycle = ["lowerA", "upperA", "cardioRecovery", "balletRecovery", "lowerB", "upperB", "activeRecovery"];

function toDateOnly(dateValue) {
  const date = new Date(dateValue || new Date().toISOString().slice(0, 10));
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDateForDay(startDate, day) {
  const date = toDateOnly(startDate);
  date.setDate(date.getDate() + (day - 1));
  return date;
}

function getWeekdayIndex(date) {
  const jsDay = date.getDay(); // 0=Sun ... 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon ... 6=Sun
}

function buildPlanItem(day, key, templates) {
  const base = templates[key];
  return {
    title: `Day ${day} · ${base.title}`,
    workouts: base.workouts,
    habits: dailyHabits,
  };
}

function buildDynamicPlan(role, day, challengeStartDate) {
  const targetDate = getDateForDay(challengeStartDate, day);
  const weekday = getWeekdayIndex(targetDate);
  if (role === ROLE_MALE) {
    const key = maleWeekdayCycle[weekday];
    return buildPlanItem(day, key, maleTemplates);
  }
  const key = femaleWeekdayCycle[weekday];
  return buildPlanItem(day, key, femaleTemplates);
}

export function getDefaultGoal(role) {
  return role === ROLE_MALE ? "可见腹肌 + 线条感 + 精瘦运动体态" : "臀腿增长 + 腿部塑形 + 肩背轻线条";
}

export function getBasePlan(role, day, challengeStartDate) {
  const safeDay = Math.min(21, Math.max(1, day));
  return buildDynamicPlan(role, safeDay, challengeStartDate);
}
