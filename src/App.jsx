import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Cloud,
  Flame,
  Heart,
  MessageCircle,
  RefreshCw,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import { getBasePlan, getDefaultGoal } from "./plans";
import PreferenceForm from "./PreferenceForm";
import {
  createDefaultPreferenceProfile,
  DEFAULT_PREFERENCE_PROFILE,
  normalizePreferenceProfile,
  profileSummary,
} from "./preferenceProfile";
import { fetchChallengeByCode, saveChallengeToCloud, supabase } from "./supabaseClient";
import { clearLocalSession, getStoredSessionValues, readLocalSession, writeLocalSession } from "./sessionStorage";

const DAYS = 21;
const ROLE_MALE = "male";
const ROLE_FEMALE = "female";

const PLAN_PENDING_PLACEHOLDER = {
  pending: true,
  title: "等待对方加入后生成专属计划",
  workouts: [],
  habits: [],
};

function createPendingPlan() {
  return { ...PLAN_PENDING_PLACEHOLDER };
}

function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function Button({ className = "", children, ...props }) {
  return (
    <button className={`app-btn ${className}`} {...props}>
      {children}
    </button>
  );
}

function roleLabel(role) {
  return role === ROLE_MALE ? "♂ 男生" : "♀ 女生";
}

function oppositeRole(role) {
  return role === ROLE_MALE ? ROLE_FEMALE : ROLE_MALE;
}

function dayKey(day) {
  return `day-${day}`;
}

