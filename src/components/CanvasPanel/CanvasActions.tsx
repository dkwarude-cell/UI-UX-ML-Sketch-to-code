"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { COLOR_SWATCHES } from "@/lib/constants";
import { useState, useRef } from "react";

interface CanvasActionsProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExportPng: () => void;
  onGenerate: () => void;
  onUploadImage: (file: File) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function CanvasActions({
  onUndo,
  onRedo,
  onClear,
  onExportPng,
  onGenerate,
  onUploadImage,
  canUndo,
  canRedo,
}: CanvasActionsProps) {
  const strokeColor = useAppStore((s) => s.strokeColor);
  const setStrokeColor = useAppStore((s) => s.setStrokeColor);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const [shaking, setShaking] = useState(false);
  const [customColor, setCustomColor] = useState(strokeColor);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
      // Reset input so re-uploading the same file works
      e.target.value = "";
    }
  };

  const handleUndo = () => {
    if (!canUndo) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      return;
    }
    onUndo();
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 p-3 flex flex-col gap-2.5"
      style={{
        background: "linear-gradient(transparent, rgba(255,255,255,0.95) 30%)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Color & Width Row */}
      <div className="flex items-center gap-3 px-1">
        {/* Color Swatches */}
        <div className="flex items-center gap-1.5">
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => {
                setStrokeColor(color);
                setCustomColor(color);
              }}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                background: color,
                border: strokeColor === color ? "2px solid var(--accent-blue)" : "2px solid var(--border)",
                boxShadow: strokeColor === color ? "0 0 0 2px rgba(37,99,235,0.2)" : "none",
              }}
            />
          ))}
          <div className="relative">
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setStrokeColor(e.target.value);
              }}
              className="w-6 h-6 rounded-full cursor-pointer border-0 p-0"
              style={{ appearance: "none", WebkitAppearance: "none" }}
              title="Custom color"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5" style={{ background: "var(--border)" }} />

        {/* Stroke Width */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            {strokeWidth}px
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue) ${((strokeWidth - 1) / 11) * 100}%, var(--border) ${((strokeWidth - 1) / 11) * 100}%, var(--border) 100%)`,
            }}
          />
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <motion.button
            onClick={handleUndo}
            animate={shaking ? { x: [0, -4, 4, -4, 0] } : {}}
            transition={{ duration: 0.3 }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: canUndo ? "var(--text-secondary)" : "var(--text-muted)",
              cursor: canUndo ? "pointer" : "default",
              opacity: canUndo ? 1 : 0.5,
            }}
          >
            ↩ Undo
          </motion.button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: canRedo ? "var(--text-secondary)" : "var(--text-muted)",
              cursor: canRedo ? "pointer" : "default",
              opacity: canRedo ? 1 : 0.5,
            }}
          >
            ↪ Redo
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-red-50"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            ✕ Clear
          </button>
          <button
            onClick={onExportPng}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            ↓ PNG
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-blue-50"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--accent-blue)",
            }}
            title="Upload a JPEG/JPG image"
          >
            📷 Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Generate Button */}
        <motion.button
          onClick={onGenerate}
          disabled={isGenerating}
          whileTap={{ scale: 0.96 }}
          className="px-5 py-2 text-sm font-bold rounded-xl transition-all"
          style={{
            background: isGenerating
              ? "var(--text-muted)"
              : "linear-gradient(135deg, #16A34A, #15803D)",
            color: "#FFFFFF",
            boxShadow: isGenerating
              ? "none"
              : "0 2px 12px rgba(22, 163, 74, 0.3)",
            cursor: isGenerating ? "wait" : "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="inline-block"
              >
                ⟳
              </motion.span>
              Generating...
            </span>
          ) : (
            "Generate Code ▶"
          )}
        </motion.button>
      </div>
    </div>
  );
}
