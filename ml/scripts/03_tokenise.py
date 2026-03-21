import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

from datasets import Dataset, DatasetDict, load_dataset
from PIL import Image
from tqdm import tqdm
from transformers import AutoTokenizer

TRAIN_RATIO = 0.9
VAL_RATIO = 0.05
TEST_RATIO = 0.05

CLEAN_SCRIPT_PATTERN = re.compile(r"<script(?![^>]*tailwind)[\s\S]*?</script>", re.IGNORECASE)
COMMENT_PATTERN = re.compile(r"<!--.*?-->", re.DOTALL)
MULTISPACE_PATTERN = re.compile(r"\s{2,}")


def clean_html(html: str) -> str:
    html = COMMENT_PATTERN.sub("", html)
    html = CLEAN_SCRIPT_PATTERN.sub("", html)
    html = MULTISPACE_PATTERN.sub(" ", html)
    html = html.strip()
    return html


def load_rows(raw_dir: Path, aug_dir: Path) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for fp in list(raw_dir.glob("*.jsonl")) + list(aug_dir.glob("*.jsonl")):
        with fp.open("r", encoding="utf-8") as f:
            for line in f:
                row = json.loads(line)
                rows.append(row)
    return rows


def prepare_dataset(rows: List[Dict[str, str]], tokenizer, max_length: int) -> DatasetDict:
    image_paths = [r["image_path"] for r in rows]
    texts = [clean_html(r["html"]) for r in rows]

    images: List[Image.Image] = []
    for p in tqdm(image_paths, desc="load images", unit="img"):
        images.append(Image.open(p).convert("RGB"))

    enc = tokenizer(
        texts,
        max_length=max_length,
        truncation=True,
        padding="max_length",
        return_attention_mask=True,
    )

    ds = Dataset.from_dict({
        "image": images,
        "input_ids": enc["input_ids"],
        "attention_mask": enc["attention_mask"],
        "labels": enc["input_ids"],
    })

    ds = ds.shuffle(seed=42)
    n = len(ds)
    n_train = int(n * TRAIN_RATIO)
    n_val = int(n * VAL_RATIO)
    splits = DatasetDict({
        "train": ds.select(range(n_train)),
        "val": ds.select(range(n_train, n_train + n_val)),
        "test": ds.select(range(n_train + n_val, n)),
    })
    return splits


def main() -> None:
    parser = argparse.ArgumentParser(description="Tokenise dataset for PaliGemma2")
    parser.add_argument("--raw", type=str, default="ml/data/raw", help="Raw data dir")
    parser.add_argument("--aug", type=str, default="ml/data/augmented", help="Augmented data dir")
    parser.add_argument("--out", type=str, default="ml/data/processed", help="Output dataset dir")
    parser.add_argument("--max_length", type=int, default=2048, help="Max token length")
    args = parser.parse_args()

    out_dir = Path(args.out)
    if out_dir.exists():
        print("[tokenise] processed dataset already exists; skipping")
        return

    tokenizer = AutoTokenizer.from_pretrained("google/paligemma2-3b-pt-224")
    rows = load_rows(Path(args.raw), Path(args.aug))
    if not rows:
        print("[tokenise] no rows found; aborting")
        return

    ds = prepare_dataset(rows, tokenizer, args.max_length)
    out_dir.mkdir(parents=True, exist_ok=True)
    ds.save_to_disk(str(out_dir))
    print(f"[tokenise] saved dataset to {out_dir}")


if __name__ == "__main__":
    main()
