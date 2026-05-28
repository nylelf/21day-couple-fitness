import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Circle,
  Cloud,
  Flame,
  Heart,
  MessageCircle,
  RefreshCw,
  Share2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { getBasePlan, getDefaultGoal } from "./plans";
import { fetchChallengeByCode, saveChallengeToCloud, supabase } from "./supabaseClient";

const DAYS = 21;
const LOCAL_SESSION_KEY = "couple-fitness-session-v2";
const ROLE_MALE = "male";
const ROLE_FEMALE = "female";

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
  const start = new Date(challengeStartDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return Math.min(21, Math.max(1, diff + 1));
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
  const challengeStartDate = data.challengeStartDate || new Date().toISOString().slice(0, 10);
  return {
    inviteCode,
    challengeStartDate,
    users: {
      male: {
        name: data.users?.male?.name || "",
        goal: data.users?.male?.goal || getDefaultGoal(ROLE_MALE),
        joinedAt: data.users?.male?.joinedAt || "",
      },
      female: {
        name: data.users?.female?.name || "",
        goal: data.users?.female?.goal || getDefaultGoal(ROLE_FEMALE),
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

function createChallenge(inviteCode, myRole, nickname) {
  const now = new Date().toISOString();
  const startDate = now.slice(0, 10);
  const base = normalizeChallenge({
    inviteCode,
    challengeStartDate: startDate,
    users: {
      [myRole]: {
        name: nickname.trim(),
        goal: getDefaultGoal(myRole),
        joinedAt: now,
      },
    },
  });
  return { ...base, updatedAt: now };
}

function readLocalSession() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : { myRole: "", currentInviteCode: "" };
  } catch {
    return { myRole: "", currentInviteCode: "" };
  }
}

function writeLocalSession(myRole, currentInviteCode) {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ myRole, currentInviteCode }));
}


