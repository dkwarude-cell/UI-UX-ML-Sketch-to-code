import argparse
import subprocess
from pathlib import Path
from typing import Optional

from transformers import AutoModelForCausalLM, AutoTokenizer


def run_cmd(cmd: str, cwd: Optional[Path] = None) -> None:
    print(f"[export] {cmd}")
    subprocess.check_call(cmd, shell=True, cwd=cwd)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export merged model to safetensors and GGUF")
    parser.add_argument("--ckpt", type=str, default="ml/checkpoints/merged", help="Merged checkpoint path")
    parser.add_argument("--out", type=str, default="ml/exports/sketchtocode-model", help="Output dir")
    args = parser.parse_args()

    ckpt = Path(args.ckpt)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    print("[export] loading merged checkpoint")
    model = AutoModelForCausalLM.from_pretrained(ckpt, torch_dtype="auto")
    tokenizer = AutoTokenizer.from_pretrained(ckpt)

    print("[export] saving safetensors")
    model.save_pretrained(out, safe_serialization=True)
    tokenizer.save_pretrained(out)

    gguf_path = Path("ml/exports/sketchtocode-model.gguf")
    if not gguf_path.exists():
        llama_cpp_dir = Path("ml/llama.cpp")
        if not llama_cpp_dir.exists():
            run_cmd("git clone https://github.com/ggerganov/llama.cpp.git", cwd=Path("ml"))
        run_cmd("cmake -B build", cwd=llama_cpp_dir)
        run_cmd("cmake --build build -j", cwd=llama_cpp_dir)
        convert_script = llama_cpp_dir / "convert_hf_to_gguf.py"
        run_cmd(
            f"python {convert_script} {out} --outfile {gguf_path} --ftype q4_k_m",
            cwd=llama_cpp_dir,
        )
    else:
        print("[export] GGUF already exists; skipping")

    card = Path("ml/exports/README.md")
    card.write_text(
        "# SketchToCode Model\n\n"
        "Merged LoRA model trained on synthetic + self-collected wireframe -> HTML pairs.\n\n"
        "## Files\n- safetensors: sketchtocode-model/\n- GGUF Q4_K_M: sketchtocode-model.gguf\n\n"
        "## Usage (llama-cpp-python)\n"
        "```python\nfrom llama_cpp import Llama\nllm = Llama(model_path='ml/exports/sketchtocode-model.gguf', n_gpu_layers=-1)\n\nresp = llm(\n    messages=[{'role':'user','content':[{'type':'text','text':'<image>...'}]}],\n    stream=False,\n    max_tokens=512\n)\nprint(resp)\n```\n",
        encoding="utf-8",
    )
    print(f"[export] wrote model card to {card}")


if __name__ == "__main__":
    main()
