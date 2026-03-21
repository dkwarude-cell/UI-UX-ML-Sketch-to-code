"use client";

import { motion } from "framer-motion";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

export default function AppHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-14 flex items-center justify-between px-6 glass-panel"
      style={{
        borderColor: "var(--border)",
        background:
          "linear-gradient(120deg, rgba(124, 132, 255, 0.24), rgba(124, 132, 255, 0) 35%), rgba(255, 255, 255, 0.04)",
      }}
    >
      {/* Left - Logo */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md" style={{
          background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
          boxShadow: "0 10px 30px rgba(124, 132, 255, 0.35)",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3L4 8v8l8 5 8-5V8l-8-5z"
              stroke="#f8fafc"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path d="M8 10l4 2.5 4-2.5" stroke="#f8fafc" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-extrabold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
            SketchToCode
          </span>
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)", letterSpacing: "0.4px" }}>
            Timber-inspired workspace
          </span>
        </div>
      </div>

      {/* Center - Keyboard Shortcuts */}
      <div className="hidden md:flex items-center gap-3">
        {KEYBOARD_SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <kbd
              className="px-1.5 py-0.5 text-[10px] font-mono rounded"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {s.keys}
            </kbd>
            <span className="text-[11px]">{s.action}</span>
          </div>
        ))}
      </div>

      {/* Right - Links */}
      <div className="flex items-center gap-3">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
          title="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
        <button
          className="text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(120deg, #8b5cf6, #22d3ee)",
            color: "#0b1021",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: "0 10px 25px rgba(34, 211, 238, 0.35)",
          }}
        >
          Start converting →
        </button>
      </div>
    </motion.header>
  );
}
