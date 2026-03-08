"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { DEVICE_VIEWS } from "@/lib/constants";
import DeviceFrame from "./DeviceFrame";

export default function PreviewPanel() {
  const generatedCode = useAppStore((s) => s.generatedCode);
  const deviceView = useAppStore((s) => s.deviceView);
  const [debouncedCode, setDebouncedCode] = useState("");
  const [flashKey, setFlashKey] = useState(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce code updates
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedCode(generatedCode);
      setFlashKey((k) => k + 1);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [generatedCode]);

  const deviceConfig = DEVICE_VIEWS.find((d) => d.id === deviceView);
  const iframeWidth = deviceConfig?.width || "100%";

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      className="flex flex-col h-full"
      style={{ background: "var(--bg-panel)" }}
    >
      {/* Panel Header */}
      <div
        className="h-8 flex items-center justify-between px-4 shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <span
          className="text-xs font-semibold"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <span className="mr-2" style={{ color: "var(--accent-purple)" }}>●</span>
          Live Preview
        </span>
        <DeviceFrame />
      </div>

      {/* Preview Area */}
      <div
        className="flex-1 flex items-start justify-center overflow-auto p-4"
        style={{ background: "var(--bg-surface)" }}
      >
        {debouncedCode ? (
          <motion.div
            key={flashKey}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              width: iframeWidth,
              maxWidth: "100%",
              height: "100%",
              transition: "width 0.3s ease",
              margin: iframeWidth !== "100%" ? "0 auto" : undefined,
            }}
            className="rounded-lg overflow-hidden"
          >
            <iframe
              srcDoc={debouncedCode}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-full border-0 rounded-lg"
              style={{
                background: "#FFFFFF",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
              }}
              title="Preview"
            />
          </motion.div>
        ) : (
          <div
            className="w-full h-full rounded-xl flex items-center justify-center"
            style={{
              border: "2px dashed var(--border)",
              background: "rgba(255, 255, 255, 0.5)",
            }}
          >
            <div className="text-center">
              <div
                className="text-3xl mb-3 opacity-30"
              >
                🖥️
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Your generated UI will appear here
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)", opacity: 0.6 }}
              >
                Draw a wireframe and click Generate
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
