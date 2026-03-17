# Architecture Documentation

Comprehensive technical architecture and design patterns for SketchToCode.

## Table of Contents

- [System Overview](#system-overview)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Component Hierarchy](#component-hierarchy)

---

## System Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SketchToCode Application                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌────────────────────┐               │
│  │   Drawing        │  │   Generated Code   │               │
│  │   Canvas         │  │   Editor           │               │
│  │  (Fabric.js)     │  │  (Monaco)          │               │
│  └────────┬─────────┘  └────────┬───────────┘               │
│           │                      │                           │
│           ├──────────┬───────────┤                           │
│           │          │           │                           │
│           ▼          ▼           ▼                           │
│  ┌────────────────────────────────────────┐                 │
│  │      Zustand State Management          │                 │
│  │  (useAppStore)                         │                 │
│  │  - Canvas history                      │                 │
│  │  - Generated code                      │                 │
│  │  - UI state (tools, colors)            │                 │
│  └────────────┬─────────────────────────────┘               │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────┐                 │
│  │      API Layer                         │                 │
│  │  POST /api/generate                    │                 │
│  │  - Image → Base64                      │                 │
│  │  - Streaming response                  │                 │
│  └────────────┬─────────────────────────────┘               │
│               │                                              │
└───────────────┼──────────────────────────────────────────────┘
                │
       ┌────────▼────────┐
       │  OpenRouter     │
       │  Gemini 2.5     │
       │  Flash API      │
       │  (Claude Vision)│
       └─────────────────┘
```

---

## Frontend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 | Server-side rendering, routing |
| **UI Library** | React 19 | Component composition |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Canvas** | Fabric.js | Drawing and shape manipulation |
| **Code Editor** | Monaco Editor | Syntax highlighting, code display |
| **Animations** | Framer Motion | Smooth UI transitions |
| **State** | Zustand | Client-side state management |
| **Type Safety** | TypeScript | Static type checking |

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── generate/
│   │       └── route.ts         # Server-side API endpoint
│   ├── page.tsx                 # Main app page (/  route)
│   ├── layout.tsx               # Root layout wrapper
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── Canvas.tsx               # Drawing canvas wrapper
│   ├── Toolbar.tsx              # Tool selector, colors, width
│   ├── CodeEditor.tsx           # Monaco editor wrapper
│   ├── Preview.tsx              # Live preview iframe
│   ├── DeviceToggle.tsx         # Device view switcher
│   ├── AppHeader.tsx            # Header with title
│   └── ...                      # Other UI components
│
├── hooks/                        # Custom React hooks
│   ├── useCanvas.ts             # Canvas initialization & events
│   ├── useGenerate.ts           # Code generation logic
│   ├── useKeyboardShortcuts.ts # Keyboard event handling
│   └── ...                      # Other hooks
│
├── store/
│   └── useAppStore.ts           # Zustand state management
│
├── lib/
│   ├── constants.ts             # App configuration
│   └── utils.ts                 # Utility functions
│
└── styles/
    └── (Tailwind CSS config)
```

### Core Concepts

#### Component Model

Components follow React best practices:
- Functional components with hooks
- Props for data flow
- Custom hooks for logic reuse
- Proper key management in lists

**Example:**
```typescript
// components/Canvas.tsx
export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeTool } = useAppStore();
  
  useCanvas(canvasRef, activeTool);
  
  return <canvas ref={canvasRef} />;
}
```

#### Hook Organization

1. **useCanvas** - Handles Fabric.js setup and drawing
2. **useGenerate** - API calls and streaming response
3. **useKeyboardShortcuts** - Global keyboard event handling
4. **useAppStore** - Zustand store selector

---

## Backend Architecture

### Next.js Server

**Framework:** Next.js 14 with App Router

**Route Structure:**
```
/                    → Main App (page.tsx)
/api/generate        → Code generation endpoint
```

### Code Generation Endpoint

**File:** `/src/app/api/generate/route.ts`

**Flow:**
```
1. Receive POST request with base64 image
2. Validate API key exists
3. Initialize OpenRouter client
4. Send image + prompt to Gemini Vision API
5. Stream response back to client
6. Handle errors gracefully
```

**Key Features:**
- Streaming response for real-time display
- Error handling for missing credentials
- Token management (max_tokens = 2048)
- Proper HTTP status codes

```typescript
export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) return new Response("Missing image", { status: 400 });
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return new Response("API key missing", { status: 500 });
    
    // Call OpenRouter API with streaming
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 2048,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [
            { type: "image_url", image_url: { url: `data:image/png;base64,${image}` } },
            { type: "text", text: "Convert this sketch to HTML/Tailwind CSS" }
          ]}
        ]
      })
    });
    
    // Return streaming response
    return new Response(response.body, { status: 200 });
  } catch (error) {
    return new Response(`Error: ${error}`, { status: 500 });
  }
}
```

---

## Data Flow

### User Draws Sketch

```
Canvas Draw Event
    ↓
Fabric.js captures strokes
    ↓
useCanvas hook calls canvas.toDataURL()
    ↓
Data stored in memory (not persisted)
```

### Generate Code Flow

```
User clicks "Generate" button
    ↓
useGenerate hook triggered
    ↓
Convert canvas to PNG base64
    ↓
POST /api/generate {image: base64}
    ↓
Server: Send image to OpenRouter API
    ↓
OpenRouter: Run Gemini Vision model
    ↓
Stream HTML chunks back to client
    ↓
Client: Append chunks to state
    ↓
Monaco editor + preview update in real-time
```

### State Update Flow

```
User Action (draw, tool change, etc)
    ↓
Component event handler triggered
    ↓
Zustand store action called
    ↓
State updated atomically
    ↓
React re-renders affected components
    ↓
UI reflects new state immediately
```

---

## State Management

### Zustand Store Structure

**File:** `/src/store/useAppStore.ts`

```typescript
interface AppState {
  // Drawing state
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
  
  // Preview
  deviceView: DeviceView;
  
  // Actions
  setActiveTool: (tool: ToolId) => void;
  appendGeneratedCode: (chunk: string) => void;
  pushHistory: (json: string) => void;
  undo: () => string | null;
  // ... more actions
}
```

### Why Zustand?

✅ **Lightweight** - No boilerplate vs Redux
✅ **Performant** - Atomic updates, no unnecessary re-renders
✅ **Flexible** - Middleware support
✅ **TypeScript** - Great type inference
✅ **DevTools** - Built-in debugging

### Usage Pattern

```typescript
// In a component
function MyComponent() {
  const activeTool = useAppStore((s) => s.activeTool);
  const setActiveTool = useAppStore((s) => s.setActiveTool);
  
  return (
    <button onClick={() => setActiveTool("pen")}>
      Current tool: {activeTool}
    </button>
  );
}
```

---

## Component Hierarchy

### Main Layout

```
App (page.tsx)
├── Header
│   └── Title & Version
├── Main Content (flex layout)
│   ├── Left Panel (Canvas)
│   │   ├── Canvas Component
│   │   │   └── Toolbar
│   │   │       ├── Tool Buttons
│   │   │       ├── Color Picker
│   │   │       └── Line Width Slider
│   │   └── Keyboard Shortcuts Help
│   │
│   ├── Resize Handle (draggable divider)
│   │
│   ├── Middle Panel (Code Editor)
│   │   └── Monaco Editor
│   │       └── Generated HTML/CSS
│   │
│   ├── Resize Handle (draggable divider)
│   │
│   └── Right Panel (Preview)
│       ├── Device View Toggle
│       │   ├── Desktop
│       │   ├── Tablet
│       │   └── Mobile
│       └── Preview iframe
│           └── Rendered HTML
│
└── Status Bar
    ├── Generation Status
    └── Token Count
```

### Component Dependencies

```
Canvas → useCanvas hook
  ├── Fabric.js initialization
  ├── Event listeners
  └── Canvas state updates

CodeEditor → Monaco.Editor
  ├── Syntax highlighting
  ├── Read-only display
  └── Selection support

Preview → useGenerate hook
  ├── API calls
  ├── Streaming response
  └── iframe rendering

Toolbar → useAppStore
  ├── Tool selection
  ├── Color picker
  └── Line width control
```

---

## Key Libraries Deep Dive

### Fabric.js

Used for canvas drawing and shape manipulation.

**Features:**
- Free-form drawing (pen)
- Shapes: rectangle, circle, line
- Text annotations
- Undo/redo stack
- Canvas serialization (JSON/PNG)

```typescript
const canvas = new fabric.Canvas("sketchCanvas", {
  width: 1200,
  height: 600,
  backgroundColor: "#ffffff",
  isDrawingMode: true,
});

canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
canvas.freeDrawingBrush.color = "#000";
canvas.freeDrawingBrush.width = 2;
```

### Monaco Editor

Provides VS Code-like code editing experience.

**Features:**
- Syntax highlighting (HTML/CSS/JavaScript)
- Line numbers & minimap
- Code folding
- Read-only support
- Language intelligence

```typescript
<Editor
  theme="vs-light"
  language="html"
  value={generatedCode}
  options={{
    readOnly: true,
    minimap: { enabled: true },
    wordWrap: "on",
  }}
/>
```

### Framer Motion

Smooth animations and transitions.

**Uses:**
- Panel resize animations
- Tool selection feedback
- Code reveal animations
- Device toggle transitions

```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  {generatedCode}
</motion.div>
```

---

## Performance Optimizations

### 1. Code Splitting

Next.js automatically code-splits at route level.

### 2. Image Optimization

Canvas images converted to PNG for API efficiency.

### 3. Memoization

```typescript
const MyComponent = memo(function MyComponent(props) {
  // Only re-renders if props change
});
```

### 4. Lazy Loading

Monaco Editor loaded on demand:
```typescript
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div>Loading editor...</div>
});
```

### 5. Canvas History Limit

Max 50 undo states to prevent memory bloat:
```typescript
const MAX_HISTORY = 50;
```

---

## Security Considerations

### 1. API Key Management

- Keys stored in `.env.local` (not committed to repo)
- Never exposed to client-side code
- Used only server-side in `/api/generate`

### 2. Image Validation

- Check image exists and is not oversized
- Validate base64 encoding
- Sanitize model responses before rendering

### 3. Content Security Policy

Consider adding in `next.config.js`:
```javascript
headers: [
  {
    key: "Content-Security-Policy",
    value: "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com"
  }
]
```

### 4. CORS

Currently open for localhost. In production:
```typescript
headers: {
  "Access-Control-Allow-Origin": "your-domain.com"
}
```

---

## Error Handling Strategy

### UI Layer
- Try-catch wrapping API calls
- User-friendly error messages
- Retry mechanisms for transient failures

### API Layer
- Proper HTTP status codes
- Descriptive error messages
- Graceful degradation

### Monitoring
- Error logging (optional)
- Performance metrics
- User analytics

---

## Scalability Considerations

### Current Limitations
- Single canvas instance per session
- No database persistence
- No user accounts
- Streaming limited to 60 seconds

### Future Improvements
- User authentication & history
- Cloud storage for sketches
- Collaborative editing
- Batch processing
- Custom model deployment
- Rate limiting per user

---

## Testing Strategy

### Unit Tests
Test individual hooks and utilities:
```typescript
test('useGenerate appends chunks correctly', () => {
  // Test streaming response handling
});
```

### Integration Tests
Test component interactions:
```typescript
test('canvas → generate → preview workflow', () => {
  // Test full flow
});
```

### E2E Tests
Test complete user workflows with Cypress/Playwright.

---

## Deployment Architecture

### Development
- Local Next.js dev server
- Hot module reloading
- Source maps for debugging

### Production
- Next.js build & export (static optimization)
- Edge deployment (Vercel, Netlify)
- CDN for assets
- Serverless functions for API

See [DEPLOYMENT.md](./DEPLOYMENT.md) for details.

---

## Monitoring & Observability

### Metrics to Track
- API response times
- Code generation success rate
- Token usage
- User engagement
- Error rates

### Tools
- Sentry (error tracking)
- PostHog (analytics)
- CloudFlare (performance)

---

## Summary

SketchToCode uses a **modern, scalable React architecture** with:
- ✅ Component-driven UI
- ✅ Centralized state management
- ✅ Server-side API integration
- ✅ Streaming response handling
- ✅ Type-safe with TypeScript
- ✅ Production-ready patterns

The architecture is designed for **extensibility** — adding features like image upload, collaboration, or model switching is straightforward.
