/**
 * Backend API base URL.
 */
const getApiBase = () => {
  if (typeof window === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env) return env;
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:3001";
  return `${window.location.protocol}//${hostname}`;
};

export interface UserProfile {
  username: string;
  nickname?: string;
  deviceToken?: string;
  gamesPlayed: number;
  subjects: Record<string, number>;
  subjectsPlayed?: Record<string, number>;
  overallLevel: number;
  achievements: string[];
  avatar?: string;
  avatarFrame?: string;
}

export type FetchProfileResult = { profile: UserProfile } | { profile: null; error: string };

export async function fetchUserProfile(username: string): Promise<FetchProfileResult> {
  const base = getApiBase();
  if (!base) return { profile: null, error: "API not configured" };
  try {
    const res = await fetch(`${base}/api/user/${encodeURIComponent(username)}`);
    if (!res.ok) {
      if (res.status === 404) return { profile: null, error: "" };
      return { profile: null, error: `Request failed (${res.status})` };
    }
    const profile = await res.json();
    return { profile };
  } catch (err) {
    return { profile: null, error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function createProfile(
  deviceToken: string, nickname: string, pin?: string
): Promise<{ profile: UserProfile | null; error?: string }> {
  const base = getApiBase();
  if (!base) return { profile: null, error: "API not configured" };
  try {
    const res = await fetch(`${base}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken, nickname, pin }),
    });
    return await res.json();
  } catch { return { profile: null, error: "Network error" }; }
}

export async function authenticateProfile(
  deviceToken: string, pin: string
): Promise<{ profile: UserProfile | null; error?: string }> {
  const base = getApiBase();
  if (!base) return { profile: null, error: "API not configured" };
  try {
    const res = await fetch(`${base}/api/profile/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken, pin }),
    });
    return await res.json();
  } catch { return { profile: null, error: "Network error" }; }
}

export async function getDeviceProfiles(
  deviceToken: string
): Promise<UserProfile[]> {
  const base = getApiBase();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/profile/device/${encodeURIComponent(deviceToken)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.profiles ?? [];
  } catch { return []; }
}

export async function loginByNickname(
  nickname: string, pin: string, deviceToken?: string
): Promise<{ profile: UserProfile | null; error?: string }> {
  const base = getApiBase();
  if (!base) return { profile: null, error: "API not configured" };
  try {
    const res = await fetch(`${base}/api/profile/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, pin, deviceToken }),
    });
    return await res.json();
  } catch { return { profile: null, error: "Network error" }; }
}

export async function setUserAvatar(username: string, avatar: string, frame?: string): Promise<UserProfile | null> {
  const base = getApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/user/${encodeURIComponent(username)}/avatar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar, frame }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
