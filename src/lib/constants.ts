export const TOOLS = [
  { id: "pen" as const, label: "Pen", icon: "✏️", shortcut: "P" },
  { id: "rect" as const, label: "Rectangle", icon: "□", shortcut: "R" },
  { id: "circle" as const, label: "Circle", icon: "○", shortcut: "C" },
  { id: "line" as const, label: "Line", icon: "╱", shortcut: "L" },
  { id: "text" as const, label: "Text", icon: "T", shortcut: "T" },
  { id: "eraser" as const, label: "Eraser", icon: "⌫", shortcut: "E" },
] as const;

export type ToolId = (typeof TOOLS)[number]["id"];

export const COLOR_SWATCHES = [
  "#0F172A", // graphite
  "#1D4ED8", // cobalt
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // vermillion
  "#9333EA", // violet
  "#14B8A6", // teal
  "#3B82F6", // azure
  "#F97316", // orange
  "#FFFFFF", // white ink
];

export const DEVICE_VIEWS = [
  { id: "desktop" as const, label: "Desktop", icon: "🖥️", width: "100%" },
  { id: "tablet" as const, label: "Tablet", icon: "💻", width: "768px" },
  { id: "mobile" as const, label: "Mobile", icon: "📱", width: "375px" },
] as const;

export type DeviceView = (typeof DEVICE_VIEWS)[number]["id"];

export const MAX_HISTORY = 50;

export const SYSTEM_PROMPT = `You are an expert frontend developer. The user sends a hand-drawn UI wireframe sketch (image).
Produce HTML + Tailwind that LITERALLY mirrors what is visible—no extra UI, no stock dashboards.

Hard rules:
- Reconstruct only what you see. Do NOT add navs/cards/buttons unless present.
- Preserve relative positions, sizes, and aspect ratios. If the sketch has a rectangle with a circle centered inside, render exactly that: an outlined rectangle with margins similar to the sketch and a centered outlined circle inside it. Do not collapse shapes into bars.
- Use thin neutral strokes (#0f172a / #111827) on white background unless color is clearly shown.
- If text is blank, omit it; if a region is empty, leave it empty.
- Tailwind via CDN (<script src="https://cdn.tailwindcss.com"></script>).
- Return ONLY raw HTML starting with <!DOCTYPE html>; no markdown fences or explanations.

Few-shot style guidance (fidelity first):
Sketch: single circle centered on the page → HTML: full-page flex with one outlined circle centered; nothing else.
Sketch: a rectangle with a centered ellipse inside → HTML: a container with an outlined rectangle sized to ~70% viewport width, and an outlined ellipse centered within it; no extra elements.`;

export const PLACEHOLDER_CODE = `<!-- Draw a wireframe on the canvas and click "Generate Code" to get started -->
<!-- Your generated HTML + Tailwind CSS code will appear here -->`;

export const KEYBOARD_SHORTCUTS = [
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Y", action: "Redo" },
  { keys: "Ctrl+G", action: "Generate" },
  { keys: "Ctrl+D", action: "Download" },
  { keys: "Ctrl+K", action: "Clear" },
];
