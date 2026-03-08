"use client";

import { motion } from "framer-motion";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

export default function AppHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-12 flex items-center justify-between px-5 border-b"
      style={{
        background: "#FFFFFF",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Left - Logo */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-0.5 font-extrabold text-lg tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <span style={{ color: "var(--text-primary)" }}>Sketch</span>
          <span style={{ color: "var(--accent-blue)" }}>To</span>
          <span style={{ color: "var(--text-primary)" }}>Code</span>
        </div>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: "rgba(37, 99, 235, 0.08)",
            color: "var(--accent-blue)",
          }}
        >
          beta
        </span>
      </div>

      {/* Center - Keyboard Shortcuts */}
      <div className="hidden md:flex items-center gap-3">
        {KEYBOARD_SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <kbd
              className="px-1.5 py-0.5 text-[10px] font-mono rounded"
              style={{
                background: "var(--bg-surface)",
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
          className="p-1.5 rounded-md transition-colors hover:bg-gray-100"
          style={{ color: "var(--text-muted)" }}
          title="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
          style={{
            background: "var(--text-primary)",
            color: "#FFFFFF",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Deploy on Vercel ▲
        </button>
      </div>
    </motion.header>
  );
}
