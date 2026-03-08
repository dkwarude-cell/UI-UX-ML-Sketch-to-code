"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

export function useGenerate() {
  const setIsGenerating = useAppStore((s) => s.setIsGenerating);
  const setGeneratedCode = useAppStore((s) => s.setGeneratedCode);
  const appendGeneratedCode = useAppStore((s) => s.appendGeneratedCode);
  const setGenerationMeta = useAppStore((s) => s.setGenerationMeta);
  const isGenerating = useAppStore((s) => s.isGenerating);

  const generate = useCallback(
    async (base64Image: string) => {
      if (isGenerating) return;

      setIsGenerating(true);
      setGeneratedCode("");
      setGenerationMeta(null);
      const startTime = Date.now();

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API error: ${response.status} - ${errText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No readable stream");

        const decoder = new TextDecoder();
        let totalChars = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          appendGeneratedCode(chunk);
          totalChars += chunk.length;
        }

        setGenerationMeta({
          tokens: Math.round(totalChars / 4),
          timeMs: Date.now() - startTime,
        });
      } catch (error) {
        console.error("Generation error:", error);
        setGeneratedCode(
          `<!-- Error: ${error instanceof Error ? error.message : "Unknown error"} -->\n<!-- Ensure ANTHROPIC_API_KEY is set in .env.local -->`
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, setIsGenerating, setGeneratedCode, appendGeneratedCode, setGenerationMeta]
  );

  return { generate, isGenerating };
}
