import base64
import io
import json
from pathlib import Path
from typing import List, Dict, Any

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from llama_cpp import Llama
from PIL import Image

MODEL_PATH = Path("ml/exports/sketchtocode-model.gguf")
MODEL_NAME = "sketchtocode-model"
llm = None

app = FastAPI(title="SketchToCode VLM Server")


def load_model() -> None:
    global llm
    if llm is not None:
        return
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
    llm = Llama(
        model_path=str(MODEL_PATH),
        n_gpu_layers=-1,
        n_ctx=4096,
        temperature=0.2,
        top_p=0.95,
        max_tokens=2048,
    )


@app.on_event("startup")
async def startup_event():
    load_model()


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}


def stream_response(chunks: List[str]):
    async def event_generator():
        for chunk in chunks:
            data = json.dumps({"choices": [{"delta": {"content": chunk}}]})
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    payload = await request.json()
    messages = payload.get("messages", [])
    if not messages:
        return JSONResponse({"error": "missing messages"}, status_code=400)

    # Extract user text; image is ignored here but could be used for vision-capable backends
    user_parts = messages[-1].get("content", [])
    text_parts = [p.get("text") for p in user_parts if p.get("type") == "text"]
    prompt_text = "\n".join([p for p in text_parts if p])

    # Decode image (not used by llama.cpp text model but placeholder for compatibility)
    for part in user_parts:
        if part.get("type") == "image_url":
            data_url = part.get("image_url", {}).get("url", "")
            if data_url.startswith("data:image"):
                b64 = data_url.split(",")[-1]
                _ = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
            break

    load_model()
    stream = llm.create_completion(
        prompt=prompt_text,
        max_tokens=2048,
        temperature=0.2,
        top_p=0.95,
        stream=True,
    )

    chunks: List[str] = []
    for part in stream:
        token = part.get("choices", [{}])[0].get("text", "")
        if token:
            chunks.append(token)

    return stream_response(chunks)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=11435, workers=1)
