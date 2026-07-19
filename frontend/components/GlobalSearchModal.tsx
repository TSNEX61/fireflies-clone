"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, Clock, ChevronRight } from "lucide-react";

interface SearchResult {
  id: number;
  title: string;
  date: string;
  speaker_name: string;
  speaker_initial: string;
  match_count: number;
  matches: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/meetings/search/global?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handler = () => { if (!isOpen) onClose(); };
    // The parent dispatches open-global-search; we listen for close
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[15vh]"
      style={{ zIndex: 100, background: "rgba(26,31,46,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "fadeIn 0.15s ease-out" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full mx-4"
        style={{
          maxWidth: "640px",
          background: "var(--ff-white)",
          borderRadius: "16px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 12px 28px rgba(0,0,0,0.10)",
          border: "1px solid var(--ff-border)",
          overflow: "hidden",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--ff-border)" }}>
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ff-text-3)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search across all transcripts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-[15px] outline-none bg-transparent"
            style={{ color: "var(--ff-text)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 rounded-md" style={{ color: "var(--ff-text-3)", background: "var(--ff-bg)", border: "none", cursor: "pointer" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="text-[11px] font-semibold px-2 py-1 rounded-md" style={{ color: "var(--ff-text-3)", background: "var(--ff-bg)", border: "none", cursor: "pointer" }}>
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: "420px" }}>
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="w-10 h-10" style={{ color: "var(--ff-border)" }} />
              <p className="text-[13px] font-medium" style={{ color: "var(--ff-text-3)" }}>Type to search across all transcripts...</p>
              <p className="text-[11px]" style={{ color: "var(--ff-text-3)" }}>Try searching for a keyword, topic, or speaker name</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 rounded-full" style={{ border: "2px solid var(--ff-border)", borderTopColor: "var(--ff-green)", animation: "spin 0.6s linear infinite" }} />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Search className="w-10 h-10" style={{ color: "var(--ff-border)" }} />
              <p className="text-[13px] font-medium" style={{ color: "var(--ff-text-3)" }}>No matches found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { router.push(`/meetings/${r.id}`); onClose(); }}
                  className="w-full text-left px-5 py-3.5 flex items-start gap-3.5"
                  style={{ border: "none", background: "none", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ff-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--ff-green-light)", color: "var(--ff-green)" }}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[13px] font-semibold truncate" style={{ color: "var(--ff-text)", fontFamily: "'DM Sans', sans-serif" }}>{r.title}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--ff-green-light)", color: "var(--ff-green)" }}>
                          {r.match_count} match{r.match_count !== 1 ? "es" : ""}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--ff-text-3)" }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-medium" style={{ color: "var(--ff-text-3)" }}>{formatDate(r.date)}</span>
                      <span className="text-[11px]" style={{ color: "var(--ff-border)" }}>·</span>
                      <span className="text-[11px] font-medium" style={{ color: "var(--ff-text-3)" }}>{r.speaker_name}</span>
                    </div>
                    <div className="space-y-1">
                      {r.matches.slice(0, 2).map((m, i) => (
                        <p key={i} className="text-[12px] leading-relaxed truncate" style={{ color: "var(--ff-text-2)" }}>
                          &ldquo;{m}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
