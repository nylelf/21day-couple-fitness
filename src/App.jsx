import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Flame, Dumbbell, Heart, CalendarDays, Trophy, MessageCircle, CheckCircle2, Circle, Share2, RotateCcw, Activity, Cloud, Users } from "lucide-react";

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

const DAYS = 21;

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY:", supabaseKey);

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const CHALLENGE_ID = "dapangpang-xiaobenben-21day";

const malePlan = [
  { title: "Push + 腹肌", tasks: ["胸肩三头力量训练", "腹肌 12-15 分钟", "蛋白质达标", "饮水 2L+", "睡眠 7h+"] },
  { title: "Pull + 有氧恢复", tasks: ["背二头训练", "25 分钟低强度有氧", "拉伸 8 分钟", "无高糖饮料", "记录体重"] },
  { title: "Legs + Core", tasks: ["腿部训练", "核心训练", "蛋白质达标", "步数 8000+", "睡眠 7h+"] },
  { title: "Shoulder + HIIT", tasks: ["肩部线条训练", "HIIT/短有氧 15-20 分钟", "腹肌 10 分钟", "饮食控制", "拉伸恢复"] },
  { title: "Upper Pump + 周五篮球", tasks: ["上半身泵感训练", "手臂补充", "周五篮球", "蛋白质达标", "今日照片/镜子检查"] },
  { title: "核心 + 恢复", tasks: ["腹肌训练", "低强度快走 20 分钟", "补水电解质", "拉伸小腿髋屈肌", "早点睡"] },
  { title: "周日篮球 + Mobility", tasks: ["周日篮球", "全身拉伸", "饮食不放飞", "记录周总结", "准备下周训练"] },
];

const femalePlan = [
  { title: "臀腿日", tasks: ["腿举", "壶铃/自重深蹲", "杠铃 RDL", "臀外展", "公羊挺身"] },
  { title: "肩背日", tasks: ["高位下拉", "坐姿划船", "绳索侧平举", "面拉"] },
  { title: "有氧 + 核心", tasks: ["坡走 30 分钟", "平板支撑", "卷腹/死虫", "拉伸 10 分钟", "蛋白质达标"] },
  { title: "恢复日", tasks: ["快走 20-30 分钟", "臀腿拉伸", "肩颈放松", "饮水达标", "睡眠 7h+"] },
  { title: "臀腿强化", tasks: ["腿举", "臀推/臀桥", "RDL", "臀外展", "拉伸放松"] },
  { title: "肩背塑形", tasks: ["高位下拉", "坐姿划船", "绳索侧平举", "面拉"] },
  { title: "轻有氧 + 打卡", tasks: ["快走/椭圆机 30 分钟", "核心 10 分钟", "拉伸", "记录体重", "本周总结"] },
];

function getPlan(user, day) {
  const index = (day - 1) % 7;
  return user === "daniel" ? malePlan[index] : femalePlan[index];
}

const defaultState = {
  challengeId: CHALLENGE_ID,
  currentDay: 1,
  users: {
    daniel: { name: "", goal: "腹肌 + 清晰肌肉线条", basketballTarget: "周五 + 周日篮球" },
    partner: { name: "", goal: "臀腿肩背塑形", basketballTarget: "可选" },
  },
  checkins: {},
  notes: {},
  updatedAt: new Date().toISOString(),
};

function loadLocalState() {
  try {
    const raw = localStorage.getItem("couple-fitness-challenge-shared-v1");
    return raw ? JSON.parse(raw) : defaultState;
  } catch {
    return defaultState;
  }
}

function mergeState(local, remote) {
  if (!remote) return local;
  return {
    ...defaultState,
    ...remote,
    users: { ...defaultState.users, ...(remote.users || {}) },
    checkins: { ...(local?.checkins || {}), ...(remote.checkins || {}) },
    notes: { ...(local?.notes || {}), ...(remote.notes || {}) },
  };
}

