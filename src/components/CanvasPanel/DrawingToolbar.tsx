"use client";

import { motion } from "framer-motion";
import { TOOLS } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";
import type { ToolId } from "@/lib/constants";

export default function DrawingToolbar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const setActiveTool = useAppStore((s) => s.setActiveTool);

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1 p-1.5 rounded-xl"
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <motion.button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as ToolId)}
            whileTap={{ scale: 0.9 }}
            animate={isActive ? { scale: 1.1 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            title={`${tool.label} (${tool.shortcut})`}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-base transition-all duration-150"
            style={{
              background: isActive ? "var(--accent-blue)" : "transparent",
              color: isActive ? "#FFFFFF" : "var(--text-secondary)",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <span className="text-[15px]">{tool.icon}</span>
            {isActive && (
              <motion.div
                layoutId="tool-indicator"
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--accent-blue)", zIndex: -1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
