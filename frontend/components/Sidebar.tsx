"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Sparkles, Mic2, Settings, Plus, Menu, X,
  Activity, Upload, Grid3X3, BarChart2, Bot, Cpu, Users, MoreHorizontal,
} from "lucide-react";

const navItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "AskFred", href: "/features?name=AskFred", icon: Sparkles },
  { name: "Meetings", href: "/", icon: Mic2 },
];

const navSecondary = [
  { name: "Meeting Status", href: "/features?name=Meeting+Status", icon: Activity },
  { name: "Uploads", href: "/features?name=Uploads", icon: Upload },
  { name: "Integrations", href: "/features?name=Integrations", icon: Grid3X3 },
  { name: "Analytics", href: "/features?name=Analytics", icon: BarChart2 },
  { name: "Voice Agents", href: "/features?name=Voice+Agents", icon: Bot },
  { name: "AI Skills", href: "/features?name=AI+Skills", icon: Cpu },
  { name: "Team", href: "/features?name=Team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "More", href: "/features?name=More", icon: MoreHorizontal },
];

const allItems = [...navItems, ...navSecondary];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const closeSidebar = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = () => setOpen((p) => !p);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const idx = allItems.findIndex((item) => {
      if (item.name === "Home") return pathname === "/home";
      if (item.name === "Meetings") return pathname === "/" || pathname.startsWith("/meetings");
      return pathname.startsWith(item.href.split("?")[0]);
    });
    if (idx >= 0) setActiveIdx(idx);
  }, [pathname]);

  const renderNavItem = (item: typeof allItems[0], i: number) => {
    const isActive = activeIdx === i;
    const Icon = item.icon;

    return (
      <Link
        key={i}
        href={item.href}
        onClick={() => { setActiveIdx(i); closeSidebar(); }}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 12px 8px 14px", borderRadius: "6px", textDecoration: "none",
          background: isActive ? "rgba(0,195,137,0.12)" : "transparent",
          color: isActive ? "#00C389" : "rgba(255,255,255,0.55)",
          fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
          position: "relative",
        }}
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; } }}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.background = "transparent"; } }}
      >
        {isActive && (
          <div style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: "3px", height: "18px", borderRadius: "0 3px 3px 0",
            background: "#00C389",
          }} />
        )}
        <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Hamburger trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="Toggle sidebar"
        style={{
          position: "fixed", top: "12px", left: "12px", zIndex: 40,
          width: "34px", height: "34px", borderRadius: "8px",
          border: "1px solid var(--ff-border)", background: "var(--ff-white)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ff-text-3)", transition: "all 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--ff-bg)"; e.currentTarget.style.color = "var(--ff-text)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--ff-white)"; e.currentTarget.style.color = "var(--ff-text-3)"; }}
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed", inset: 0, zIndex: 25,
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
            animation: "fadeIn 0.15s ease-out",
          }}
        />
      )}

      {/* Sidebar drawer — dark navy like Fireflies */}
      <aside
        ref={sidebarRef}
        style={{
          position: "fixed", left: 0, top: 0, zIndex: 30,
          width: "220px", height: "100vh",
          background: "#141821",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: "10px", background: "#00C389" }}>ff</div>
          <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>fireflies</span>
        </div>

        {/* Primary nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map((item, i) => renderNavItem(item, i))}

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "8px 4px" }} />

          {/* Secondary nav */}
          {navSecondary.map((item, i) => renderNavItem(item, i + navItems.length))}
        </nav>

        {/* New Meeting */}
        <div style={{ padding: "8px 8px" }}>
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              width: "100%", padding: "9px 0", borderRadius: "8px",
              background: "#00C389", color: "#fff",
              border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onClick={() => { window.dispatchEvent(new CustomEvent("open-new-meeting")); setOpen(false); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#00a876"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#00C389"; }}
          >
            <Plus size={15} />
            New Meeting
          </button>
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Alex" style={{ width: "30px", height: "30px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)" }} />
            <div style={{ position: "absolute", bottom: "0", right: "0", width: "8px", height: "8px", borderRadius: "50%", background: "#00C389", border: "2px solid #141821" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: "1.3", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Alex Sterling</p>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", lineHeight: "1.3", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Free Plan</p>
          </div>
        </div>
      </aside>
    </>
  );
}
