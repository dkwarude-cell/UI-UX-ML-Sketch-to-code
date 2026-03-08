"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { fabric } from "fabric";
import { useAppStore } from "@/store/useAppStore";
import DrawingToolbar from "./DrawingToolbar";
import CanvasActions from "./CanvasActions";
import { useCanvas } from "@/hooks/useCanvas";

export default function CanvasPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    fabricCanvas,
    handleUndo,
    handleRedo,
    handleClear,
    handleExportPng,
    canUndo,
    canRedo,
  } = useCanvas(canvasRef, containerRef);

  const isGenerating = useAppStore((s) => s.isGenerating);
  const setIsGenerating = useAppStore((s) => s.setIsGenerating);
  const setGeneratedCode = useAppStore((s) => s.setGeneratedCode);
  const appendGeneratedCode = useAppStore((s) => s.appendGeneratedCode);
  const setGenerationMeta = useAppStore((s) => s.setGenerationMeta);

  const handleGenerate = useCallback(async () => {
    if (!fabricCanvas.current || isGenerating) return;

    const canvas = fabricCanvas.current;
    const dataUrl = canvas.toDataURL({
      format: "png",
      multiplier: 1,
    });

    // Remove data URL prefix to get pure base64
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

    setIsGenerating(true);
    setGeneratedCode("");
    setGenerationMeta(null);
    const startTime = Date.now();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`API error (${response.status}): ${errBody || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream");

      const decoder = new TextDecoder();
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        appendGeneratedCode(chunk);
        totalTokens += chunk.length;
      }

      // Strip markdown code fences if present
      const currentCode = useAppStore.getState().generatedCode;
      const cleaned = currentCode
        .replace(/^```html\s*\n?/i, '')
        .replace(/^```\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      if (cleaned !== currentCode) {
        setGeneratedCode(cleaned);
      }

      setGenerationMeta({
        tokens: Math.round(totalTokens / 4), // rough token estimate
        timeMs: Date.now() - startTime,
      });
    } catch (error) {
      console.error("Generation error:", error);
      setGeneratedCode(
        `<!-- Error generating code. Check console for details. -->\n<!-- ${error} -->`
      );
    } finally {
      setIsGenerating(false);
    }
  }, [fabricCanvas, isGenerating, setIsGenerating, setGeneratedCode, appendGeneratedCode, setGenerationMeta]);

  // Expose generate function globally for keyboard shortcut
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__sketchGenerate = handleGenerate;
    return () => {
      delete (window as unknown as Record<string, unknown>).__sketchGenerate;
    };
  }, [handleGenerate]);

  const handleUploadImage = useCallback(
    (file: File) => {
      if (!fabricCanvas.current) return;
      const canvas = fabricCanvas.current;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        fabric.Image.fromURL(dataUrl, (img) => {
          // Scale the image to fit the canvas while preserving aspect ratio
          const canvasW = canvas.getWidth();
          const canvasH = canvas.getHeight();
          const imgW = img.width || canvasW;
          const imgH = img.height || canvasH;
          const scale = Math.min(canvasW / imgW, canvasH / imgH, 1);

          img.set({
            left: (canvasW - imgW * scale) / 2,
            top: (canvasH - imgH * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            selectable: true,
          });

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
    },
    [fabricCanvas]
  );

  return (
    <motion.div
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0, ease: "easeOut" }}
      className="flex flex-col h-full"
      style={{ background: "var(--bg-panel)" }}
    >
      {/* Panel Header */}
      <div
        className="h-8 flex items-center px-4 text-xs font-semibold shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          color: "var(--text-secondary)",
          background: "var(--bg-surface)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <span className="mr-2" style={{ color: "var(--accent-blue)" }}>●</span>
        Drawing Canvas
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <canvas ref={canvasRef} />
        <DrawingToolbar />
        <CanvasActions
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onExportPng={handleExportPng}
          onGenerate={handleGenerate}
          onUploadImage={handleUploadImage}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>
    </motion.div>
  );
}
