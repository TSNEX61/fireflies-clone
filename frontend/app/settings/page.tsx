"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ToastProvider, useToast } from "@/components/Toast";
import { Settings, Save, Shield, Mail, Globe, Sliders, User, Building, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const STORAGE_KEY = "fireflies-settings";

interface SettingsData {
  autoJoin: string;
  transcriptionLanguage: string;
  sendRecaps: string;
  enableAskFred: boolean;
  displayName: string;
  companyName: string;
}

const defaultSettings: SettingsData = {
  autoJoin: "all",
  transcriptionLanguage: "en-US",
  sendRecaps: "participants",
  enableAskFred: true,
  displayName: "Alex Sterling",
  companyName: "Acme Corp",
};

function loadSettings(): SettingsData {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {}
  return defaultSettings;
}

function saveSettings(data: SettingsData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function SettingsContent() {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  const update = (patch: Partial<SettingsData>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    showToast("Settings saved successfully!", "success");
  };

  if (!loaded) return null;

  return (
    <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh", color: "var(--ff-text)", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: "0", paddingTop: "56px" }}>
        <Navbar />
        <main style={{ padding: "48px 56px", maxWidth: "820px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "var(--ff-white)", border: "1px solid var(--ff-border)", padding: "28px", borderRadius: "18px", marginBottom: "20px", boxShadow: "var(--ff-shadow-card)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Settings style={{ width: "22px", height: "22px" }} />
            </div>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Settings</h1>
              <p style={{ fontSize: "13px", color: "var(--ff-text-3)", margin: 0 }}>Manage your workspace options and preferences.</p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "18px", boxShadow: "var(--ff-shadow-card)", overflow: "hidden" }}>

            {/* Section 1: Profile */}
            <div style={{ padding: "24px", borderBottom: "1px solid var(--ff-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <User style={{ width: "16px", height: "16px", color: "var(--ff-green)" }} />
                Profile
              </h3>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--ff-text-3)", display: "block", marginBottom: "6px" }}>Display Name</label>
                  <input value={settings.displayName} onChange={e => update({ displayName: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--ff-text-3)", display: "block", marginBottom: "6px" }}>Company</label>
                  <input value={settings.companyName} onChange={e => update({ companyName: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }} />
                </div>
              </div>
            </div>

            {/* Section 2: Meeting Bot Settings */}
            <div style={{ padding: "24px", borderBottom: "1px solid var(--ff-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Sliders style={{ width: "16px", height: "16px", color: "var(--ff-green)" }} />
                Meeting Join Settings
              </h3>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--ff-text-3)", marginBottom: "16px" }}>
                Specify which meetings the Fireflies bot should automatically dial into.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { value: "all", label: "Auto-join all calendar meetings", desc: "Fireflies joins any event with a meeting link." },
                  { value: "owned", label: "Only join meetings I host", desc: "Fireflies only enters meetings where you are the organizer." },
                  { value: "none", label: "Manual dial-in only", desc: "Never auto-join. Invite the bot or upload audio manually." },
                ].map((opt) => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", borderRadius: "10px", border: `1px solid ${settings.autoJoin === opt.value ? "var(--ff-green)" : "var(--ff-border)"}`, cursor: "pointer", transition: "all 0.15s", background: settings.autoJoin === opt.value ? "var(--ff-green-light)" : "transparent" }}
                    onMouseEnter={e => { if (settings.autoJoin !== opt.value) e.currentTarget.style.background = "var(--ff-bg)"; }}
                    onMouseLeave={e => { if (settings.autoJoin !== opt.value) e.currentTarget.style.background = "transparent"; }}>
                    <input type="radio" name="autojoin" value={opt.value} checked={settings.autoJoin === opt.value} onChange={() => update({ autoJoin: opt.value })}
                      style={{ width: "16px", height: "16px", accentColor: "var(--ff-green)", cursor: "pointer", marginTop: "1px", flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)" }}>{opt.label}</span>
                      <span style={{ fontSize: "11px", color: "var(--ff-text-3)", lineHeight: 1.5, display: "block" }}>{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 3: Language */}
            <div style={{ padding: "24px", borderBottom: "1px solid var(--ff-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Globe style={{ width: "16px", height: "16px", color: "var(--ff-green)" }} />
                Transcription Language
              </h3>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--ff-text-3)", marginBottom: "16px" }}>
                Choose the primary language for speech parsing and summarization.
              </p>
              <select value={settings.transcriptionLanguage} onChange={e => update({ transcriptionLanguage: e.target.value })}
                style={{ width: "100%", maxWidth: "300px", padding: "10px 12px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }}>
                <option value="en-US">English (United States)</option>
                <option value="en-GB">English (United Kingdom)</option>
                <option value="es-ES">Spanish (Spain)</option>
                <option value="fr-FR">French (France)</option>
                <option value="de-DE">German (Germany)</option>
                <option value="ja-JP">Japanese (Japan)</option>
              </select>
            </div>

            {/* Section 4: Email Recaps */}
            <div style={{ padding: "24px", borderBottom: "1px solid var(--ff-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Mail style={{ width: "16px", height: "16px", color: "var(--ff-green)" }} />
                Email Recaps
              </h3>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--ff-text-3)", marginBottom: "16px" }}>
                Select who should receive the meeting summary via email.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { value: "all", label: "Send recap to all participants" },
                  { value: "participants", label: "Only send to internal team members" },
                  { value: "me", label: "Only send to me" },
                ].map((opt) => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="radio" name="recaps" value={opt.value} checked={settings.sendRecaps === opt.value} onChange={() => update({ sendRecaps: opt.value })}
                      style={{ width: "16px", height: "16px", accentColor: "var(--ff-green)", cursor: "pointer" }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ff-text)" }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 5: Security / Ask Fred */}
            <div style={{ padding: "24px", borderBottom: "1px solid var(--ff-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Shield style={{ width: "16px", height: "16px", color: "var(--ff-green)" }} />
                Security
              </h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)" }}>Enable AskFred AI assistant</span>
                  <span style={{ fontSize: "11px", color: "var(--ff-text-3)", display: "block" }}>Allow team members to query meeting databases.</span>
                </div>
                <button type="button" onClick={() => update({ enableAskFred: !settings.enableAskFred })}
                  style={{ width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", background: settings.enableAskFred ? "var(--ff-green)" : "var(--ff-border)", flexShrink: 0 }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: settings.enableAskFred ? "20px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </button>
              </div>
            </div>

            {/* Section 6: Appearance */}
            <div style={{ padding: "24px", borderBottom: "1px solid var(--ff-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Moon style={{ width: "16px", height: "16px", color: "var(--ff-green)" }} />
                Appearance
              </h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)" }}>Switch between light and dark theme</span>
                  <span style={{ fontSize: "11px", color: "var(--ff-text-3)", display: "block" }}>Currently using {theme} mode.</span>
                </div>
                <button type="button" onClick={toggleTheme}
                  style={{ width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", background: theme === "dark" ? "var(--ff-green)" : "var(--ff-border)", flexShrink: 0 }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: theme === "dark" ? "20px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "20px 24px", background: "var(--ff-bg)", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit"
                style={{ padding: "12px 24px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "14px", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "background 0.15s", boxShadow: "0 4px 14px rgba(0,195,137,0.25)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-green)"; }}>
                <Save style={{ width: "14px", height: "14px" }} />
                Save Preferences
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <ToastProvider><SettingsContent /></ToastProvider>;
}
