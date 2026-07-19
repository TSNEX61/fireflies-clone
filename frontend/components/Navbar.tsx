"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, Share2, Check, MoreHorizontal } from "lucide-react";

const avatarColors = [
  { bg: "#e0f2fe", text: "#0369a1" },
  { bg: "#fce7f3", text: "#be185d" },
  { bg: "#ecfdf5", text: "#047857" },
  { bg: "#fef3c7", text: "#b45309" },
  { bg: "#ede9fe", text: "#6d28d9" },
];

interface MenuItem {
  label?: string;
  icon?: any;
  onClick?: () => void;
  divider?: boolean;
  danger?: boolean;
}

interface NavbarProps {
  meeting?: any;
  shareCopied?: boolean;
  onShare?: () => void;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  menuItems?: MenuItem[];
}

export default function Navbar({ meeting, shareCopied, onShare, menuOpen, onMenuToggle, menuRef, menuItems }: NavbarProps) {
  const router = useRouter();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <header
      className="h-14 flex items-center fixed top-0 right-0 z-20"
      style={{
        left: "0",
        background: "var(--ff-white)",
        borderBottom: "1px solid var(--ff-border)",
        paddingLeft: "42px",
        paddingRight: "24px",
      }}
    >
      {/* Center - title */}
      <div className="flex-1 flex items-center min-w-0 px-2">
        {meeting ? (
          <span className="text-[13px] font-semibold truncate text-center" style={{ color: "var(--ff-text)", fontFamily: "'DM Sans', sans-serif" }}>
            {meeting.title}
          </span>
        ) : null}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {meeting && (
          <>
            <span className="text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full" style={{ background: "var(--ff-bg)", color: "var(--ff-text-3)", border: "1px solid var(--ff-border)" }}>
              {new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "var(--ff-green-light)", color: "var(--ff-green)" }}>
              <Clock className="w-2.5 h-2.5" />
              {formatTime(meeting.duration_seconds)}
            </span>
            {meeting.tags?.slice(0, 2).map((tag: any, i: number) => (
              <span key={i} className="text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full" style={{ background: "#eef0ff", color: "#5b6abf" }}>
                {tag.name}
              </span>
            ))}
            <div className="flex items-center">
              {meeting.participants?.slice(0, 3).map((p: any, i: number) => (
                <div key={p.id} title={p.name} className="flex items-center justify-center rounded-full text-[8px] font-bold" style={{
                  width: "20px", height: "20px",
                  border: "2px solid var(--ff-white)",
                  marginLeft: i > 0 ? "-5px" : "0",
                  background: avatarColors[i % avatarColors.length].bg, color: avatarColors[i % avatarColors.length].text,
                }}>
                  {p.name[0]}
                </div>
              ))}
              {meeting.participants?.length > 3 && (
                <span className="text-[9px] font-bold ml-1" style={{ color: "var(--ff-text-3)" }}>+{meeting.participants.length - 3}</span>
              )}
            </div>

            <div className="w-px h-4" style={{ background: "var(--ff-border)" }} />

            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{
                border: "1px solid var(--ff-border)",
                background: shareCopied ? "var(--ff-green-light)" : "var(--ff-white)",
                color: shareCopied ? "var(--ff-green)" : "var(--ff-text-2)",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!shareCopied) e.currentTarget.style.background = "var(--ff-bg)"; }}
              onMouseLeave={e => { if (!shareCopied) e.currentTarget.style.background = shareCopied ? "var(--ff-green-light)" : "var(--ff-white)"; }}
            >
              {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{shareCopied ? "Copied!" : "Share"}</span>
            </button>

            <div ref={menuRef} className="relative">
              <button
                onClick={onMenuToggle}
                className="p-1.5 rounded-lg"
                style={{
                  border: "1px solid var(--ff-border)",
                  background: menuOpen ? "var(--ff-bg)" : "var(--ff-white)",
                  color: "var(--ff-text-3)", cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--ff-bg)"}
                onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = "var(--ff-white)"; }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && menuItems && (
                <div className="absolute top-full right-0 mt-1 w-[200px] overflow-hidden" style={{ background: "var(--ff-white)", border: "1px solid var(--ff-border)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 50, animation: "scaleIn 0.15s ease-out" }}>
                  {menuItems.map((item, i) => {
                    if (item.divider) return <div key={i} className="my-0.5" style={{ height: "1px", background: "var(--ff-border)" }} />;
                    const Icon = item.icon;
                    return (
                      <button key={i} onClick={item.onClick} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] font-semibold text-left" style={{ border: "none", background: "none", cursor: "pointer", color: item.danger ? "#ef4444" : "var(--ff-text)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#fef2f2" : "var(--ff-bg)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        {Icon && <Icon className="w-3.5 h-3.5" style={{ color: item.danger ? "#ef4444" : "var(--ff-text-3)" }} />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <button
          className="relative p-[7px] rounded-lg"
          style={{ color: "var(--ff-text-3)", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; e.currentTarget.style.color = "var(--ff-text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ff-text-3)"; }}
          onClick={() => router.push("/notifications")}
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-[5px] right-[5px] w-[7px] h-[7px] rounded-full border-[1.5px] border-white" style={{ background: "var(--ff-green)" }} />
        </button>

        <div className="w-px h-5 mx-0.5" style={{ background: "var(--ff-border)" }} />

        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{ transition: "all 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--ff-bg)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt="Profile"
            className="w-7 h-7 rounded-full flex-shrink-0"
          />
          <span className="text-[12px] font-semibold" style={{ color: "var(--ff-text)" }}>Alex Sterling</span>
        </button>
      </div>
    </header>
  );
}
