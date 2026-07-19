"use client";

import React, { useState, useEffect } from "react";
import { X, UploadCloud, FileText, Check, Plus, AlertCircle } from "lucide-react";
import { useToast } from "@/components/Toast";
import { Participant } from "@/types";
import { API_BASE } from "@/lib/api";

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewMeetingModal({ isOpen, onClose, onSuccess }: NewMeetingModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"paste" | "upload">("paste");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("30");
  const [mediaUrl, setMediaUrl] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [tagsInput, setTagsInput] = useState("");

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");

  const [dbParticipants, setDbParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch("${API_BASE}/api/participants")
        .then((res) => res.json())
        .then((data) => setDbParticipants(data))
        .catch((err) => console.error("Error loading participants:", err));

      setTitle("");
      setDate(new Date().toISOString().substring(0, 16));
      setDuration("30");
      setMediaUrl("");
      setTranscriptText("");
      setSelectedParticipants([]);
      setTagsInput("");
      setUploadedFile(null);
      setFileContent("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("File size exceeds 2MB limit.");
        return;
      }
      setUploadedFile(file);
      setError("");

      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleParticipantToggle = (id: number) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Meeting Title is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("date", new Date(date).toISOString());
      formData.append("duration_seconds", String(parseInt(duration) * 60));
      if (mediaUrl.trim()) formData.append("media_url", mediaUrl);

      const tagList = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      tagList.forEach((tag) => formData.append("tag_names", tag));
      selectedParticipants.forEach((pid) => formData.append("participant_ids", String(pid)));

      if (tab === "paste") {
        formData.append("transcript_text", transcriptText);
      } else if (tab === "upload" && uploadedFile) {
        formData.append("file", uploadedFile);
      }

      const res = await fetch("${API_BASE}/api/meetings", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to process meeting.");
      }

      showToast("Meeting processed and added successfully!", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while creating the meeting.");
      showToast(err.message || "Failed to add meeting", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", border: "1px solid var(--ff-border)", borderRadius: "8px",
    fontSize: "13px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)",
    transition: "all 0.15s", fontWeight: 500,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: "var(--ff-text-3)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(26,31,46,0.6)", backdropFilter: "blur(4px)", animation: "fadeIn 0.15s ease-out" }}>
      <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "16px", width: "100%", maxWidth: "640px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", animation: "scaleIn 0.2s ease-out" }}>

        {/* Header */}
        <div style={{ padding: "24px", borderBottom: "1px solid var(--ff-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ff-text)", display: "flex", alignItems: "center", gap: "8px", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
              <Plus style={{ width: "18px", height: "18px", color: "var(--ff-green)" }} />
              Add New Meeting
            </h2>
            <span style={{ fontSize: "12px", color: "var(--ff-text-3)", marginTop: "2px", fontWeight: 500 }}>
              Paste a transcript or upload audio/video logs to generate summaries and notes.
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ padding: "6px", border: "none", background: "none", borderRadius: "6px", cursor: "pointer", color: "var(--ff-text-3)", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {error && (
            <div style={{ padding: "12px 14px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, animation: "fadeIn 0.15s ease-out" }}>
              <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={labelStyle}>Meeting Title <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" placeholder="e.g. Q3 Design Review Standup" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={labelStyle}>Meeting Date & Time</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Duration & Media URL */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={labelStyle}>Duration (minutes)</label>
              <input type="number" min="1" placeholder="30" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={labelStyle}>Media URL (Optional)</label>
              <input type="url" placeholder="e.g. https://domain.com/audio.mp3" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Tags (comma separated)</label>
            <input type="text" placeholder="e.g. Design, Engineering, Roadmap" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          {/* Participants */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Select Participants</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "12px", border: "1px solid var(--ff-border)", background: "var(--ff-bg)", borderRadius: "10px", maxHeight: "140px", overflowY: "auto" }}>
              {dbParticipants.map((p) => {
                const isSelected = selectedParticipants.includes(p.id);
                return (
                  <button
                    type="button" key={p.id} onClick={() => handleParticipantToggle(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                      border: isSelected ? "none" : "1px solid var(--ff-border)",
                      background: isSelected ? "var(--ff-green)" : "var(--ff-white)",
                      color: isSelected ? "#fff" : "var(--ff-text-2)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.background = "var(--ff-green-light)"; e.currentTarget.style.color = "var(--ff-green)"; } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.background = "var(--ff-white)"; e.currentTarget.style.color = "var(--ff-text-2)"; } }}
                  >
                    {isSelected && <Check style={{ width: "12px", height: "12px" }} />}
                    <span>{p.name}</span>
                  </button>
                );
              })}
              {dbParticipants.length === 0 && (
                <span style={{ fontSize: "12px", color: "var(--ff-text-3)", padding: "4px" }}>No participants seeded in DB.</span>
              )}
            </div>
          </div>

          {/* Content Source Tabs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--ff-border)" }}>
              <button type="button" onClick={() => setTab("paste")} style={{
                padding: "10px 16px", fontSize: "13px", fontWeight: 700, border: "none",
                borderBottomWidth: "2px", borderBottomStyle: "solid",
                borderBottomColor: tab === "paste" ? "var(--ff-green)" : "transparent",
                color: tab === "paste" ? "var(--ff-green)" : "var(--ff-text-3)",
                background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                transition: "all 0.2s",
              }}>
                <FileText style={{ width: "14px", height: "14px" }} />
                Paste Transcript Text
              </button>
              <button type="button" onClick={() => setTab("upload")} style={{
                padding: "10px 16px", fontSize: "13px", fontWeight: 700, border: "none",
                borderBottomWidth: "2px", borderBottomStyle: "solid",
                borderBottomColor: tab === "upload" ? "var(--ff-green)" : "transparent",
                color: tab === "upload" ? "var(--ff-green)" : "var(--ff-text-3)",
                background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                transition: "all 0.2s",
              }}>
                <UploadCloud style={{ width: "14px", height: "14px" }} />
                Upload Transcript File
              </button>
            </div>

            {tab === "paste" ? (
              <div>
                <textarea
                  placeholder={"Paste multi-speaker transcript line-by-line here...\nFormat:\nSpeaker A: Hello everyone!\nSpeaker B: Hi, what's our agenda?\nSpeaker A: I will outline our milestones."}
                  rows={8}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  style={{ width: "100%", padding: "14px", border: "1px solid var(--ff-border)", borderRadius: "10px", fontSize: "13px", fontFamily: "monospace", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)", resize: "vertical", transition: "all 0.15s" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.06)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", border: "2px dashed var(--ff-border)", background: "var(--ff-bg)", borderRadius: "12px", cursor: "pointer", position: "relative", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.background = "var(--ff-green-light)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.background = "var(--ff-bg)"; }}
              >
                <input type="file" accept=".txt,.vtt,.json" onChange={handleFileChange} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                <UploadCloud style={{ width: "36px", height: "36px", color: uploadedFile ? "var(--ff-green)" : "var(--ff-text-3)", marginBottom: "12px" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ff-text)" }}>
                  {uploadedFile ? uploadedFile.name : "Choose a file or drag it here"}
                </span>
                <span style={{ fontSize: "11px", color: "var(--ff-text-3)", marginTop: "4px" }}>
                  Supports .txt, .vtt formats (Max 2MB)
                </span>
                {uploadedFile && (
                  <span style={{ fontSize: "10px", color: "var(--ff-green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Check style={{ width: "12px", height: "12px" }} /> File Loaded ({Math.round(uploadedFile.size / 1024)} KB)
                  </span>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--ff-border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{
            padding: "10px 20px", border: "1px solid var(--ff-border)", borderRadius: "10px",
            background: "var(--ff-white)", fontSize: "13px", fontWeight: 600,
            color: "var(--ff-text-2)", cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; }}
          >
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: "10px 24px", background: "var(--ff-green)", color: "#fff", border: "none",
            borderRadius: "10px", fontSize: "13px", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s",
            boxShadow: loading ? "none" : "0 2px 8px rgba(0,195,137,0.2)",
          }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "var(--ff-green-hover)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,195,137,0.3)"; }}}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,195,137,0.2)"; }}}
          >
            {loading ? (
              <>
                <div style={{ width: "14px", height: "14px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                <span>Processing AI Summary...</span>
              </>
            ) : (
              <span>Add & Summarize</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
