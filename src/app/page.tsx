"use client";

import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  Panel,
  Group,
  Separator,
} from "react-resizable-panels";
import { useEffect, useState, memo } from "react";

// Dynamic imports to avoid SSR issues with Fabric.js and Monaco
const CanvasPanelBase = dynamic(
  () => import("@/components/CanvasPanel"),
  { ssr: false }
);
const CodePanelBase = dynamic(
  () => import("@/components/CodePanel"),
  { ssr: false }
);
const PreviewPanelBase = dynamic(
  () => import("@/components/PreviewPanel"),
  { ssr: false }
);

const CanvasPanel = memo(CanvasPanelBase);
const CodePanel = memo(CodePanelBase);
const PreviewPanel = memo(PreviewPanelBase);

export default function Home() {
  useKeyboardShortcuts();
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"draw" | "code" | "preview">("draw");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mobile tabbed layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col" style={{ background: "var(--bg-app)" }}>
        <AppHeader />
        {/* Tabs */}
        <div
          className="flex shrink-0"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-panel)",
          }}
        >
          {(["draw", "code", "preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-xs font-semibold capitalize transition-all"
              style={{
                color: activeTab === tab ? "var(--accent-blue)" : "var(--text-muted)",
                borderBottom: activeTab === tab ? "2px solid var(--accent-blue)" : "2px solid transparent",
                background: activeTab === tab ? "rgba(37, 99, 235, 0.04)" : "transparent",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {tab === "draw" && "✏️ "}
              {tab === "code" && "⟨⟩ "}
              {tab === "preview" && "🖥️ "}
              {tab}
            </button>
          ))}
        </div>
        {/* Active Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "draw" && <CanvasPanel />}
          {activeTab === "code" && <CodePanel />}
          {activeTab === "preview" && <PreviewPanel />}
        </div>
      </div>
    );
  }

  // Desktop three-panel layout
  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-app)" }}>
      <AppHeader />
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* Panel 1 - Drawing Canvas */}
          <Panel defaultSize={35} minSize={20}>
            <CanvasPanel />
          </Panel>

          <Separator
            className="w-1 transition-colors duration-150 hover:bg-blue-500 active:bg-blue-500"
            style={{ background: "var(--border)" }}
          />

          {/* Panel 2 - Code Editor */}
          <Panel defaultSize={35} minSize={20}>
            <CodePanel />
          </Panel>

          <Separator
            className="w-1 transition-colors duration-150 hover:bg-blue-500 active:bg-blue-500"
            style={{ background: "var(--border)" }}
          />

          {/* Panel 3 - Live Preview */}
          <Panel defaultSize={30} minSize={15}>
            <PreviewPanel />
          </Panel>
        </Group>
      </div>
    </div>
  );
}
