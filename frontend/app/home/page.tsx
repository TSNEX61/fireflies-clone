"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Meeting } from "@/types";
import {
  Mic2, Clock, CheckSquare, Users, ArrowRight, Plus, TrendingUp, Calendar,
} from "lucide-react";
import GlobalSearchModal from "@/components/GlobalSearchModal";

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const avatarColors = [
  { bg: "#e6faf5", text: "#00C389" }, { bg: "#eef0ff", text: "#5b6abf" },
  { bg: "#fff7e6", text: "#d97706" }, { bg: "#f0f5ff", text: "#3b82f6" },
  { bg: "#fce7f3", text: "#db2777" }, { bg: "#ecfdf5", text: "#059669" },
];

function HomeContent() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsSearchOpen(true);
    window.addEventListener("open-global-search", handler);
    return () => window.removeEventListener("open-global-search", handler);
  }, []);

  useEffect(() => {
    fetch("http://localhost:8000/api/meetings")
      .then((r) => r.json())
      .then((data) => { setMeetings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalMeetings = meetings.length;
  const totalMinutes = meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0) / 60;
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const thisWeek = meetings.filter((m) => {
    const d = new Date(m.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });
  const recentMeetings = meetings.slice(0, 5);
  const allParticipants = new Set(meetings.flatMap((m) => m.participants?.map((p) => p.name) || []));

  return (
    <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh", color: "var(--ff-text)", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 0, paddingTop: "56px", display: "flex", flexDirection: "column" }}>
        <main style={{ flex: 1, padding: "48px 56px", maxWidth: "1140px", width: "100%", margin: "0 auto" }}>

          {/* Welcome */}
          <div style={{ marginBottom: "48px" }}>
            <h1 style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ff-text)", margin: "0 0 4px", fontFamily: "'DM Sans', sans-serif" }}>
              Welcome back, Alex
            </h1>
            <p style={{ fontSize: "15px", marginTop: "8px", color: "var(--ff-text-3)", margin: "6px 0 0", fontWeight: 500 }}>
              Here&apos;s an overview of your meetings and activity.
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "48px" }}>
            {[
              { label: "Total Meetings", value: totalMeetings, icon: Mic2, color: "#00C389", bg: "#e6faf5" },
              { label: "Total Hours", value: totalHours, icon: Clock, color: "#3b82f6", bg: "#eff6ff" },
              { label: "This Week", value: thisWeek.length, icon: Calendar, color: "#f59e0b", bg: "#fffbeb" },
              { label: "Participants", value: allParticipants.size, icon: Users, color: "#8b5cf6", bg: "#f5f3ff" },
            ].map((stat, i) => (
              <div key={i} style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "16px", padding: "24px 28px", display: "flex", alignItems: "center", gap: "14px", animation: `fadeInUp 0.4s ease-out ${i * 0.05}s both`, boxShadow: "var(--ff-shadow-card)" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: stat.bg, color: stat.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <stat.icon style={{ width: "20px", height: "20px" }} />
                </div>
                <div>
                  <p style={{ fontSize: "32px", fontWeight: 900, color: "var(--ff-text)", margin: 0, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1 }}>{stat.value}</p>
                  <p style={{ fontSize: "12px", color: "var(--ff-text-3)", margin: 0, fontWeight: 600 }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px" }}>

            {/* Recent Meetings */}
            <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "18px", overflow: "hidden", boxShadow: "var(--ff-shadow-card)" }}>
              <div style={{ padding: "22px 26px", borderBottom: "1px solid var(--ff-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ff-text)", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Recent Meetings</h3>
                <Link href="/" style={{ fontSize: "11px", fontWeight: 600, color: "var(--ff-green)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                  View all <ArrowRight style={{ width: "12px", height: "12px" }} />
                </Link>
              </div>
              {loading ? (
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ height: "48px", borderRadius: "8px", background: "var(--ff-bg)", animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
                  ))}
                </div>
              ) : recentMeetings.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <Mic2 style={{ width: "32px", height: "32px", color: "var(--ff-border)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: "13px", color: "var(--ff-text-3)", margin: 0, fontWeight: 500 }}>No meetings yet</p>
                  <p style={{ fontSize: "12px", color: "var(--ff-text-3)", margin: "4px 0 0", opacity: 0.7 }}>Create your first meeting to get started.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {recentMeetings.map((m, i) => (
                    <Link key={m.id} href={`/meetings/${m.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", padding: "12px 20px", gap: "12px", borderBottom: i < recentMeetings.length - 1 ? "1px solid var(--ff-border)" : "none", transition: "all 0.15s", borderLeft: "3px solid transparent" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; e.currentTarget.style.borderLeftColor = "var(--ff-green)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ff-text)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "10px", color: "var(--ff-text-3)", fontWeight: 500 }}>{getInitials(m.participants?.[0]?.name || "U")}</span>
                          <span style={{ fontSize: "10px", color: "var(--ff-text-3)", fontWeight: 500 }}>{formatDuration(m.duration_seconds)}</span>
                          <span style={{ fontSize: "10px", color: "var(--ff-text-3)", fontWeight: 500 }}>·</span>
                          <span style={{ fontSize: "10px", color: "var(--ff-text-3)", fontWeight: 500 }}>{formatTimeAgo(m.date)}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", marginLeft: "auto" }}>
                        {(m.participants || []).slice(0, 3).map((p, j) => {
                          const c = avatarColors[j % avatarColors.length];
                          return (
                            <div key={p.id} style={{ width: "22px", height: "22px", borderRadius: "50%", background: c.bg, color: c.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 700, marginLeft: j > 0 ? "-4px" : 0, border: "2px solid var(--ff-white)" }}>{p.name[0]}</div>
                          );
                        })}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: Quick Actions + Activity */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Quick Actions */}
              <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "18px", padding: "24px 26px", boxShadow: "var(--ff-shadow-card)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ff-text)", margin: "0 0 18px", fontFamily: "'DM Sans', sans-serif" }}>Quick Actions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button onClick={() => window.dispatchEvent(new CustomEvent("open-new-meeting"))} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--ff-border)", background: "var(--ff-white)", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--ff-text)", transition: "all 0.15s", width: "100%", textAlign: "left", boxShadow: "var(--ff-shadow-sm)" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-light)"; e.currentTarget.style.borderColor = "#b2e8d8"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; e.currentTarget.style.borderColor = "var(--ff-border)"; }}>
                    <Plus style={{ width: "14px", height: "14px", color: "var(--ff-green)" }} /> New Meeting
                  </button>
                  <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--ff-border)", background: "var(--ff-white)", fontSize: "13px", fontWeight: 600, color: "var(--ff-text)", textDecoration: "none", transition: "all 0.15s", boxShadow: "var(--ff-shadow-sm)" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; }}>
                    <Mic2 style={{ width: "14px", height: "14px", color: "var(--ff-text-3)" }} /> Browse Meetings
                  </Link>
                  <Link href="/tasks" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--ff-border)", background: "var(--ff-white)", fontSize: "13px", fontWeight: 600, color: "var(--ff-text)", textDecoration: "none", transition: "all 0.15s", boxShadow: "var(--ff-shadow-sm)" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; }}>
                    <CheckSquare style={{ width: "14px", height: "14px", color: "var(--ff-text-3)" }} /> View Tasks
                  </Link>
                </div>
              </div>

              {/* Top Participants */}
              <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "18px", padding: "24px 26px", boxShadow: "var(--ff-shadow-card)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ff-text)", margin: "0 0 18px", fontFamily: "'DM Sans', sans-serif" }}>Top Participants</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Array.from(allParticipants).slice(0, 5).map((name, i) => {
                    const c = avatarColors[i % avatarColors.length];
                    const count = meetings.filter((m) => m.participants?.some((p) => p.name === name)).length;
                    const barWidth = Math.max(20, (count / Math.max(totalMeetings, 1)) * 100);
                    return (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: c.bg, color: c.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, flexShrink: 0 }}>{name.split(" ").map(n => n[0]).join("")}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ff-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)" }}>{count}</span>
                          </div>
                           <div style={{ height: "5px", borderRadius: "3px", background: "var(--ff-bg)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: "4px", background: c.text, transition: "width 0.3s" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {allParticipants.size === 0 && <p style={{ fontSize: "12px", color: "var(--ff-text-3)", margin: 0 }}>No participants yet.</p>}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

export default function HomePage() {
  return <HomeContent />;
}
