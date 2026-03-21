import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/constants";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return new Response("Missing image data", { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response("OPENROUTER_API_KEY not configured in .env.local", {
        status: 500,
      });
    }

    // Call OpenRouter API (OpenAI-compatible) with streaming
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "SketchToCode",
        },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_AI_MODEL || "google/gemini-2.5-flash",
          max_tokens: Number(process.env.NEXT_PUBLIC_MAX_TOKENS || 800),
          temperature: 0.15,
          stream: true,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${image}`,
                  },
                },
                {
                  type: "text",
                  text: "Convert this wireframe sketch into a complete HTML/Tailwind CSS page. Use the Tailwind CDN link. Return ONLY the complete HTML document.",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error("OpenRouter API error:", openRouterResponse.status, errorText);
      return new Response(
        `API Error (${openRouterResponse.status}): ${errorText}`,
        { status: openRouterResponse.status }
      );
    }

    if (!openRouterResponse.body) {
      return new Response("No response body from API", { status: 500 });
    }

    // Parse SSE stream from OpenRouter and forward just the text content
    const reader = openRouterResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Process any remaining buffer
              if (buffer.trim()) {
                const trimmed = buffer.trim();
                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6);
                  if (data !== "[DONE]") {
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      if (content) {
                        controller.enqueue(encoder.encode(content));
                      }
                    } catch {
                      // skip
                    }
                  }
                }
              }
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete lines from buffer
            const lines = buffer.split("\n");
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Generate API error:", error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
