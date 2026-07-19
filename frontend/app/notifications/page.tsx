"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Bell, FolderCheck, ShieldAlert, CheckSquare, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Meeting } from "@/types";

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  time: string;
  category: "transcript" | "task" | "security";
  isRead: boolean;
  meetingId?: number;
}

function generateNotifications(meetings: Meeting[]): NotificationItem[] {
  const now = Date.now();
  const items: NotificationItem[] = [];

  meetings.forEach((m, i) => {
    const ageMs = now - new Date(m.date).getTime();
    const ageHrs = Math.floor(ageMs / 3600000);
    const timeLabel = ageHrs < 1 ? "Just now" : ageHrs < 24 ? `${ageHrs}h ago` : `${Math.floor(ageHrs / 24)}d ago`;

    items.push({
      id: m.id * 10 + 1,
      title: "Transcript ready",
      body: `AI summary, keywords, and action items are ready for "${m.title}".`,
      time: timeLabel,
      category: "transcript",
      isRead: i > 1,
      meetingId: m.id,
    });

    if (m.participants.length >= 2) {
      items.push({
        id: m.id * 10 + 2,
        title: "Meeting processed",
        body: `Transcription completed for "${m.title}" — ${m.participants.length} participants detected.`,
        time: timeLabel,
        category: "transcript",
        isRead: i > 0,
        meetingId: m.id,
      });
    }
  });

  items.push({
    id: 99901,
    title: "Workspace secured",
    body: "CORS and authentication settings verified for local development environment.",
    time: "3d ago",
    category: "security",
    isRead: true,
  });

  return items.sort((a, b) => a.id - b.id).reverse();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/meetings")
      .then((r) => r.json())
      .then((meetings: Meeting[]) => {
        setNotifications(generateNotifications(meetings));
        setLoading(false);
      })
      .catch(() => {
        setNotifications([{
          id: 1, title: "Welcome to Fireflies",
          body: "Start creating meetings to see real notifications here.",
          time: "Just now", category: "transcript", isRead: false,
        }]);
        setLoading(false);
      });
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const getIcon = (category: string) => {
    if (category === "transcript") return <FolderCheck style={{ width: "18px", height: "18px", color: "var(--ff-green)" }} />;
    if (category === "task") return <CheckSquare style={{ width: "18px", height: "18px", color: "#f59e0b" }} />;
    return <ShieldAlert style={{ width: "18px", height: "18px", color: "#ef4444" }} />;
  };

  const getIconBg = (category: string) => {
    if (category === "transcript") return "var(--ff-green-light)";
    if (category === "task") return "#fffbeb";
    return "#fef2f2";
  };

  return (
    <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh", color: "var(--ff-text)", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: "0", paddingTop: "56px" }}>
        <Navbar />
        <main style={{ padding: "48px 56px", maxWidth: "820px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--ff-white)", border: "1px solid var(--ff-border)", padding: "28px", borderRadius: "18px", marginBottom: "20px", boxShadow: "var(--ff-shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ position: "relative", width: "44px", height: "44px", borderRadius: "12px", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bell style={{ width: "22px", height: "22px" }} />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "18px", height: "18px", borderRadius: "50%", background: "var(--ff-green)", color: "#fff", fontSize: "9px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--ff-white)" }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Notifications</h1>
                <p style={{ fontSize: "13px", color: "var(--ff-text-3)", margin: 0 }}>
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up!"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} style={{ padding: "8px 14px", border: "1px solid var(--ff-border)", borderRadius: "8px", background: "var(--ff-white)", fontSize: "12px", fontWeight: 600, color: "var(--ff-text)", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; }}>
                  Mark all read
                </button>
              )}
              <button onClick={handleClearAll} style={{ padding: "8px 14px", border: "1px solid #fecaca", borderRadius: "8px", background: "var(--ff-white)", fontSize: "12px", fontWeight: 600, color: "#ef4444", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; }}>
                Clear all
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "18px", overflow: "hidden", boxShadow: "var(--ff-shadow-card)" }}>
            {loading ? (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: "64px", borderRadius: "8px", background: "var(--ff-bg)", animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "64px", textAlign: "center" }}>
                <Bell style={{ width: "48px", height: "48px", color: "var(--ff-border)", margin: "0 auto 12px" }} />
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--ff-text)", marginBottom: "4px" }}>All Caught Up!</h4>
                <p style={{ fontSize: "12px", color: "var(--ff-text-3)", margin: 0 }}>You have no notifications.</p>
              </div>
            ) : (
              notifications.map((item, idx) => {
                const content = (
                  <div key={item.id} style={{
                    padding: "18px 24px", display: "flex", gap: "14px",
                    background: !item.isRead ? "rgba(0,195,137,0.03)" : "var(--ff-white)",
                    borderBottom: idx < notifications.length - 1 ? "1px solid var(--ff-border)" : "none",
                    textDecoration: "none", color: "inherit", cursor: item.meetingId ? "pointer" : "default",
                    transition: "background 0.15s, transform 0.15s",
                  }} onMouseEnter={e => { e.currentTarget.style.transform = "translateX(2px)"; e.currentTarget.style.background = !item.isRead ? "rgba(0,195,137,0.06)" : "var(--ff-bg)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.background = !item.isRead ? "rgba(0,195,137,0.03)" : "var(--ff-white)"; }}>
                    <div style={{ padding: "10px", background: getIconBg(item.category), borderRadius: "10px", height: "40px", width: "40px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {getIcon(item.category)}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "6px" }}>
                          {item.title}
                          {!item.isRead && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ff-green)", display: "inline-block" }} />}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ff-text-3)" }}>{item.time}</span>
                          {item.meetingId && <ExternalLink style={{ width: "12px", height: "12px", color: "var(--ff-green)" }} />}
                        </div>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--ff-text-3)", lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                        {item.body}
                      </p>
                    </div>
                  </div>
                );

                if (item.meetingId) {
                  return <Link key={item.id} href={`/meetings/${item.meetingId}`} onClick={() => markRead(item.id)} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link>;
                }
                return content;
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
