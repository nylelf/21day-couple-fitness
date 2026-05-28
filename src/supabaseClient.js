import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function fetchChallengeByCode(inviteCode) {
  if (!supabase) return { data: null, error: new Error("Supabase 未配置") };
  const code = inviteCode.trim().toUpperCase();
  const response = await supabase.from("challenges").select("invite_code,data").eq("invite_code", code).maybeSingle();
  return { data: response.data, error: response.error || null };
}

export async function saveChallengeToCloud(inviteCode, challenge) {
  if (!supabase) return { error: new Error("Supabase 未配置") };
  const code = inviteCode.toUpperCase();
  const payload = { ...challenge, inviteCode: code, updatedAt: new Date().toISOString() };

  const writeInvite = await supabase.from("challenges").upsert(
    { invite_code: code, data: payload, updated_at: new Date().toISOString() },
    { onConflict: "invite_code" }
  );
  return { error: writeInvite.error || null };
}
