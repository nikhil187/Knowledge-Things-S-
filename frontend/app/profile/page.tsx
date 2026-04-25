"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/app/context/GameContext";
import {
  fetchUserProfile,
  setUserAvatar,
  createProfile,
  authenticateProfile,
  getDeviceProfiles,
  loginByNickname,
  type UserProfile,
  type FetchProfileResult,
} from "@/utils/api";
import { SUBJECTS, getSubjectConfig } from "@/utils/subjects";
import { MAX_SUBJECT_LEVEL } from "@/utils/gameConstants";
import { ACHIEVEMENTS } from "@/utils/achievements";
import AvatarPicker from "@/components/AvatarPicker";
import PlayerAvatar from "@/components/PlayerAvatar";

/* ------------------------------------------------------------------ */
/*  Page-level view states                                            */
/* ------------------------------------------------------------------ */
type ViewState = "loading" | "create" | "login" | "pin_required" | "switcher" | "profile";

/* ------------------------------------------------------------------ */
/*  PIN Input — 4 big square boxes like a phone passcode              */
/* ------------------------------------------------------------------ */
function PinInput({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const digits = value.padEnd(4, " ").split("").slice(0, 4);

  return (
    <div className="flex justify-center gap-3">
      {digits.map((ch, i) => (
        <div
          key={i}
          onClick={() => inputRef.current?.focus()}
          className={`
            w-14 h-16 sm:w-16 sm:h-[72px] rounded-2xl border-3 flex items-center justify-center
            text-2xl sm:text-3xl font-bold cursor-text select-none transition-all duration-200
            ${
              i === value.length && !disabled
                ? "border-violet-500 bg-violet-50 shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
                : ch.trim()
                  ? "border-violet-300 bg-white"
                  : "border-slate-200 bg-white"
            }
          `}
          style={{ fontFamily: "var(--font-display)", borderWidth: "3px" }}
        >
          {ch.trim() ? ch : ""}
        </div>
      ))}

      {/* Hidden real input to capture keyboard */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        maxLength={4}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
          onChange(raw);
        }}
        className="sr-only"
        aria-label="Secret code input"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide-in animation wrapper                                        */
/* ------------------------------------------------------------------ */
const pageVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.97 },
};

/** Extract the display name from a "devicePrefix:nickname" key */
function displayName(raw: string | null | undefined): string {
  if (!raw) return "";
  const idx = raw.indexOf(":");
  return idx >= 0 ? raw.slice(idx + 1) : raw;
}

