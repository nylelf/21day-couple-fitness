export const FITNESS_LEVELS = [
  { value: "beginner", label: "新手（0-6个月）" },
  { value: "novice", label: "初级（6个月-2年）" },
  { value: "intermediate", label: "中级（2-5年）" },
  { value: "advanced", label: "高级（5年以上）" },
  { value: "recovery", label: "伤后恢复" },
];

export const GOALS = [
  { value: "fat_loss", label: "减脂塑形" },
  { value: "muscle_gain", label: "增肌" },
  { value: "maintain", label: "维持体能" },
  { value: "rehabilitation", label: "伤后康复" },
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

export const CYCLE_LENGTHS = [
  { value: 25, label: "25天" },
  { value: 28, label: "28天" },
  { value: 30, label: "30天" },
  { value: 32, label: "32天" },
  { value: "irregular", label: "不规律" },
];

const FITNESS_LEVEL_SET = new Set(FITNESS_LEVELS.map((item) => item.value));
const GOAL_SET = new Set(GOALS.map((item) => item.value));
const EQUIPMENT_SET = new Set(EQUIPMENT_OPTIONS.map((item) => item.value));
const SESSION_SET = new Set(SESSION_DURATIONS.map((item) => item.value));
const CYCLE_SET = new Set(CYCLE_LENGTHS.map((item) => item.value));

export const DEFAULT_PREFERENCE_PROFILE = {
  fitnessLevel: "beginner",
  goal: "fat_loss",
  equipment: "gym",
  sessionDuration: 60,
  otherActivities: "",
  healthNotes: "",
  lastPeriodDate: "",
  cycleLength: 28,
};

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
    goal: "maintain",
    equipment: profile.homeTraining ? "home" : "gym",
    sessionDuration: profile.quickMode ? 30 : 60,
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
    goal: GOAL_SET.has(source.goal) ? source.goal : DEFAULT_PREFERENCE_PROFILE.goal,
    equipment: EQUIPMENT_SET.has(source.equipment) ? source.equipment : DEFAULT_PREFERENCE_PROFILE.equipment,
    sessionDuration: SESSION_SET.has(sessionDuration) ? sessionDuration : DEFAULT_PREFERENCE_PROFILE.sessionDuration,
    otherActivities: normalizePreferenceText(source.otherActivities),
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
    labelFor(FITNESS_LEVELS, normalized.fitnessLevel),
    labelFor(GOALS, normalized.goal),
    labelFor(EQUIPMENT_OPTIONS, normalized.equipment),
    `${normalized.sessionDuration}分钟/次`,
  ];
  if (normalized.otherActivities) parts.push(normalized.otherActivities);
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
