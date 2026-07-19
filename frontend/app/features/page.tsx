"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Sparkles, Activity, Upload, Grid3X3, BarChart2,
  Bot, Cpu, Users, MoreHorizontal,
} from "lucide-react";

const featureInfo: Record<string, { icon: any; color: string; bg: string; description: string }> = {
  AskFred: { icon: Sparkles, color: "#00C389", bg: "#e6faf5", description: "AI meeting assistant that can summarize, answer questions, and extract insights from your meetings." },
  "Meeting Status": { icon: Activity, color: "#3b82f6", bg: "#eff6ff", description: "Track the status of your meetings — scheduled, in progress, or completed — in real time." },
  Uploads: { icon: Upload, color: "#f59e0b", bg: "#fffbeb", description: "Upload audio or video files to automatically transcribe and analyze." },
  Integrations: { icon: Grid3X3, color: "#8b5cf6", bg: "#f5f3ff", description: "Connect with Zoom, Google Meet, Microsoft Teams, Slack, and more." },
  Analytics: { icon: BarChart2, color: "#ef4444", bg: "#fef2f2", description: "Meeting analytics — duration trends, speaker breakdown, topic frequency, and action item completion rates." },
  "Voice Agents": { icon: Bot, color: "#06b6d4", bg: "#ecfeff", description: "AI voice agents that can join meetings on your behalf and take notes." },
  "AI Skills": { icon: Cpu, color: "#ec4899", bg: "#fdf2f8", description: "Custom AI skills — train Fireflies to detect objections, follow-ups, and custom topics." },
  Team: { icon: Users, color: "#f97316", bg: "#fff7ed", description: "Manage your team — invite members, assign roles, and share meeting access." },
  More: { icon: MoreHorizontal, color: "#6b7280", bg: "#f9fafb", description: "Additional features and settings coming soon." },
};

function FeaturesContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Feature";
  const info = featureInfo[name] || { icon: Sparkles, color: "#6b7280", bg: "#f9fafb", description: "This feature is currently in development." };
  const Icon = info.icon;

  return (
    <div style={{ display: "flex", background: "var(--ff-bg)", minHeight: "100vh", color: "var(--ff-text)", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 0, paddingTop: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "480px", padding: "48px 40px", background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "20px", textAlign: "center", animation: "scaleIn 0.25s ease-out" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: info.bg, color: info.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Icon style={{ width: "32px", height: "32px" }} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--ff-text)", margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" }}>
            {name}
          </h2>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 14px", borderRadius: "20px", background: "var(--ff-green-light)", color: "var(--ff-green)", fontSize: "11px", fontWeight: 700, marginBottom: "16px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ff-green)", animation: "pulse 2s infinite" }} />
            Coming Soon
          </div>
          <p style={{ fontSize: "14px", color: "var(--ff-text-2)", lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
            {info.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", background: "var(--ff-bg)", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}><div style={{ width: "40px", height: "40px", border: "4px solid var(--ff-border)", borderTopColor: "var(--ff-green)", borderRadius: "50%", animation: "spin 1s linear infinite" }} /></div>}>
      <FeaturesContent />
    </Suspense>
  );
}
