"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function CodeActions() {
  const generatedCode = useAppStore((s) => s.generatedCode);
  const generationMeta = useAppStore((s) => s.generationMeta);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-ui.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        disabled={!generatedCode}
        className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-all"
        style={{
          background: copied ? "rgba(22, 163, 74, 0.08)" : "var(--bg-surface)",
          border: `1px solid ${copied ? "var(--accent-green)" : "var(--border)"}`,
          color: copied ? "var(--accent-green)" : "var(--text-secondary)",
          opacity: generatedCode ? 1 : 0.4,
        }}
      >
        {copied ? "✓ Copied" : "⧉ Copy"}
      </button>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={!generatedCode}
        className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-all"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          opacity: generatedCode ? 1 : 0.4,
        }}
      >
        ↓ .html
      </button>

      {/* Meta info */}
      {generationMeta && (
        <div className="flex items-center gap-2 ml-auto">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-mono"
            style={{
              background: "rgba(124, 58, 237, 0.06)",
              color: "var(--accent-purple)",
              border: "1px solid rgba(124, 58, 237, 0.12)",
            }}
          >
            ~{generationMeta.tokens} tokens
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-mono"
            style={{
              background: "rgba(37, 99, 235, 0.06)",
              color: "var(--accent-blue)",
              border: "1px solid rgba(37, 99, 235, 0.12)",
            }}
          >
            {(generationMeta.timeMs / 1000).toFixed(1)}s
          </span>
        </div>
      )}
    </div>
  );
}