function calcCurrentDay(challengeStartDate) {
  const start = parseDateOnly(challengeStartDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return Math.min(21, Math.max(1, diff + 1));
}

function parseDateOnly(dateValue) {
  if (dateValue instanceof Date) {
    return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
  }
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, d] = dateValue.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateValue);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDateOnly(dateValue) {
  const d = parseDateOnly(dateValue);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateKey(date) {
  return formatDateOnly(date);
}

function addDays(dateValue, days) {
  const d = parseDateOnly(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

function getChallengeDateForDay(challengeStartDate, day) {
  return addDays(challengeStartDate, day - 1);
}

function dateDiffDays(fromDate, toDate) {
  const start = parseDateOnly(fromDate).getTime();
  const end = parseDateOnly(toDate).getTime();
  return Math.floor((end - start) / 86400000);
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function normalizePreferenceText(text) {
  return (text || "").trim();
}

function reduceSetsValue(sets) {
  if (typeof sets === "number") return Math.max(1, sets - 1);
  return sets;
}

function personalizePlan(plan, preferenceText, preferenceProfile = DEFAULT_PREFERENCE_PROFILE, role = "") {
  const normalizedProfile = normalizePreferenceProfile(preferenceProfile, preferenceText, role);
  const text = `${normalizePreferenceText(preferenceText)} ${normalizedProfile.healthNotes} ${normalizedProfile.otherActivities}`.toLowerCase();
  const hasStructuredPrefs =
    normalizedProfile.fitnessLevel !== DEFAULT_PREFERENCE_PROFILE.fitnessLevel ||
    normalizedProfile.goal !== DEFAULT_PREFERENCE_PROFILE.goal ||
    normalizedProfile.equipment !== DEFAULT_PREFERENCE_PROFILE.equipment ||
    normalizedProfile.sessionDuration !== DEFAULT_PREFERENCE_PROFILE.sessionDuration ||
    normalizedProfile.otherActivities ||
    normalizedProfile.healthNotes;

  if (!text.trim() && !hasStructuredPrefs) return plan;

  let workouts = [...(plan.workouts || [])];
  let habits = [...(plan.habits || [])];
  const tags = [];

  if (normalizedProfile.sessionDuration <= 30 || /(30分钟|30 分钟|时间少|忙|quick)/.test(text)) {
    workouts = workouts.slice(0, 4);
    habits.push("Quick Session（30分钟内完成）");
    tags.push("快速版");
  }

  if (
    ["beginner", "novice", "recovery"].includes(normalizedProfile.fitnessLevel) ||
    /(新手|初学|beginner)/.test(text)
  ) {
    workouts = workouts.map((item) => ({ ...item, sets: reduceSetsValue(item.sets), note: `${item.note} Beginner-friendly: keep 2 reps in reserve.` }));
    tags.push("新手版");
  }

  const needsKneeCare =
    normalizedProfile.goal === "rehabilitation" ||
    normalizedProfile.fitnessLevel === "recovery" ||
    /(膝|knee)/.test(text);
  if (needsKneeCare) {
    workouts = workouts.map((item) =>
      /(深蹲|腿举|跳|squat|leg press|jump)/i.test(item.name)
        ? { ...item, note: `${item.note} Knee-care: reduce load 10-20% and keep pain-free range.` }
        : item
    );
    habits.push("Knee Care（膝盖友好：训练后冰敷/拉伸）");
    tags.push("膝盖友好");
  }

  const needsBackCare =
    normalizedProfile.goal === "rehabilitation" ||
    normalizedProfile.fitnessLevel === "recovery" ||
    /(腰|lower back|back pain|腰椎)/.test(text);
  if (needsBackCare) {
    workouts = workouts.map((item) =>
      /(硬拉|deadlift|good morning)/i.test(item.name)
        ? { ...item, note: `${item.note} Back-care: prioritize neutral spine and lighter load.` }
        : item
    );
    habits.push("Back Care（下背恢复：核心激活+伸展）");
    tags.push("腰背友好");
  }

  if (
    normalizedProfile.equipment === "home" ||
    normalizedProfile.equipment === "bodyweight" ||
    /(家|home|dumbbell|弹力带|徒手)/.test(text)
  ) {
    workouts = workouts.map((item) => ({
      ...item,
      note: `${item.note} Home-option: dumbbell/band/bodyweight variation is acceptable.`,
    }));
    tags.push("居家可做");
  }

  return {
    ...plan,
    title: tags.length ? `${plan.title} · ${tags.join("/")}` : plan.title,
    workouts,
    habits,
  };
}

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizeChallenge(data) {
  if (!data) return null;
  const inviteCode = data.inviteCode || data.challengeId || "";
  const challengeStartDate = data.challengeStartDate || formatDateOnly(new Date());
  return {
    inviteCode,
    challengeStartDate,
    users: {
      male: {
        name: data.users?.male?.name || "",
        goal: data.users?.male?.goal || getDefaultGoal(ROLE_MALE),
        preferenceProfile: normalizePreferenceProfile(data.users?.male?.preferenceProfile, data.users?.male?.preferences, ROLE_MALE),
        preferences: normalizePreferenceText(
          data.users?.male?.preferences ||
            profileSummary(normalizePreferenceProfile(data.users?.male?.preferenceProfile, data.users?.male?.preferences, ROLE_MALE), ROLE_MALE)
        ),
        joinedAt: data.users?.male?.joinedAt || "",
      },
      female: {
        name: data.users?.female?.name || "",
        goal: data.users?.female?.goal || getDefaultGoal(ROLE_FEMALE),
        preferenceProfile: normalizePreferenceProfile(data.users?.female?.preferenceProfile, data.users?.female?.preferences, ROLE_FEMALE),
        preferences: normalizePreferenceText(
          data.users?.female?.preferences ||
            profileSummary(normalizePreferenceProfile(data.users?.female?.preferenceProfile, data.users?.female?.preferences, ROLE_FEMALE), ROLE_FEMALE)
        ),
        joinedAt: data.users?.female?.joinedAt || "",
      },
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
    messages: {
      male: data.messages?.male || {},
      female: data.messages?.female || {},
    },
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

function normalizeCheckinEntry(entry) {
  if (!entry) return { workouts: {}, habits: {} };
  if (entry.workouts || entry.habits) {
    return {
      workouts: entry.workouts || {},
      habits: entry.habits || {},
    };
  }
  return {
    workouts: entry,
    habits: {},
  };
}

function createChallenge(inviteCode, myRole, nickname, challengeStartDate, preferences = "", preferenceProfile = DEFAULT_PREFERENCE_PROFILE) {
  const now = new Date().toISOString();
  const startDate = challengeStartDate || now.slice(0, 10);
  const normalizedProfile = normalizePreferenceProfile(preferenceProfile, preferences, myRole);
  const base = normalizeChallenge({
    inviteCode,
    challengeStartDate: startDate,
    users: {
      [myRole]: {
        name: nickname.trim(),
        goal: getDefaultGoal(myRole),
        preferenceProfile: normalizedProfile,
        preferences: normalizePreferenceText(preferences || profileSummary(normalizedProfile, myRole)),
        joinedAt: now,
      },
    },
  });
  return { ...base, updatedAt: now };
}

function buildFallbackPlans(role, challengeStartDate) {
  const plans = {};
  for (let day = 1; day <= DAYS; day += 1) {
    plans[dayKey(day)] = getBasePlan(role, day, challengeStartDate);
  }
  return plans;
}

async function requestGeneratedPlan(role, preferenceProfile, challengeStartDate) {
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, preferenceProfile, challengeStartDate }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "计划生成失败");
  }
  if (!data.plans || typeof data.plans !== "object") {
    throw new Error("计划生成失败");
  }
  return data.plans;
}

async function resolveRolePlans(role, preferenceProfile, challengeStartDate) {
  try {
    const plans = await requestGeneratedPlan(role, preferenceProfile, challengeStartDate);
    return { plans, usedFallback: false };
  } catch {
    return {
      plans: buildFallbackPlans(role, challengeStartDate),
      usedFallback: true,
    };
  }
}


export default function App() {
  const session = readLocalSession();
  const hasRestorableSession = Boolean(session.currentInviteCode && session.myRole);
  const [screen, setScreen] = useState(hasRestorableSession ? "main" : "landing");
  const [myRole, setMyRole] = useState(session.myRole || "");
  const [myNickname, setMyNickname] = useState(session.myNickname || "");
  const [inviteCode, setInviteCode] = useState(session.currentInviteCode || "");
  const [challenge, setChallenge] = useState(null);
  const [activeRole, setActiveRole] = useState(session.myRole || ROLE_MALE);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [tab, setTab] = useState("today");
  const [syncStatus, setSyncStatus] = useState(supabase ? "连接中..." : "本地模式：Supabase 未配置");
  const [errorMsg, setErrorMsg] = useState("");

  const [createRole, setCreateRole] = useState(ROLE_MALE);
  const [createNickname, setCreateNickname] = useState("");
  const [createPreferenceProfile, setCreatePreferenceProfile] = useState(createDefaultPreferenceProfile());
  const [createStartDate, setCreateStartDate] = useState(formatDateOnly(new Date()));
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState(ROLE_FEMALE);
  const [joinNickname, setJoinNickname] = useState("");
  const [joinPreferenceProfile, setJoinPreferenceProfile] = useState(createDefaultPreferenceProfile());
  const [stayOnLanding, setStayOnLanding] = useState(false);
  const restoreRequestVersionRef = useRef(0);
  const [calendarMonthDate, setCalendarMonthDate] = useState(new Date());
  const [aiCoachText, setAiCoachText] = useState("");
  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [aiCoachError, setAiCoachError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [planGenerating, setPlanGenerating] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimerRef = useRef(null);

  const currentDay = challenge ? calcCurrentDay(challenge.challengeStartDate) : 1;
  const hasStarted = challenge ? getDateKey(new Date()) >= getDateKey(challenge.challengeStartDate) : true;
  const viewingRole = activeRole;
  const canEdit = challenge && hasStarted && viewingRole === myRole && selectedDay === currentDay;
  const dKey = dayKey(selectedDay);
  const getEffectivePlan = (role, day) => {
    const key = dayKey(day);
    const aiPlan = challenge?.plans?.[role]?.[key];
    if (aiPlan?.workouts?.length) {
      return aiPlan;
    }
    return createPendingPlan();
  };
  const selectedPlan = useMemo(() => {
    if (!challenge) return personalizePlan(getBasePlan(viewingRole, selectedDay), "");
    return getEffectivePlan(viewingRole, selectedDay);
  }, [challenge, viewingRole, selectedDay, dKey]);

  const checkin = normalizeCheckinEntry(challenge?.checkins?.[viewingRole]?.[dKey]);
  const checkedWorkouts = checkin.workouts || {};
  const checkedHabits = checkin.habits || {};
  const noteText = challenge?.notes?.[viewingRole]?.[dKey] || "";
  const dayMessageText = challenge?.messages?.[viewingRole]?.[dKey] || "";
  const doneCount = Object.values(checkedWorkouts).filter(Boolean).length + Object.values(checkedHabits).filter(Boolean).length;
  const totalCount = selectedPlan.workouts.length + selectedPlan.habits.length;
  const completion = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const stats = useMemo(() => {
    if (!challenge) return { male: { percent: 0 }, female: { percent: 0 } };
    const result = {};
    [ROLE_MALE, ROLE_FEMALE].forEach((role) => {
      let total = 0;
      let done = 0;
      for (let day = 1; day <= DAYS; day += 1) {
        const key = dayKey(day);
        const plan = getEffectivePlan(role, day);
        const dayCheckin = normalizeCheckinEntry(challenge.checkins?.[role]?.[key]);
        total += (plan.workouts?.length || 0) + (plan.habits?.length || 0);
        done += Object.values(dayCheckin.workouts || {}).filter(Boolean).length;
        done += Object.values(dayCheckin.habits || {}).filter(Boolean).length;
      }
      result[role] = { percent: total ? Math.round((done / total) * 100) : 0 };
    });
    return result;
  }, [challenge]);

  const dayPermissionLabel = useMemo(() => {
    if (!hasStarted) return "挑战未开始，仅可预览";
    if (viewingRole !== myRole) return "对方记录，仅可查看";
    if (selectedDay < currentDay) return "历史记录，仅可查看";
    if (selectedDay > currentDay) return "未来计划，仅可预览";
    return "今日可打卡";
  }, [hasStarted, viewingRole, myRole, selectedDay, currentDay]);

  async function fetchAiCoach() {
    if (!challenge || !myRole) return;
    setAiCoachLoading(true);
    setAiCoachError("");
    try {
      const todayKey = dayKey(currentDay);
      const todayPlan = getEffectivePlan(myRole, currentDay);
      const todayCheckin = normalizeCheckinEntry(challenge.checkins?.[myRole]?.[todayKey]);
      const todayDone =
        Object.values(todayCheckin.workouts || {}).filter(Boolean).length +
        Object.values(todayCheckin.habits || {}).filter(Boolean).length;
      const todayTotal = (todayPlan.workouts?.length || 0) + (todayPlan.habits?.length || 0);
      const todayCompletion = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0;
      const prefs =
        challenge.users[myRole]?.preferences ||
        profileSummary(challenge.users[myRole]?.preferenceProfile || DEFAULT_PREFERENCE_PROFILE, myRole);
      const todayNote = challenge.notes?.[myRole]?.[todayKey] || "";

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: myRole,
          completion: todayCompletion,
          dayNumber: currentDay,
          preferences: prefs,
          stats: { male: stats.male.percent, female: stats.female.percent },
          noteText: todayNote,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "获取 AI 建议失败");
      }
      setAiCoachText(data.text || "");
    } catch (err) {
      setAiCoachError(err.message || "网络错误，请稍后重试");
      setAiCoachText("");
    } finally {
      setAiCoachLoading(false);
    }
  }

  function mutateChallenge(mutator, statusOnSuccess = "已同步到云端") {
    if (!challenge || !inviteCode) return;
    const next = mutator(challenge);
    const finalized = { ...next, updatedAt: new Date().toISOString() };
    setChallenge(finalized);
    setSyncStatus("同步中...");
    saveChallengeToCloud(inviteCode, finalized).then(({ error }) => {
      setSyncStatus(error ? "云端同步失败" : statusOnSuccess);
    });
  }

  function resetJoinCreateErrors() {
    setErrorMsg("");
  }

  function showToast(message) {
    setToastMsg(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 5000);
  }

  function applyChallengeSession(nextChallenge, role, code, nickname, statusText, options = {}) {
    const { force = false } = options;
    if (stayOnLanding && !force) return;
    const normalized = normalizeChallenge(nextChallenge);
    const safeRole = role || ROLE_MALE;
    const resolvedNickname = normalized.users?.[safeRole]?.name || nickname || "";
    setMyRole(safeRole);
    setMyNickname(resolvedNickname);
    setInviteCode(code);
    setActiveRole(safeRole);
    setChallenge(normalized);
    setSelectedDay(calcCurrentDay(normalized.challengeStartDate));
    setScreen("main");
    setNeedsReconnect(false);
    setErrorMsg("");
    setSyncStatus(statusText);
    writeLocalSession(safeRole, code, resolvedNickname);
  }

  async function fetchAndRestoreChallenge({ code, role, nickname, useDirectSingle = false }) {
    if (!code || !supabase) return false;
    const requestVersion = ++restoreRequestVersionRef.current;
    const isStale = () => requestVersion !== restoreRequestVersionRef.current;
    setSyncStatus("拉取最新数据...");

    if (useDirectSingle) {
      const { data, error } = await supabase
        .from("challenges")
        .select("data")
        .eq("invite_code", code)
        .single();

      if (isStale()) return false;

      if (error) {
        console.error("Supabase reconnect failed:", error);
        if (error.code === "PGRST116") {
          setSyncStatus("未找到挑战数据");
          setErrorMsg("找不到这个邀请码，请确认是否输入正确");
        } else {
          setSyncStatus("云端读取失败");
          setErrorMsg("云端读取失败，请稍后重试");
        }
        setNeedsReconnect(true);
        return false;
      }

      if (!data?.data) {
        setSyncStatus("未找到挑战数据");
        setErrorMsg("找不到这个邀请码，请确认是否输入正确");
        setNeedsReconnect(true);
        return false;
      }

      applyChallengeSession(data.data, role, code, nickname, "已同步最新数据");
      return true;
    }

    const result = await fetchChallengeByCode(code);
    if (isStale()) return false;
    if (result.error) {
      setSyncStatus("云端读取失败");
      setNeedsReconnect(true);
      return false;
    }
    if (!result.data?.data) {
      setSyncStatus("未找到挑战数据");
      setNeedsReconnect(true);
      return false;
    }

    applyChallengeSession(result.data.data, role, code, nickname, "已同步最新数据");
    return true;
  }

  async function reloadChallenge(codeOverride) {
    const code = (codeOverride || inviteCode || "").toUpperCase();
    await fetchAndRestoreChallenge({
      code,
      role: myRole || ROLE_MALE,
      nickname: myNickname,
      useDirectSingle: false,
    });
  }

  async function reconnectChallenge() {
    setStayOnLanding(false);
    if (!supabase) {
      setSyncStatus("云端读取失败");
      setErrorMsg("Supabase 未配置");
      setNeedsReconnect(true);
      return;
    }
    const { code: storedCode, role: storedRole, nickname: storedNickname } = getStoredSessionValues();
    if (!storedCode || !storedRole) {
      setErrorMsg("本地没有可恢复的挑战信息");
      setNeedsReconnect(true);
      return;
    }
    await fetchAndRestoreChallenge({
      code: storedCode,
      role: storedRole,
      nickname: storedNickname,
      useDirectSingle: true,
    });
  }

  async function handleCreateChallenge() {
    resetJoinCreateErrors();
    const name = createNickname.trim();
    const preferenceProfile = normalizePreferenceProfile(createPreferenceProfile, "", createRole);
    const preferenceSummary = profileSummary(preferenceProfile, createRole);
    const todayKey = getDateKey(new Date());
    const startDate = createStartDate || todayKey;
    if (!name) {
      setErrorMsg("请输入昵称");
      return;
    }
    if (startDate < todayKey) {
      setErrorMsg("开始日期只能选择今天或之后");
      return;
    }
    if (!supabase) {
      setErrorMsg("请先配置 Supabase");
      return;
    }

    setPlanGenerating(true);
    setToastMsg("");
    let rolePlans;
    let usedFallback = false;
    try {
      const result = await resolveRolePlans(createRole, preferenceProfile, startDate);
      rolePlans = result.plans;
      usedFallback = result.usedFallback;
    } finally {
      setPlanGenerating(false);
    }

    let attempts = 0;
    while (attempts < 4) {
      const code = generateInviteCode();
      const exists = await fetchChallengeByCode(code);
      if (exists.data?.data) {
        attempts += 1;
        continue;
      }
      const created = createChallenge(code, createRole, name, startDate, preferenceSummary, preferenceProfile);
      created.plans = {
        male: createRole === ROLE_MALE ? rolePlans : {},
        female: createRole === ROLE_FEMALE ? rolePlans : {},
      };
      const saved = await saveChallengeToCloud(code, created);
      if (saved.error) {
        setErrorMsg("创建失败，请检查 Supabase challenges 表");
        return;
      }
      if (usedFallback) {
        showToast("计划生成失败，已使用默认计划");
      }
      applyChallengeSession(created, createRole, code, name, "挑战创建成功", { force: true });
      return;
    }
    setErrorMsg("邀请码生成冲突过多，请重试");
  }

  async function handleJoinChallenge() {
    resetJoinCreateErrors();
    const code = joinCode.trim().toUpperCase();
    const nickname = joinNickname.trim();
    const preferenceProfile = normalizePreferenceProfile(joinPreferenceProfile, "", joinRole);
    const preferenceSummary = profileSummary(preferenceProfile, joinRole);
    if (!code || code.length !== 6) {
      setErrorMsg("邀请码应为 6 位");
      return;
    }
    if (!nickname) {
      setErrorMsg("请输入昵称");
      return;
    }
    if (!supabase) {
      setErrorMsg("请先配置 Supabase");
      return;
    }

    const result = await fetchChallengeByCode(code);
    if (result.error) {
      setErrorMsg("读取挑战失败");
      return;
    }
    if (!result.data?.data) {
      setErrorMsg("邀请码不存在");
      return;
    }
    const remote = normalizeChallenge(result.data.data);
    const occupiedName = (remote.users[joinRole]?.name || "").trim();

    if (occupiedName && occupiedName !== nickname) {
      setErrorMsg("这个角色已经被占用，请选择另一个角色。");
      return;
    }

    const isReclaim = Boolean(occupiedName && occupiedName === nickname);
    const shouldRefreshPlan = !isReclaim || Boolean(preferenceSummary || profileSummary(preferenceProfile, joinRole));

    let rolePlans = remote.plans?.[joinRole] || {};
    let usedFallback = false;

    if (shouldRefreshPlan) {
      setPlanGenerating(true);
      setToastMsg("");
      try {
        rolePlans = await requestGeneratedPlan(joinRole, preferenceProfile, remote.challengeStartDate);
      } catch {
        rolePlans = buildFallbackPlans(joinRole, remote.challengeStartDate);
        usedFallback = true;
      } finally {
        setPlanGenerating(false);
      }
    }

    if (isReclaim) {
      if (shouldRefreshPlan) {
        const reclaimed = {
          ...remote,
          users: {
            ...remote.users,
            [joinRole]: {
              ...remote.users[joinRole],
              preferenceProfile,
              preferences: preferenceSummary,
            },
          },
          plans: {
            ...remote.plans,
            [joinRole]: rolePlans,
          },
        };
        const saved = await saveChallengeToCloud(code, reclaimed);
        if (!saved.error) {
          if (usedFallback) showToast("计划生成失败，已使用默认计划");
          applyChallengeSession(reclaimed, joinRole, code, nickname, "已恢复你的挑战身份", { force: true });
          return;
        }
      }
      applyChallengeSession(remote, joinRole, code, nickname, "已恢复你的挑战身份", { force: true });
      return;
    }

    const updated = {
      ...remote,
      users: {
        ...remote.users,
        [joinRole]: {
          ...remote.users[joinRole],
          name: nickname,
          goal: remote.users[joinRole]?.goal || getDefaultGoal(joinRole),
          preferenceProfile,
          preferences: preferenceSummary,
          joinedAt: new Date().toISOString(),
        },
      },
      plans: {
        ...remote.plans,
        [joinRole]: rolePlans,
      },
    };

    const saved = await saveChallengeToCloud(code, updated);
    if (saved.error) {
      setErrorMsg("加入失败，请稍后重试");
      return;
    }

    if (usedFallback) {
      showToast("计划生成失败，已使用默认计划");
    }
    applyChallengeSession(updated, joinRole, code, nickname, "加入成功，已连接共享挑战", { force: true });
  }

  function leaveChallenge() {
    restoreRequestVersionRef.current += 1;
    setStayOnLanding(false);
    clearLocalSession();
    setScreen("landing");
    setMyRole("");
    setMyNickname("");
    setInviteCode("");
    setChallenge(null);
    setNeedsReconnect(false);
    setActiveRole(ROLE_MALE);
    setSelectedDay(1);
    setTab("today");
    setErrorMsg("");
    setSyncStatus(supabase ? "连接中..." : "本地模式：Supabase 未配置");
  }

  function backToLandingWithoutClearingSession() {
    restoreRequestVersionRef.current += 1;
    setStayOnLanding(true);
    setScreen("landing");
    setErrorMsg("");
  }

  function toggleWorkout(index) {
    if (!canEdit) return;
    const dayCheckin = normalizeCheckinEntry(challenge?.checkins?.[viewingRole]?.[dKey]);
    mutateChallenge((prev) => ({
      ...prev,
      checkins: {
        ...prev.checkins,
        [viewingRole]: {
          ...prev.checkins[viewingRole],
          [dKey]: {
            ...dayCheckin,
            workouts: {
              ...(dayCheckin.workouts || {}),
              [index]: !(dayCheckin.workouts || {})[index],
            },
          },
        },
      },
    }));
  }

  function toggleHabit(index) {
    if (!canEdit) return;
    const dayCheckin = normalizeCheckinEntry(challenge?.checkins?.[viewingRole]?.[dKey]);
    mutateChallenge((prev) => ({
      ...prev,
      checkins: {
        ...prev.checkins,
        [viewingRole]: {
          ...prev.checkins[viewingRole],
          [dKey]: {
            ...dayCheckin,
            habits: {
              ...(dayCheckin.habits || {}),
              [index]: !(dayCheckin.habits || {})[index],
            },
          },
        },
      },
    }));
  }

  function updateNote(value) {
    if (!canEdit) return;
    mutateChallenge((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [viewingRole]: {
          ...prev.notes[viewingRole],
          [dKey]: value,
        },
      },
    }));
  }

  function saveMessage() {
    if (viewingRole !== myRole) return;
    mutateChallenge(
      (prev) => ({
        ...prev,
        messages: {
          ...prev.messages,
          [myRole]: {
            ...(prev.messages?.[myRole] || {}),
            [dKey]: messageDraft,
          },
        },
      }),
      "留言已保存"
    );
  }

  function copyInvite() {
    const text = `我们在做 21 天情侣健身挑战，邀请码：${inviteCode}\n你可以输入邀请码加入并选择你的身份。`;
    navigator.clipboard?.writeText(text);
    setSyncStatus("邀请码已复制");
  }

  useEffect(() => {
    if (!screen || screen !== "main" || !supabase || stayOnLanding) return;
    reconnectChallenge();
  }, [screen, stayOnLanding]);

  useEffect(() => {
    if (!challenge?.challengeStartDate) return;
    const start = parseDateOnly(challenge.challengeStartDate);
    start.setDate(1);
    setCalendarMonthDate(start);
  }, [challenge?.challengeStartDate]);

  useEffect(() => {
    if (viewingRole === myRole) {
      setMessageDraft(challenge?.messages?.[myRole]?.[dKey] || "");
    }
  }, [challenge, myRole, viewingRole, dKey]);

  useEffect(() => {

    const channels = [];
    const handlers = (payload) => {
      const nextData = payload?.new?.data;
      if (!nextData) return;
      const normalized = normalizeChallenge(nextData);
      setChallenge(normalized);
      setSyncStatus("收到对方更新 ✅");
    };

    const inviteChannel = supabase
      .channel(`challenge-by-code-${inviteCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `invite_code=eq.${inviteCode}` }, handlers)
      .subscribe();
    channels.push(inviteChannel);

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [inviteCode, screen]);

  if (screen === "landing") {
    return (
      <div className="app-shell">
        <div className="mobile-container">
          <Card className="card glass-card">
            <CardContent className="card-content section-stack">
              <div className="header-row">
                <div>
                  <h1 className="app-title">21天情侣健身挑战</h1>
                  <p className="app-subtitle">邀请制共享挑战</p>
                </div>
                <div className="icon-pill"><Heart size={22} /></div>
              </div>
              <Button className="primary-btn full-btn" onClick={() => { setScreen("create"); setCreateRole(ROLE_MALE); setCreateStartDate(formatDateOnly(new Date())); setCreatePreferenceProfile(createDefaultPreferenceProfile()); }}>
                <Users size={16} />Create Couple Challenge
              </Button>
              <Button className="ghost-btn full-btn" onClick={() => { setScreen("join"); setJoinRole(ROLE_FEMALE); setJoinPreferenceProfile(createDefaultPreferenceProfile()); }}>
                <UserPlus size={16} />Join Challenge
              </Button>
              <div className="footer-note">创建者只需填写自己的身份和昵称，另一半用邀请码加入并填写自己的信息。</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (screen === "create") {
    return (
      <div className="app-shell">
        <div className="mobile-container">
          <Card className="card glass-card">
            <CardContent className="card-content section-stack">
              <h2 className="section-heading">创建挑战</h2>
              <div className="role-toggle-grid">
                <Button className={`role-btn ${createRole === ROLE_MALE ? "is-active" : ""}`} onClick={() => setCreateRole(ROLE_MALE)}>♂ 男生</Button>
                <Button className={`role-btn ${createRole === ROLE_FEMALE ? "is-active" : ""}`} onClick={() => setCreateRole(ROLE_FEMALE)}>♀ 女生</Button>
              </div>
              <input
                className="text-input"
                value={createNickname}
                onChange={(event) => setCreateNickname(event.target.value)}
                placeholder="输入你的昵称"
              />
              <input
                className="text-input"
                type="date"
                min={formatDateOnly(new Date())}
                value={createStartDate}
                onChange={(event) => setCreateStartDate(event.target.value)}
              />
              <PreferenceForm
                role={createRole}
                value={createPreferenceProfile}
                onChange={setCreatePreferenceProfile}
              />
              <div className="footer-note">开始日期可选今天或未来日期。偏好设置会用于微调训练计划。</div>
              {toastMsg && <div className="info-box toast-line">{toastMsg}</div>}
              {errorMsg && <div className="error-line">{errorMsg}</div>}
              <Button
                className="primary-btn full-btn"
                onClick={handleCreateChallenge}
                disabled={planGenerating}
              >
                {planGenerating ? "🤖 AI 正在为你生成专属计划，请稍候（约10-20秒）…" : "生成邀请码并创建"}
              </Button>
              <Button className="ghost-btn full-btn" onClick={() => { setScreen("landing"); setErrorMsg(""); setToastMsg(""); }} disabled={planGenerating}>返回</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (screen === "join") {
    return (
      <div className="app-shell">
        <div className="mobile-container">
          <Card className="card glass-card">
            <CardContent className="card-content section-stack">
              <h2 className="section-heading">加入挑战</h2>
              <input
                className="text-input code-input"
                maxLength={6}
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="输入 6 位邀请码"
              />
              <div className="role-toggle-grid">
                <Button className={`role-btn ${joinRole === ROLE_MALE ? "is-active" : ""}`} onClick={() => setJoinRole(ROLE_MALE)}>♂ 男生</Button>
                <Button className={`role-btn ${joinRole === ROLE_FEMALE ? "is-active" : ""}`} onClick={() => setJoinRole(ROLE_FEMALE)}>♀ 女生</Button>
              </div>
              <input
                className="text-input"
                value={joinNickname}
                onChange={(event) => setJoinNickname(event.target.value)}
                placeholder="输入你的昵称"
              />
              <PreferenceForm
                role={joinRole}
                value={joinPreferenceProfile}
                onChange={setJoinPreferenceProfile}
              />
              {toastMsg && <div className="info-box toast-line">{toastMsg}</div>}
              {errorMsg && <div className="error-line">{errorMsg}</div>}
              <Button
                className="primary-btn full-btn"
                onClick={handleJoinChallenge}
                disabled={planGenerating}
              >
                {planGenerating ? "🤖 AI 正在为你生成专属计划，请稍候（约10-20秒）…" : "加入挑战"}
              </Button>
              <Button className="ghost-btn full-btn" onClick={() => { setScreen("landing"); setErrorMsg(""); setToastMsg(""); }} disabled={planGenerating}>返回</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="app-shell">
        <div className="mobile-container">
          <Card className="card glass-card">
            <CardContent className="card-content section-stack">
              <div className="sync-line"><Cloud size={16} /> {syncStatus}</div>
              {needsReconnect ? (
                <>
                  <div className="info-box">
                    无法恢复挑战连接。当前邀请码：<b>{inviteCode || "未找到"}</b><br />
                    身份：<b>{myRole ? roleLabel(myRole) : "未记录"}</b>
                    {myNickname ? <> ｜ 昵称：<b>{myNickname}</b></> : null}
                  </div>
                  <Button className="ghost-btn full-btn" onClick={reconnectChallenge}>重新连接挑战</Button>
                  <Button className="danger-btn full-btn" onClick={leaveChallenge}>退出当前挑战</Button>
                  <Button className="ghost-btn full-btn" onClick={backToLandingWithoutClearingSession}>返回初始界面</Button>
                </>
              ) : (
                <>
                  <Button className="ghost-btn full-btn" onClick={reconnectChallenge}>重新连接挑战</Button>
                  <Button className="danger-btn full-btn" onClick={leaveChallenge}>退出当前挑战</Button>
                  <Button className="ghost-btn full-btn" onClick={backToLandingWithoutClearingSession}>返回初始界面</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const meName = challenge.users[myRole]?.name || myNickname || roleLabel(myRole);
  const partner = oppositeRole(myRole);
  const partnerName = challenge.users[partner]?.name || roleLabel(partner);
  const selectedChallengeDate = getChallengeDateForDay(challenge.challengeStartDate, selectedDay);
  const challengeEndDateObj = getChallengeDateForDay(challenge.challengeStartDate, DAYS);

  return (
    <div className="app-shell">
      <div className="mobile-container">
        <div className="header-wrap">
          <div className="header-row">
            <div>
              <h1 className="app-title">21天情侣健身挑战</h1>
              <p className="app-subtitle">{`邀请码：${inviteCode} ｜ ${meName} × ${partnerName}`}</p>
            </div>
            <div className="icon-pill"><Heart size={22} /></div>
          </div>
        </div>

        <Card className="card glass-card">
          <CardContent className="card-content">
            <div className="sync-line"><Cloud size={16} /> {syncStatus}</div>
            <div className="identity-line">你当前身份：{roleLabel(myRole)}</div>
            <div className="identity-line">挑战周期：{challenge.challengeStartDate} ~ {getDateKey(challengeEndDateObj)}</div>
            <div className="identity-line">{hasStarted ? `今天是 Day ${currentDay} / 21` : `挑战将于 ${challenge.challengeStartDate} 开始`}</div>
            <div className="role-toggle-grid">
              <Button className={`role-btn ${activeRole === ROLE_MALE ? "is-active" : ""}`} onClick={() => setActiveRole(ROLE_MALE)}>
                ♂ {challenge.users.male.name || "男生"}
              </Button>
              <Button className={`role-btn ${activeRole === ROLE_FEMALE ? "is-active" : ""}`} onClick={() => setActiveRole(ROLE_FEMALE)}>
                ♀ {challenge.users.female.name || "女生"}
              </Button>
            </div>
            <div className="progress-grid">
              <div className="progress-card">
                <div className="progress-label">♂ 男生进度</div>
                <div className="progress-value">{stats.male.percent}%</div>
              </div>
              <div className="progress-card">
                <div className="progress-label">♀ 女生进度</div>
                <div className="progress-value">{stats.female.percent}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="view-tabs view-tabs-4">
          <Button className={`tab-btn ${tab === "today" ? "is-active" : ""}`} onClick={() => setTab("today")}><Activity size={16} />今日</Button>
          <Button className={`tab-btn ${tab === "calendar" ? "is-active" : ""}`} onClick={() => setTab("calendar")}><CalendarDays size={16} />日历</Button>
          <Button className={`tab-btn ${tab === "partner" ? "is-active" : ""}`} onClick={() => setTab("partner")}><Users size={16} />对方</Button>
          <Button className={`tab-btn ${tab === "coach" ? "is-active" : ""}`} onClick={() => setTab("coach")}><MessageCircle size={16} />AI</Button>
        </div>

        {tab === "today" && (
          <div className="section-stack">
            {selectedPlan.pending ? (
              <Card className="card glass-card">
                <CardContent className="card-content section-stack">
                  <div className="today-top">
                    <div>
                      <div className="day-label">Day {selectedDay} / 21</div>
                      <div className="today-goal">{getDateKey(selectedChallengeDate)}</div>
                      <h2 className="today-title">{roleLabel(viewingRole)} 训练计划</h2>
                    </div>
                  </div>
                  <div className="info-box plan-pending-box">{selectedPlan.title}</div>
                  <div className="day-nav">
                    <Button className="dark-btn" onClick={() => setSelectedDay((prev) => Math.max(1, prev - 1))}>上一天</Button>
                    <Button className="dark-btn" onClick={() => setSelectedDay((prev) => Math.min(21, prev + 1))}>下一天</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
            <Card className="card white-card">
              <CardContent className="card-content card-large">
                <div className="today-top">
                  <div>
                    <div className="day-label">Day {selectedDay} / 21</div>
                    <div className="today-goal">{getDateKey(selectedChallengeDate)}</div>
                    <h2 className="today-title">{selectedPlan.title}</h2>
                    <p className="today-goal">{roleLabel(viewingRole)} ｜目标：{challenge.users[viewingRole].goal || getDefaultGoal(viewingRole)}</p>
                    {challenge.users[viewingRole].preferences ? (
                      <p className="today-goal">个性化：{challenge.users[viewingRole].preferences}</p>
                    ) : null}
                  </div>
                  <div className="today-percent">
                    <div className="today-percent-value">{completion}%</div>
                    <div className="today-percent-label">{dayPermissionLabel}</div>
                  </div>
                </div>
                <div className="permission-pill">{dayPermissionLabel}</div>
                <div className="section-title"><Activity size={18} />今日训练</div>
                <div className="workout-list">
                  {selectedPlan.workouts.map((exercise, index) => (
                    <button
                      key={`${exercise.name}-${index}`}
                      onClick={() => toggleWorkout(index)}
                      disabled={!canEdit}
                      className={`workout-item ${viewingRole === ROLE_FEMALE ? "female-soft" : ""} ${checkedWorkouts[index] ? "is-done" : ""}`}
                    >
                      <div className="workout-main">
                        <div className="workout-name">{exercise.name}</div>
                        <div className="workout-meta">{`${exercise.sets} 组 × ${exercise.reps} 次`}</div>
                        <div className="workout-meta">休息：{exercise.rest}</div>
                        <div className="workout-note">{exercise.note}</div>
                      </div>
                      <div className="workout-check">
                        {checkedWorkouts[index] ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="day-nav">
                  <Button className="dark-btn" onClick={() => setSelectedDay((prev) => Math.max(1, prev - 1))}>上一天</Button>
                  <Button className="dark-btn" onClick={() => setSelectedDay((prev) => Math.min(21, prev + 1))}>下一天</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card glass-card">
              <CardContent className="card-content">
                <div className="section-title"><Heart size={18} />饮食 / 恢复</div>
                <div className="habit-list">
                  {selectedPlan.habits.map((habit, index) => (
                    <button
                      key={`${habit}-${index}`}
                      onClick={() => toggleHabit(index)}
                      disabled={!canEdit}
                      className={`habit-item ${checkedHabits[index] ? "is-done" : ""}`}
                    >
                      {checkedHabits[index] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      <span className="habit-text">{habit}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
              </>
            )}

            {!selectedPlan.pending && (
              <>
            <Card className="card glass-card">
              <CardContent className="card-content">
                <div className="section-title"><Activity size={18} />训练记录</div>
                <textarea
                  value={noteText}
                  onChange={(event) => updateNote(event.target.value)}
                  disabled={!canEdit}
                  placeholder="记录训练、饮食、睡眠"
                  className="text-area"
                />
              </CardContent>
            </Card>

            <Card className="card glass-card">
              <CardContent className="card-content section-stack">
                <div className="section-title"><Heart size={18} />给TA的话</div>
                {viewingRole === myRole ? (
                  <>
                    <textarea
                      className="text-area"
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="写一句鼓励、感谢或提醒，对方可以看到"
                    />
                    <Button className="primary-btn full-btn" onClick={saveMessage}>
                      保存留言
                    </Button>
                  </>
                ) : (
                  <div className="info-box">
                    💌 TA给你的话：{dayMessageText || "（暂无留言）"}
                  </div>
                )}
              </CardContent>
            </Card>
              </>
            )}
          </div>
        )}

        {tab === "calendar" && (
          <Card className="card glass-card">
            <CardContent className="card-content">
              <div className="calendar-header">
                <h2 className="section-heading">{formatMonthTitle(calendarMonthDate)}</h2>
                <div className="calendar-nav">
                  <button
                    className="calendar-nav-btn"
                    aria-label="上个月"
                    onClick={() =>
                      setCalendarMonthDate((prev) => {
                        const next = new Date(prev);
                        next.setMonth(next.getMonth() - 1);
                        return next;
                      })
                    }
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="calendar-nav-btn"
                    aria-label="下个月"
                    onClick={() =>
                      setCalendarMonthDate((prev) => {
                        const next = new Date(prev);
                        next.setMonth(next.getMonth() + 1);
                        return next;
                      })
                    }
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="calendar-grid">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
                  <div key={label} className="calendar-day is-empty">{label}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {(() => {
                  const monthStart = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);
                  const monthEnd = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 0);
                  const monthDays = monthEnd.getDate();
                  const startOffset = (monthStart.getDay() + 6) % 7;
                  const cells = [];
                  const selectedDateKey = getDateKey(selectedChallengeDate);

                  for (let i = 0; i < startOffset; i += 1) {
                    const prevDate = new Date(monthStart);
                    prevDate.setDate(monthStart.getDate() - (startOffset - i));
                    cells.push({ date: prevDate, inMonth: false });
                  }

                  for (let d = 1; d <= monthDays; d += 1) {
                    cells.push({ date: new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), d), inMonth: true });
                  }

                  let tailDay = 1;
                  while (cells.length % 7 !== 0) {
                    const nextDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, tailDay);
                    cells.push({ date: nextDate, inMonth: false });
                    tailDay += 1;
                  }

                  return cells.map((cell) => {
                    const dateKey = getDateKey(cell.date);
                    const offsetDays = dateDiffDays(challenge.challengeStartDate, cell.date);
                    const day = offsetDays + 1;
                    const isChallengeDay = day >= 1 && day <= DAYS;

                    let pct = 0;
                    if (isChallengeDay) {
                      const k = dayKey(day);
                      const plan = getEffectivePlan(viewingRole, day);
                      const dayCheckin = normalizeCheckinEntry(challenge.checkins?.[viewingRole]?.[k]);
                      const done = Object.values(dayCheckin.workouts || {}).filter(Boolean).length + Object.values(dayCheckin.habits || {}).filter(Boolean).length;
                      const total = (plan.workouts?.length || 0) + (plan.habits?.length || 0);
                      pct = total ? Math.round((done / total) * 100) : 0;
                    }

                    const stateClass = dateKey === selectedDateKey
                      ? "is-current"
                      : !isChallengeDay
                        ? "is-empty"
                        : pct >= 80
                          ? "is-great"
                          : pct > 0
                            ? "is-mid"
                            : "is-empty";

                    return (
                      <button
                        key={dateKey}
                        className={`calendar-day ${stateClass} ${cell.inMonth ? "" : "is-other-month"}`}
                        disabled={!isChallengeDay}
                        onClick={() => {
                          if (!isChallengeDay) return;
                          setSelectedDay(day);
                          setTab("today");
                        }}
                      >
                        <div>{cell.date.getDate()}</div>
                        {isChallengeDay && <div style={{ fontSize: 11, opacity: 0.8 }}>D{day}</div>}
                      </button>
                    );
                  });
                })()}
              </div>
              <div className="calendar-tip">可查看真实日期对应的 Day1-21；仅当前身份且挑战开始后的今日可编辑。</div>
            </CardContent>
          </Card>
        )}

        {tab === "partner" && (
          <Card className="card glass-card">
            <CardContent className="card-content section-stack">
              <div className="section-title"><Users size={18} />对方记录，仅可查看</div>
              <div className="info-box">当前查看：{roleLabel(oppositeRole(myRole))} {challenge.users[oppositeRole(myRole)].name || ""}</div>
              <Button className="ghost-btn full-btn" onClick={() => setActiveRole(oppositeRole(myRole))}>切换到对方视角</Button>
              <Button className="ghost-btn full-btn" onClick={() => { setSelectedDay(currentDay); setTab("today"); }}>查看对方今日记录</Button>
            </CardContent>
          </Card>
        )}

        {tab === "coach" && (
          <Card className="card glass-card">
            <CardContent className="card-content section-stack">
              <div className="coach-head">
                <Flame size={22} />
                <h2 className="section-heading">AI Coach</h2>
              </div>
              <div className={`info-box ${aiCoachError ? "error-line" : ""}`}>
                {aiCoachLoading
                  ? "正在生成 AI 建议，请稍候…"
                  : aiCoachError || aiCoachText || "点击「获取 AI 建议」，将根据今日完成率、训练记录与双方进度生成个性化教练反馈。"}
              </div>
              <Button
                className="primary-btn full-btn"
                onClick={fetchAiCoach}
                disabled={aiCoachLoading}
              >
                <MessageCircle size={16} />
                {aiCoachLoading ? "生成中…" : "获取 AI 建议"}
              </Button>
              <div className="info-box">
                邀请码分享卡：<b>{inviteCode}</b><br />
                把邀请码发给你的另一半，对方选择剩余身份后即可加入同一个挑战。
              </div>
              <Button className="primary-btn full-btn" onClick={copyInvite}><Share2 size={16} />复制邀请码</Button>
              <Button className="ghost-btn full-btn" onClick={() => reloadChallenge()}><RefreshCw size={16} />手动同步</Button>
              <Button className="danger-btn full-btn" onClick={leaveChallenge}>离开挑战</Button>
            </CardContent>
          </Card>
        )}

        <Card className="card glass-card">
          <CardContent className="card-content">
            <Button className="danger-btn full-btn" onClick={leaveChallenge}>退出当前挑战</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
