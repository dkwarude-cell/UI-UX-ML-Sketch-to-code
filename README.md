# SketchToCode

> Draw a wireframe on a canvas → AI generates production-ready HTML + Tailwind CSS in seconds.

![SketchToCode Screenshot](./screenshot-placeholder.png)

## Features

- **Drawing Canvas** — Pen, Rectangle, Circle, Line, Text, and Eraser tools powered by Fabric.js
- **AI Code Generation** — Claude Vision API analyzes your sketch and generates semantic HTML + Tailwind CSS
- **Monaco Code Editor** — Full VS Code editor experience with syntax highlighting and streaming output
- **Live Preview** — Real-time iframe preview with Desktop / Tablet / Mobile device toggles
- **Resizable Panels** — Drag panel dividers to customize your workspace
- **Keyboard Shortcuts** — Ctrl+Z (undo), Ctrl+G (generate), Ctrl+D (download), and more
- **Light Theme UI** — Clean, professional light interface optimized for readability

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Fabric.js v5** (canvas drawing)
- **Monaco Editor** (code display)
- **Framer Motion** (animations)
- **react-resizable-panels** (panel layout)
- **Zustand** (state management)
- **Anthropic Claude API** (AI code generation)
- **Tailwind CSS** (styling)

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd sketch-to-code
npm install
```

### 2. Add your API Key

Copy `.env.example` to `.env.local` and add your Anthropic API key:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Keyboard Shortcuts

| Shortcut       | Action         |
| -------------- | -------------- |
| `Ctrl/Cmd + Z` | Undo           |
| `Ctrl/Cmd + Y` | Redo           |
| `Ctrl/Cmd + G` | Generate Code  |
| `Ctrl/Cmd + D` | Download HTML  |
| `Ctrl/Cmd + K` | Clear Canvas   |
| `P`            | Pen tool       |
| `R`            | Rectangle tool |
| `C`            | Circle tool    |
| `L`            | Line tool      |
| `T`            | Text tool      |
| `E`            | Eraser         |

## Deploy on Vercel

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` in **Settings → Environment Variables**
4. Deploy!

## License

MIT
