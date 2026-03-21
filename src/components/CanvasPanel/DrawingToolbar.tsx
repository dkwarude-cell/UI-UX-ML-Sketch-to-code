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
      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 p-2 rounded-xl"
      style={{
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        boxShadow: "0 16px 30px rgba(0,0,0,0.35)",
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
                background: isActive ? "linear-gradient(135deg, #22d3ee, #8b5cf6)" : "rgba(255,255,255,0.06)",
                color: isActive ? "#0b1021" : "#e2e8f0",
                fontWeight: isActive ? 700 : 500,
                boxShadow: isActive ? "0 8px 18px rgba(34, 211, 238, 0.35)" : "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
          >
            <span className="text-[15px]">{tool.icon}</span>
            {isActive && (
              <motion.div
                layoutId="tool-indicator"
                className="absolute inset-0 rounded-lg"
                  style={{ background: "transparent", zIndex: -1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
