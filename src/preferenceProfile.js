import {
  createEmptyWeeklyActivities,
  formatWeeklyActivitiesText,
  normalizeWeeklyActivities,
} from "../lib/weeklyActivities.js";

export const FITNESS_LEVELS = [
  {
    value: "beginner",
    tier: "L1",
    label: "新手",
    duration: "0-6个月",
    traits: ["不会发力", "动作不标准", "容易受伤"],
    recommendations: ["固定器械", "史密斯机", "自重训练"],
  },
  {
    value: "novice",
    tier: "L2",
    label: "初级",
    duration: "6个月-2年",
    traits: [],
    recommendations: ["器械+自由重量"],
  },
  {
    value: "intermediate",
    tier: "L3",
    label: "中级",
    duration: "2-5年",
    traits: [],
    recommendations: ["PPL", "Upper Lower", "力量周期"],
  },
  {
    value: "advanced",
    tier: "L4",
    label: "高级",
    duration: "5年以上",
    traits: [],
    recommendations: ["高容量训练", "周期化训练"],
  },
];

const LEGACY_FITNESS_LEVELS = ["recovery"];



export const MALE_GOALS = [

  { value: "muscle_gain", label: "增肌" },

  { value: "fat_loss", label: "减脂" },

  { value: "strength", label: "力量" },

  { value: "posture", label: "体态改善" },

  { value: "athletic", label: "运动表现" },

  { value: "rehab", label: "康复训练" },

];



export const FEMALE_GOALS = [

  { value: "glute_shape", label: "翘臀塑形" },

  { value: "slim_legs", label: "瘦腿" },

  { value: "abs_line", label: "马甲线" },

  { value: "full_body_shape", label: "全身塑形" },

  { value: "postpartum", label: "产后恢复" },

  { value: "fat_loss", label: "减脂" },

  { value: "muscle_gain", label: "增肌" },

];



export const EQUIPMENT_OPTIONS = [

  { value: "bodyweight", label: "仅徒手" },

  { value: "home", label: "家里有哑铃/弹力带" },

  { value: "gym", label: "健身房" },

];



export const SESSION_DURATIONS = [

  { value: 30, label: "30分钟" },

  { value: 45, label: "45分钟" },

  { value: 60, label: "60分钟" },

  { value: 90, label: "90分钟以上" },

];



export const TRAINING_SPLITS = [

  { value: "full_body", label: "全身训练" },

  { value: "upper_lower", label: "二分化" },

  { value: "push_pull_legs", label: "三分化 PPL" },

  { value: "bro_4", label: "四分化" },

  { value: "bro_5", label: "五分化" },

  { value: "bro_6", label: "六分化" },

];



export const CYCLE_LENGTHS = [

  { value: 25, label: "25天" },

  { value: 28, label: "28天" },

  { value: 30, label: "30天" },

  { value: 32, label: "32天" },

  { value: "irregular", label: "不规律" },

];



const FITNESS_LEVEL_SET = new Set([
  ...FITNESS_LEVELS.map((item) => item.value),
  ...LEGACY_FITNESS_LEVELS,
]);

const MALE_GOAL_SET = new Set(MALE_GOALS.map((item) => item.value));

const FEMALE_GOAL_SET = new Set(FEMALE_GOALS.map((item) => item.value));

const EQUIPMENT_SET = new Set(EQUIPMENT_OPTIONS.map((item) => item.value));

const SESSION_SET = new Set(SESSION_DURATIONS.map((item) => item.value));

const TRAINING_SPLIT_SET = new Set(TRAINING_SPLITS.map((item) => item.value));

const CYCLE_SET = new Set(CYCLE_LENGTHS.map((item) => item.value));



const LEGACY_GOAL_MAP = {

  maintain: { male: "posture", female: "full_body_shape" },

  rehabilitation: { male: "rehab", female: "postpartum" },

};

export const DEFAULT_PREFERENCE_PROFILE = {

  fitnessLevel: "beginner",

  goals: ["fat_loss"],

  equipment: "gym",

  sessionDuration: 60,

  trainingSplit: "push_pull_legs",

  weeklyActivities: createEmptyWeeklyActivities(),

  otherActivities: "",

  healthNotes: "",

  lastPeriodDate: "",

  cycleLength: 28,

};



export function getFitnessLevelByValue(value) {
  return FITNESS_LEVELS.find((item) => item.value === value);
}

export function getFitnessLevelLabel(value) {
  const level = getFitnessLevelByValue(value);
  if (level) return `${level.tier} ${level.label}（${level.duration}）`;
  if (value === "recovery") return "伤后恢复";
  return value || "";
}

export function getGoalsForRole(role) {

  return role === "female" ? FEMALE_GOALS : MALE_GOALS;

}



export function getDefaultGoalForRole(role) {

  return "fat_loss";

}



export function getGoalLabel(role, goalValue) {

  const options = getGoalsForRole(role);

  return options.find((item) => item.value === goalValue)?.label || goalValue || "";

}

export function getGoalLabels(role, goals = []) {
  const list = Array.isArray(goals) ? goals : goals ? [goals] : [];
  return list.map((value) => getGoalLabel(role, value)).filter(Boolean).join("、");
}

