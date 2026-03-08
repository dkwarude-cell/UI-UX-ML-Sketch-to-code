"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { ToolId } from "@/lib/constants";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            useAppStore.getState().undo();
            break;
          case "y":
            e.preventDefault();
            useAppStore.getState().redo();
            break;
          case "g":
            e.preventDefault();
            // Trigger generate via global function
            const gen = (window as unknown as Record<string, unknown>).__sketchGenerate;
            if (typeof gen === "function") gen();
            break;
          case "d":
            e.preventDefault();
            // Trigger download
            const code = useAppStore.getState().generatedCode;
            if (code) {
              const blob = new Blob([code], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "generated-ui.html";
              a.click();
              URL.revokeObjectURL(url);
            }
            break;
          case "k":
            e.preventDefault();
            // Clear canvas via global function
            const clr = (window as unknown as Record<string, unknown>).__sketchClear;
            if (typeof clr === "function") clr();
            break;
        }
      } else {
        // Single key shortcuts for tools
        const toolMap: Record<string, ToolId> = {
          p: "pen",
          r: "rect",
          c: "circle",
          t: "text",
          e: "eraser",
          l: "line",
        };

        const tool = toolMap[e.key.toLowerCase()];
        if (tool) {
          useAppStore.getState().setActiveTool(tool);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
