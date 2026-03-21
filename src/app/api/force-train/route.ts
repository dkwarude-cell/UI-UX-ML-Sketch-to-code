import fs from "fs";
import path from "path";

export const runtime = "edge";

export async function POST() {
  const forcePath = path.join(process.cwd(), "ml", "engine", "FORCE_TRAIN");
  try {
    const dir = path.dirname(forcePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(forcePath, "", "utf-8");
    return new Response(JSON.stringify({ triggered: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("force-train error", error);
    return new Response(JSON.stringify({ triggered: false, error: "write_failed" }), { status: 500 });
  }
}
