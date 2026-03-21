"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CUSTOM_MODEL } from "@/lib/constants";

type ModelStatus = {
  status: string;
  model: string;
  version: string;
  uptime: string;
  requests_served: number;
  avg_latency_ms: number;
  training_pairs: number;
  last_retrained: string;
  accuracy: string;
  gpu: string;
  architecture: string;
  parameters?: string;
};

type TrainingStatus = {
  status: string;
};

export default function ModelStatusBadge() {
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [training, setTraining] = useState<TrainingStatus | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [mRes, tRes] = await Promise.all([
          fetch("/api/model-status").then((r) => r.json()),
          fetch("/api/training-status").then((r) => r.json()),
        ]);
        setModel(mRes);
        setTraining(tRes);
      } catch (err) {
        console.error("status fetch error", err);
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, []);

  const isBusy = ["training", "collecting", "evaluating"].includes((training?.status || "").toLowerCase());
  const dotColor = isBusy ? "#f59e0b" : "#22c55e";
  const label = isBusy ? "Training in progress..." : `${CUSTOM_MODEL.name} · online`;
  const requestsServed = model?.requests_served ?? 0;
  const latency = model?.avg_latency_ms ?? 0;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
          color: "var(--text-secondary)",
        }}
      >
        <motion.span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ background: dotColor, boxShadow: `0 0 0 6px ${dotColor}22` }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <span>{label}</span>
        <span className="text-[11px] opacity-80">{requestsServed.toLocaleString()} generations</span>
      </div>

      {hovered && model && (
        <div
          className="absolute top-full mt-2 right-0 z-20 w-72 p-3 rounded-xl shadow-xl text-sm"
          style={{
            background: "rgba(15,18,36,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-secondary)",
          }}
        >
          <div className="flex justify-between text-xs pb-1" style={{ color: "var(--text-muted)" }}>
            <span>Model</span><span>{model.model}</span>
          </div>
          <div className="flex justify-between text-xs pb-1" style={{ color: "var(--text-muted)" }}>
            <span>Parameters</span><span>{model.parameters ?? CUSTOM_MODEL.parameters}</span>
          </div>
          <div className="flex justify-between text-xs pb-1" style={{ color: "var(--text-muted)" }}>
            <span>Accuracy</span><span>{model.accuracy}</span>
          </div>
          <div className="flex justify-between text-xs pb-1" style={{ color: "var(--text-muted)" }}>
            <span>Trained on</span><span>{model.training_pairs.toLocaleString()} pairs</span>
          </div>
          <div className="flex justify-between text-xs pb-1" style={{ color: "var(--text-muted)" }}>
            <span>GPU</span><span>{model.gpu}</span>
          </div>
          <div className="flex justify-between text-xs pb-1" style={{ color: "var(--text-muted)" }}>
            <span>Uptime</span><span>{model.uptime}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Avg speed</span><span>{Math.round(latency)} ms</span>
          </div>
        </div>
      )}
    </div>
  );
}
