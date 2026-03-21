# SketchToCode ML Pipeline

This pipeline trains and serves a custom vision-language model that converts wireframe screenshots into production-ready HTML + Tailwind. It lives in `ml/` alongside the Next.js app.

## What it does

- Collects synthetic wireframe → HTML pairs, augments them, and tokenises for PaliGemma 2 fine-tuning.
- Fine-tunes with LoRA (4-bit) to keep costs down while retaining quality.
- Exports safetensors + GGUF for efficient serving via llama.cpp / llama-cpp-python.
- Provides a FastAPI server that mimics the OpenAI/OpenRouter streaming shape for easy app swap.

## Hardware

- Training: ideally 1× A100 40–80GB, or 2× 3090/4090 with LoRA + 4-bit. CPU-only will run in fallback mode (slower, smaller batches, 1 epoch).
- Inference: ≥8GB VRAM for GGUF Q4_K_M; CPU works but is slower.

## Quickstart

```bash
cd ml
pip install -r requirements.txt
bash run_all.sh  # runs collection → augment → tokenise → train → export
python scripts/06_serve.py  # start local inference server
```

## Google Colab

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/dkwarude-cell/UI-UX-ML-Sketch-to-code/blob/main/ml/colab_train.ipynb)

## Switching Next.js to the custom model

Set in `.env.local`:

```
USE_CUSTOM_MODEL=true
CUSTOM_MODEL_URL=http://localhost:11435
```

Restart `npm run dev -- --port 3001`. The app will call the local FastAPI server; if unset, it falls back to OpenRouter.

## Training time (estimates)

- Data gen + augment: ~30–60 min for 10k pairs on CPU.
- Tokenisation: ~10 min.
- LoRA training (3 epochs, effective batch 16):
  - A100 80GB: ~1–2 hours
  - Dual 3090: ~3–4 hours

## Contributing more data

The app posts successful generations to `src/app/api/collect/route.ts`, appending to `ml/data/raw/self_collected.jsonl`. To contribute externally, POST the same payload shape to that endpoint.

## Repo layout

- `ml/data/raw/` — scraped/synthetic + self-collected JSONL pairs
- `ml/data/augmented/` — augmented images + JSONL
- `ml/data/processed/` — tokenised HuggingFace dataset
- `ml/scripts/` — end-to-end pipeline scripts
- `ml/checkpoints/` — LoRA checkpoints
- `ml/exports/` — merged safetensors + GGUF + model card

## Safety & licensing

- Base model: `google/paligemma2-3b-pt-224` (Apache 2.0)
- Generated data: synthetic + user-contributed; ensure no PII before training.
