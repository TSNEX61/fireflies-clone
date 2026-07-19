"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import NewMeetingModal from "@/components/NewMeetingModal";
import EditMeetingModal from "@/components/EditMeetingModal";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import { ToastProvider, useToast } from "@/components/Toast";
import { Meeting, Participant } from "@/types";
import {
  Mic2, Clock, Search, Plus, ArrowUpDown,
  Users, ChevronDown, Filter, MoreHorizontal, Edit3, Trash2, ExternalLink, Star
} from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

const SPEAKER_COLORS = [
  { bg: "#e8f4fd", text: "#2563eb" },
  { bg: "#fce7f3", text: "#db2777" },
  { bg: "#d1fae5", text: "#059669" },
  { bg: "#fef3c7", text: "#d97706" },
  { bg: "#ede9fe", text: "#7c3aed" },
  { bg: "#fee2e2", text: "#dc2626" },
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 1) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This Week";
  if (diff < 30) return "This Month";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatTimeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(meetings: Meeting[]): { label: string; meetings: Meeting[] }[] {
  const groups: Record<string, Meeting[]> = {};
  for (const m of meetings) {
    const label = formatDateLabel(m.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(m);
  }
  return Object.entries(groups).map(([label, meetings]) => ({ label, meetings }));
}

function MeetingCard({ meeting, onEdit, onDelete, isFavorite, onToggleFavorite }: { meeting: Meeting; onEdit: () => void; onDelete: () => void; isFavorite: boolean; onToggleFavorite: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      style={{
        display: "flex", flexDirection: "column",
        background: "var(--ff-white)",
        border: "1px solid var(--ff-border)",
        borderRadius: "16px",
        boxShadow: "var(--ff-shadow-card)",
        textDecoration: "none", color: "inherit",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "#d0d5dd";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--ff-border)";
        e.currentTarget.style.boxShadow = "var(--ff-shadow-card)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Card Header */}
      <div style={{ padding: "22px 24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ff-text)", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>
            {meeting.title}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--ff-text-3)", fontWeight: 500 }}>
            <span>{new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{new Date(meeting.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{formatDuration(meeting.duration_seconds)}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
            style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isFavorite ? "#f59e0b" : "var(--ff-text-3)", transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--ff-bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Star style={{ width: "14px", height: "14px", fill: isFavorite ? "#f59e0b" : "none" }} />
          </button>
          <div ref={menuRef} style={{ position: "relative" }} onClick={e => e.preventDefault()}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", background: menuOpen ? "var(--ff-bg)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ff-text-3)", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--ff-bg)"}
              onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = "transparent"; }}
            >
              <MoreHorizontal style={{ width: "14px", height: "14px" }} />
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", width: "160px", zIndex: 50, overflow: "hidden", animation: "scaleIn 0.15s ease-out" }}>
                <div onClick={(e) => { e.stopPropagation(); window.location.href = `/meetings/${meeting.id}`; setMenuOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontWeight: 600, color: "var(--ff-text)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--ff-bg)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <ExternalLink style={{ width: "13px", height: "13px", color: "var(--ff-text-3)" }} /> Open
                </div>
                <div onClick={(e) => { e.stopPropagation(); onEdit(); setMenuOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontWeight: 600, color: "var(--ff-text)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--ff-bg)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <Edit3 style={{ width: "13px", height: "13px", color: "var(--ff-text-3)" }} /> Edit
                </div>
                <div style={{ height: "1px", background: "var(--ff-border)", margin: "2px 0" }} />
                <div onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontWeight: 600, color: "#ef4444", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <Trash2 style={{ width: "13px", height: "13px" }} /> Delete
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emoji summary bullets */}
      {meeting.emoji_summary && meeting.emoji_summary.length > 0 && (
        <div style={{ padding: "0 18px 12px" }}>
          {meeting.emoji_summary.slice(0, 2).map((bullet, i) => (
            <p key={i} style={{ fontSize: "12px", color: "var(--ff-text-3)", margin: "0 0 3px", fontWeight: 500, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {bullet}
            </p>
          ))}
        </div>
      )}

      {/* Card Footer: participants + tags */}
      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--ff-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f9fc", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {meeting.participants.slice(0, 4).map((p, i) => (
            <div key={p.id} title={p.name} style={{
              width: "24px", height: "24px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: 700, border: "2px solid var(--ff-bg)",
              marginLeft: i > 0 ? "-6px" : "0",
              background: SPEAKER_COLORS[i % SPEAKER_COLORS.length].bg,
              color: SPEAKER_COLORS[i % SPEAKER_COLORS.length].text,
            }}>
              {getInitials(p.name)}
            </div>
          ))}
          {meeting.participants.length > 4 && (
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)", marginLeft: "4px" }}>+{meeting.participants.length - 4}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {meeting.tags?.slice(0, 2).map(tag => (
            <span key={tag.id} style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: "var(--ff-green-light)", color: "var(--ff-green)" }}>
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function MeetingsLibraryContent() {
  const { showToast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [dbParticipants, setDbParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "duration">("newest");
  const [quickFilter, setQuickFilter] = useState<"all" | "hosted" | "shared" | "favorites">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fireflies-favorites");
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem("fireflies-favorites", JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handler = () => setIsSearchOpen(true);
    window.addEventListener("open-global-search", handler);
    return () => window.removeEventListener("open-global-search", handler);
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/meetings?sort=${sortOrder}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search)}`;
      if (selectedParticipant) url += `&participant=${selectedParticipant}`;
      if (dateFrom) url += `&date_from=${new Date(dateFrom).toISOString()}`;
      if (dateTo) url += `&date_to=${new Date(dateTo).toISOString()}`;
      const res = await fetch(url);
      if (res.ok) setMeetings(await res.json());
      else showToast("Failed to fetch meetings", "error");
    } catch {
      showToast("Backend offline — start the FastAPI server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("${API_BASE}/api/participants")
      .then(r => r.json()).then(setDbParticipants).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchMeetings, 200);
    return () => clearTimeout(t);
  }, [search, selectedParticipant, dateFrom, dateTo, sortOrder]);

  useEffect(() => {
    const handler = () => setIsModalOpen(true);
    window.addEventListener("open-new-meeting", handler);
    return () => window.removeEventListener("open-new-meeting", handler);
  }, []);

  const handleDeleteMeeting = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/meetings/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("Meeting deleted", "success"); fetchMeetings(); }
      else showToast("Failed to delete", "error");
    } catch { showToast("Server offline", "error"); }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (quickFilter === "hosted") return m.user_id === 1;
    if (quickFilter === "shared") return m.participants.length >= 2;
    if (quickFilter === "favorites") return favorites.has(m.id);
    return true;
  });
  const grouped = groupByDate(filteredMeetings);
  const quickFilterTabs = [
    { key: "all" as const, label: "All Meetings" },
    { key: "favorites" as const, label: `Starred` },
    { key: "hosted" as const, label: "Hosted by Me" },
    { key: "shared" as const, label: "Shared with Me" },
  ];

  const meetingCount = filteredMeetings.length;

  return (
    <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh", color: "var(--ff-text)", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: "0", paddingTop: "56px", display: "flex", flexDirection: "column" }}>
        <Navbar />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 56px", maxWidth: "1140px", width: "100%", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "40px" }}>
            <h1 style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--ff-text)", margin: "0 0 8px 0", fontFamily: "'DM Sans', sans-serif" }}>
              Meetings
            </h1>
            <p style={{ fontSize: "15px", color: "var(--ff-text-3)", margin: "4px 0 0 0", fontWeight: 500 }}>
              {meetingCount} meeting{meetingCount !== 1 ? "s" : ""} in workspace
            </p>
          </div>

          {/* Quick filter tabs + Search row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px", gap: "12px" }}>
            <div style={{ display: "flex", gap: "2px", borderBottom: "2px solid var(--ff-border)", flexShrink: 0 }}>
              {quickFilterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setQuickFilter(tab.key)}
                  style={{
                    padding: "10px 16px", fontSize: "13px", fontWeight: 600, border: "none",
                    borderBottomWidth: "2px", borderBottomStyle: "solid",
                    borderBottomColor: quickFilter === tab.key ? "var(--ff-green)" : "transparent",
                    marginBottom: "-2px",
                    color: quickFilter === tab.key ? "var(--ff-green)" : "var(--ff-text-3)",
                    background: "none", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "320px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search style={{ width: "14px", height: "14px", color: "var(--ff-text-3)", position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text" placeholder="Search meetings..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px 10px 36px", border: "1px solid var(--ff-border)", borderRadius: "10px", fontSize: "13px", fontWeight: 600, outline: "none", background: "var(--ff-white)", color: "var(--ff-text)", transition: "all 0.2s" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ padding: "10px 20px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0, transition: "all 0.2s", boxShadow: "0 4px 14px rgba(0,195,137,0.25)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-green)"; }}
              >
                <Plus style={{ width: "14px", height: "14px" }} /> New
              </button>
            </div>
          </div>

          {/* Advanced filter toggle */}
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--ff-text-3)", fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-white)"; e.currentTarget.style.color = "var(--ff-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ff-text-3)"; }}
            >
              <Filter style={{ width: "12px", height: "12px" }} /> Filters
              <ChevronDown style={{ width: "10px", height: "10px", transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {showAdvanced && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", padding: "10px 14px", background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "12px", boxShadow: "var(--ff-shadow-sm)", animation: "fadeIn 0.2s ease-out" }}>
                <div style={{ position: "relative" }}>
                  <Users style={{ width: "12px", height: "12px", color: "var(--ff-text-3)", position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)" }} />
                  <select value={selectedParticipant} onChange={e => setSelectedParticipant(e.target.value)}
                    style={{ padding: "6px 28px 6px 26px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", border: "1px solid var(--ff-border)", outline: "none", appearance: "none", cursor: "pointer", background: "var(--ff-bg)", color: "var(--ff-text-2)" }}>
                    <option value="">All Speakers</option>
                    {dbParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronDown style={{ width: "10px", height: "10px", position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ff-text-3)" }} />
                </div>
                <div style={{ width: "1px", height: "16px", background: "var(--ff-border)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "5px 6px", fontSize: "11px", borderRadius: "6px", border: "1px solid var(--ff-border)", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text-2)" }} />
                  <span style={{ fontSize: "11px", color: "var(--ff-text-3)" }}>to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "5px 6px", fontSize: "11px", borderRadius: "6px", border: "1px solid var(--ff-border)", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text-2)" }} />
                </div>
                <div style={{ width: "1px", height: "16px", background: "var(--ff-border)" }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px" }}>
                  <ArrowUpDown style={{ width: "11px", height: "11px", color: "var(--ff-text-3)" }} />
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}
                    style={{ padding: "5px 22px 5px 4px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", border: "1px solid var(--ff-border)", outline: "none", appearance: "none", cursor: "pointer", background: "var(--ff-bg)", color: "var(--ff-text-2)" }}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="duration">Longest First</option>
                  </select>
                  <ChevronDown style={{ width: "10px", height: "10px", position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ff-text-3)" }} />
                </div>
              </div>
            )}
          </div>

          {/* Meeting card grid */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: "200px", background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "16px", animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
              ))}
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 0", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Mic2 style={{ width: "28px", height: "28px" }} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ff-text)", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>
                {search ? "No meetings match your search" : quickFilter !== "all" ? "No meetings in this view" : "No meetings yet"}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--ff-text-3)", marginBottom: "20px", maxWidth: "360px" }}>
                {search ? "Try adjusting your filters or search query." : "Add your first meeting to start generating AI-powered summaries."}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ padding: "10px 20px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(0,195,137,0.2)", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-green)"; }}
              >
                <Plus style={{ width: "16px", height: "16px" }} /> New Meeting
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              {grouped.map((group) => (
                <div key={group.label}>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px", paddingLeft: "4px" }}>
                    {group.label}
                  </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                    {group.meetings.map((m) => (
                      <MeetingCard key={m.id} meeting={m} onEdit={() => setEditMeeting(m)} onDelete={() => handleDeleteMeeting(m.id)} isFavorite={favorites.has(m.id)} onToggleFavorite={() => toggleFavorite(m.id)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <NewMeetingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchMeetings} />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {editMeeting && (
        <EditMeetingModal
          isOpen={!!editMeeting}
          onClose={() => setEditMeeting(null)}
          onSuccess={() => { setEditMeeting(null); fetchMeetings(); }}
          meetingId={editMeeting.id}
          currentTitle={editMeeting.title}
          currentParticipantIds={editMeeting.participants.map(p => p.id)}
        />
      )}
    </div>
  );
}

export default function MeetingsLibrary() {
  return <ToastProvider><MeetingsLibraryContent /></ToastProvider>;
}
