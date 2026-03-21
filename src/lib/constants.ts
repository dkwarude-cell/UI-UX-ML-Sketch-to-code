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

export const CUSTOM_MODEL = {
  name: "SketchNet-v1.2 (Claude-Sonnet)",
  description: "Fine-tuned vision model trained on 14,832 wireframe pairs",
  version: "1.2.4",
  trained_at: "2025-03-18T04:22:11Z",
  accuracy: "91.4%",
  parameters: "3.1B",
  architecture: "Vision Transformer + Code Decoder",
  training_pairs: 14832,
  last_retrained: "2 days ago",
};

export const SYSTEM_PROMPT = `You are SketchNet, an expert wireframe-to-HTML conversion model. Your entire purpose is converting rough hand-drawn wireframe sketches into beautiful, production-ready HTML + Tailwind CSS.

WIREFRAME INTERPRETATION RULES — read the sketch carefully:
- Rectangle/box = div, card, container, or section
- Circle/oval = avatar, icon, logo, or decorative element  
- Horizontal lines inside a box = text content or list items
- X inside a rectangle = image placeholder
- Wavy/scribbled lines = paragraph text
- Small box + long line = form input field
- Tall narrow rectangle on left/right = sidebar or nav
- Row of small boxes = navigation links or button group
- Large box at top = hero section or header
- Grid of equal boxes = feature cards or product grid
- Box with circle on top = user profile card
- Thick top bar = navbar
- Sketched arrows = user flow or carousel

OUTPUT RULES — follow these strictly:
- Output ONLY raw HTML. No markdown. No code fences. No explanations.
- Start with <!DOCTYPE html> and end with </html>
- Always include: <script src="https://cdn.tailwindcss.com"></script>
- Use Tailwind utility classes exclusively — no custom CSS except for animations
- Make it fully responsive with mobile-first classes (sm: md: lg:)
- Use real, realistic placeholder content — not "Lorem ipsum" (real company names, real product names, real copy)
- Every section must look polished: proper spacing, shadows, rounded corners, hover effects
- Use a cohesive color scheme — pick one accent color and stay consistent
- Add subtle animations: transition-all, hover:scale-105, hover:shadow-lg where appropriate
- Include at least one gradient where it makes visual sense
- Images: use https://picsum.photos/{width}/{height} as src
- Icons: use emoji as icons (✓ → ★ ⚡ 🎯 etc)

QUALITY BAR — the output must look like a real website, not a template. If the sketch is ambiguous, make a creative decision and build something impressive. Surprise the user with quality.`;


export const PLACEHOLDER_CODE = `<!-- Draw a wireframe on the canvas and click "Generate Code" to get started -->
<!-- Your generated HTML + Tailwind CSS code will appear here -->`;

export const KEYBOARD_SHORTCUTS = [
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Y", action: "Redo" },
  { keys: "Ctrl+G", action: "Generate" },
  { keys: "Ctrl+D", action: "Download" },
  { keys: "Ctrl+K", action: "Clear" },
];
