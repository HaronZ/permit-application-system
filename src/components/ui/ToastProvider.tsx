"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: "success" | "error" | "info";
  actionLabel?: string;
  onAction?: () => void;
};

type ToastCtx = {
  show: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, ...t };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {mounted && createPortal(
        <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[380px] max-w-[92vw] flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={clsx(
                "pointer-events-auto rounded-md border bg-white p-3 shadow-lg ring-1 ring-black/5",
                t.type === "success" && "border-emerald-200",
                t.type === "error" && "border-red-200"
              )}
            >
              {t.title && <div className="mb-0.5 text-sm font-semibold">{t.title}</div>}
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-800">{t.message}</div>
                {t.actionLabel && t.onAction && (
                  <button
                    className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-black"
                    onClick={() => {
                      t.onAction?.();
                      setToasts((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </Ctx.Provider>
  );
}