/* ------------------------------------------------------------------ */
/*  Main ProfilePage component                                        */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const { username, setUsername, deviceToken, activeProfileId, setActiveProfileId } = useGame();

  const [view, setView] = useState<ViewState>("loading");
  const [profileTab, setProfileTab] = useState<"avatar" | "stats" | "badges">("avatar");
  const [deviceProfiles, setDeviceProfiles] = useState<UserProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  // Create form
  const [nickname, setNickname] = useState("");
  const [createPin, setCreatePin] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Auth form (device-local PIN)
  const [authPin, setAuthPin] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Cross-device login form
  const [loginNickname, setLoginNickname] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Loaded profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  On mount: discover profiles for this device                     */
  /* ---------------------------------------------------------------- */
  const loadDeviceProfiles = useCallback(async () => {
    if (!deviceToken) return;
    const profiles = await getDeviceProfiles(deviceToken);
    setDeviceProfiles(profiles);
    return profiles;
  }, [deviceToken]);

  useEffect(() => {
    if (!deviceToken) return;

    (async () => {
      const profiles = await loadDeviceProfiles();
      if (!profiles) { setView("create"); return; }

      if (profiles.length === 0) {
        setView("create");
      } else if (profiles.length === 1) {
        const p = profiles[0];
        // Check if the single profile has a PIN (indicated by presence of a pin-related marker).
        // We treat profiles that we can auto-load (no PIN) vs needing auth.
        // Try auto-load: if user was previously authenticated, load directly.
        if (activeProfileId === p.username) {
          // Already authenticated in this session
          loadFullProfile(p.username);
        } else {
          // We don't know if there's a PIN from the list alone.
          // Attempt a no-pin auth to see if it goes through.
          setSelectedProfile(p);
          tryAutoLoad(p);
        }
      } else {
        // Multiple profiles: if one was previously active, try it
        if (activeProfileId) {
          const prev = profiles.find((p) => p.username === activeProfileId);
          if (prev) {
            setSelectedProfile(prev);
            tryAutoLoad(prev);
            return;
          }
        }
        setView("switcher");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceToken]);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  /** Try to load a profile without PIN. If the backend rejects, show PIN screen. */
  async function tryAutoLoad(p: UserProfile) {
    setView("loading");
    const result = await authenticateProfile(deviceToken, "");
    if (result.profile) {
      finishLoad(result.profile);
    } else {
      // PIN required
      setSelectedProfile(p);
      setView("pin_required");
    }
  }

  /** Load the full profile data (subjects, achievements, etc.) from the user endpoint */
  async function loadFullProfile(uname: string) {
    setProfileLoading(true);
    setView("loading");
    const result: FetchProfileResult = await fetchUserProfile(uname);
    if (result.profile) {
      finishLoad(result.profile);
    } else {
      // Profile exists on device but not in user store yet — show it anyway
      setProfile(null);
      setUsername(uname);
      setActiveProfileId(uname);
      setView("profile");
    }
    setProfileLoading(false);
  }

  function finishLoad(p: UserProfile) {
    setProfile(p);
    setUsername(p.username);
    setActiveProfileId(p.username);
    setView("profile");
  }

  /* ---------------------------------------------------------------- */
  /*  Actions                                                         */
  /* ---------------------------------------------------------------- */

  async function handleCreate() {
    const name = nickname.trim().slice(0, 20);
    if (!name) return;
    setCreating(true);
    setCreateError(null);

    const pin = createPin.trim() || undefined;
    const result = await createProfile(deviceToken, name, pin);

    if (result.profile) {
      finishLoad(result.profile);
      await loadDeviceProfiles();
    } else {
      setCreateError(result.error ?? "Something went wrong");
    }
    setCreating(false);
  }

  async function handleAuth() {
    if (authPin.length !== 4) return;
    setAuthenticating(true);
    setAuthError(null);

    const result = await authenticateProfile(deviceToken, authPin);
    if (result.profile) {
      finishLoad(result.profile);
    } else {
      setAuthError(result.error ?? "Wrong secret code. Try again!");
      setAuthPin("");
    }
    setAuthenticating(false);
  }

  async function handleCrossDeviceLogin() {
    const name = loginNickname.trim();
    if (!name || loginPin.length !== 4) return;
    setLoggingIn(true);
    setLoginError(null);

    const result = await loginByNickname(name, loginPin, deviceToken);
    if (result.profile) {
      finishLoad(result.profile);
      await loadDeviceProfiles(); // Refresh device profiles list
    } else {
      setLoginError(result.error ?? "Wrong nickname or secret code");
      setLoginPin("");
    }
    setLoggingIn(false);
  }

  function handleSignOut() {
    setProfile(null);
    setUsername(null);
    setActiveProfileId(null);
    setSelectedProfile(null);
    setAuthPin("");
    setAuthError(null);
    // Re-evaluate which view to show
    if (deviceProfiles.length === 0) {
      setView("create");
    } else if (deviceProfiles.length === 1) {
      setView("pin_required");
      setSelectedProfile(deviceProfiles[0]);
    } else {
      setView("switcher");
    }
  }

  function handleSwitchProfile() {
    setAuthPin("");
    setAuthError(null);
    if (deviceProfiles.length <= 1) {
      // Only one profile — go to create
      setView("create");
    } else {
      setView("switcher");
    }
  }

  function handleSelectFromSwitcher(p: UserProfile) {
    setSelectedProfile(p);
    setAuthPin("");
    setAuthError(null);
    if (activeProfileId === p.username) {
      loadFullProfile(p.username);
    } else {
      tryAutoLoad(p);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-full relative">
      <div className="fixed inset-0 -z-20 animated-bg" />
      <div className="mx-auto max-w-2xl container-touch py-8">
        <AnimatePresence mode="wait">
          {/* ─── LOADING ────────────────────────────── */}
          {view === "loading" && (
            <motion.div
              key="loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
              <p className="text-[var(--color-text)] font-semibold">Loading...</p>
            </motion.div>
          )}

          {/* ─── STATE A: CREATE PROFILE ────────────── */}
          {view === "create" && (
            <motion.div
              key="create"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="card-game p-8 max-w-md mx-auto"
            >
              <h1
                className="text-2xl font-bold text-slate-800 mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Create Your Player Profile
              </h1>
              <p className="text-slate-600 mb-6">
                Pick a nickname and start tracking your quiz progress!
              </p>

              {/* Nickname */}
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                placeholder="e.g. SuperFox"
                className="input-soft mb-5"
                maxLength={20}
                aria-label="Nickname"
              />

              {/* Optional PIN */}
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Create a secret code (optional)
              </label>
              <p className="text-slate-500 text-sm mb-3">
                A secret code stops siblings from using your profile
              </p>
              <PinInput value={createPin} onChange={setCreatePin} />

              {createError && (
                <p className="mt-4 text-sm text-red-600 font-medium text-center">{createError}</p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                className="btn-primary text-white w-full mt-6"
                disabled={!nickname.trim() || creating}
                aria-label="Create profile"
              >
                {creating ? "Creating..." : "Create Profile"}
              </button>

              {/* If there are existing profiles, let them switch */}
              {deviceProfiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setView("switcher")}
                  className="mt-4 text-sm font-semibold text-violet-600 hover:text-violet-700 w-full text-center"
                >
                  Switch to an existing profile
                </button>
              )}

              <div className="mt-5 pt-5 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-500 mb-2">Already have an account on another device?</p>
                <button
                  type="button"
                  onClick={() => { setLoginError(null); setLoginNickname(""); setLoginPin(""); setView("login"); }}
                  className="text-sm font-bold text-violet-600 hover:text-violet-700"
                >
                  Log in with nickname + secret code
                </button>
              </div>

              <Link
                href="/"
                className="mt-6 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                &larr; Back to Home
              </Link>
            </motion.div>
          )}

          {/* ─── STATE: CROSS-DEVICE LOGIN ──────────── */}
          {view === "login" && (
            <motion.div
              key="login"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="card-game p-8 max-w-md mx-auto"
            >
              <h1
                className="text-2xl font-bold text-slate-800 mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Log in from another device
              </h1>
              <p className="text-slate-600 mb-6">
                Enter the nickname and secret code you created on your other device.
              </p>

              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nickname
              </label>
              <input
                type="text"
                value={loginNickname}
                onChange={(e) => setLoginNickname(e.target.value.slice(0, 20))}
                placeholder="e.g. SuperFox"
                className="input-soft mb-5"
                maxLength={20}
                autoFocus
                aria-label="Nickname"
              />

              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Secret code
              </label>
              <PinInput value={loginPin} onChange={setLoginPin} />

              {loginError && (
                <p className="mt-4 text-sm text-red-600 font-medium text-center">{loginError}</p>
              )}

              <button
                type="button"
                onClick={handleCrossDeviceLogin}
                className="btn-primary text-white w-full mt-6"
                disabled={!loginNickname.trim() || loginPin.length !== 4 || loggingIn}
                aria-label="Log in"
              >
                {loggingIn ? "Logging in..." : "Log In"}
              </button>

              <button
                type="button"
                onClick={() => setView("create")}
                className="mt-4 text-sm font-semibold text-violet-600 hover:text-violet-700 w-full text-center"
              >
                &larr; Back to create profile
              </button>
            </motion.div>
          )}

          {/* ─── STATE B: PIN REQUIRED ──────────────── */}
          {view === "pin_required" && selectedProfile && (
            <motion.div
              key="pin"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="card-game p-8 max-w-md mx-auto text-center"
            >
              <PlayerAvatar emoji={selectedProfile.avatar} size="lg" className="mx-auto mb-4" />
              <h1
                className="text-2xl font-bold text-slate-800 mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Welcome back!
              </h1>
              <p className="text-slate-600 mb-6 text-lg" style={{ fontFamily: "var(--font-display)" }}>
                {displayName(selectedProfile.nickname || selectedProfile.username)}
              </p>

              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Enter your secret code
              </label>
              <PinInput value={authPin} onChange={setAuthPin} autoFocus />

              {authError && (
                <p className="mt-4 text-sm text-red-600 font-medium">{authError}</p>
              )}

              <button
                type="button"
                onClick={handleAuth}
                className="btn-primary text-white w-full mt-6"
                disabled={authPin.length !== 4 || authenticating}
                aria-label="Unlock profile"
              >
                {authenticating ? "Unlocking..." : "Unlock"}
              </button>

              <button
                type="button"
                onClick={handleSwitchProfile}
                className="mt-4 text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                Not you? Switch profile
              </button>
            </motion.div>
          )}

          {/* ─── STATE D: PROFILE SWITCHER ──────────── */}
          {view === "switcher" && (
            <motion.div
              key="switcher"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="card-game p-8 max-w-md mx-auto"
            >
              <h1
                className="text-2xl font-bold text-slate-800 mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Profiles on this device
              </h1>
              <p className="text-slate-600 mb-6 text-sm">
                Pick your profile to continue
              </p>

              <div className="space-y-3">
                {deviceProfiles.map((p) => (
                  <motion.button
                    key={p.username}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectFromSwitcher(p)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-300 transition-all text-left"
                  >
                    <PlayerAvatar emoji={p.avatar} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate" style={{ fontFamily: "var(--font-display)" }}>
                        {displayName(p.nickname || p.username)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Level {p.overallLevel} &middot; {p.gamesPlayed} quizzes
                      </p>
                    </div>
                    <span className="text-slate-400 text-xl">&rsaquo;</span>
                  </motion.button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setView("create")}
                className="btn-secondary w-full mt-5 flex items-center justify-center gap-2"
              >
                <span className="text-xl leading-none">+</span> Create new profile
              </button>

              <Link
                href="/"
                className="mt-6 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                &larr; Back to Home
              </Link>
            </motion.div>
          )}

          {/* ─── STATE C: PROFILE LOADED — MY PROGRESS DASHBOARD ──── */}
          {view === "profile" && (
            <motion.div
              key="profile"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* ── Header card ── */}
              <div className="card-game overflow-hidden">
                <div className="px-6 py-6 bg-gradient-to-r from-violet-50 to-fuchsia-50">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar emoji={profile?.avatar} size="lg" glow />
                      <div>
                        <h1
                          className="text-2xl font-bold text-slate-800"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {displayName(profile?.nickname || username)}
                        </h1>
                        <p className="text-sm text-gray-500">
                          Grade 4 · {profile?.gamesPlayed || 0} game{profile?.gamesPlayed !== 1 ? 's' : ''} played
                        </p>
                      </div>
                    </div>
                    {profile && (
                      <div className="rounded-2xl bg-violet-100 px-5 py-3 text-center border-2 border-violet-200">
                        <span
                          className="block text-3xl font-bold text-violet-700"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Level {profile.overallLevel}
                        </span>
                        <span className="text-xs font-medium text-violet-500">highest of {MAX_SUBJECT_LEVEL}</span>
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-violet-400 mb-1">
                            <span>Lv {profile.overallLevel}</span>
                            <span>{profile.overallLevel < MAX_SUBJECT_LEVEL ? `Lv ${profile.overallLevel + 1} next` : "Max level!"}</span>
                          </div>
                          <div className="w-full bg-violet-200 rounded-full h-2">
                            <div
                              className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((profile.overallLevel / MAX_SUBJECT_LEVEL) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer actions inside header card */}
                <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-end flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    {deviceProfiles.length > 1 && (
                      <button
                        type="button"
                        onClick={handleSwitchProfile}
                        className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                      >
                        Switch profile
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Tab switcher ── */}
              <div className="card-game overflow-hidden">
                <div className="flex">
                  {(["avatar", "stats", "badges"] as const).map((t) => {
                    const labels = { avatar: "🦊 Avatar", stats: "📊 Stats", badges: "🏅 Badges" };
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProfileTab(t)}
                        className={`flex-1 py-3 text-sm font-bold transition-all ${
                          profileTab === t
                            ? "text-violet-700 border-b-2 border-violet-500 bg-violet-50"
                            : "text-slate-500 border-b-2 border-transparent hover:text-slate-700 hover:bg-slate-50"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {labels[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {profile ? (
                <>
                  {/* ── Avatar tab ── */}
                  {profileTab === "avatar" && (
                    <div className="card-game p-5">
                      <AvatarPicker
                        currentAvatar={profile.avatar}
                        currentFrame={profile.avatarFrame}
                        earnedAchievements={profile.achievements ?? []}
                        onSave={async (avatar, frame) => {
                          const updated = await setUserAvatar(username!, avatar, frame);
                          if (updated) setProfile(updated);
                        }}
                      />
                    </div>
                  )}

                  {/* ── Stats tab ── */}
                  {profileTab === "stats" && (
                    <>
                      {/* Stats strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Quizzes Played", value: profile.gamesPlayed, emoji: "🎮" },
                          { label: "Achievements", value: `${profile.achievements.length}/${ACHIEVEMENTS.length}`, emoji: "🏅" },
                          { label: "Best Level", value: `${profile.overallLevel}/${MAX_SUBJECT_LEVEL}`, emoji: "⭐" },
                          {
                            label: "Subjects Tried",
                            value: Object.values(profile.subjectsPlayed ?? {}).filter((n) => n > 0).length,
                            emoji: "📚",
                          },
                        ].map((stat, i) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="card-game p-4 text-center"
                          >
                            <span className="text-2xl block mb-1">{stat.emoji}</span>
                            <p
                              className="text-2xl font-bold text-slate-800"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {stat.value}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5 leading-tight">{stat.label}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Subject progress */}
                      <div className="card-game p-5">
                        <p
                          className="text-base font-bold text-slate-700 mb-4"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Subject Levels
                        </p>
                        <div className="space-y-3">
                          {SUBJECTS.map((s, i) => {
                            const level = profile.subjects[s.label] ?? 1;
                            const played = profile.subjectsPlayed?.[s.label] ?? 0;
                            const cfg = getSubjectConfig(s.label);
                            const pct = Math.round((level / MAX_SUBJECT_LEVEL) * 100);
                            return (
                              <motion.div
                                key={s.label}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3"
                              >
                                <div
                                  className={`w-10 h-10 rounded-xl ${cfg.gradientClass} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}
                                >
                                  {s.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-slate-700 truncate">{s.label}</span>
                                    <span className="text-xs font-bold text-slate-500 ml-2 flex-shrink-0">
                                      Lv {level}/{MAX_SUBJECT_LEVEL}{played > 0 ? ` · ${played} played` : ""}
                                    </span>
                                  </div>
                                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                    <motion.div
                                      className={`h-full rounded-full ${cfg.progressBarColor}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-400 mt-4">Get 4+ stars to advance a level. Max level {MAX_SUBJECT_LEVEL}.</p>
                      </div>

                      {/* Games by subject */}
                      {Object.values(profile.subjectsPlayed ?? {}).some((n) => n > 0) && (
                        <div className="card-game p-5">
                          <p
                            className="text-base font-bold text-slate-700 mb-4"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            Games by Subject
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {SUBJECTS.filter((s) => (profile.subjectsPlayed?.[s.label] ?? 0) > 0).map((s, i) => {
                              const played = profile.subjectsPlayed![s.label]!;
                              const level = profile.subjects[s.label] ?? 1;
                              const cfg = getSubjectConfig(s.label);
                              return (
                                <motion.div
                                  key={s.label}
                                  initial={{ opacity: 0, scale: 0.92 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.06 }}
                                  className={`rounded-2xl ${cfg.gradientClass} p-3 text-white shadow-md`}
                                >
                                  <span className="text-2xl block mb-1">{s.emoji}</span>
                                  <p className="text-xs font-semibold opacity-90 truncate">{s.label}</p>
                                  <p
                                    className="text-lg font-bold"
                                    style={{ fontFamily: "var(--font-display)" }}
                                  >
                                    {played} {played === 1 ? "game" : "games"}
                                  </p>
                                  <p className="text-xs opacity-80">Level {level}</p>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* CTA if never played */}
                      {profile.gamesPlayed === 0 && (
                        <div className="card-game p-6 text-center">
                          <span className="text-4xl block mb-3">🚀</span>
                          <p className="font-bold text-slate-700 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                            Ready to start learning?
                          </p>
                          <p className="text-sm text-slate-500 mb-4">Play your first quiz to earn XP, level up, and collect badges!</p>
                          <Link href="/" className="btn-primary text-white inline-block px-6">
                            Start a Quiz
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Badges tab ── */}
                  {profileTab === "badges" && (
                    <div className="card-game p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p
                          className="text-base font-bold text-slate-700"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Badges
                        </p>
                        <span className="text-sm font-semibold text-violet-600 bg-violet-50 rounded-full px-3 py-1 border border-violet-200">
                          {profile.achievements.length}/{ACHIEVEMENTS.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ACHIEVEMENTS.map((a, i) => {
                          const isEarned = profile.achievements.includes(a.id);
                          return (
                            <motion.div
                              key={a.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={`rounded-xl border-2 px-3 py-3 text-center transition-all ${
                                isEarned
                                  ? "border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-50 shadow-sm"
                                  : "border-slate-200 bg-slate-50 opacity-45"
                              }`}
                            >
                              <span className="text-2xl block mb-1">
                                {isEarned ? a.emoji : "❓"}
                              </span>
                              <p className={`text-xs font-bold leading-tight ${isEarned ? "text-slate-800" : "text-slate-400"}`}>
                                {a.label}
                              </p>
                              {isEarned && (
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{a.description}</p>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                      {profile.achievements.length === 0 && (
                        <p className="text-sm text-slate-500 text-center mt-2">
                          Play games to earn your first badge!
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="card-game p-6 text-center">
                  <p className="text-slate-600 mb-4">
                    No progress yet. Play a quiz to start leveling up!
                  </p>
                  <Link
                    href="/"
                    className="font-semibold text-violet-600 hover:text-violet-700"
                  >
                    Start a game &rarr;
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
