"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ToastProvider, useToast } from "@/components/Toast";
import { ActionItem, Meeting } from "@/types";
import { CheckSquare, Calendar, User, ExternalLink, ClipboardList, Plus, X } from "lucide-react";
import Link from "next/link";
import { Participant } from "@/types";

function TasksContent() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskMeetingId, setNewTaskMeetingId] = useState<number>(0);
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const loadTasks = async () => {
    setLoading(true);
    try {
      const [tasksRes, meetingsRes, participantsRes] = await Promise.all([
        fetch("http://localhost:8000/api/action-items"),
        fetch("http://localhost:8000/api/meetings"),
        fetch("http://localhost:8000/api/participants"),
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      if (participantsRes.ok) setParticipants(await participantsRes.json());
    } catch {
      showToast("Server offline.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleToggleTask = async (taskId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`http://localhost:8000/api/action-items/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_complete: !currentStatus }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_complete: !currentStatus } : t)));
        showToast(`Task marked as ${!currentStatus ? "completed" : "pending"}`, "success");
      }
    } catch {
      showToast("Failed to connect to API.", "error");
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskText.trim()) { showToast("Enter a task description.", "error"); return; }
    if (!newTaskMeetingId) { showToast("Select a meeting.", "error"); return; }
    try {
      let assigneeId: number | undefined;
      if (newTaskAssignee.trim()) {
        const found = participants.find(p => p.name.toLowerCase() === newTaskAssignee.trim().toLowerCase());
        if (found) assigneeId = found.id;
      }
      const res = await fetch("http://localhost:8000/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: newTaskMeetingId,
          text: newTaskText.trim(),
          assignee_id: assigneeId || null,
        }),
      });
      if (res.ok) {
        showToast("Task created!", "success");
        setNewTaskText(""); setNewTaskMeetingId(0); setNewTaskAssignee(""); setShowNewTask(false);
        loadTasks();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to create task.", "error");
      }
    } catch {
      showToast("Server offline.", "error");
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return !t.is_complete;
    if (filter === "completed") return t.is_complete;
    return true;
  });

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const getMeetingTitle = (id: number) => meetings.find((m) => m.id === id)?.title || `Meeting #${id}`;

  const tabs = [
    { key: "all" as const, label: "All", count: tasks.length },
    { key: "pending" as const, label: "Pending", count: tasks.filter((t) => !t.is_complete).length },
    { key: "completed" as const, label: "Completed", count: tasks.filter((t) => t.is_complete).length },
  ];

  return (
    <div style={{ display: "flex", background: "linear-gradient(160deg, #e8ecf4 0%, #dde1ea 30%, #e4e8f2 70%, #eaeef6 100%)", minHeight: "100vh", color: "var(--ff-text)", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: "0", paddingTop: "56px" }}>
        <Navbar />
        <main style={{ padding: "48px 56px", maxWidth: "940px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "18px", padding: "32px", marginBottom: "24px", boxShadow: "var(--ff-shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--ff-green-light)", color: "var(--ff-green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckSquare style={{ width: "22px", height: "22px" }} />
              </div>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Tasks</h1>
                <p style={{ fontSize: "14px", color: "var(--ff-text-3)", margin: 0 }}>
                  {tasks.filter(t => !t.is_complete).length} pending action item{tasks.filter(t => !t.is_complete).length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button onClick={() => setShowNewTask(!showNewTask)}
              style={{ padding: "10px 20px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 4px 14px rgba(0,195,137,0.25)", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-green)"; }}>
              {showNewTask ? <X style={{ width: "14px", height: "14px" }} /> : <Plus style={{ width: "14px", height: "14px" }} />}
              {showNewTask ? "Cancel" : "New Task"}
            </button>
          </div>

          {/* New task form */}
          {showNewTask && (
            <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-green)", borderRadius: "16px", padding: "20px", marginBottom: "20px", animation: "fadeIn 0.2s ease-out", boxShadow: "0 0 0 3px rgba(0,195,137,0.08)" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--ff-text)", margin: "0 0 12px" }}>Create New Task</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Task description..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }} />
                <div style={{ display: "flex", gap: "10px" }}>
                  <select value={newTaskMeetingId} onChange={e => setNewTaskMeetingId(Number(e.target.value))}
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }}>
                    <option value={0}>Select meeting...</option>
                    {meetings.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                  <input value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)} placeholder="Assignee (optional)"
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)" }} />
                </div>
                <button onClick={handleCreateTask}
                  style={{ padding: "10px 20px", background: "var(--ff-green)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", transition: "background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-green-hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-green)"; }}>
                  Create Task
                </button>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--ff-border)", gap: "32px", marginBottom: "36px" }}>
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                style={{ paddingBlock: "12px", fontSize: "13px", fontWeight: 700, border: "none", borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: filter === tab.key ? "var(--ff-green)" : "transparent", color: filter === tab.key ? "var(--ff-green)" : "var(--ff-text-3)", background: "none", cursor: "pointer", transition: "all 0.15s" }}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Tasks List */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: "64px", background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "14px", animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "18px", padding: "100px", textAlign: "center" }}>
              <ClipboardList style={{ width: "48px", height: "48px", color: "var(--ff-border)", margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--ff-text)", marginBottom: "6px" }}>
                {filter === "all" ? "No Action Items" : filter === "pending" ? "All caught up!" : "No completed tasks"}
              </h3>
              <p style={{ fontSize: "12px", color: "var(--ff-text-3)", maxWidth: "320px", margin: "0 auto" }}>
                {filter === "all" ? "Create a task or generate one from a meeting transcript." : filter === "pending" ? "All tasks have been completed." : "Complete some tasks to see them here."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredTasks.map((task) => (
                <div key={task.id}
                  style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", padding: "20px", borderRadius: "16px", display: "flex", alignItems: "flex-start", gap: "14px", transition: "all 0.15s", boxShadow: "var(--ff-shadow-card)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#d0d5dd"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--ff-shadow-card-hover)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ff-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--ff-shadow-card)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                  <input type="checkbox" checked={task.is_complete} onChange={() => handleToggleTask(task.id, task.is_complete)}
                    style={{ width: "16px", height: "16px", borderRadius: "4px", accentColor: "var(--ff-green)", cursor: "pointer", flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.5, margin: "0 0 4px", textDecoration: task.is_complete ? "line-through" : "none", color: task.is_complete ? "var(--ff-text-3)" : "var(--ff-text)" }}>
                      {task.text}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--ff-text-3)", margin: "0 0 8px", fontWeight: 500 }}>
                      From: {getMeetingTitle(task.meeting_id)}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--ff-text-3)", fontWeight: 600 }}>
                      {task.assignee && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <User style={{ width: "12px", height: "12px" }} />
                          <span>{task.assignee.name}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar style={{ width: "12px", height: "12px" }} />
                        <span>{formatDate(task.created_at)}</span>
                      </div>
                      <Link href={`/meetings/${task.meeting_id}`} style={{ color: "var(--ff-green)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none", fontWeight: 600 }}>
                        View transcript <ExternalLink style={{ width: "11px", height: "11px" }} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return <ToastProvider><TasksContent /></ToastProvider>;
}
