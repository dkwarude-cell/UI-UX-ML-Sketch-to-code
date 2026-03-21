import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch("http://localhost:11436/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return new Response(text, { status: res.status });
  } catch (error) {
    console.error("feedback proxy error", error);
    return new Response("Server error", { status: 500 });
  }
}
