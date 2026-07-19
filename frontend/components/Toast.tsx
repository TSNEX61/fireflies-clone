"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";
export interface ToastMessage { id: string; message: string; type: ToastType; }
interface ToastContextType { showToast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-[340px]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-in"
            style={{
              background: "var(--ff-white)",
              border: "1px solid var(--ff-border)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            }}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ff-green)" }} />}
            {toast.type === "error"   && <AlertCircle  className="w-4 h-4 flex-shrink-0 text-red-500" />}
            {toast.type === "info"    && <Info         className="w-4 h-4 flex-shrink-0 text-blue-500" />}
            <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--ff-text)" }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md transition-colors flex-shrink-0"
              style={{ color: "var(--ff-text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--ff-bg)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
