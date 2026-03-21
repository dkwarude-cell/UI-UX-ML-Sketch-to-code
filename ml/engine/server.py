import asyncio
import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from .collector import DataCollector
from .feedback import FeedbackManager

logger = logging.getLogger(__name__)

app = FastAPI(title="SketchToCode ML Daemon")
request_queue: asyncio.Queue = asyncio.Queue(maxsize=10)
collector: Optional[DataCollector] = None
feedback_mgr: Optional[FeedbackManager] = None

current_model_version: Optional[str] = None
requests_served = 0
start_time = time.time()
reload_lock = asyncio.Lock()


async def enqueue_request(item: Dict[str, Any]):
    try:
        request_queue.put_nowait(item)
    except asyncio.QueueFull:
        raise HTTPException(status_code=503, detail="Queue full")


@app.post("/collect")
async def collect(payload: Dict[str, Any]):
    if not collector:
        raise HTTPException(status_code=500, detail="collector unavailable")
    image = payload.get("image_base64") or payload.get("image")
    html = payload.get("html")
    timestamp = payload.get("timestamp")
    session_id = payload.get("session_id")
    if not image or not html:
        raise HTTPException(status_code=400, detail="missing fields")
    return collector.handle_pair(image, html, timestamp, session_id)


@app.post("/feedback")
async def feedback(payload: Dict[str, Any]):
    if not feedback_mgr:
        raise HTTPException(status_code=500, detail="feedback unavailable")
    generation_id = payload.get("generation_id")
    rating = payload.get("rating")
    html = payload.get("html")
    image = payload.get("image_base64") or payload.get("image")
    if not generation_id or rating not in {"good", "bad"}:
        raise HTTPException(status_code=400, detail="invalid payload")
    feedback_mgr.handle_feedback(generation_id, rating, html, image)
    return {"status": "ok"}


@app.post("/v1/chat/completions")
async def completions(payload: Dict[str, Any]):
    await enqueue_request(payload)
    response = await _generate_response(payload)
    global requests_served
    requests_served += 1
    return JSONResponse(response)


async def _generate_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY missing; no local model configured")
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()


@app.post("/reload")
async def reload_endpoint():
    async with reload_lock:
        # In API-only mode, mark the version as remote.
        global current_model_version
        current_model_version = "remote-api"
        return {"status": "reloaded", "model": current_model_version}


@app.get("/status")
async def status():
    uptime = time.time() - start_time
    return {
        "model": current_model_version or "fallback",
        "requests_served": requests_served,
        "uptime_sec": int(uptime),
        "queue_size": request_queue.qsize(),
    }


@app.get("/health")
async def health():
    return {"ok": True}


def _has_local_model() -> bool:
    return False


def start_inference_server(collector: DataCollector) -> None:
    global current_model_version, feedback_mgr
    current_model_version = "remote-api"
    globals()["collector"] = collector
    feedback_mgr = FeedbackManager(collector.db_path)

    def serve(port: int):
        config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
        server = uvicorn.Server(config)
        server.run()

    threading.Thread(target=serve, args=(11436,), daemon=True).start()
    serve(11435)
