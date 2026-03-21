import { NextRequest } from "next/server";
import http from "http";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { image, html, timestamp, session_id, generation_id } = await req.json();
    if (!image || !html) {
      return new Response("Missing image or html", { status: 400 });
    }

    await fetch("http://localhost:11436/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: image,
        html,
        timestamp: timestamp || Date.now(),
        session_id: session_id || "browser",
        generation_id,
      }),
    });

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("collect endpoint error", error);
    return new Response("Server error", { status: 500 });
  }
}
