# SketchToCode

> **Draw a wireframe on a canvas → AI generates production-ready HTML + Tailwind CSS in seconds.**

Transform your UI sketches into fully functional HTML code powered by AI vision. Perfect for rapid prototyping, design handoffs, and accelerating frontend development.

![SketchToCode Features](./docs/assets/features.png)

## 🚀 Features

- **✏️ Drawing Canvas** — Pen, Rectangle, Circle, Line, Text, and Eraser tools powered by Fabric.js
- **🤖 AI Code Generation** — OpenRouter/Gemini analyzes your sketch and generates semantic HTML + Tailwind CSS
- **💻 Monaco Code Editor** — Full VS Code-like experience with syntax highlighting and streaming output
- **👁️ Live Preview** — Real-time iframe preview with Desktop / Tablet / Mobile responsive views
- **🎨 Responsive Design** — Draggable panel dividers to customize your workspace
- **⌨️ Keyboard Shortcuts** — Ctrl+Z (undo), Ctrl+G (generate), Ctrl+D (download), and more
- **🎯 Clean UI** — Professional light interface optimized for readability and workflow

## 📋 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend Framework** | Next.js 14 (App Router) |
| **React & UI** | React 19 + TypeScript |
| **Canvas Drawing** | Fabric.js v5 |
| **Code Editor** | Monaco Editor (VS Code) |
| **Animations** | Framer Motion |
| **Layout** | react-resizable-panels |
| **State Management** | Zustand |
| **AI/LLM** | OpenRouter API (Gemini 2.5 Flash) |
| **Styling** | Tailwind CSS 3 |
| **Dev Tools** | ESLint 9, TypeScript 5 |

## 📦 Prerequisites

- Node.js 18+ or 20+
- npm 9+ or you can use yarn/pnpm
- An OpenRouter API key (free tier available)

## 🎯 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code.git
cd UI-UX-ML-Sketch-to-code
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

> **Note:** React 19 and Next.js 14 have minor peer dependency conflicts, so we use `--legacy-peer-deps`.

### 3. Configure API Key

Create `.env.local` in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-your_api_key_here
```

Get your free API key: [OpenRouter](https://openrouter.ai/)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── generate/route.ts      # AI code generation API endpoint
│   ├── page.tsx                   # Main application page
│   └── layout.tsx                 # Root layout
├── components/
│   ├── Canvas.tsx                 # Fabric.js drawing canvas
│   ├── Toolbar.tsx                # Drawing tools, colors, line width
│   ├── CodeEditor.tsx             # Monaco editor for generated code
│   ├── Preview.tsx                # Live preview iframe
│   ├── DeviceToggle.tsx            # Device view switcher
│   └── ...other components
├── hooks/
│   ├── useCanvas.ts               # Canvas interaction logic
│   ├── useGenerate.ts             # Code generation hook
│   ├── useKeyboardShortcuts.ts    # Keyboard shortcut handler
│   └── ...other hooks
├── store/
│   └── useAppStore.ts             # Zustand state management
├── lib/
│   └── constants.ts               # UI tools, colors, device views, prompts
└── styles/
    └── globals.css                # Global styles & Tailwind setup
```

## 🎨 Main Components

### Canvas
Interactive drawing surface using Fabric.js. Supports:
- Free-form drawing (pen)
- Shapes (rectangle, circle, line)
- Text annotations
- Eraser tool with adjustment
- Undo/Redo history (50-item limit)

### Code Generation
Powered by OpenRouter's Gemini 2.5 Flash model:
- Analyzes hand-drawn sketches via vision API
- Generates semantic HTML + Tailwind CSS
- Streams response for real-time display
- Token usage tracking

### Live Preview
Real-time HTML preview with:
- Responsive device views (Desktop, Tablet, Mobile)
- Isolated iframe (no style conflicts)
- Error handling for malformed HTML

### Monaco Code Editor
VS Code-like editor with:
- Syntax highlighting (HTML/CSS)
- Read-only display of generated code
- Copy-to-clipboard functionality
- Line numbers and minimap

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
# OpenRouter API Key (required)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Optional: Custom model (defaults to google/gemini-2.5-flash)
# NEXT_PUBLIC_AI_MODEL=google/gemini-2.5-flash
```

### Canvas Configuration

Adjust in `src/lib/constants.ts`:

```typescript
export const TOOLS = [
  { id: "pen", label: "Pen", icon: "✏️", shortcut: "P" },
  // ... more tools
];

export const COLOR_SWATCHES = ["#1A1D23", "#2563EB", /* ... */];
export const MAX_HISTORY = 50; // Undo history limit
```

### AI Prompt

Customize the system prompt in `src/lib/constants.ts`:

```typescript
export const SYSTEM_PROMPT = `You are an expert frontend developer...`;
```

## 📡 API Endpoints

### POST `/api/generate`

Generates HTML + CSS code from a sketch image.

**Request:**
```json
{
  "image": "base64_encoded_png_image"
}
```

**Response:**
Streams HTML/CSS code as Server-Sent Events.

**Error Codes:**
- `400` - Missing image data
- `500` - API key not configured
- `402` - Insufficient API credits

See [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for detailed specs.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `P` | Activate Pen tool |
| `R` | Activate Rectangle tool |
| `C` | Activate Circle tool |
| `L` | Activate Line tool |
| `T` | Activate Text tool |
| `E` | Activate Eraser tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+G` | Generate code |
| `Ctrl+D` | Download HTML file |
| `Ctrl+K` | Clear canvas |
| `?` | Show help |

## 🚀 Building for Production

### 1. Build

```bash
npm run build
```

### 2. Test Production Build

```bash
npm run start
```

### 3. Deploy

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment guides for:
- Vercel (recommended)
- Docker
- AWS, GCP, Azure
- Self-hosted

## 🐛 Troubleshooting

- **"OPENROUTER_API_KEY not configured"** → Add your API key to `.env.local`
- **"API error 402: Low credits"** → Reduce `max_tokens` in `/api/generate/route.ts` or add credits
- **Canvas freezes** → Clear history with Ctrl+K or refresh the page
- **Generated code doesn't render** → Check browser console for HTML parsing errors

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for more solutions.

## 🏗️ Architecture

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for:
- Data flow diagrams
- Component hierarchy
- State management details
- API integration patterns

## 👨‍💻 Development

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint -- --fix
```

### Type Checking

```bash
# Check TypeScript
npx tsc --noEmit
```

## 📚 Contributing

We welcome contributions! See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Pull request process
- Issue templates

## 📄 License

MIT License - feel free to use this in your projects!

## 🤝 Support

- **Issues:** [GitHub Issues](https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code/discussions)
- **Documentation:** See `/docs` folder

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Fabric.js API](http://fabricjs.com/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/docs.html)

## 🗺️ Roadmap

- [ ] Image upload support (instead of drawing only)
- [ ] Component extraction and reusable libraries
- [ ] Design system integration
- [ ] Collaborative real-time editing
- [ ] Mobile app (React Native)
- [ ] Custom LLM model support
- [ ] Batch code generation

