import { ROLE_FEMALE, ROLE_MALE } from "./constants";
import { formatDateOnly } from "./dateUtils";
import { getDefaultGoal } from "./plans";
import {
  DEFAULT_PREFERENCE_PROFILE,
  getGoalLabels,
  normalizePreferenceProfile,
  profileSummary,
} from "./preferenceProfile";
import { getPlanMetaForRole } from "./planMeta";

export function dayKey(day) {
  return `day-${day}`;
}

export function normalizeCheckinEntry(entry) {
  if (!entry) return { workouts: {}, habits: {} };
  if (entry.workouts || entry.habits) {
    return {
      workouts: entry.workouts || {},
      habits: entry.habits || {},
    };
  }
  return { workouts: entry, habits: {} };
}

/** @returns {{ text: string, sentAt: string } | null} */
export function normalizeMessageEntry(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const text = value.trim();
    return text ? { text, sentAt: "" } : null;
  }
  const text = String(value.text || "").trim();
  if (!text) return null;
  return { text, sentAt: String(value.sentAt || "") };
}

function normalizeMessagesFrom(data) {
  const roles = [ROLE_MALE, ROLE_FEMALE];
  const fromRaw = data.messagesFrom || {};
  const legacy = data.messages || {};
  const out = { male: {}, female: {} };

  for (const role of roles) {
    const merged = { ...(legacy[role] || {}), ...(fromRaw[role] || {}) };
    for (const [key, raw] of Object.entries(merged)) {
      const entry = normalizeMessageEntry(raw);
      if (entry) out[role][key] = entry;
    }
  }
  return out;
}

export function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizeUser(data, role) {
  const raw = data.users?.[role];
  const preferenceProfile = normalizePreferenceProfile(raw?.preferenceProfile, raw?.preferences, role);
  return {
    name: raw?.name || "",
    goal: raw?.goal || getDefaultGoal(role),
    preferenceProfile,
    preferences: (raw?.preferences || profileSummary(preferenceProfile, role)).trim(),
    joinedAt: raw?.joinedAt || "",
  };
}

export function normalizeChallenge(data) {
  if (!data) return null;
  return {
    inviteCode: data.inviteCode || data.challengeId || "",
    challengeStartDate: data.challengeStartDate || formatDateOnly(new Date()),
    users: {
      male: normalizeUser(data, ROLE_MALE),
      female: normalizeUser(data, ROLE_FEMALE),
    },
    plans: {
      male: data.plans?.male || {},
      female: data.plans?.female || {},
    },
    checkins: {
      male: data.checkins?.male || {},
      female: data.checkins?.female || {},
    },
    notes: {
      male: data.notes?.male || {},
      female: data.notes?.female || {},
    },
    messagesFrom: normalizeMessagesFrom(data),
    cheersFrom: {
      male: data.cheersFrom?.male || {},
      female: data.cheersFrom?.female || {},
    },
    planMeta: {
      male: getPlanMetaForRole(data, ROLE_MALE),
      female: getPlanMetaForRole(data, ROLE_FEMALE),
    },
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export function createEmptyPlanMeta() {
  return { generatedThrough: 0, generating: null, lastError: null, lastGeneratedAt: "" };
}

export function createChallenge(
  inviteCode,
  myRole,
  nickname,
  challengeStartDate,
  preferences = "",
  preferenceProfile = DEFAULT_PREFERENCE_PROFILE
) {
  const now = new Date().toISOString();
  const normalizedProfile = normalizePreferenceProfile(preferenceProfile, preferences, myRole);
  const base = normalizeChallenge({
    inviteCode,
    challengeStartDate: challengeStartDate || formatDateOnly(new Date()),
    users: {
      [myRole]: {
        name: nickname.trim(),
        goal: getGoalLabels(myRole, normalizedProfile.goals),
        preferenceProfile: normalizedProfile,
        preferences: (preferences || profileSummary(normalizedProfile, myRole)).trim(),
        joinedAt: now,
      },
    },
  });
  return { ...base, updatedAt: now };
}

export function buildCompletedPlanMeta(generatedThrough, usedFallback = false) {
  return {
    generatedThrough,
    generating: null,
    lastGeneratedAt: new Date().toISOString(),
    lastError: usedFallback ? "已用模板补全" : null,
  };
}
