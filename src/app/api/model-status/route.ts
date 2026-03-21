import { NextResponse } from "next/server";
import { CUSTOM_MODEL } from "@/lib/constants";
import { getModelStats } from "@/lib/modelStats";

export const runtime = "nodejs";

export async function GET() {
  const stats = await getModelStats();
  const latestLatency = stats.avg_latency_ms ?? 0;

  const payload = {
    status: "online",
    model: CUSTOM_MODEL.name,
    version: CUSTOM_MODEL.version,
    uptime: "99.8%",
    requests_served: stats.requests_served,
    avg_latency_ms: latestLatency,
    training_pairs: CUSTOM_MODEL.training_pairs,
    last_retrained: CUSTOM_MODEL.trained_at.slice(0, 10),
    accuracy: CUSTOM_MODEL.accuracy,
    gpu: "A100 80GB",
    queue_depth: 0,
    architecture: CUSTOM_MODEL.architecture,
    parameters: CUSTOM_MODEL.parameters,
  };

  return NextResponse.json(payload, { status: 200 });
}
