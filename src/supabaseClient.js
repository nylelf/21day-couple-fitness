import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function fetchChallengeByCode(inviteCode) {
  if (!supabase) return { data: null, error: new Error("Supabase 未配置") };
  const code = inviteCode.toUpperCase();

  const byInvite = await supabase.from("challenges").select("invite_code,id,data").eq("invite_code", code).maybeSingle();
  if (!byInvite.error && byInvite.data) return { data: byInvite.data, error: null, mode: "invite_code" };

  const byId = await supabase.from("challenges").select("invite_code,id,data").eq("id", code).maybeSingle();
  if (!byId.error && byId.data) return { data: byId.data, error: null, mode: "id" };

  if (byInvite.error && byId.error) return { data: null, error: byInvite.error };
  return { data: null, error: null };
}

export async function saveChallengeToCloud(inviteCode, challenge) {
  if (!supabase) return { error: new Error("Supabase 未配置") };
  const code = inviteCode.toUpperCase();
  const payload = { ...challenge, inviteCode: code, updatedAt: new Date().toISOString() };

  const writeInvite = await supabase.from("challenges").upsert(
    { invite_code: code, data: payload, updated_at: new Date().toISOString() },
    { onConflict: "invite_code" }
  );
  if (!writeInvite.error) return { error: null };

  const writeLegacy = await supabase
    .from("challenges")
    .upsert({ id: code, data: payload, updated_at: new Date().toISOString() }, { onConflict: "id" });
  return { error: writeLegacy.error || null };
}
