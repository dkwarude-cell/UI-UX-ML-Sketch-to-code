import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export type ModelStats = {
  requests_served: number;
  avg_latency_ms: number;
  latency_samples: number[];
  pairs_collected: number;
  last_updated: string;
};

const statsPath = path.join(process.cwd(), "src", "data", "model_stats.json");
const defaultStats: ModelStats = {
  requests_served: 0,
  avg_latency_ms: 0,
  latency_samples: [],
  pairs_collected: 14832,
  last_updated: "",
};

async function readStatsFile(): Promise<ModelStats> {
  try {
    const raw = await fs.readFile(statsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ModelStats>;
    return {
      ...defaultStats,
      ...parsed,
      latency_samples: parsed.latency_samples ?? [],
    };
  } catch {
    return { ...defaultStats };
  }
}

async function writeStatsFile(stats: ModelStats) {
  const tmpPath = `${statsPath}.tmp`;
  await fs.mkdir(path.dirname(statsPath), { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(stats, null, 2), "utf-8");
  if (fsSync.existsSync(statsPath)) {
    fsSync.rmSync(statsPath, { force: true });
  }
  fsSync.renameSync(tmpPath, statsPath);
}

export async function updateModelStats({
  latency,
  incrementRequests,
  incrementPairs,
}: {
  latency?: number;
  incrementRequests?: boolean;
  incrementPairs?: boolean;
}) {
  const stats = await readStatsFile();
  if (incrementRequests) {
    stats.requests_served += 1;
  }
  if (incrementPairs) {
    stats.pairs_collected += 1;
  }
  if (typeof latency === "number" && Number.isFinite(latency)) {
    const samples = stats.latency_samples ?? [];
    samples.push(latency);
    if (samples.length > 50) {
      samples.splice(0, samples.length - 50);
    }
    stats.latency_samples = samples;
    stats.avg_latency_ms = Number(
      (samples.reduce((sum, v) => sum + v, 0) / samples.length).toFixed(2)
    );
  }
  stats.last_updated = new Date().toISOString();
  await writeStatsFile(stats);
  return stats;
}

export async function getModelStats(): Promise<ModelStats> {
  const stats = await readStatsFile();
  return stats;
}
