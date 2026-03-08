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
  "#1A1D23",
  "#2563EB",
  "#16A34A",
  "#EF4444",
  "#F59E0B",
];

export const DEVICE_VIEWS = [
  { id: "desktop" as const, label: "Desktop", icon: "🖥️", width: "100%" },
  { id: "tablet" as const, label: "Tablet", icon: "💻", width: "768px" },
  { id: "mobile" as const, label: "Mobile", icon: "📱", width: "375px" },
] as const;

export type DeviceView = (typeof DEVICE_VIEWS)[number]["id"];

export const MAX_HISTORY = 50;

export const SYSTEM_PROMPT = `You are an expert frontend developer. The user will send you a hand-drawn UI wireframe sketch.
Analyze the layout carefully — identify all UI regions, boxes, text labels, buttons, forms,
navigation bars, cards, and other components visible in the sketch.
Generate a complete, semantic HTML document with embedded Tailwind CSS (via CDN <script src="https://cdn.tailwindcss.com"></script>) that faithfully
reproduces the layout shown in the sketch. Use placeholder text and placeholder images (via https://placehold.co) where needed.
IMPORTANT: Return ONLY the raw HTML code starting with <!DOCTYPE html>. Do NOT wrap in markdown code fences. Do NOT include any explanation or commentary. Just the pure HTML.`;

export const PLACEHOLDER_CODE = `<!-- Draw a wireframe on the canvas and click "Generate Code" to get started -->
<!-- Your generated HTML + Tailwind CSS code will appear here -->`;

export const KEYBOARD_SHORTCUTS = [
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Y", action: "Redo" },
  { keys: "Ctrl+G", action: "Generate" },
  { keys: "Ctrl+D", action: "Download" },
  { keys: "Ctrl+K", action: "Clear" },
];
