const LOCAL_INVITE_CODE_KEY = "currentInviteCode";
const LOCAL_MY_ROLE_KEY = "myRole";
const LOCAL_MY_NICKNAME_KEY = "myNickname";
const LEGACY_SESSION_KEY = "couple-fitness-session-v2";

export function readLocalSession() {
  try {
    const currentInviteCode = localStorage.getItem(LOCAL_INVITE_CODE_KEY) || "";
    const myRole = localStorage.getItem(LOCAL_MY_ROLE_KEY) || "";
    const myNickname = localStorage.getItem(LOCAL_MY_NICKNAME_KEY) || "";
    if (currentInviteCode || myRole) return { myRole, currentInviteCode, myNickname };

    const legacyRaw = localStorage.getItem(LEGACY_SESSION_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      return {
        myRole: parsed?.myRole || "",
        currentInviteCode: parsed?.currentInviteCode || "",
        myNickname: "",
      };
    }
    return { myRole: "", currentInviteCode: "", myNickname: "" };
  } catch {
    return { myRole: "", currentInviteCode: "", myNickname: "" };
  }
}

export function writeLocalSession(myRole, currentInviteCode, myNickname) {
  localStorage.setItem(LOCAL_MY_ROLE_KEY, myRole || "");
  localStorage.setItem(LOCAL_INVITE_CODE_KEY, (currentInviteCode || "").toUpperCase());
  localStorage.setItem(LOCAL_MY_NICKNAME_KEY, myNickname || "");
}

export function clearLocalSession() {
  localStorage.removeItem(LOCAL_INVITE_CODE_KEY);
  localStorage.removeItem(LOCAL_MY_ROLE_KEY);
  localStorage.removeItem(LOCAL_MY_NICKNAME_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function getStoredSessionValues() {
  return {
    code: (localStorage.getItem(LOCAL_INVITE_CODE_KEY) || "").trim().toUpperCase(),
    role: localStorage.getItem(LOCAL_MY_ROLE_KEY) || "",
    nickname: localStorage.getItem(LOCAL_MY_NICKNAME_KEY) || "",
  };
}
