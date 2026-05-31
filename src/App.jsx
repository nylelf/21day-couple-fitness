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
import { getDefaultGoal } from "./plans";
import PreferenceForm from "./PreferenceForm";
import { getPlanMealItems, usesLegacyRecoveryHabits } from "./mealPlan";
import { formatPlanTitle, formatRestTime, formatWorkoutName, formatWorkoutVolume } from "./formatLabels";
import {
  createDefaultPreferenceProfile,
  createDefaultPreferenceProfileForRole,
  DEFAULT_PREFERENCE_PROFILE,
  getGoalLabels,
  normalizePreferenceProfile,
  profileSummary,
} from "./preferenceProfile";
import { fetchChallengeByCode, saveChallengeToCloud, supabase } from "./supabaseClient";
import { clearLocalSession, getStoredSessionValues, readLocalSession, writeLocalSession } from "./sessionStorage";
import { DAYS, ROLE_FEMALE, ROLE_MALE, oppositeRole, roleLabel } from "./constants";
import {
  calcCurrentDay,
  dateDiffDays,
  formatDateOnly,
  formatMonthTitle,
  getChallengeDateForDay,
  getDateKey,
  parseDateOnly,
} from "./dateUtils";
import {
  buildCompletedPlanMeta,
  createChallenge,
  createEmptyPlanMeta,
  dayKey,
  generateInviteCode,
  normalizeChallenge,
  normalizeCheckinEntry,
} from "./challenge";
import {
  buildAllPendingPlans,
  buildPendingPlansFromDay,
  createPendingPlan,
  generatePlanChunkForRole,
  getPendingPlanForDay,
  resolveRolePlans,
} from "./planGeneration";
import { getNextChunkToGenerate, getPlanMetaForRole, isStoredAiDayPlan } from "./planMeta";
import { Button, Card, CardContent } from "./components/ui";

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
  const [createPreferenceProfile, setCreatePreferenceProfile] = useState(
    createDefaultPreferenceProfileForRole(ROLE_MALE)
  );
  const [createStartDate, setCreateStartDate] = useState(formatDateOnly(new Date()));
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState(ROLE_FEMALE);
  const [joinNickname, setJoinNickname] = useState("");
  const [joinPreferenceProfile, setJoinPreferenceProfile] = useState(
    createDefaultPreferenceProfileForRole(ROLE_FEMALE)
  );
  const [joinStep, setJoinStep] = useState("identify");
  const [joinRemoteChallenge, setJoinRemoteChallenge] = useState(null);
  const [joinLookupLoading, setJoinLookupLoading] = useState(false);
  const [joinIsReturningUpdate, setJoinIsReturningUpdate] = useState(false);
  const [stayOnLanding, setStayOnLanding] = useState(false);
  const restoreRequestVersionRef = useRef(0);
  const [calendarMonthDate, setCalendarMonthDate] = useState(new Date());
  const [aiCoachText, setAiCoachText] = useState("");
  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [aiCoachError, setAiCoachError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planProgress, setPlanProgress] = useState(0);
  const [planProgressLabel, setPlanProgressLabel] = useState("");
  const [planBackgroundGenerating, setPlanBackgroundGenerating] = useState(false);
  const [planBackgroundLabel, setPlanBackgroundLabel] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimerRef = useRef(null);
  const autoGenInFlightRef = useRef(false);
  const lastSeenPartnerCheerRef = useRef(null);

  const currentDay = challenge ? calcCurrentDay(challenge.challengeStartDate) : 1;
  const hasStarted = challenge ? getDateKey(new Date()) >= getDateKey(challenge.challengeStartDate) : true;
  const viewingRole = activeRole;
  const canEdit = challenge && hasStarted && viewingRole === myRole && selectedDay === currentDay;
  const dKey = dayKey(selectedDay);
  const getEffectivePlan = (role, day) => {
    const key = dayKey(day);
    const storedPlan = challenge?.plans?.[role]?.[key];
    if (isStoredAiDayPlan(storedPlan)) {
      return {
        title: formatPlanTitle(storedPlan.title || `Day ${day}`),
        workouts: (storedPlan.workouts || []).map((item) => ({
          ...item,
          name: formatWorkoutName(item.name),
        })),
        meals: storedPlan.meals,
        habits: Array.isArray(storedPlan.habits) ? storedPlan.habits : [],
      };
    }
    if (storedPlan?.pending) {
      return {
        pending: true,
        title: storedPlan.title || getPendingPlanForDay(day).title,
        workouts: [],
        habits: [],
      };
    }
    const rolePlans = challenge?.plans?.[role];
    const hasAnyPlan = rolePlans && Object.keys(rolePlans).length > 0;
    if (!hasAnyPlan) {
      return createPendingPlan();
    }
    return getPendingPlanForDay(day);
  };
  const selectedPlan = useMemo(() => {
    if (!challenge) return createPendingPlan();
    return getEffectivePlan(viewingRole, selectedDay);
  }, [challenge, viewingRole, selectedDay, dKey]);

  const checkin = normalizeCheckinEntry(challenge?.checkins?.[viewingRole]?.[dKey]);
  const checkedWorkouts = checkin.workouts || {};
  const mealItems = useMemo(() => getPlanMealItems(selectedPlan), [selectedPlan]);
  const checkedHabits = checkin.habits || {};
  const noteText = challenge?.notes?.[viewingRole]?.[dKey] || "";
  const dayMessageText = challenge?.messages?.[viewingRole]?.[dKey] || "";
  const doneCount = Object.values(checkedWorkouts).filter(Boolean).length + Object.values(checkedHabits).filter(Boolean).length;
  const totalCount = selectedPlan.workouts.length + mealItems.length;
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
        total += (plan.workouts?.length || 0) + getPlanMealItems(plan).length;
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
      const todayTotal = (todayPlan.workouts?.length || 0) + getPlanMealItems(todayPlan).length;
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

  function resetJoinFlow() {
    setJoinStep("identify");
    setJoinRemoteChallenge(null);
    setJoinLookupLoading(false);
    setJoinIsReturningUpdate(false);
    setJoinPreferenceProfile(createDefaultPreferenceProfileForRole(joinRole || ROLE_FEMALE));
    setToastMsg("");
  }

  function openJoinScreen() {
    resetJoinCreateErrors();
    resetJoinFlow();
    const stored = getStoredSessionValues();
    setJoinCode(stored.code || "");
    setJoinRole(stored.role || ROLE_FEMALE);
    setJoinNickname(stored.nickname || "");
    setScreen("join");
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
    setPlanBackgroundGenerating(false);
    setToastMsg("");
    setPlanProgress(0);
    setPlanProgressLabel("正在生成第 1–7 天计划…");

    let inviteCode = "";
    let attempts = 0;
    while (attempts < 4) {
      const candidate = generateInviteCode();
      const exists = await fetchChallengeByCode(candidate);
      if (!exists.data?.data) {
        inviteCode = candidate;
        break;
      }
      attempts += 1;
    }
    if (!inviteCode) {
      setPlanGenerating(false);
      setErrorMsg("邀请码生成冲突过多，请重试");
      return;
    }

    const pendingPlans = buildAllPendingPlans();
    const created = createChallenge(inviteCode, createRole, name, startDate, preferenceSummary, preferenceProfile);
    created.plans = {
      male: createRole === ROLE_MALE ? { ...pendingPlans } : {},
      female: createRole === ROLE_FEMALE ? { ...pendingPlans } : {},
    };
    created.planMeta = {
      male: createRole === ROLE_MALE ? createEmptyPlanMeta() : getPlanMetaForRole(created, ROLE_MALE),
      female: createRole === ROLE_FEMALE ? createEmptyPlanMeta() : getPlanMetaForRole(created, ROLE_FEMALE),
    };

    let mergedPlans = { ...pendingPlans };
    let enteredMain = false;
    let usedFallback = false;

    const syncPlans = async (nextPlans, planMetaPatch, toastMessage) => {
      mergedPlans = { ...mergedPlans, ...nextPlans };
      const updated = {
        ...created,
        plans: {
          ...created.plans,
          [createRole]: { ...mergedPlans },
        },
        planMeta: {
          ...created.planMeta,
          [createRole]: {
            ...(created.planMeta?.[createRole] || {}),
            ...planMetaPatch,
          },
        },
      };
      created.planMeta = updated.planMeta;
      const saved = await saveChallengeToCloud(inviteCode, updated);
      if (saved.error) {
        throw new Error("保存计划失败");
      }
      if (enteredMain) {
        setChallenge(normalizeChallenge(updated));
        if (toastMessage) showToast(toastMessage);
      }
      return updated;
    };

    try {
      const result = await resolveRolePlans(createRole, preferenceProfile, startDate, {
        onProgressUpdate: (pct, chunk) => {
          setPlanProgress(pct);
          setPlanProgressLabel(`正在生成 ${chunk.label}…`);
        },
        onChunkComplete: async (chunk, chunkPlans) => {
          await syncPlans(chunkPlans, buildCompletedPlanMeta(7));
          if (chunk.start === 1 && !enteredMain) {
            enteredMain = true;
            setPlanGenerating(false);
            const latest = {
              ...created,
              plans: {
                ...created.plans,
                [createRole]: { ...mergedPlans },
              },
              planMeta: created.planMeta,
            };
            applyChallengeSession(latest, createRole, inviteCode, name, "挑战创建成功", { force: true });
            showToast("第 1–7 天已就绪；第 8 天起将根据打卡数据自动生成后续计划");
          }
        },
      });

      usedFallback = result.usedFallback;
      await syncPlans(result.plans, buildCompletedPlanMeta(result.generatedThrough || 7, result.usedFallback));
      setPlanProgress(100);
      setPlanProgressLabel("第 1–7 天计划已生成");

      if (!enteredMain && isStoredAiDayPlan(result.plans["day-1"])) {
        enteredMain = true;
        const latest = {
          ...created,
          plans: {
            ...created.plans,
            [createRole]: { ...mergedPlans },
          },
          planMeta: created.planMeta,
        };
        applyChallengeSession(latest, createRole, inviteCode, name, "挑战创建成功", { force: true });
        showToast(usedFallback ? "AI 未连接，已使用本地模板（第 1–7 天）" : "第 1–7 天计划已生成");
      } else if (enteredMain && usedFallback) {
        showToast("AI 未连接，第 1–7 天已用本地模板");
      }
    } catch {
      setErrorMsg("创建失败，请稍后重试");
      setPlanGenerating(false);
      setPlanBackgroundGenerating(false);
      return;
    } finally {
      setPlanGenerating(false);
      setPlanBackgroundGenerating(false);
    }

    if (!enteredMain) {
      setErrorMsg("计划生成失败，请稍后重试");
    }
    return;
  }

  async function handleJoinLookup() {
    resetJoinCreateErrors();
    const code = joinCode.trim().toUpperCase();
    const nickname = joinNickname.trim();
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

    setJoinLookupLoading(true);
    try {
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

      setJoinRemoteChallenge(remote);
      if (occupiedName && occupiedName === nickname) {
        setJoinStep("welcome");
        return;
      }

      setJoinIsReturningUpdate(false);
      setJoinPreferenceProfile(createDefaultPreferenceProfileForRole(joinRole || ROLE_FEMALE));
      setJoinStep("preferences");
    } finally {
      setJoinLookupLoading(false);
    }
  }

  async function handleJoinDirectEnter() {
    if (!joinRemoteChallenge) return;
    const code = joinCode.trim().toUpperCase();
    const nickname = joinNickname.trim();
    const day1Plan = joinRemoteChallenge.plans?.[joinRole]?.["day-1"];
    if (isStoredAiDayPlan(day1Plan)) {
      applyChallengeSession(joinRemoteChallenge, joinRole, code, nickname, "欢迎回来！", { force: true });
      resetJoinFlow();
      return;
    }

    const existing = joinRemoteChallenge.users?.[joinRole]?.preferenceProfile;
    const preferenceProfile = existing
      ? normalizePreferenceProfile(existing, "", joinRole)
      : createDefaultPreferenceProfileForRole(joinRole);
    setJoinPreferenceProfile({ ...preferenceProfile });
    setJoinIsReturningUpdate(true);
    setJoinStep("preferences");
    await handleJoinCompleteWithPreferences(preferenceProfile);
  }

  function handleJoinStartUpdatePreferences() {
    if (!joinRemoteChallenge) return;
    const existing = joinRemoteChallenge.users?.[joinRole]?.preferenceProfile;
    setJoinPreferenceProfile(
      existing
        ? { ...normalizePreferenceProfile(existing, "", joinRole) }
        : createDefaultPreferenceProfileForRole(joinRole)
    );
    setJoinIsReturningUpdate(true);
    setJoinStep("preferences");
  }

  async function handleJoinCompleteWithPreferences(preferenceProfileOverride) {
    resetJoinCreateErrors();
    const code = joinCode.trim().toUpperCase();
    const nickname = joinNickname.trim();
    if (!joinRemoteChallenge) {
      setErrorMsg("请先完成上一步验证");
      setJoinStep("identify");
      return;
    }
    if (!code || !nickname) {
      setErrorMsg("邀请码或昵称无效，请返回上一步");
      setJoinStep("identify");
      return;
    }

    const latestResult = await fetchChallengeByCode(code);
    if (latestResult.error || !latestResult.data?.data) {
      setErrorMsg("读取挑战失败，请稍后重试");
      return;
    }
    const remote = normalizeChallenge(latestResult.data.data);

    const preferenceProfile = normalizePreferenceProfile(
      preferenceProfileOverride ?? joinPreferenceProfile,
      "",
      joinRole
    );
    const preferenceSummary = profileSummary(preferenceProfile, joinRole);

    // 新用户加入 / 老用户更新偏好：调用 /api/generate-plan
    setPlanGenerating(true);
    setPlanBackgroundGenerating(false);
    setToastMsg("");
    setPlanProgress(0);
    setPlanProgressLabel("正在生成第 1–7 天计划…");

    let rolePlans;
    let usedFallback = false;
    let enteredMain = false;

    try {
      const result = await resolveRolePlans(joinRole, preferenceProfile, remote.challengeStartDate, {
        onProgressUpdate: (pct, chunk) => {
          setPlanProgress(pct);
          setPlanProgressLabel(`正在生成 ${chunk.label}…`);
        },
        onChunkComplete: async (chunk, chunkPlans, mergedPartial) => {
          if (chunk.start !== 1 || enteredMain) return;

          const partialPlans = mergedPartial || {
            ...buildPendingPlansFromDay(8),
            ...chunkPlans,
          };
          const earlyUpdated = {
            ...remote,
            users: {
              ...remote.users,
              [joinRole]: {
                ...remote.users[joinRole],
                name: nickname,
                goal: getGoalLabels(joinRole, preferenceProfile.goals),
                preferenceProfile,
                preferences: preferenceSummary,
                joinedAt: remote.users[joinRole]?.joinedAt || new Date().toISOString(),
              },
            },
            plans: {
              ...remote.plans,
              [joinRole]: partialPlans,
            },
            planMeta: {
              ...remote.planMeta,
              [joinRole]: buildCompletedPlanMeta(7),
            },
          };

          const saved = await saveChallengeToCloud(code, earlyUpdated);
          if (!saved.error) {
            enteredMain = true;
            setPlanGenerating(false);
            applyChallengeSession(
              earlyUpdated,
              joinRole,
              code,
              nickname,
              joinIsReturningUpdate ? "偏好已更新" : "加入成功",
              { force: true }
            );
            resetJoinFlow();
            showToast("第 1–7 天已就绪；第 8 天起将根据打卡数据自动生成后续计划");
          }
        },
      });

      rolePlans = result.plans;
      usedFallback = result.usedFallback;
      setPlanProgress(100);
      setPlanProgressLabel("第 1–7 天计划已生成");
    } finally {
      setPlanGenerating(false);
      setPlanBackgroundGenerating(false);
    }

    if (!isStoredAiDayPlan(rolePlans?.["day-1"])) {
      if (!enteredMain) setErrorMsg("计划生成失败，请稍后重试");
      return;
    }

    const updated = {
      ...remote,
      users: {
        ...remote.users,
        [joinRole]: {
          ...remote.users[joinRole],
          name: nickname,
          goal: getGoalLabels(joinRole, preferenceProfile.goals),
          preferenceProfile,
          preferences: preferenceSummary,
          joinedAt: remote.users[joinRole]?.joinedAt || new Date().toISOString(),
        },
      },
      plans: {
        ...remote.plans,
        [joinRole]: rolePlans,
      },
      planMeta: {
        ...remote.planMeta,
        [joinRole]: buildCompletedPlanMeta(result.generatedThrough || 7, usedFallback),
      },
    };

    const saved = await saveChallengeToCloud(code, updated);
    if (saved.error) {
      if (!enteredMain) setErrorMsg("加入失败，请稍后重试");
      return;
    }

    if (usedFallback) {
      showToast(
        `${roleLabel(joinRole)}计划 AI 生成未完成，已按你填写的偏好（含每周运动、分化等）用本地计划补全。${result.fallbackError ? ` ${result.fallbackError}` : ""}`
      );
    } else if (!enteredMain) {
      showToast("第 1–7 天计划已生成");
    }

    if (!enteredMain) {
      applyChallengeSession(
        updated,
        joinRole,
        code,
        nickname,
        joinIsReturningUpdate ? "偏好与计划已更新" : "加入成功，已连接共享挑战",
        { force: true }
      );
      resetJoinFlow();
    } else {
      setChallenge(normalizeChallenge(updated));
    }
    return;
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

  function sendCheerToPartner() {
    if (!challenge || !myRole || screen !== "main") return;
    const partnerRole = oppositeRole(myRole);
    const partnerDisplayName = challenge.users[partnerRole]?.name || roleLabel(partnerRole);
    if (!challenge.users[partnerRole]?.name?.trim()) {
      showToast("等 TA 加入挑战后再点赞吧");
      return;
    }
    if (!hasStarted) {
      showToast(`挑战 ${challenge.challengeStartDate} 开始后才能点赞`);
      return;
    }
    const cheerKey = dayKey(currentDay);
    if (challenge.cheersFrom?.[myRole]?.[cheerKey]) {
      showToast("今天已经送过爱心啦，明天再来～");
      return;
    }
    mutateChallenge(
      (prev) => ({
        ...prev,
        cheersFrom: {
          ...prev.cheersFrom,
          [myRole]: {
            ...(prev.cheersFrom?.[myRole] || {}),
            [cheerKey]: new Date().toISOString(),
          },
        },
      }),
      `已给 ${partnerDisplayName} 送去爱心鼓励 💕`
    );
  }

  function copyInvite() {
    const text = `我们在做 21 天情侣健身挑战，邀请码：${inviteCode}\n你可以输入邀请码加入并选择你的身份。`;
    navigator.clipboard?.writeText(text);
    setSyncStatus("邀请码已复制");
  }

  useEffect(() => {
    if (!hasRestorableSession || !supabase || stayOnLanding) return;
    if (screen === "main" && !challenge) {
      reconnectChallenge();
    }
  }, [screen, stayOnLanding, hasRestorableSession, challenge]);

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
    if (!challenge || !myRole || screen !== "main" || !hasStarted) return;
    const partnerRole = oppositeRole(myRole);
    const cheerKey = dayKey(currentDay);
    const sentAt = challenge.cheersFrom?.[partnerRole]?.[cheerKey];
    if (!sentAt || sentAt === lastSeenPartnerCheerRef.current) return;
    lastSeenPartnerCheerRef.current = sentAt;
    const name = challenge.users[partnerRole]?.name || roleLabel(partnerRole);
    showToast(`${name} 给你点了爱心 💕`);
  }, [challenge?.cheersFrom, challenge?.users, myRole, currentDay, screen, hasStarted]);

  useEffect(() => {
    if (!challenge || !myRole || !inviteCode || !supabase || screen !== "main") return;
    if (planGenerating || autoGenInFlightRef.current) return;

    const meta = getPlanMetaForRole(challenge, myRole);
    if (meta.generating) return;

    const chunk = getNextChunkToGenerate(currentDay, meta.generatedThrough);
    if (!chunk || chunk.start === 1) return;

    let cancelled = false;

    (async () => {
      autoGenInFlightRef.current = true;
      setPlanBackgroundGenerating(true);
      setPlanBackgroundLabel(`根据前 ${chunk.start - 1} 天打卡数据生成 ${chunk.label}…`);

      let locking = null;
      try {
        const latestResult = await fetchChallengeByCode(inviteCode);
        if (cancelled || latestResult.error || !latestResult.data?.data) return;

        const fresh = normalizeChallenge(latestResult.data.data);
        const freshMeta = getPlanMetaForRole(fresh, myRole);
        if (freshMeta.generating || freshMeta.generatedThrough >= chunk.end) return;

        locking = {
          ...fresh,
          planMeta: {
            ...fresh.planMeta,
            [myRole]: {
              ...freshMeta,
              generating: chunk.start,
              lastError: null,
            },
          },
        };
        setChallenge(locking);
        await saveChallengeToCloud(inviteCode, locking);

        const result = await generatePlanChunkForRole(locking, myRole, chunk);
        if (cancelled) return;

        const rolePlans = {
          ...(locking.plans?.[myRole] || {}),
          ...result.plans,
        };
        const updated = {
          ...locking,
          plans: {
            ...locking.plans,
            [myRole]: rolePlans,
          },
          planMeta: {
            ...locking.planMeta,
            [myRole]: {
              generatedThrough: chunk.end,
              generating: null,
              lastError: result.usedFallback ? "已用模板补全" : null,
              lastGeneratedAt: new Date().toISOString(),
            },
          },
        };

        setChallenge(normalizeChallenge(updated));
        await saveChallengeToCloud(inviteCode, updated);
        showToast(
          result.usedFallback
            ? `${chunk.label} 生成失败，已用模板补全`
            : `${chunk.label} 已根据上周打卡数据生成`
        );
      } catch {
        if (!cancelled && locking) {
          const freshMeta = getPlanMetaForRole(locking, myRole);
          const unlocked = {
            ...locking,
            planMeta: {
              ...locking.planMeta,
              [myRole]: {
                ...freshMeta,
                generating: null,
                lastError: "自动生成失败",
              },
            },
          };
          setChallenge(normalizeChallenge(unlocked));
          await saveChallengeToCloud(inviteCode, unlocked);
          showToast(`${chunk.label} 自动生成失败，打开 App 时会重试`);
        }
      } finally {
        autoGenInFlightRef.current = false;
        if (!cancelled) {
          setPlanBackgroundGenerating(false);
          setPlanBackgroundLabel("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    challenge?.planMeta?.[myRole]?.generatedThrough,
    challenge?.planMeta?.[myRole]?.generating,
    currentDay,
    myRole,
    screen,
    inviteCode,
    planGenerating,
  ]);

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
              <Button className="primary-btn full-btn" onClick={() => { setScreen("create"); setCreateRole(ROLE_MALE); setCreateStartDate(formatDateOnly(new Date())); setCreatePreferenceProfile(createDefaultPreferenceProfileForRole(ROLE_MALE)); }}>
                <Users size={16} />Create Couple Challenge
              </Button>
              {Boolean(myRole && inviteCode) ? (
                <Button className="primary-btn full-btn" onClick={() => { setStayOnLanding(false); setScreen("main"); }}>
                  继续我的挑战
                </Button>
              ) : null}
              <Button className="ghost-btn full-btn" onClick={openJoinScreen}>
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
                <Button
                  className={`role-btn ${createRole === ROLE_MALE ? "is-active" : ""}`}
                  onClick={() => {
                    setCreateRole(ROLE_MALE);
                    setCreatePreferenceProfile(createDefaultPreferenceProfileForRole(ROLE_MALE));
                  }}
                >
                  ♂ 男生
                </Button>
                <Button
                  className={`role-btn ${createRole === ROLE_FEMALE ? "is-active" : ""}`}
                  onClick={() => {
                    setCreateRole(ROLE_FEMALE);
                    setCreatePreferenceProfile(createDefaultPreferenceProfileForRole(ROLE_FEMALE));
                  }}
                >
                  ♀ 女生
                </Button>
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
              {planGenerating ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ marginBottom: 16, fontSize: 16 }}>🤖 AI 正在生成你的专属计划...</p>
                  <div style={{ background: "#2a2a3d", borderRadius: 8, height: 12, margin: "16px 0" }}>
                    <div
                      style={{
                        background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                        borderRadius: 8,
                        height: "100%",
                        width: `${planProgress}%`,
                        transition: "width 1.2s ease",
                      }}
                    />
                  </div>
                  <p style={{ color: "#a78bfa", fontSize: 14 }}>{planProgress}%</p>
                  <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                    {planProgressLabel || "正在并行生成 3 段计划…"}
                  </p>
                </div>
              ) : (
                <Button
                  className="primary-btn full-btn"
                  onClick={handleCreateChallenge}
                >
                  生成邀请码并创建
                </Button>
              )}
              <Button className="ghost-btn full-btn" onClick={() => { setScreen("landing"); setErrorMsg(""); setToastMsg(""); }} disabled={planGenerating}>返回</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (screen === "join") {
    if (joinStep === "welcome") {
      return (
        <div className="app-shell">
          <div className="mobile-container">
            <Card className="card glass-card">
              <CardContent className="card-content section-stack">
                <h2 className="section-heading">👋 欢迎回来，{joinNickname.trim()}！</h2>
                <div className="info-box">
                  你的专属计划已生成，是否需要更新偏好设置？
                </div>
                <div className="info-box">
                  邀请码：<b>{joinCode}</b><br />
                  身份：{roleLabel(joinRole)}
                </div>
                {errorMsg && <div className="error-line">{errorMsg}</div>}
                <Button className="primary-btn full-btn" onClick={handleJoinDirectEnter}>
                  直接进入挑战
                </Button>
                <Button className="ghost-btn full-btn" onClick={handleJoinStartUpdatePreferences}>
                  更新偏好设置
                </Button>
                <Button
                  className="ghost-btn full-btn"
                  onClick={() => {
                    setJoinStep("identify");
                    setJoinRemoteChallenge(null);
                    setErrorMsg("");
                  }}
                >
                  返回修改信息
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (joinStep === "preferences") {
      return (
        <div className="app-shell">
          <div className="mobile-container">
            <Card className="card glass-card">
              <CardContent className="card-content section-stack">
                <h2 className="section-heading">
                  {joinIsReturningUpdate ? "更新偏好设置" : "填写偏好设置"}
                </h2>
                <div className="info-box">
                  {joinNickname.trim()} ｜ {roleLabel(joinRole)} ｜ 邀请码 {joinCode}
                </div>
                <PreferenceForm
                  role={joinRole}
                  value={joinPreferenceProfile}
                  onChange={setJoinPreferenceProfile}
                />
                {toastMsg && <div className="info-box toast-line">{toastMsg}</div>}
                {errorMsg && <div className="error-line">{errorMsg}</div>}
                {planGenerating ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <p style={{ marginBottom: 16, fontSize: 16 }}>🤖 AI 正在生成你的专属计划...</p>
                    <div style={{ background: "#2a2a3d", borderRadius: 8, height: 12, margin: "16px 0" }}>
                      <div
                        style={{
                          background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                          borderRadius: 8,
                          height: "100%",
                          width: `${planProgress}%`,
                          transition: "width 1.2s ease",
                        }}
                      />
                    </div>
                    <p style={{ color: "#a78bfa", fontSize: 14 }}>{planProgress}%</p>
                    <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                      {planProgressLabel || "正在并行生成 3 段计划…"}
                    </p>
                  </div>
                ) : (
                  <Button
                    className="primary-btn full-btn"
                    onClick={() =>
                      handleJoinCompleteWithPreferences(
                        normalizePreferenceProfile(joinPreferenceProfile, "", joinRole)
                      )
                    }
                  >
                    {joinIsReturningUpdate ? "保存并重新生成计划" : "加入挑战"}
                  </Button>
                )}
                <Button
                  className="ghost-btn full-btn"
                  onClick={() => {
                    if (joinIsReturningUpdate) {
                      setJoinStep("welcome");
                      setErrorMsg("");
                      return;
                    }
                    setJoinStep("identify");
                    setJoinRemoteChallenge(null);
                    setErrorMsg("");
                  }}
                  disabled={planGenerating}
                >
                  返回
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

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
                <Button
                  className={`role-btn ${joinRole === ROLE_MALE ? "is-active" : ""}`}
                  onClick={() => {
                    setJoinRole(ROLE_MALE);
                    setJoinPreferenceProfile(createDefaultPreferenceProfileForRole(ROLE_MALE));
                  }}
                >
                  ♂ 男生
                </Button>
                <Button
                  className={`role-btn ${joinRole === ROLE_FEMALE ? "is-active" : ""}`}
                  onClick={() => {
                    setJoinRole(ROLE_FEMALE);
                    setJoinPreferenceProfile(createDefaultPreferenceProfileForRole(ROLE_FEMALE));
                  }}
                >
                  ♀ 女生
                </Button>
              </div>
              <input
                className="text-input"
                value={joinNickname}
                onChange={(event) => setJoinNickname(event.target.value)}
                placeholder="输入你的昵称"
              />
              <div className="footer-note">老用户输入相同昵称可直接恢复，无需重新填写偏好。</div>
              {errorMsg && <div className="error-line">{errorMsg}</div>}
              <Button
                className="primary-btn full-btn"
                onClick={handleJoinLookup}
                disabled={joinLookupLoading}
              >
                {joinLookupLoading ? "正在验证…" : "继续"}
              </Button>
              <Button
                className="ghost-btn full-btn"
                onClick={() => { setScreen("landing"); resetJoinFlow(); setErrorMsg(""); }}
                disabled={joinLookupLoading}
              >
                返回
              </Button>
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
  const todayCheerKey = dayKey(currentDay);
  const iCheeredPartnerToday = Boolean(challenge.cheersFrom?.[myRole]?.[todayCheerKey]);
  const partnerCheeredMeToday = Boolean(challenge.cheersFrom?.[partner]?.[todayCheerKey]);
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
            <button
              type="button"
              className={`icon-pill heart-btn ${iCheeredPartnerToday ? "is-cheered" : ""}`}
              onClick={sendCheerToPartner}
              aria-label="给 TA 点赞"
              title={iCheeredPartnerToday ? "今天已送爱心" : "给 TA 一个爱心鼓励"}
            >
              <Heart size={22} fill={iCheeredPartnerToday ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <Card className="card glass-card">
          <CardContent className="card-content">
            <div className="sync-line"><Cloud size={16} /> {syncStatus}</div>
            {partnerCheeredMeToday ? (
              <div className="info-box cheer-received-banner">
                💕 {partnerName} 今天给你点了爱心，继续一起加油！
              </div>
            ) : null}
            {planBackgroundGenerating ? (
              <div className="info-box plan-bg-gen-note">
                ⏳ {planBackgroundLabel || "正在根据打卡数据生成后续计划…"}
              </div>
            ) : null}
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
            <Card className="card glass-card">
              <CardContent className="card-content">
                <div className="today-top">
                  <div>
                    <div className="day-label">Day {selectedDay} / 21</div>
                    <div className="today-goal">{getDateKey(selectedChallengeDate)}</div>
                    <h2 className="today-title">{selectedPlan.title}</h2>
                    <p className="today-goal">{roleLabel(viewingRole)} ｜目标：{challenge.users[viewingRole].goal || getDefaultGoal(viewingRole)}</p>
                  </div>
                  <div className="today-percent">
                    <div className="today-percent-value">{completion}%</div>
                    <div className="today-percent-label">{dayPermissionLabel}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card white-card workout-panel">
              <CardContent className="card-content card-large">
                <div className="workout-list">
                  {selectedPlan.workouts.map((exercise, index) => (
                    <button
                      key={`${exercise.name}-${index}`}
                      type="button"
                      onClick={() => toggleWorkout(index)}
                      disabled={!canEdit}
                      className={`workout-item ${checkedWorkouts[index] ? "is-done" : ""}`}
                    >
                      <div className="workout-main">
                        <div className="workout-name">{formatWorkoutName(exercise.name)}</div>
                        <div className="workout-meta">{formatWorkoutVolume(exercise)}</div>
                        {formatRestTime(exercise.rest) ? (
                          <div className="workout-meta">{formatRestTime(exercise.rest)}</div>
                        ) : null}
                        {exercise.note ? <div className="workout-note">{exercise.note}</div> : null}
                      </div>
                      <div className="workout-check">
                        {checkedWorkouts[index] ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="day-nav day-nav-standalone">
              <Button className="dark-btn" onClick={() => setSelectedDay((prev) => Math.max(1, prev - 1))}>上一天</Button>
              <Button className="dark-btn" onClick={() => setSelectedDay((prev) => Math.min(21, prev + 1))}>下一天</Button>
            </div>

            <Card className="card glass-card">
              <CardContent className="card-content">
                <div className="section-title"><Heart size={18} />饮食建议</div>
                {usesLegacyRecoveryHabits(selectedPlan) ? (
                  <div className="info-box meal-legacy-note">
                    当前为旧版饮食/恢复格式。请重新创建挑战（需 vercel dev 调用 AI）以获取按日调整的六餐建议。
                  </div>
                ) : null}
                <div className="meal-list">
                  {mealItems.map((item, index) => (
                    <button
                      key={`${item.key}-${index}`}
                      onClick={() => toggleHabit(index)}
                      disabled={!canEdit}
                      className={`meal-item ${checkedHabits[index] ? "is-done" : ""}`}
                    >
                      {checkedHabits[index] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      <div className="meal-item-body">
                        {item.label ? <div className="meal-item-label">{item.label}</div> : null}
                        <div className="meal-item-text">{item.text}</div>
                      </div>
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
                      const total = (plan.workouts?.length || 0) + getPlanMealItems(plan).length;
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
