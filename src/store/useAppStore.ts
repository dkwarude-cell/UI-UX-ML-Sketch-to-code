import { create } from "zustand";
import type { ToolId, DeviceView } from "@/lib/constants";

interface GenerationMeta {
  tokens: number;
  timeMs: number;
}

interface AppState {
  // Drawing tools
  activeTool: ToolId;
  strokeColor: string;
  strokeWidth: number;

  // Canvas history
  canvasHistory: string[];
  historyIndex: number;

  // Code generation
  generatedCode: string;
  isGenerating: boolean;
  generationMeta: GenerationMeta | null;
  generationId: string | null;

  // Preview
  deviceView: DeviceView;

  // Actions
  setActiveTool: (tool: ToolId) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setGeneratedCode: (code: string) => void;
  appendGeneratedCode: (chunk: string) => void;
  setIsGenerating: (val: boolean) => void;
  setGenerationMeta: (meta: GenerationMeta | null) => void;
  setGenerationId: (id: string | null) => void;
  setDeviceView: (view: DeviceView) => void;

  // History actions
  pushHistory: (json: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clearHistory: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTool: "pen",
  strokeColor: "#1A1D23",
  strokeWidth: 2,

  canvasHistory: [],
  historyIndex: -1,

  generatedCode: "",
  isGenerating: false,
  generationMeta: null,
  generationId: null,

  deviceView: "desktop",

  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
  appendGeneratedCode: (chunk) =>
    set((state) => ({ generatedCode: state.generatedCode + chunk })),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setGenerationMeta: (meta) => set({ generationMeta: meta }),
  setGenerationId: (id) => set({ generationId: id }),
  setDeviceView: (view) => set({ deviceView: view }),

  pushHistory: (json) => {
    const { canvasHistory, historyIndex } = get();
    // Truncate any forward history
    const newHistory = canvasHistory.slice(0, historyIndex + 1);
    newHistory.push(json);
    // Enforce max history
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({
      canvasHistory: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { historyIndex, canvasHistory } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return canvasHistory[newIndex];
  },

  redo: () => {
    const { historyIndex, canvasHistory } = get();
    if (historyIndex >= canvasHistory.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return canvasHistory[newIndex];
  },

  clearHistory: () => set({ canvasHistory: [], historyIndex: -1 }),
}));
