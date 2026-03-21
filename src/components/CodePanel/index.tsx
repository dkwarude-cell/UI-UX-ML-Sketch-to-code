"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import CodeActions from "./CodeActions";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "var(--bg-panel)" }}
    >
      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
        Loading editor...
      </div>
    </div>
  ),
});

export default function CodePanel() {
  const generatedCode = useAppStore((s) => s.generatedCode);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setGeneratedCode = useAppStore((s) => s.setGeneratedCode);
  const prevCodeLength = useRef(0);
  const changeTimer = useRef<NodeJS.Timeout | null>(null);

  // Track code length changes for animation effect
  useEffect(() => {
    prevCodeLength.current = generatedCode.length;
  }, [generatedCode]);

  // Debounce edits to avoid re-render on every streamed chunk
  const setGeneratedCodeDebounced = useCallback(
    (value: string) => {
      if (changeTimer.current) {
        clearTimeout(changeTimer.current);
      }
      changeTimer.current = setTimeout(() => {
        setGeneratedCode(value);
        changeTimer.current = null;
      }, 120);
    },
    [setGeneratedCode]
  );

  useEffect(() => {
    return () => {
      if (changeTimer.current) {
        clearTimeout(changeTimer.current);
      }
    };
  }, []);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && !isGenerating) {
      setGeneratedCodeDebounced(value);
    }
  };

  const displayCode = generatedCode || "<!-- Draw a wireframe and click Generate → -->";

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      className="flex flex-col h-full glass-panel"
      style={{
        background: "rgba(255,255,255,0.05)",
        borderColor: "var(--border)",
      }}
    >
      {/* Panel Header */}
      <div
        className="h-9 flex items-center justify-between px-4 shrink-0 glass-header"
        style={{
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <span className="mr-2" style={{ color: "var(--accent-green)" }}>●</span>
            Code Editor
          </span>
          {isGenerating && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(196, 132, 255, 0.18)",
                color: "#f4e9ff",
              }}
            >
              streaming...
            </motion.span>
          )}
        </div>
        <CodeActions />
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language="html"
          theme="vs-dark"
          value={displayCode}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            roundedSelection: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            readOnly: isGenerating,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            folding: true,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
          }}
        />
      </div>
    </motion.div>
  );
}
