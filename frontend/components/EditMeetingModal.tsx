"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/components/Toast";
import { Participant } from "@/types";

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meetingId: number;
  currentTitle: string;
  currentParticipantIds: number[];
}

export default function EditMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  meetingId,
  currentTitle,
  currentParticipantIds
}: EditMeetingModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(currentTitle);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>(currentParticipantIds);

  const [dbParticipants, setDbParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setSelectedParticipants(currentParticipantIds);
      setError("");

      fetch("http://localhost:8000/api/participants")
        .then((res) => res.json())
        .then((data) => setDbParticipants(data))
        .catch((err) => console.error("Error loading participants:", err));
    }
  }, [isOpen, currentTitle, currentParticipantIds]);

  if (!isOpen) return null;

  const handleParticipantToggle = (id: number) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Meeting title cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`http://localhost:8000/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          participant_ids: selectedParticipants,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update meeting.");
      }

      showToast("Meeting metadata updated successfully!", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while updating.");
      showToast(err.message || "Failed to update metadata", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(26,31,46,0.6)", backdropFilter: "blur(4px)", animation: "fadeIn 0.15s ease-out" }}>
      <div style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "16px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", animation: "scaleIn 0.2s ease-out" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ff-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ff-text)", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            Edit Meeting Details
          </h2>
          <button
            onClick={onClose}
            style={{ padding: "6px", border: "none", background: "none", borderRadius: "6px", cursor: "pointer", color: "var(--ff-text-3)", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ padding: "10px 12px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, animation: "fadeIn 0.15s ease-out" }}>
              <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
              Meeting Title
            </label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              style={{ padding: "10px 14px", border: "1px solid var(--ff-border)", borderRadius: "8px", fontSize: "13px", outline: "none", background: "var(--ff-bg)", color: "var(--ff-text)", transition: "all 0.15s", fontWeight: 500 }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,195,137,0.08)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--ff-border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          {/* Participants */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ff-text-3)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
              Active Participants
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "12px", border: "1px solid var(--ff-border)", background: "var(--ff-bg)", borderRadius: "10px", maxHeight: "160px", overflowY: "auto" }}>
              {dbParticipants.map((p) => {
                const isSelected = selectedParticipants.includes(p.id);
                return (
                  <button
                    type="button" key={p.id} onClick={() => handleParticipantToggle(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "5px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
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
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ff-border)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={onClose} style={{
            padding: "8px 16px", border: "1px solid var(--ff-border)", borderRadius: "8px",
            background: "var(--ff-white)", fontSize: "12px", fontWeight: 600,
            color: "var(--ff-text-2)", cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; }}
          >
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: "8px 16px", background: "var(--ff-green)", color: "#fff", border: "none",
            borderRadius: "8px", fontSize: "12px", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s",
            boxShadow: loading ? "none" : "0 2px 6px rgba(0,195,137,0.2)",
          }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "var(--ff-green-hover)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,195,137,0.3)"; }}}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = "var(--ff-green)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,195,137,0.2)"; }}}
          >
            {loading ? (
              <div style={{ width: "12px", height: "12px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            ) : (
              <Save style={{ width: "12px", height: "12px" }} />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
