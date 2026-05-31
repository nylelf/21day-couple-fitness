/** Shared preference field helpers. */

export function normalizeGoalsFromProfile(profile) {
  const raw = profile?.goals !== undefined ? profile.goals : profile?.goal;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.filter(Boolean);
}

export function roleDisplayLabel(role) {
  return role === "male" ? "男生" : role === "female" ? "女生" : "学员";
}
