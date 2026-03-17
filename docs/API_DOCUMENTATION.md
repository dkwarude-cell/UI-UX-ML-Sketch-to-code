# API Documentation

Complete reference for SketchToCode API endpoints and integrations.

## Table of Contents

- [Code Generation API](#code-generation-api)
- [AI Model Configuration](#ai-model-configuration)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

---

## Code Generation API

### Endpoint

```
POST /api/generate
```

### Description

Converts a hand-drawn sketch image into production-ready HTML + Tailwind CSS code.

### Authentication

Uses OpenRouter API key from environment variable:
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### Request

#### Headers
```http
Content-Type: application/json
```

#### Body

```json
{
  "image": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | Yes | Base64-encoded PNG image of the sketch (max 20MB after encoding) |

#### Image Requirements

- **Format:** PNG (recommended) or JPEG
- **Dimensions:** 
  - Minimum: 256×256 pixels
  - Recommended: 1024×768 or higher
  - Maximum: 4096×4096 pixels
- **Size:** Max 20MB after base64 encoding (~15MB original)
- **Color Depth:** RGB or RGBA

### Response

#### Streaming Response

The endpoint returns a **streamed response** (SSE) containing generated HTML/CSS code:

```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked

<!DOCTYPE html>
<html lang="en">
...
```

#### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Cache-Control: no-cache
Transfer-Encoding: chunked
```

#### Response Body

Complete HTML document including:
- `<!DOCTYPE html>` declaration
- `<html>` root element
- `<head>` with Tailwind CSS CDN
- `<body>` with semantic HTML structure
- Embedded Tailwind CSS classes
- `<style>` tag with custom styles if needed

**Important:** The response is **streaming**. Code appears progressively in real-time.

### Timing

| Metric | Value |
|--------|-------|
| Average Response Time | 2-8 seconds |
| Min Response Time | 1 second |
| Max Response Time | 30 seconds |
| Timeout | 60 seconds |

### Error Responses

#### 400 Bad Request

Missing required image data:

```json
{
  "error": "Missing image data",
  "status": 400
}
```

#### 402 Payment Required

Insufficient API credits:

```json
{
  "error": "API Error (402): This request requires more credits...",
  "status": 402
}
```

**Solution:** Reduce `max_tokens` in `/src/app/api/generate/route.ts` or add credits at [OpenRouter](https://openrouter.ai/settings/keys).

#### 500 Internal Server Error

API key not configured:

```
OPENROUTER_API_KEY not configured in .env.local
```

**Solution:** Add your API key to `.env.local`

#### 429 Too Many Requests

Rate limit exceeded:

```json
{
  "error": "Rate limit exceeded. Try again later.",
  "status": 429,
  "retryAfter": 60
}
```

---

## AI Model Configuration

### Default Model

```
Model: google/gemini-2.5-flash
Provider: Google via OpenRouter
Vision: Yes (analyzes sketch images)
```

### Customizing the Model

Edit `/src/app/api/generate/route.ts`:

```typescript
const openRouterResponse = await fetch(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    // ... other options
    body: JSON.stringify({
      model: "google/gemini-2.5-flash", // ← Change this
      max_tokens: 2048,
      // ...
    }),
  }
);
```

### Recommended Models

| Model | Provider | Speed | Cost | Quality |
|-------|----------|-------|------|---------|
| `google/gemini-2.5-flash` | Google | ⚡ Fast | 💰 Low | ⭐⭐⭐⭐ |
| `openai/gpt-4-vision` | OpenAI | 🐢 Slow | 💸 High | ⭐⭐⭐⭐⭐ |
| `claude-3-vision` | Anthropic | ⚡ Medium | 💰 Medium | ⭐⭐⭐⭐⭐ |
| `meta/llama-3-vision` | Meta | ⚡ Fast | 💰 Low | ⭐⭐⭐ |

Explore all models: [OpenRouter Models](https://openrouter.ai/models)

### Adjusting Token Limits

```typescript
// In /src/app/api/generate/route.ts
max_tokens: 2048, // Lower = cheaper, faster
           // Higher = more detailed code
```

**Token Estimation:**
- 1 token ≈ 4 characters
- Typical HTML output: 500-1500 tokens

### System Prompt

Customize in `/src/lib/constants.ts`:

```typescript
export const SYSTEM_PROMPT = `You are an expert frontend developer...`;
```

---

## Rate Limiting

### Limits (per OpenRouter)

| Metric | Limit |
|--------|-------|
| Requests per minute | 500 (free tier) |
| Tokens per day | Varies by tier |
| Concurrent requests | 10 |

### Handling Rate Limits

Implementing exponential backoff in client code:

```typescript
async function generateWithRetry(
  image: string,
  maxRetries = 3,
  baseDelay = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      if (response.ok) return response;
      if (response.status === 429) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

---

## Error Handling

### Common Errors & Solutions

#### "API key not configured"

```
Status: 500
Message: OPENROUTER_API_KEY not configured in .env.local
```

**Fix:**
```env
OPENROUTER_API_KEY=sk-or-v1-your_key
```

#### "API error 402: Low credits"

```
Status: 402
Message: This request requires more credits, or fewer max_tokens...
```

**Solutions:**
1. Reduce `max_tokens` in API route
2. Add credits: https://openrouter.ai/settings/keys
3. Use a cheaper model

#### "No readable stream"

**Cause:** Response body is not readable
**Fix:** Check network connection and API status

#### "Invalid HTML generated"

**Cause:** AI model generated invalid markup
**Fix:** Improve sketch clarity, provide clearer layout

### Client-Side Error Handling

```typescript
try {
  const response = await fetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ image }),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();

    if (status === 400) {
      throw new Error("Missing image data");
    } else if (status === 402) {
      throw new Error("Insufficient API credits. Reduce max_tokens or add credits.");
    } else if (status === 500) {
      throw new Error("API key not configured");
    } else {
      throw new Error(`API error ${status}: ${text}`);
    }
  }

  // Handle streaming response...
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No stream available");

  // Read chunks...
} catch (error) {
  console.error("Generation failed:", error);
  // Show user-friendly error message
}
```

---

## Examples

### cURL

```bash
# Create a test sketch as base64
BASE64_IMAGE=$(base64 -i sketch.png)

curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"image\": \"$BASE64_IMAGE\"}" \
  --output generated.html
```

### JavaScript/TypeScript

```typescript
async function generateCode(imageFile: File): Promise<string> {
  // Convert File to base64
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.readAsDataURL(imageFile);
  });

  // Call API
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  // Read streaming response
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No stream");

  const decoder = new TextDecoder();
  let code = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    code += decoder.decode(value, { stream: true });
  }

  return code;
}