export default function App() {
  const [state, setState] = useState(loadLocalState);
  const [activeUser, setActiveUser] = useState("daniel");
  const [view, setView] = useState("today");
  const [syncStatus, setSyncStatus] = useState(supabase ? "连接云端中..." : "本地模式：未配置 Supabase");
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("daniel");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const day = state.currentDay;
  const plan = getPlan(activeUser, day);
  const key = `${activeUser}-day-${day}`;
  const checked = state.checkins[key] || {};
  const completed = Object.values(checked).filter(Boolean).length;
  const completion = Math.round((completed / plan.tasks.length) * 100);

  async function pullCloud() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("challenges")
      .select("data")
      .eq("id", CHALLENGE_ID)
      .maybeSingle();

    if (error) {
      setSyncStatus("云端读取失败，请检查 Supabase 表和环境变量");
      return;
    }

    if (data?.data) {
      setState(prev => mergeState(prev, data.data));
      setSyncStatus("已连接云端，同步中");
    } else {
      await supabase.from("challenges").insert({ id: CHALLENGE_ID, data: defaultState });
      setSyncStatus("已创建情侣挑战云端空间");
    }
  }

  async function pushCloud(nextState) {
    localStorage.setItem("couple-fitness-challenge-shared-v1", JSON.stringify(nextState));
    if (!supabase) return;

    const payload = { ...nextState, updatedAt: new Date().toISOString() };
    const { error } = await supabase
      .from("challenges")
      .upsert({ id: CHALLENGE_ID, data: payload });

    setSyncStatus(error ? "云端同步失败" : "已同步到云端");
  }

  useEffect(() => {
    pullCloud();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("challenge-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `id=eq.${CHALLENGE_ID}` }, payload => {
        if (payload.new?.data) {
          setState(prev => mergeState(prev, payload.new.data));
          setSyncStatus("收到对方更新 ✅");
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const stats = useMemo(() => {
    const result = {};
    for (const user of ["daniel", "partner"]) {
      let total = 0;
      let done = 0;
      for (let d = 1; d <= DAYS; d++) {
        const p = getPlan(user, d);
        total += p.tasks.length;
        const k = `${user}-day-${d}`;
        done += Object.values(state.checkins[k] || {}).filter(Boolean).length;
      }
      result[user] = { total, done, percent: Math.round((done / total) * 100) };
    }
    return result;
  }, [state.checkins]);

  const aiCoach = useMemo(() => {
    if (activeUser === "daniel") {
      return completion >= 80
        ? "今天完成度很好。重点保持热量缺口、蛋白质和睡眠。周五/周日有篮球，腿部训练别硬冲重量。"
        : "今天先完成主训练 + 腹肌即可。一周 5 练，周五和周日还有篮球，别把恢复透支。";
    }
    return completion >= 80
      ? "今天很棒！臀腿肩背塑形最重要的是动作控制和坚持，训练后记得补蛋白。"
      : "今天先完成前 3 个动作就算成功。21 天挑战的目标是建立习惯，不是每天练到崩溃。";
  }, [activeUser, completion]);

  function updateState(mutator) {
    setState(prev => {
      const next = mutator(prev);
      pushCloud(next);
      return next;
    });
  }

  function toggleTask(i) {
    updateState(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      checkins: {
        ...prev.checkins,
        [key]: { ...(prev.checkins[key] || {}), [i]: !(prev.checkins[key] || {})[i] },
      },
    }));
  }

  function setDay(newDay) {
    updateState(prev => ({ ...prev, currentDay: Math.max(1, Math.min(DAYS, newDay)) }));
  }

  function updateNote(value) {
    updateState(prev => ({ ...prev, notes: { ...prev.notes, [key]: value } }));
  }

  function resetAll() {
    updateState(() => defaultState);
  }

  function copyInvite() {
    const text = `这是我们的21天情侣健身挑战App ❤️
打开链接后选择自己的角色并填写昵称开始打卡：${window.location.href}`;
    navigator.clipboard?.writeText(text);
    setSyncStatus("邀请文案已复制，可以发微信/WhatsApp");
  }

  function saveProfile() {
    if (!profileName.trim()) return;
    updateState(prev => ({
      ...prev,
      users: {
        ...prev.users,
        [profileRole]: { ...prev.users[profileRole], name: profileName.trim() },
      },
    }));
    setActiveUser(profileRole);
    setProfileName("");
    setIsEditingProfile(false);
  }

  const otherUser = activeUser === "daniel" ? "partner" : "daniel";
  const currentSymbol = activeUser === "daniel" ? "♂" : "♀";
  const currentName = state.users[activeUser].name || (activeUser === "daniel" ? "男生昵称" : "女生昵称");
  const displayDaniel = `♂ ${state.users.daniel.name || "男生昵称"}`;
  const displayPartner = `♀ ${state.users.partner.name || "女生昵称"}`;
  const needsSetup = !state.users.daniel.name || !state.users.partner.name;
  const showProfileEditor = needsSetup || isEditingProfile;

  useEffect(() => {
    if (isEditingProfile) {
      setProfileRole(activeUser);
      setProfileName(state.users[activeUser].name || "");
    }
  }, [isEditingProfile, activeUser, state.users]);

  return (
    <div className="app-shell">
      <div className="mobile-container">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="header-wrap">
          <div className="header-row">
            <div>
              <h1 className="app-title">21天情侣健身挑战</h1>
              <p className="app-subtitle">{displayDaniel} × {displayPartner}</p>
            </div>
            <div className="icon-pill">
              <Heart size={22} />
            </div>
          </div>
        </motion.div>

        <Card className="card glass-card">
          <CardContent className="card-content">
            <div className="sync-line"><Cloud size={16} /> {syncStatus}</div>
            <div className="role-toggle-grid">
              <Button onClick={() => setActiveUser("daniel")} className={`role-btn ${activeUser === "daniel" ? "is-active" : ""}`}>{displayDaniel}</Button>
              <Button onClick={() => setActiveUser("partner")} className={`role-btn ${activeUser === "partner" ? "is-active" : ""}`}>{displayPartner}</Button>
            </div>
            <div className="progress-grid">
              <div className="progress-card">
                <div className="progress-label">我的完成率</div>
                <div className="progress-value">{stats[activeUser].percent}%</div>
              </div>
              <div className="progress-card">
                <div className="progress-label">对方完成率</div>
                <div className="progress-value">{stats[otherUser].percent}%</div>
              </div>
            </div>
            <Button onClick={() => setIsEditingProfile(true)} className="ghost-btn full-btn">编辑资料</Button>
          </CardContent>
        </Card>

        <div className="view-tabs">
          <Button onClick={() => setView("today")} className={`tab-btn ${view === "today" ? "is-active" : ""}`}><Dumbbell size={16} />今日</Button>
          <Button onClick={() => setView("calendar")} className={`tab-btn ${view === "calendar" ? "is-active" : ""}`}><CalendarDays size={16} />日历</Button>
          <Button onClick={() => setView("coach")} className={`tab-btn ${view === "coach" ? "is-active" : ""}`}><MessageCircle size={16} />AI</Button>
        </div>

        {showProfileEditor && (
          <div className="overlay">
            <Card className="card overlay-card">
              <CardContent className="card-content">
                <div className="profile-title">{needsSetup ? "首次设置资料" : "编辑资料"}</div>
                <div className="profile-subtitle">选择角色并填写昵称</div>
                <div className="role-toggle-grid">
                  <Button onClick={() => setProfileRole("daniel")} className={`role-btn ${profileRole === "daniel" ? "is-active" : ""}`}>♂ 男生</Button>
                  <Button onClick={() => setProfileRole("partner")} className={`role-btn ${profileRole === "partner" ? "is-active" : ""}`}>♀ 女生</Button>
                </div>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="输入昵称，例如：大胖胖 / 小笨笨"
                  className="text-input"
                />
                <Button onClick={saveProfile} className="primary-btn full-btn">保存昵称</Button>
                {!needsSetup && <Button onClick={() => setIsEditingProfile(false)} className="ghost-btn full-btn">取消</Button>}
                {needsSetup && (
                  <div className="setup-tip">
                    {state.users.daniel.name ? "♂ 男生昵称已设置" : "♂ 还未设置男生昵称"} ｜ {state.users.partner.name ? "♀ 女生昵称已设置" : "♀ 还未设置女生昵称"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {view === "today" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="section-stack">
            <Card className="card white-card">
              <CardContent className="card-content card-large">
                <div className="today-top">
                  <div>
                    <div className="day-label">Day {day} / 21</div>
                    <h2 className="today-title">{plan.title}</h2>
                    <p className="today-goal">{currentSymbol} {currentName} ｜目标：{state.users[activeUser].goal}</p>
                  </div>
                  <div className="today-percent">
                    <div className="today-percent-value">{completion}%</div>
                    <div className="today-percent-label">今日完成</div>
                  </div>
                </div>

                <div className="task-list">
                  {plan.tasks.map((task, i) => (
                    <button key={task} onClick={() => toggleTask(i)} className={`task-item ${checked[i] ? "is-done" : ""}`}>
                      {checked[i] ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      <span className="task-text">{task}</span>
                    </button>
                  ))}
                </div>

                <div className="day-nav">
                  <Button onClick={() => setDay(day - 1)} className="dark-btn">上一天</Button>
                  <Button onClick={() => setDay(day + 1)} className="dark-btn">下一天</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card glass-card">
              <CardContent className="card-content">
                <div className="section-title"><Activity size={18} />今日额外记录</div>
                <textarea
                  value={state.notes[key] || ""}
                  onChange={(e) => updateNote(e.target.value)}
                  placeholder="例：今天篮球 1.5 小时；RDL 60kg；睡眠 7.5h；饮食 8/10"
                  className="text-area"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {view === "calendar" && (
          <Card className="card glass-card">
            <CardContent className="card-content">
              <div className="calendar-header">
                <h2 className="section-heading">21天日历</h2>
                <Trophy size={18} />
              </div>
              <div className="calendar-grid">
                {Array.from({ length: DAYS }, (_, i) => {
                  const d = i + 1;
                  const p = getPlan(activeUser, d);
                  const k = `${activeUser}-day-${d}`;
                  const done = Object.values(state.checkins[k] || {}).filter(Boolean).length;
                  const pct = Math.round((done / p.tasks.length) * 100);
                  return (
                    <button key={d} onClick={() => { setDay(d); setView("today"); }} className={`calendar-day ${d === day ? "is-current" : pct >= 80 ? "is-great" : pct > 0 ? "is-mid" : "is-empty"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="calendar-tip">绿色 = 完成 80%+；黄色 = 部分完成；深色 = 未完成。</div>
            </CardContent>
          </Card>
        )}

        {view === "coach" && (
          <Card className="card glass-card">
            <CardContent className="card-content section-stack">
              <div className="coach-head">
                <Flame size={22} />
                <h2 className="section-heading">AI Coach</h2>
              </div>
              <div className="info-box">{aiCoach}</div>
              <div className="info-box">
                <b>情侣监督玩法：</b><br />每天训练后互相发一句：“Day {day} done ✅”。连续 7 天可以安排一次奖励餐或约会。
              </div>
              <Button onClick={copyInvite} className="primary-btn full-btn"><Share2 size={16} />复制邀请文案</Button>
              <Button onClick={pullCloud} className="ghost-btn full-btn"><Users size={16} />手动同步</Button>
              <Button onClick={resetAll} className="danger-btn full-btn"><RotateCcw size={16} />重置测试数据</Button>
            </CardContent>
          </Card>
        )}

        <div className="footer-note">
          共享版说明：配置 Supabase 后，你和小笨笨打开同一个链接即可实时同步。未配置时会自动退回本地模式。
        </div>
      </div>
    </div>
  );
}