function normalizeGoalsForRole(rawGoals, role) {
  const goalSet = role === "female" ? FEMALE_GOAL_SET : MALE_GOAL_SET;
  const input = Array.isArray(rawGoals) ? rawGoals : rawGoals ? [rawGoals] : [];
  const normalized = [];

  for (const item of input) {
    let value = item;
    if (!goalSet.has(value)) {
      value = normalizeGoalForRole(value, role);
    }
    if (goalSet.has(value) && !normalized.includes(value)) {
      normalized.push(value);
    }
  }

  if (!normalized.length) {
    normalized.push(getDefaultGoalForRole(role));
  }

  return normalized;
}



function normalizeGoalForRole(goal, role) {

  const roleKey = role === "female" ? "female" : "male";

  const goalSet = role === "female" ? FEMALE_GOAL_SET : MALE_GOAL_SET;



  if (goalSet.has(goal)) return goal;



  const legacy = LEGACY_GOAL_MAP[goal];

  if (legacy?.[roleKey] && goalSet.has(legacy[roleKey])) {

    return legacy[roleKey];

  }



  return getDefaultGoalForRole(role);

}



function normalizePreferenceText(text) {

  return (text || "").trim();

}



function migrateLegacyProfile(profile, fallbackText = "") {

  const hasLegacyFlags =

    profile.quickMode ||

    profile.beginnerFriendly ||

    profile.kneeCare ||

    profile.backCare ||

    profile.homeTraining ||

    profile.customText;



  if (!hasLegacyFlags) return null;



  const healthParts = [];

  if (profile.kneeCare) healthParts.push("膝盖保护");

  if (profile.backCare) healthParts.push("下背保护");

  if (profile.customText || fallbackText) healthParts.push(profile.customText || fallbackText);



  return {

    fitnessLevel: profile.beginnerFriendly ? "beginner" : profile.recovery ? "recovery" : "intermediate",

    goals: ["fat_loss"],

    equipment: profile.homeTraining ? "home" : "gym",

    sessionDuration: profile.quickMode ? 30 : 60,

    weeklyActivities: createEmptyWeeklyActivities(),

    otherActivities: "",

    healthNotes: healthParts.join("；"),

    lastPeriodDate: "",

    cycleLength: 28,

  };

}



export function normalizePreferenceProfile(profile, fallbackText = "", role = "") {

  const safe = profile && typeof profile === "object" ? profile : {};

  const migrated = migrateLegacyProfile(safe, fallbackText);

  const source = migrated || safe;



  const sessionDuration = Number(source.sessionDuration);

  const normalized = {

    fitnessLevel: FITNESS_LEVEL_SET.has(source.fitnessLevel) ? source.fitnessLevel : DEFAULT_PREFERENCE_PROFILE.fitnessLevel,

    goals: normalizeGoalsForRole(source.goals !== undefined ? source.goals : source.goal, role),

    equipment: EQUIPMENT_SET.has(source.equipment) ? source.equipment : DEFAULT_PREFERENCE_PROFILE.equipment,

    sessionDuration: SESSION_SET.has(sessionDuration) ? sessionDuration : DEFAULT_PREFERENCE_PROFILE.sessionDuration,

    trainingSplit: TRAINING_SPLIT_SET.has(source.trainingSplit) ? source.trainingSplit : DEFAULT_PREFERENCE_PROFILE.trainingSplit,

    weeklyActivities: normalizeWeeklyActivities(source.weeklyActivities, source.otherActivities),

    otherActivities:
      formatWeeklyActivitiesText(
        normalizeWeeklyActivities(source.weeklyActivities, source.otherActivities)
      ) || normalizePreferenceText(source.otherActivities),

    healthNotes: normalizePreferenceText(source.healthNotes),

    lastPeriodDate: normalizePreferenceText(source.lastPeriodDate),

    cycleLength: CYCLE_SET.has(source.cycleLength) ? source.cycleLength : DEFAULT_PREFERENCE_PROFILE.cycleLength,

  };



  if (role === "male") {

    normalized.lastPeriodDate = "";

    normalized.cycleLength = DEFAULT_PREFERENCE_PROFILE.cycleLength;

  }



  return normalized;

}



function labelFor(options, value) {

  return options.find((item) => item.value === value)?.label || "";

}



export function profileSummary(profile, role = "") {

  const normalized = normalizePreferenceProfile(profile, "", role);

  const parts = [

    getFitnessLevelLabel(normalized.fitnessLevel),

    getGoalLabels(role, normalized.goals),

    labelFor(EQUIPMENT_OPTIONS, normalized.equipment),

    `${normalized.sessionDuration}分钟/次`,

    labelFor(TRAINING_SPLITS, normalized.trainingSplit),

  ];

  const activitySummary = formatWeeklyActivitiesText(normalized.weeklyActivities);
  if (activitySummary) parts.push(activitySummary);

  if (normalized.healthNotes) parts.push(normalized.healthNotes);

  if (role === "female" && normalized.lastPeriodDate) {

    parts.push(`上次经期：${normalized.lastPeriodDate}`);

  }

  if (role === "female" && normalized.cycleLength) {

    parts.push(`周期：${labelFor(CYCLE_LENGTHS, normalized.cycleLength)}`);

  }

  return parts.filter(Boolean).join("；");

}



export function createDefaultPreferenceProfile() {

  return { ...DEFAULT_PREFERENCE_PROFILE };

}



export function createDefaultPreferenceProfileForRole(role) {
  if (role === "female") {
    return {
      ...DEFAULT_PREFERENCE_PROFILE,
      goals: ["glute_shape"],
      trainingSplit: "push_pull_legs",
    };
  }
  return {
    ...DEFAULT_PREFERENCE_PROFILE,
    goals: ["muscle_gain"],
    trainingSplit: "push_pull_legs",
  };
}



