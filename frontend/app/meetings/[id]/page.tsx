"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import EditMeetingModal from "@/components/EditMeetingModal";
import { ToastProvider, useToast } from "@/components/Toast";
import type { MeetingDetail, Bookmark as BookmarkData, Comment as CommentData, Soundbite as SoundbiteData } from "@/types";
import {
  Play, Pause, Search, ChevronDown, ChevronUp, CheckSquare, Edit3, Trash2,
  Volume2, FileText, Clock, Sparkles, Download, AlertCircle,
  Check, X, Plus, Edit2, Bot, ArrowUp, Bookmark, Headphones, MessageCircle,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { API_BASE } from "@/lib/api";

function MeetingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const meetingId = Number(params.id);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);

  const [leftPanel, setLeftPanel] = useState<"notes" | "askfred" | "bookmarks" | "comments" | "soundbites">("notes");
  const [leftStripCollapsed, setLeftStripCollapsed] = useState(false);

  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [newAiText, setNewAiText] = useState("");
  const [newAiAssigneeId, setNewAiAssigneeId] = useState<number>(0);
  const [editingAiId, setEditingAiId] = useState<number | null>(null);
  const [editingAiText, setEditingAiText] = useState("");

  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hi! I am Fred, your AI meeting assistant. Ask me anything about what was discussed, action items, or conclusions." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [bookmarkNote, setBookmarkNote] = useState("");
  const [commentText, setCommentText] = useState("");
  const [soundbiteTitle, setSoundbiteTitle] = useState("");
  const [soundbiteStart, setSoundbiteStart] = useState(0);
  const [soundbiteEnd, setSoundbiteEnd] = useState(30);

  const bookmarks = meeting?.bookmarks || [];
  const comments = meeting?.comments || [];
  const soundbites = meeting?.soundbites || [];

  const loadMeetingDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/meetings/${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setMeeting(data);
        setError("");
      } else {
        setError("Meeting not found in database.");
        showToast("Error loading meeting details", "error");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to communicate with API server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMeetingDetails(); }, [meetingId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [meeting]);

  useEffect(() => {
    if (!meeting) return;
    const active = meeting.transcript_segments.find(
      (seg) => currentTime >= seg.start_time_seconds && currentTime <= seg.end_time_seconds
    );
    if (active) {
      setActiveSegmentId(active.id);
      const element = document.getElementById(`segment-${active.id}`);
      if (element && isPlaying) {
        const rect = element.getBoundingClientRect();
        const parent = element.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          if (rect.top < parentRect.top || rect.bottom > parentRect.bottom) {
            element.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }
      }
    }
  }, [currentTime, meeting, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().catch(() => showToast("Playback failed", "error")); setIsPlaying(true); }
  };

  const handleTimeUpdate = () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration || meeting?.duration_seconds || 0); };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current) { audioRef.current.currentTime = seconds; audioRef.current.play().catch(() => {}); setIsPlaying(true); }
  };

  useEffect(() => {
    if (!meeting || !transcriptQuery.trim()) { setSearchMatches([]); setActiveMatchIndex(-1); return; }
    const matches: number[] = [];
    const q = transcriptQuery.toLowerCase();
    meeting.transcript_segments.forEach((seg) => {
      if (seg.text.toLowerCase().includes(q) || seg.speaker.name.toLowerCase().includes(q)) matches.push(seg.id);
    });
    setSearchMatches(matches);
    setActiveMatchIndex(matches.length > 0 ? 0 : -1);
  }, [transcriptQuery, meeting]);

  useEffect(() => {
    if (activeMatchIndex >= 0 && searchMatches[activeMatchIndex]) {
      const el = document.getElementById(`segment-${searchMatches[activeMatchIndex]}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeMatchIndex, searchMatches]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleNextMatch = () => { if (searchMatches.length > 0) setActiveMatchIndex((p) => (p + 1) % searchMatches.length); };
  const handlePrevMatch = () => { if (searchMatches.length > 0) setActiveMatchIndex((p) => (p - 1 + searchMatches.length) % searchMatches.length); };

  const handleToggleActionItem = async (itemId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/action-items/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_complete: !currentStatus })
      });
      if (res.ok) {
        setMeeting((prev) => prev ? { ...prev, action_items: prev.action_items.map((ai) => ai.id === itemId ? { ...ai, is_complete: !currentStatus } : ai) } : null);
        showToast(`Action item marked as ${!currentStatus ? "completed" : "incomplete"}`, "success");
      } else showToast("Failed to update task", "error");
    } catch { showToast("Backend connection failed.", "error"); }
  };

  const handleAddActionItem = async () => {
    if (!newAiText.trim()) { showToast("Task description cannot be empty", "error"); return; }
    try {
      const res = await fetch("${API_BASE}/api/action-items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId, text: newAiText.trim(), assignee_id: newAiAssigneeId > 0 ? newAiAssigneeId : null, is_complete: false })
      });
      if (res.ok) {
        const item = await res.json();
        setMeeting((prev) => prev ? { ...prev, action_items: [...prev.action_items, item] } : null);
        setNewAiText(""); setNewAiAssigneeId(0); showToast("Action item added!", "success");
      } else showToast("Failed to add action item", "error");
    } catch { showToast("Server connection error.", "error"); }
  };

  const handleDeleteActionItem = async (itemId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/action-items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        setMeeting((prev) => prev ? { ...prev, action_items: prev.action_items.filter((ai) => ai.id !== itemId) } : null);
        showToast("Action item deleted.", "success");
      } else showToast("Failed to delete action item", "error");
    } catch { showToast("Server connection error.", "error"); }
  };

  const handleUpdateActionItemText = async (itemId: number) => {
    if (!editingAiText.trim()) { showToast("Task text cannot be empty", "error"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/action-items/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: editingAiText.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setMeeting((prev) => prev ? { ...prev, action_items: prev.action_items.map((ai) => ai.id === itemId ? { ...ai, text: updated.text } : ai) } : null);
        setEditingAiId(null); setEditingAiText(""); showToast("Action item updated!", "success");
      } else showToast("Failed to update action item", "error");
    } catch { showToast("Server connection error.", "error"); }
  };

  const handleDeleteMeeting = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/meetings/${meetingId}`, { method: "DELETE" });
      if (res.ok) { showToast("Meeting deleted.", "success"); router.push("/"); }
      else { showToast("Failed to delete meeting.", "error"); setLoading(false); }
    } catch { showToast("Server error.", "error"); setLoading(false); }
  };

  const handleExportMarkdown = () => {
    if (!meeting) return;
    let md = `# ${meeting.title}\nDate: ${new Date(meeting.date).toLocaleString()}\nDuration: ${formatTime(meeting.duration_seconds)}\n\n`;
    if (meeting.summary) { md += `## Overview\n${meeting.summary.overview_text}\n\n## Keywords\n${meeting.summary.keywords.join(", ")}\n\n`; }
    md += `## Transcript\n`;
    meeting.transcript_segments.forEach((s) => { md += `**[${formatTime(s.start_time_seconds)}] ${s.speaker.name}**: ${s.text}\n\n`; });
    if (meeting.action_items.length > 0) { md += `## Action Items\n`; meeting.action_items.forEach((ai) => { md += `- [${ai.is_complete ? "x" : " "}] ${ai.text}${ai.assignee ? ` (@${ai.assignee.name})` : ""}\n`; }); }
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${meeting.title.replace(/\s+/g, "_")}_transcript.md`; a.click();
    URL.revokeObjectURL(url); showToast("Exported as Markdown!", "success");
  };

  const handleExportTxt = () => {
    if (!meeting) return;
    let txt = `${meeting.title}\nDate: ${new Date(meeting.date).toLocaleString()}\nDuration: ${formatTime(meeting.duration_seconds)}\n\n`;
    if (meeting.summary) { txt += `OVERVIEW\n${meeting.summary.overview_text}\n\nKEYWORDS\n${meeting.summary.keywords.join(", ")}\n\n`; }
    txt += `TRANSCRIPT\n${"─".repeat(40)}\n`;
    meeting.transcript_segments.forEach((s) => { txt += `[${formatTime(s.start_time_seconds)}] ${s.speaker.name}: ${s.text}\n\n`; });
    if (meeting.action_items.length > 0) { txt += `ACTION ITEMS\n${"─".repeat(40)}\n`; meeting.action_items.forEach((ai) => { txt += `[${ai.is_complete ? "✓" : "○"}] ${ai.text}${ai.assignee ? ` (${ai.assignee.name})` : ""}\n`; }); }
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${meeting.title.replace(/\s+/g, "_")}_transcript.txt`; a.click();
    URL.revokeObjectURL(url); showToast("Exported as TXT!", "success");
  };

  const handleExportPDF = () => {
    if (!meeting) return;
    const doc = new jsPDF();
    let y = 20;
    const lineHeight = 7;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - 2 * margin;

    const addText = (text: string, fontSize: number, isBold: boolean, color?: [number, number, number]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      if (color) doc.setTextColor(...color);
      else doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(text, maxLineWidth);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += lineHeight;
      });
    };

    addText(meeting.title, 18, true);
    y += 2;
    addText(`Date: ${new Date(meeting.date).toLocaleString()}`, 11, false, [120, 120, 120]);
    addText(`Duration: ${formatTime(meeting.duration_seconds)}`, 11, false, [120, 120, 120]);
    y += 6;

    if (meeting.summary) {
      addText("Overview", 14, true);
      y += 1;
      addText(meeting.summary.overview_text, 11, false);
      y += 4;
      addText(`Keywords: ${meeting.summary.keywords.join(", ")}`, 11, false, [80, 80, 80]);
      y += 6;
    }

    addText("Transcript", 14, true);
    y += 2;
    meeting.transcript_segments.forEach((s) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(`[${formatTime(s.start_time_seconds)}] ${s.speaker.name}:`, margin, y);
      const speakerWidth = doc.getTextWidth(`[${formatTime(s.start_time_seconds)}] ${s.speaker.name}: `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const textLines = doc.splitTextToSize(s.text, maxLineWidth - speakerWidth);
      textLines.forEach((line: string, i: number) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin + speakerWidth, y);
        y += 5;
      });
      y += 2;
    });

    if (meeting.action_items.length > 0) {
      y += 4;
      addText("Action Items", 14, true);
      y += 1;
      meeting.action_items.forEach((ai) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const checkbox = ai.is_complete ? "[x]" : "[ ]";
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        const text = `${checkbox} ${ai.text}${ai.assignee ? ` (${ai.assignee.name})` : ""}`;
        const lines = doc.splitTextToSize(text, maxLineWidth);
        lines.forEach((line: string) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += 5;
        });
        y += 1;
      });
    }

    doc.save(`${meeting.title.replace(/\s+/g, "_")}_transcript.pdf`);
    showToast("Exported as PDF!", "success");
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !meeting) return;
    const userText = chatInput.trim(); setChatInput("");
    setChatMessages((p) => [...p, { sender: "user", text: userText }]); setChatLoading(true);
    setTimeout(() => {
      let ai = "";
      const tl = userText.toLowerCase();
      if (tl.includes("action") || tl.includes("todo") || tl.includes("task")) {
        const inc = meeting.action_items.filter((a) => !a.is_complete);
        ai = inc.length > 0 ? `Remaining action items:\n` + inc.map((a) => `- **${a.text}** (${a.assignee?.name || "Unassigned"})`).join("\n") : "All action items are completed!";
      } else if (tl.includes("summary") || tl.includes("overview")) {
        ai = meeting.summary ? meeting.summary.overview_text : "No summary available.";
      } else if (tl.includes("speaker") || tl.includes("who")) {
        ai = `Participants:\n` + meeting.participants.map((p) => `- **${p.name}** (${p.email || ""})`).join("\n");
      } else {
        const m = meeting.transcript_segments.filter((s) => s.text.toLowerCase().includes(tl));
        ai = m.length > 0 ? `Found at **${formatTime(m[0].start_time_seconds)}**:\n*${m[0].speaker.name}*: "${m[0].text}"` : `No direct match found. Key themes: ${meeting.summary?.keywords.join(", ") || "General"}. Try rephrasing.`;
      }
      setChatMessages((p) => [...p, { sender: "ai", text: ai }]); setChatLoading(false);
    }, 800);
  };

  const handleAddBookmark = async () => {
    if (!bookmarkNote.trim()) { showToast("Bookmark note cannot be empty", "error"); return; }
    try {
      const res = await fetch("${API_BASE}/api/bookmarks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId, timestamp_seconds: currentTime, note: bookmarkNote.trim() })
      });
      if (res.ok) {
        const bookmark: BookmarkData = await res.json();
        setMeeting((prev) => prev ? { ...prev, bookmarks: [bookmark, ...prev.bookmarks] } : null);
        setBookmarkNote("");
        showToast("Bookmark added!", "success");
      } else showToast("Failed to add bookmark", "error");
    } catch { showToast("Backend connection error.", "error"); }
  };

  const handleDeleteBookmark = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookmarks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMeeting((prev) => prev ? { ...prev, bookmarks: prev.bookmarks.filter((b) => b.id !== id) } : null);
        showToast("Bookmark removed.", "success");
      } else showToast("Failed to delete bookmark", "error");
    } catch { showToast("Backend connection error.", "error"); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) { showToast("Comment cannot be empty", "error"); return; }
    try {
      const res = await fetch("${API_BASE}/api/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId, author_name: "Alex Sterling", text: commentText.trim(), timestamp_seconds: currentTime })
      });
      if (res.ok) {
        const comment: CommentData = await res.json();
        setMeeting((prev) => prev ? { ...prev, comments: [comment, ...prev.comments] } : null);
        setCommentText("");
        showToast("Comment added!", "success");
      } else showToast("Failed to add comment", "error");
    } catch { showToast("Backend connection error.", "error"); }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/comments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMeeting((prev) => prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== id) } : null);
        showToast("Comment deleted.", "success");
      } else showToast("Failed to delete comment", "error");
    } catch { showToast("Backend connection error.", "error"); }
  };

  const handleAddSoundbite = async () => {
    if (!soundbiteTitle.trim()) { showToast("Soundbite title cannot be empty", "error"); return; }
    if (soundbiteEnd <= soundbiteStart) { showToast("End time must be after start time", "error"); return; }
    const speaker = meeting?.transcript_segments.find(
      (s) => currentTime >= s.start_time_seconds && currentTime <= s.end_time_seconds
    )?.speaker.name || "Unknown";
    try {
      const res = await fetch("${API_BASE}/api/soundbites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId, title: soundbiteTitle.trim(), from_seconds: soundbiteStart, to_seconds: soundbiteEnd, speaker_name: speaker })
      });
      if (res.ok) {
        const soundbite: SoundbiteData = await res.json();
        setMeeting((prev) => prev ? { ...prev, soundbites: [soundbite, ...prev.soundbites] } : null);
        setSoundbiteTitle("");
        showToast("Soundbite created!", "success");
      } else showToast("Failed to create soundbite", "error");
    } catch { showToast("Backend connection error.", "error"); }
  };

  const handleDeleteSoundbite = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/soundbites/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMeeting((prev) => prev ? { ...prev, soundbites: prev.soundbites.filter((s) => s.id !== id) } : null);
        showToast("Soundbite deleted.", "success");
      } else showToast("Failed to delete soundbite", "error");
    } catch { showToast("Backend connection error.", "error"); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  const avatarColors = [
    { bg: "#e6faf5", text: "#00C389" }, { bg: "#eef0ff", text: "#5b6abf" },
    { bg: "#fff7e6", text: "#d97706" }, { bg: "#f0f5ff", text: "#3b82f6" },
    { bg: "#fce7f3", text: "#db2777" }, { bg: "#ecfdf5", text: "#059669" },
  ];

  const pillBtn = (active: boolean): React.CSSProperties => ({
    width: "36px", height: "36px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", border: "none", flexShrink: 0,
    background: active ? "var(--ff-green-light)" : "transparent",
    color: active ? "var(--ff-green)" : "var(--ff-text-3)",
    transition: "all 0.15s",
  });

  if (loading) {
    return (
      <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: "0", paddingTop: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", border: "4px solid var(--ff-border)", borderTopColor: "var(--ff-green)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ff-text-3)" }}>Loading meeting...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: "0", paddingTop: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: "420px", padding: "32px", background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "16px", textAlign: "center", animation: "scaleIn 0.2s ease-out" }}>
            <AlertCircle style={{ width: "48px", height: "48px", color: "#ef4444", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ff-text)", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }}>Error Loading Meeting</h3>
            <p style={{ fontSize: "13px", color: "var(--ff-text-3)", marginBottom: "20px" }}>{error || "Meeting not found."}</p>
            <button onClick={() => router.push("/")} style={{ padding: "10px 20px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,195,137,0.2)" }}>Back to Meetings</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh", color: "var(--ff-text)", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "0", paddingTop: "56px", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <Navbar meeting={meeting} shareCopied={shareCopied} onShare={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(!menuOpen)} menuRef={menuRef} menuItems={[
          { label: "Export as Markdown", icon: Download, onClick: () => { handleExportMarkdown(); setMenuOpen(false); } },
          { label: "Export as TXT", icon: Download, onClick: () => { handleExportTxt(); setMenuOpen(false); } },
          { label: "Export as PDF", icon: Download, onClick: () => { handleExportPDF(); setMenuOpen(false); } },
          { divider: true },
          { label: "Edit Details", icon: Edit3, onClick: () => { setIsEditOpen(true); setMenuOpen(false); } },
          { divider: true },
          { label: "Delete", icon: Trash2, onClick: () => { setIsDeleteConfirmOpen(true); setMenuOpen(false); }, danger: true },
        ]} />

        {/* Main Content: Tool Strip + Two Panels */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Far-Left Tool Strip */}
          <div style={{ width: leftStripCollapsed ? "0px" : "44px", transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", flexShrink: 0, borderRight: leftStripCollapsed ? "none" : "1px solid var(--ff-border)", background: "var(--ff-white)", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: "4px" }}>
            <button onClick={() => setLeftStripCollapsed(true)} style={pillBtn(false)} title="Collapse">
              <PanelLeftClose style={{ width: "16px", height: "16px" }} />
            </button>
            <div style={{ width: "20px", height: "1px", background: "var(--ff-border)", margin: "6px 0" }} />
            <button onClick={() => setLeftPanel("notes")} style={pillBtn(leftPanel === "notes")} title="Notes">
              <FileText style={{ width: "16px", height: "16px" }} />
            </button>
            <button onClick={() => setLeftPanel("askfred")} style={pillBtn(leftPanel === "askfred")} title="AskFred">
              <Sparkles style={{ width: "16px", height: "16px" }} />
            </button>
            <button onClick={() => setLeftPanel("bookmarks")} style={pillBtn(leftPanel === "bookmarks")} title="Bookmarks">
              <Bookmark style={{ width: "16px", height: "16px" }} />
            </button>
            <button onClick={() => setLeftPanel("comments")} style={pillBtn(leftPanel === "comments")} title="Comments">
              <MessageCircle style={{ width: "16px", height: "16px" }} />
            </button>
            <button onClick={() => setLeftPanel("soundbites")} style={pillBtn(leftPanel === "soundbites")} title="Soundbites">
              <Headphones style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          {leftStripCollapsed && (
            <div style={{ width: "28px", flexShrink: 0, borderRight: "1px solid var(--ff-border)", background: "var(--ff-white)", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: "4px" }}>
              <button onClick={() => setLeftStripCollapsed(false)} style={pillBtn(false)} title="Expand tools">
                <PanelLeftOpen style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          )}

          {/* LEFT PANEL: AI Summary + Notes OR AskFred */}
          <div style={{ flex: "0 0 55%", maxWidth: "55%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--ff-border)", height: "100%", background: "#f3f4f8" }}>
            {leftPanel === "notes" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {meeting.summary && (
                    <>
                      <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", padding: "24px", borderRadius: "16px", boxShadow: "var(--ff-shadow-card)", animation: "fadeInUp 0.3s ease-out" }}>
                        <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Keywords</h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {meeting.summary.keywords.map((kw, i) => (
                            <span key={i} style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "var(--ff-green-light)", color: "var(--ff-green)" }}>{kw}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", padding: "24px", borderRadius: "16px", boxShadow: "var(--ff-shadow-card)", animation: "fadeInUp 0.3s ease-out 0.05s both" }}>
                        <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Overview</h4>
                        <p style={{ fontSize: "13px", color: "var(--ff-text-2)", lineHeight: 1.7, fontWeight: 500, margin: 0 }}>{meeting.summary.overview_text}</p>
                      </div>
                    </>
                  )}

                  {meeting.topics.length > 0 && (
                    <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", padding: "24px", borderRadius: "16px", boxShadow: "var(--ff-shadow-card)", animation: "fadeInUp 0.3s ease-out 0.1s both" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Topics</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {meeting.topics.map((topic) => (
                          <button key={topic.id} onClick={() => seekTo(topic.start_time_seconds || 0)} style={{ width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--ff-border)", background: "var(--ff-white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-light)"; e.currentTarget.style.borderColor = "#b2e8d8"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; e.currentTarget.style.borderColor = "var(--ff-border)"; }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ff-text)" }}>{topic.title}</span>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ff-green)", background: "var(--ff-green-light)", padding: "2px 8px", borderRadius: "6px" }}>{formatTime(topic.start_time_seconds || 0)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", padding: "24px", borderRadius: "16px", boxShadow: "var(--ff-shadow-card)", animation: "fadeInUp 0.3s ease-out 0.15s both" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                        <CheckSquare style={{ width: "14px", height: "14px", color: "var(--ff-green)" }} />
                        Action Items
                      </h4>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ff-text-3)", background: "var(--ff-bg)", padding: "2px 8px", borderRadius: "10px", border: "1px solid var(--ff-border)" }}>
                        {meeting.action_items.filter(ai => !ai.is_complete).length} open · {meeting.action_items.filter(ai => ai.is_complete).length} done
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {meeting.action_items.map((ai) => (
                        <div key={ai.id} className="group" style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "1px solid transparent", transition: "all 0.15s", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; e.currentTarget.style.border = "1px solid var(--ff-border)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.border = "1px solid transparent"; }}>
                          <input type="checkbox" checked={ai.is_complete} onChange={() => handleToggleActionItem(ai.id, ai.is_complete)} style={{ width: "16px", height: "16px", accentColor: "var(--ff-green)", cursor: "pointer", flexShrink: 0, marginTop: "2px" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {editingAiId === ai.id ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input type="text" value={editingAiText} onChange={(e) => setEditingAiText(e.target.value)} style={{ flex: 1, padding: "4px 8px", border: "1px solid var(--ff-border)", borderRadius: "6px", fontSize: "12px", outline: "none", background: "var(--ff-white)", color: "var(--ff-text)" }} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleUpdateActionItemText(ai.id); if (e.key === "Escape") setEditingAiId(null); }} />
                                <button onClick={() => handleUpdateActionItemText(ai.id)} style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--ff-green)" }}><Check style={{ width: "14px", height: "14px" }} /></button>
                                <button onClick={() => setEditingAiId(null)} style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><X style={{ width: "14px", height: "14px" }} /></button>
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                  <span style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.4, textDecoration: ai.is_complete ? "line-through" : "none", color: ai.is_complete ? "var(--ff-text-3)" : "var(--ff-text)" }}>{ai.text}</span>
                                  <div style={{ display: "flex", gap: "4px", opacity: 0, flexShrink: 0 }} className="group-hover:!opacity-100">
                                    <button onClick={() => { setEditingAiId(ai.id); setEditingAiText(ai.text); }} style={{ padding: "2px", background: "none", border: "none", cursor: "pointer", color: "var(--ff-text-3)" }} title="Edit"><Edit2 style={{ width: "11px", height: "11px" }} /></button>
                                    <button onClick={() => handleDeleteActionItem(ai.id)} style={{ padding: "2px", background: "none", border: "none", cursor: "pointer", color: "var(--ff-text-3)" }} title="Delete"><Trash2 style={{ width: "11px", height: "11px" }} /></button>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {ai.assignee && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)", background: "var(--ff-bg)", padding: "2px 6px", borderRadius: "4px" }}>
                                      <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: avatarColors[(ai.assignee_id || 0) % avatarColors.length].bg, color: avatarColors[(ai.assignee_id || 0) % avatarColors.length].text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", fontWeight: 700 }}>
                                        {ai.assignee.name[0]}
                                      </div>
                                      {ai.assignee.name}
                                    </div>
                                  )}
                                  <span style={{ fontSize: "10px", fontWeight: 600, color: ai.is_complete ? "var(--ff-green)" : "#f59e0b", background: ai.is_complete ? "var(--ff-green-light)" : "#fffbeb", padding: "2px 6px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "3px" }}>
                                    {ai.is_complete ? <><Check style={{ width: "9px", height: "9px" }} /> Done</> : <><Clock style={{ width: "9px", height: "9px" }} /> Open</>}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {meeting.action_items.length === 0 && <div style={{ textAlign: "center", padding: "20px", fontSize: "12px", color: "var(--ff-text-3)" }}>No action items.</div>}
                      <div style={{ borderTop: "1px solid var(--ff-border)", paddingTop: "10px", marginTop: "4px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input type="text" placeholder="Add action item..." value={newAiText} onChange={(e) => setNewAiText(e.target.value)} style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--ff-border)", borderRadius: "10px", fontSize: "12px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)", transition: "all 0.15s" }} onKeyDown={(e) => { if (e.key === "Enter") handleAddActionItem(); }} onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }} />
                          <select value={newAiAssigneeId} onChange={(e) => setNewAiAssigneeId(Number(e.target.value))} style={{ padding: "6px 8px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "11px", outline: "none", background: "var(--ff-white)", color: "var(--ff-text)", fontWeight: 600 }}>
                            <option value={0}>Unassigned</option>
                            {meeting.participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button onClick={handleAddActionItem} style={{ padding: "8px 10px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.15s" }}><Plus style={{ width: "14px", height: "14px" }} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {leftPanel === "askfred" && (
              /* AskFred Panel */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ff-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", background: "var(--ff-white)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot style={{ width: "14px", height: "14px" }} /></div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ff-text)", fontFamily: "'DM Sans', sans-serif" }}>AskFred</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, color: "var(--ff-text-3)", background: "var(--ff-bg)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--ff-border)" }}>
                    <span>GPT-4o</span><ChevronDown style={{ width: "12px", height: "12px" }} />
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", animation: "fadeIn 0.2s ease-out" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {msg.sender === "user" ? (
                          <><img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", border: "1px solid var(--ff-border)" }} />
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ff-text-3)" }}>You</span></>
                        ) : (
                          <><div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot style={{ width: "10px", height: "10px" }} /></div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ff-text-3)" }}>AskFred</span></>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ff-text)", lineHeight: 1.65, fontWeight: 500, paddingLeft: "24px", whiteSpace: "pre-line" }}>{msg.text}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot style={{ width: "10px", height: "10px" }} /></div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ff-text-3)" }}>AskFred</span>
                      </div>
                      <div style={{ display: "flex", gap: "5px", paddingLeft: "24px" }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <div key={i} style={{ width: "5px", height: "5px", background: "var(--ff-green)", borderRadius: "50%", animation: `bounce 1s infinite ${d}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid var(--ff-border)", background: "var(--ff-white)", flexShrink: 0 }}>
                  <form onSubmit={handleSendChat} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", border: "1px solid var(--ff-border)", borderRadius: "10px", background: "var(--ff-bg)", transition: "all 0.15s" }} onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.06)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <Sparkles style={{ width: "14px", height: "14px", color: "var(--ff-green)", flexShrink: 0, marginLeft: "4px" }} />
                    <input type="text" placeholder="Ask anything..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={chatLoading} style={{ flex: 1, background: "transparent", fontSize: "12px", outline: "none", color: "var(--ff-text)", fontWeight: 500 }} />
                    <button type="submit" disabled={chatLoading || !chatInput.trim()} style={{ width: "26px", height: "26px", borderRadius: "8px", background: "var(--ff-green)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1, flexShrink: 0 }}><ArrowUp style={{ width: "14px", height: "14px" }} /></button>
                  </form>
                </div>
              </div>
            )}
            {leftPanel === "bookmarks" && (
              /* Bookmarks Panel */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ff-border)", background: "var(--ff-white)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#fff7e6", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}><Bookmark style={{ width: "14px", height: "14px" }} /></div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)", fontFamily: "'DM Sans', sans-serif" }}>Bookmarks</span>
                  <div style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "var(--ff-text-3)", background: "var(--ff-bg)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--ff-border)" }}>{bookmarks.length}</div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {bookmarks.length === 0 && (
                    <div style={{ textAlign: "center", padding: "32px 16px" }}>
                      <Bookmark style={{ width: "32px", height: "32px", color: "var(--ff-border)", margin: "0 auto 12px" }} />
                      <p style={{ fontSize: "12px", color: "var(--ff-text-3)", fontWeight: 500, margin: 0 }}>No bookmarks yet.</p>
                      <p style={{ fontSize: "11px", color: "var(--ff-text-3)", fontWeight: 500, margin: "4px 0 0", opacity: 0.7 }}>Bookmark key moments in the transcript.</p>
                    </div>
                  )}
                  {bookmarks.map((b) => (
                    <div key={b.id} style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "12px", boxShadow: "var(--ff-shadow-sm)", padding: "12px", animation: "fadeIn 0.2s ease-out" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <button onClick={() => seekTo(b.timestamp_seconds)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "6px", border: "none", background: "var(--ff-green-light)", color: "var(--ff-green)", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>
                          <Play style={{ width: "9px", height: "9px", fill: "var(--ff-green)" }} />{formatTime(b.timestamp_seconds)}
                        </button>
                        <button onClick={() => handleDeleteBookmark(b.id)} style={{ padding: "2px", background: "none", border: "none", cursor: "pointer", color: "var(--ff-text-3)", opacity: 0.6 }} title="Remove"><Trash2 style={{ width: "12px", height: "12px" }} /></button>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--ff-text)", lineHeight: 1.5, fontWeight: 500, margin: 0 }}>{b.note}</p>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid var(--ff-border)", background: "var(--ff-white)", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px", fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)" }}>
                    <Clock style={{ width: "11px", height: "11px" }} />Current position: <span style={{ color: "var(--ff-green)", fontWeight: 700 }}>{formatTime(currentTime)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input type="text" placeholder="Bookmark this moment..." value={bookmarkNote} onChange={(e) => setBookmarkNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddBookmark(); }} style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }} />
                    <button onClick={handleAddBookmark} style={{ padding: "8px 10px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}><Plus style={{ width: "14px", height: "14px" }} /></button>
                  </div>
                </div>
              </div>
            )}
            {leftPanel === "comments" && (
              /* Comments Panel */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ff-border)", background: "var(--ff-white)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#eef0ff", color: "#5b6abf", display: "flex", alignItems: "center", justifyContent: "center" }}><MessageCircle style={{ width: "14px", height: "14px" }} /></div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)", fontFamily: "'DM Sans', sans-serif" }}>Comments</span>
                  <div style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "var(--ff-text-3)", background: "var(--ff-bg)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--ff-border)" }}>{comments.length}</div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {comments.length === 0 && (
                    <div style={{ textAlign: "center", padding: "32px 16px" }}>
                      <MessageCircle style={{ width: "32px", height: "32px", color: "var(--ff-border)", margin: "0 auto 12px" }} />
                      <p style={{ fontSize: "12px", color: "var(--ff-text-3)", fontWeight: 500, margin: 0 }}>No comments yet.</p>
                      <p style={{ fontSize: "11px", color: "var(--ff-text-3)", fontWeight: 500, margin: "4px 0 0", opacity: 0.7 }}>Add comments at specific timestamps.</p>
                    </div>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "12px", boxShadow: "var(--ff-shadow-sm)", padding: "12px", animation: "fadeIn 0.2s ease-out" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 700 }}>{c.author_name[0]}</div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ff-text)" }}>{c.author_name}</span>
                          {c.timestamp_seconds !== null && c.timestamp_seconds !== undefined && (
                            <button onClick={() => seekTo(c.timestamp_seconds!)} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "4px", border: "none", background: "var(--ff-green-light)", color: "var(--ff-green)", fontSize: "9px", fontWeight: 700, cursor: "pointer" }}>
                              <Play style={{ width: "8px", height: "8px", fill: "var(--ff-green)" }} />{formatTime(c.timestamp_seconds)}
                            </button>
                          )}
                        </div>
                        <button onClick={() => handleDeleteComment(c.id)} style={{ padding: "2px", background: "none", border: "none", cursor: "pointer", color: "var(--ff-text-3)", opacity: 0.6 }} title="Delete"><Trash2 style={{ width: "12px", height: "12px" }} /></button>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--ff-text)", lineHeight: 1.5, fontWeight: 500, margin: 0 }}>{c.text}</p>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid var(--ff-border)", background: "var(--ff-white)", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px", fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)" }}>
                    <Clock style={{ width: "11px", height: "11px" }} />Current position: <span style={{ color: "var(--ff-green)", fontWeight: 700 }}>{formatTime(currentTime)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input type="text" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }} style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }} />
                    <button onClick={handleAddComment} style={{ padding: "8px 10px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}><Plus style={{ width: "14px", height: "14px" }} /></button>
                  </div>
                </div>
              </div>
            )}
            {leftPanel === "soundbites" && (
              /* Soundbites Panel */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ff-border)", background: "var(--ff-white)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#f0f5ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}><Headphones style={{ width: "14px", height: "14px" }} /></div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)", fontFamily: "'DM Sans', sans-serif" }}>Soundbites</span>
                  <div style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "var(--ff-text-3)", background: "var(--ff-bg)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--ff-border)" }}>{soundbites.length}</div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {soundbites.length === 0 && (
                    <div style={{ textAlign: "center", padding: "32px 16px" }}>
                      <Headphones style={{ width: "32px", height: "32px", color: "var(--ff-border)", margin: "0 auto 12px" }} />
                      <p style={{ fontSize: "12px", color: "var(--ff-text-3)", fontWeight: 500, margin: 0 }}>No soundbites yet.</p>
                      <p style={{ fontSize: "11px", color: "var(--ff-text-3)", fontWeight: 500, margin: "4px 0 0", opacity: 0.7 }}>Create clips from key moments.</p>
                    </div>
                  )}
                  {soundbites.map((sb) => (
                    <div key={sb.id} style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "12px", boxShadow: "var(--ff-shadow-sm)", padding: "12px", animation: "fadeIn 0.2s ease-out" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)" }}>{sb.title}</span>
                        <button onClick={() => handleDeleteSoundbite(sb.id)} style={{ padding: "2px", background: "none", border: "none", cursor: "pointer", color: "var(--ff-text-3)", opacity: 0.6 }} title="Delete"><Trash2 style={{ width: "12px", height: "12px" }} /></button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)", background: "var(--ff-bg)", padding: "2px 6px", borderRadius: "4px" }}>{sb.speaker_name || "Unknown"}</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ff-green)" }}>{formatTime(sb.from_seconds)} to {formatTime(sb.to_seconds)}</span>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)" }}>({formatTime(sb.to_seconds - sb.from_seconds)})</span>
                      </div>
                      <button onClick={() => seekTo(sb.from_seconds)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--ff-border)", background: "var(--ff-white)", color: "var(--ff-text)", fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-light)"; e.currentTarget.style.borderColor = "#b2e8d8"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; e.currentTarget.style.borderColor = "var(--ff-border)"; }}>
                        <Play style={{ width: "11px", height: "11px", fill: "var(--ff-green)", color: "var(--ff-green)" }} /> Play clip
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid var(--ff-border)", background: "var(--ff-white)", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px", fontSize: "10px", fontWeight: 600, color: "var(--ff-text-3)" }}>
                    <Clock style={{ width: "11px", height: "11px" }} />Current position: <span style={{ color: "var(--ff-green)", fontWeight: 700 }}>{formatTime(currentTime)}</span>
                  </div>
                  <input type="text" placeholder="Soundbite title..." value={soundbiteTitle} onChange={(e) => setSoundbiteTitle(e.target.value)} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)", marginBottom: "6px" }} />
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--ff-text-3)" }}>FROM</span>
                      <input type="number" min={0} max={duration} value={soundbiteStart} onChange={(e) => setSoundbiteStart(Number(e.target.value))} style={{ flex: 1, padding: "5px 6px", border: "1px solid var(--ff-border)", borderRadius: "6px", fontSize: "11px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)", fontWeight: 600 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--ff-text-3)" }}>TO</span>
                      <input type="number" min={0} max={duration} value={soundbiteEnd} onChange={(e) => setSoundbiteEnd(Number(e.target.value))} style={{ flex: 1, padding: "5px 6px", border: "1px solid var(--ff-border)", borderRadius: "6px", fontSize: "11px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)", fontWeight: 600 }} />
                    </div>
                    <button onClick={handleAddSoundbite} style={{ padding: "7px 10px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}><Plus style={{ width: "14px", height: "14px" }} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Transcript + Audio Player at bottom */}
              <div style={{ flex: "0 0 45%", maxWidth: "45%", display: "flex", flexDirection: "column", height: "100%", background: "#fafbfc" }}>

            {/* Transcript Header + Search */}
            <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--ff-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--ff-white)", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Transcript</span>
              <div style={{ position: "relative", width: "180px" }}>
                <Search style={{ width: "12px", height: "12px", color: "var(--ff-text-3)", position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" placeholder="Search transcript..." value={transcriptQuery} onChange={(e) => setTranscriptQuery(e.target.value)} style={{ width: "100%", paddingLeft: "26px", paddingRight: transcriptQuery ? "52px" : "8px", paddingBlock: "5px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "11px", background: "var(--ff-bg)", color: "var(--ff-text)", outline: "none", transition: "all 0.15s" }} onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.06)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }} />
                {transcriptQuery && (
                  <div style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", fontWeight: 700, color: "var(--ff-text-3)" }}>
                    <span>{searchMatches.length > 0 ? activeMatchIndex + 1 : 0}/{searchMatches.length}</span>
                    <button onClick={handlePrevMatch} style={{ background: "none", border: "none", cursor: "pointer", padding: "1px", color: "var(--ff-text-3)" }}><ChevronUp style={{ width: "10px", height: "10px" }} /></button>
                    <button onClick={handleNextMatch} style={{ background: "none", border: "none", cursor: "pointer", padding: "1px", color: "var(--ff-text-3)" }}><ChevronDown style={{ width: "10px", height: "10px" }} /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Transcript Scrollable */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {meeting.transcript_segments.map((seg, idx) => {
                const isActive = seg.id === activeSegmentId;
                const isCurrentMatch = activeMatchIndex >= 0 && searchMatches[activeMatchIndex] === seg.id;
                const isMatch = searchMatches.includes(seg.id);
                const c = avatarColors[idx % avatarColors.length];
                let bg = "transparent", borderL = "transparent";
                if (isActive) { bg = "var(--ff-green-light)"; borderL = "var(--ff-green)"; }
                else if (isCurrentMatch) { bg = "#fffbeb"; borderL = "#f59e0b"; }
                else if (isMatch) { bg = "#fefce8"; borderL = "transparent"; }

                return (
                  <div key={seg.id} id={`segment-${seg.id}`} onClick={() => seekTo(seg.start_time_seconds)} style={{ padding: "12px 14px", borderRadius: "12px", background: bg, borderLeft: `3px solid ${borderL}`, cursor: "pointer", display: "flex", gap: "12px", transition: "all 0.15s" }} onMouseEnter={e => { if (!isActive && !isCurrentMatch) e.currentTarget.style.background = "var(--ff-bg)"; }} onMouseLeave={e => { if (!isActive && !isCurrentMatch && !isMatch) e.currentTarget.style.background = bg; }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", flexShrink: 0, background: c.bg, color: c.text }}>{seg.speaker.name[0]}</div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ff-text)" }}>{seg.speaker.name}</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ff-green)", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); seekTo(seg.start_time_seconds); }}>{formatTime(seg.start_time_seconds)}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--ff-text-2)", lineHeight: 1.65, fontWeight: 500, margin: 0 }}>{seg.text}</p>
                    </div>
                  </div>
                );
              })}
              {meeting.transcript_segments.length === 0 && <div style={{ textAlign: "center", padding: "32px", fontSize: "12px", color: "var(--ff-text-3)" }}>No transcript segments.</div>}
            </div>

            {/* Audio Player — fixed at bottom of transcript panel, like real Fireflies */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ff-border)", background: "var(--ff-white)", flexShrink: 0 }}>
              <div style={{ background: "var(--ff-navy)", borderRadius: "16px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 4px 20px rgba(26,31,46,0.3)" }}>
                <button onClick={togglePlay} style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--ff-green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", flexShrink: 0, transition: "all 0.15s", boxShadow: "0 4px 14px rgba(0,195,137,0.3)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--ff-green-hover)"} onMouseLeave={e => e.currentTarget.style.background = "var(--ff-green)"}>
                  {isPlaying ? <Pause style={{ width: "16px", height: "16px", fill: "#fff" }} /> : <Play style={{ width: "16px", height: "16px", fill: "#fff", marginLeft: "2px" }} />}
                </button>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, color: "#8b92a5" }}>
                    <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
                  </div>
                  <input type="range" min="0" max={duration || 100} step="0.1" value={currentTime} onChange={handleSeek} style={{ width: "100%", height: "4px", appearance: "none", background: "#2a3142", borderRadius: "4px", cursor: "pointer", accentColor: "var(--ff-green)" }} />
                </div>
                <audio ref={audioRef} src={meeting.media_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Volume2 style={{ width: "12px", height: "12px", color: "#8b92a5" }} />
                  <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }} style={{ width: "48px", height: "3px", appearance: "none", background: "#2a3142", borderRadius: "3px", cursor: "pointer", accentColor: "var(--ff-green)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditMeetingModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSuccess={loadMeetingDetails} meetingId={meeting.id} currentTitle={meeting.title} currentParticipantIds={meeting.participants.map((p) => p.id)} />

      {/* Delete Confirmation */}
      {isDeleteConfirmOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(26,31,46,0.65)", backdropFilter: "blur(8px)", animation: "fadeIn 0.15s ease-out" }}>
          <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "16px", width: "100%", maxWidth: "400px", padding: "24px", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", animation: "scaleIn 0.2s ease-out" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--ff-text)", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }}>Delete Meeting?</h3>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--ff-text-3)", lineHeight: 1.6, marginBottom: "20px" }}>This will permanently erase the transcript, summaries, and tasks. This action is irreversible.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setIsDeleteConfirmOpen(false)} style={{ padding: "8px 16px", border: "1px solid var(--ff-border)", borderRadius: "8px", background: "var(--ff-white)", color: "var(--ff-text-2)", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--ff-bg)"} onMouseLeave={e => e.currentTarget.style.background = "var(--ff-white)"}>Cancel</button>
              <button onClick={handleDeleteMeeting} style={{ padding: "8px 16px", border: "none", borderRadius: "10px", background: "#ef4444", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#dc2626"} onMouseLeave={e => e.currentTarget.style.background = "#ef4444"}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingDetail() {
  return (<ToastProvider><MeetingDetailContent /></ToastProvider>);
}
