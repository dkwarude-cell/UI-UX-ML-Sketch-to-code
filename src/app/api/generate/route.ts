import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/constants";
import { updateModelStats } from "@/lib/modelStats";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return new Response("Missing image data", { status: 400 });
    }

    const useCustom = process.env.USE_CUSTOM_MODEL === "true";
    const customUrl = process.env.CUSTOM_MODEL_URL || "http://localhost:11435";

    const openRouterPayload = {
      model: process.env.NEXT_PUBLIC_AI_MODEL || "anthropic/claude-3.5-sonnet",
      max_tokens: Number(process.env.NEXT_PUBLIC_MAX_TOKENS || 350),
      temperature: 0.3,
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
                url: `data:image/jpeg;base64,${image}`,
              },
            },
            {
              type: "text",
              text: "Convert this wireframe sketch into a complete HTML/Tailwind CSS page. Use the Tailwind CDN link. Return ONLY the complete HTML document.",
            },
          ],
        },
      ],
    };

    const targetUrl = useCustom
      ? `${customUrl}/v1/chat/completions`
      : "https://openrouter.ai/api/v1/chat/completions";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!useCustom) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return new Response("OPENROUTER_API_KEY not configured in .env.local", {
          status: 500,
        });
      }
      headers.Authorization = `Bearer ${apiKey}`;
      headers["HTTP-Referer"] = "http://localhost:3000";
      headers["X-Title"] = "SketchToCode";
    }

    const llmResponse = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(openRouterPayload),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LLM API error:", llmResponse.status, errorText);
      return new Response(
        `API Error (${llmResponse.status}): ${errorText}`,
        { status: llmResponse.status }
      );
    }

    if (!llmResponse.body) {
      return new Response("No response body from API", { status: 500 });
    }

    const start = Date.now();

    // Parse SSE stream and forward just the text content
    const reader = llmResponse.body.getReader();
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
                const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content;
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

    // Collect the streamed HTML for logging/metrics
    let collected = "";
    const generationId = crypto.randomUUID();
    let firstChunkSeen = false;

    const tappedStream = new ReadableStream({
      async start(controller) {
        const reader2 = readableStream.getReader();
        while (true) {
          const { done, value } = await reader2.read();
          if (done) {
            controller.close();
            const latency = Date.now() - start;
            try {
              await updateModelStats({ latency, incrementRequests: true, incrementPairs: true });
            } catch (err) {
              console.error("Failed to update model stats", err);
            }
            break;
          }
          const chunk = value ? new TextDecoder().decode(value) : "";
          if (chunk && !firstChunkSeen) {
            firstChunkSeen = true;
          }
          collected += chunk;
          controller.enqueue(value);
        }
      },
    });
    const responseStream = new Response(tappedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Generation-Id": generationId,
        "X-Accel-Buffering": "no",
      },
    });

    return responseStream;
  } catch (error) {
    console.error("Generate API error:", error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