export default function App() {
  const session = readLocalSession();
  const [screen, setScreen] = useState(session.currentInviteCode ? "main" : "landing");
  const [myRole, setMyRole] = useState(session.myRole || "");
  const [inviteCode, setInviteCode] = useState(session.currentInviteCode || "");
  const [challenge, setChallenge] = useState(null);
  const [activeRole, setActiveRole] = useState(session.myRole || ROLE_MALE);
  const [selectedDay, setSelectedDay] = useState(1);
  const [tab, setTab] = useState("today");
  const [syncStatus, setSyncStatus] = useState(supabase ? "连接中..." : "本地模式：Supabase 未配置");
  const [errorMsg, setErrorMsg] = useState("");

  const [createRole, setCreateRole] = useState(ROLE_MALE);
  const [createNickname, setCreateNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState(ROLE_FEMALE);
  const [joinNickname, setJoinNickname] = useState("");

  const currentDay = challenge ? calcCurrentDay(challenge.challengeStartDate) : 1;
  const viewingRole = activeRole;
  const canEdit = challenge && viewingRole === myRole && selectedDay === currentDay;
  const dKey = dayKey(selectedDay);
  const selectedPlan = useMemo(() => {
    if (!challenge) return getBasePlan(viewingRole, selectedDay);
    const base = getBasePlan(viewingRole, selectedDay);
    const custom = challenge.plans?.[viewingRole]?.[dKey];
    return {
      title: custom?.title || base.title,
      workouts: custom?.workouts?.length ? custom.workouts : base.workouts,
      habits: custom?.habits?.length ? custom.habits : base.habits,
    };
  }, [challenge, viewingRole, selectedDay, dKey]);

  const checkin = normalizeCheckinEntry(challenge?.checkins?.[viewingRole]?.[dKey]);
  const checkedWorkouts = checkin.workouts || {};
  const checkedHabits = checkin.habits || {};
  const noteText = challenge?.notes?.[viewingRole]?.[dKey] || "";
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
        const plan = challenge.plans?.[role]?.[key]?.workouts?.length
          ? challenge.plans[role][key]
          : getBasePlan(role, day);
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
    if (viewingRole !== myRole) return "对方记录，仅可查看";
    if (selectedDay < currentDay) return "历史记录，仅可查看";
    if (selectedDay > currentDay) return "未来计划，仅可预览";
    return "今日可打卡";
  }, [viewingRole, myRole, selectedDay, currentDay]);

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

  async function reloadChallenge(codeOverride) {
    const code = (codeOverride || inviteCode || "").toUpperCase();
    if (!code || !supabase) return;
    setSyncStatus("拉取最新数据...");
    const result = await fetchChallengeByCode(code);
    if (result.error) {
      setSyncStatus("云端读取失败");
      return;
    }
    if (!result.data?.data) {
      setSyncStatus("未找到挑战数据");
      return;
    }
    const normalized = normalizeChallenge(result.data.data);
    setChallenge(normalized);
    setSelectedDay(Math.min(selectedDay, calcCurrentDay(normalized.challengeStartDate)));
    setSyncStatus("已同步最新数据");
  }

  async function handleCreateChallenge() {
    resetJoinCreateErrors();
    const name = createNickname.trim();
    if (!name) {
      setErrorMsg("请输入昵称");
      return;
    }
    if (!supabase) {
      setErrorMsg("请先配置 Supabase");
      return;
    }

    let attempts = 0;
    while (attempts < 4) {
      const code = generateInviteCode();
      const exists = await fetchChallengeByCode(code);
      if (exists.data?.data) {
        attempts += 1;
        continue;
      }
      const created = createChallenge(code, createRole, name);
      const saved = await saveChallengeToCloud(code, created);
      if (saved.error) {
        setErrorMsg("创建失败，请检查 Supabase challenges 表");
        return;
      }
      writeLocalSession(createRole, code);
      setMyRole(createRole);
      setInviteCode(code);
      setActiveRole(createRole);
      setChallenge(created);
      setSelectedDay(calcCurrentDay(created.challengeStartDate));
      setSyncStatus("挑战创建成功");
      setScreen("main");
      return;
    }
    setErrorMsg("邀请码生成冲突过多，请重试");
  }

  async function handleJoinChallenge() {
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
    if (remote.users[joinRole]?.name) {
      setErrorMsg("这个角色已经被占用，请选择另一个角色。");
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
          joinedAt: new Date().toISOString(),
        },
      },
    };

    const saved = await saveChallengeToCloud(code, updated);
    if (saved.error) {
      setErrorMsg("加入失败，请稍后重试");
      return;
    }

    writeLocalSession(joinRole, code);
    setMyRole(joinRole);
    setInviteCode(code);
    setActiveRole(joinRole);
    setChallenge(updated);
    setSelectedDay(calcCurrentDay(updated.challengeStartDate));
    setSyncStatus("加入成功，已连接共享挑战");
    setScreen("main");
  }

  function leaveChallenge() {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setScreen("landing");
    setMyRole("");
    setInviteCode("");
    setChallenge(null);
    setActiveRole(ROLE_MALE);
    setSelectedDay(1);
    setTab("today");
    setErrorMsg("");
    setSyncStatus(supabase ? "连接中..." : "本地模式：Supabase 未配置");
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

  function updateGoal(value) {
    if (viewingRole !== myRole) return;
    mutateChallenge((prev) => ({
      ...prev,
      users: {
        ...prev.users,
        [myRole]: {
          ...prev.users[myRole],
          goal: value,
        },
      },
    }));
  }

  function copyInvite() {
    const text = `我们在做 21 天情侣健身挑战，邀请码：${inviteCode}\n你可以输入邀请码加入并选择你的身份。`;
    navigator.clipboard?.writeText(text);
    setSyncStatus("邀请码已复制");
  }

  useEffect(() => {
    if (!screen || screen !== "main" || !inviteCode || !supabase) return;
    reloadChallenge(inviteCode);
  }, [screen]);

  useEffect(() => {
    if (!supabase || !inviteCode || screen !== "main") return undefined;

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

    const legacyChannel = supabase
      .channel(`challenge-by-id-${inviteCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `id=eq.${inviteCode}` }, handlers)
      .subscribe();
    channels.push(legacyChannel);

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
              <Button className="primary-btn full-btn" onClick={() => { setScreen("create"); setCreateRole(ROLE_MALE); }}>
                <Users size={16} />Create Couple Challenge
              </Button>
              <Button className="ghost-btn full-btn" onClick={() => { setScreen("join"); setJoinRole(ROLE_FEMALE); }}>
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
              {errorMsg && <div className="error-line">{errorMsg}</div>}
              <Button className="primary-btn full-btn" onClick={handleCreateChallenge}>生成邀请码并创建</Button>
              <Button className="ghost-btn full-btn" onClick={() => { setScreen("landing"); setErrorMsg(""); }}>返回</Button>
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
              {errorMsg && <div className="error-line">{errorMsg}</div>}
              <Button className="primary-btn full-btn" onClick={handleJoinChallenge}>加入挑战</Button>
              <Button className="ghost-btn full-btn" onClick={() => { setScreen("landing"); setErrorMsg(""); }}>返回</Button>
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
              <Button className="ghost-btn full-btn" onClick={() => reloadChallenge()}>手动同步</Button>
              <Button className="danger-btn full-btn" onClick={leaveChallenge}>离开挑战</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const meName = challenge.users[myRole]?.name || roleLabel(myRole);
  const partner = oppositeRole(myRole);
  const partnerName = challenge.users[partner]?.name || roleLabel(partner);
  const aiCoachText = myRole === ROLE_MALE
    ? completion >= 80
      ? "今天完成度很高，继续保持蛋白质与睡眠。周五/周日篮球日注意恢复。"
      : "先完成主训练与核心动作，21 天关键是稳定持续，不是一次练爆。"
    : completion >= 80
      ? "今天节奏很好，臀腿和肩背动作继续保持控制感。"
      : "先保证前 3 个动作完成，逐步把训练习惯固定下来。";

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
            <div className="identity-line">今天是 Day {currentDay} / 21</div>
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
            <Card className="card white-card">
              <CardContent className="card-content card-large">
                <div className="today-top">
                  <div>
                    <div className="day-label">Day {selectedDay} / 21</div>
                    <h2 className="today-title">{selectedPlan.title}</h2>
                    <p className="today-goal">{roleLabel(viewingRole)} ｜目标：{challenge.users[viewingRole].goal || getDefaultGoal(viewingRole)}</p>
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

            <Card className="card glass-card">
              <CardContent className="card-content section-stack">
                <div className="section-title"><Users size={18} />个人资料</div>
                <input
                  className="text-input"
                  value={challenge.users[viewingRole].goal || ""}
                  onChange={(event) => updateGoal(event.target.value)}
                  disabled={viewingRole !== myRole}
                />
              </CardContent>
            </Card>

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
          </div>
        )}

        {tab === "calendar" && (
          <Card className="card glass-card">
            <CardContent className="card-content">
              <div className="calendar-header">
                <h2 className="section-heading">21 天日历</h2>
                <Trophy size={18} />
              </div>
              <div className="calendar-grid">
                {Array.from({ length: DAYS }, (_, index) => {
                  const day = index + 1;
                  const k = dayKey(day);
                  const plan = challenge.plans?.[viewingRole]?.[k]?.workouts?.length
                    ? challenge.plans[viewingRole][k]
                    : getBasePlan(viewingRole, day);
                  const dayCheckin = normalizeCheckinEntry(challenge.checkins?.[viewingRole]?.[k]);
                  const done = Object.values(dayCheckin.workouts || {}).filter(Boolean).length + Object.values(dayCheckin.habits || {}).filter(Boolean).length;
                  const total = (plan.workouts?.length || 0) + (plan.habits?.length || 0);
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const stateClass = day === selectedDay ? "is-current" : pct >= 80 ? "is-great" : pct > 0 ? "is-mid" : "is-empty";
                  return (
                    <button key={day} className={`calendar-day ${stateClass}`} onClick={() => { setSelectedDay(day); setTab("today"); }}>
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="calendar-tip">可查看 Day1-21 全部记录；仅当前身份的今日可编辑。</div>
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
              <div className="info-box">{aiCoachText}</div>
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
      </div>
    </div>
  );
}