// Usage
const file = document.getElementById("sketchInput") as HTMLInputElement;
const code = await generateCode(file.files![0]);
console.log(code);
```

### Python Example

```python
import requests
import base64

# Read sketch image
with open("sketch.png", "rb") as f:
    image_bytes = f.read()
    image_base64 = base64.b64encode(image_bytes).decode()

# Call API
response = requests.post(
    "http://localhost:3001/api/generate",
    json={"image": image_base64},
    stream=True,
    timeout=60
)

# Handle response
if response.status_code == 200:
    with open("generated.html", "w") as f:
        for chunk in response.iter_content(decode_unicode=True):
            f.write(chunk)
elif response.status_code == 402:
    print("Insufficient credits")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
```

### React Hook

```typescript
import { useState } from "react";

export function useSketchGeneration() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = async (imageFile: File) => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(imageFile);
      const response = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      setCode(""); // Reset
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setCode(prev => prev + chunk);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { code, loading, error, generate };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  });
}
```

---

## Best Practices

1. **Use Try-Catch:** Always wrap API calls in error handling
2. **Handle Streaming:** Process chunks progressively for better UX
3. **Validate Images:** Ensure images meet size/format requirements
4. **Monitor Credits:** Track API credit usage
5. **Cache Results:** Store generated code locally to avoid re-generation
6. **Implement Timeouts:** Set 60-second timeout for requests
7. **Log Errors:** Track failures for debugging

---

## Monitoring & Analytics

### Tracking Generation Success

```typescript
// Track usage
analytics.track("code_generated", {
  duration: Date.now() - startTime,
  codeLength: generatedCode.length,
  tokensEstimated: Math.round(generatedCode.length / 4),
});
```

### OpenRouter Dashboard

Monitor usage at: https://openrouter.ai/activity

---

## Support

For API issues:
- Check [OpenRouter Docs](https://openrouter.ai/docs)
- Review [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Open [GitHub Issue](https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code/issues)
