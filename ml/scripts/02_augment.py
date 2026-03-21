import argparse
import json
from pathlib import Path
from typing import Dict, List

import albumentations as A
import cv2
from tqdm import tqdm

AUG_PIPE = A.Compose(
    [
        A.RandomBrightnessContrast(p=0.5),
        A.GaussNoise(p=0.5),
        A.ShiftScaleRotate(shift_limit=0.01, scale_limit=0.05, rotate_limit=3, border_mode=cv2.BORDER_REFLECT, p=0.7),
        A.CLAHE(p=0.3),
    ]
)


def load_jsonl(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def save_jsonl(path: Path, rows: List[Dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def augment_dataset(raw_dir: Path, aug_dir: Path) -> None:
    aug_dir.mkdir(parents=True, exist_ok=True)
    out_jsonl = aug_dir / "augmented.jsonl"
    if out_jsonl.exists():
        print("[augment] augmented.jsonl already done; skipping")
        return

    input_files = list(raw_dir.glob("*.jsonl"))
    if not input_files:
        print("[augment] no raw jsonl files found")
        return

    rows: List[Dict[str, str]] = []
    for fp in input_files:
        rows.extend(load_jsonl(fp))

    out_rows: List[Dict[str, str]] = []
    for row in tqdm(rows, desc="augment", unit="img"):
        img_path = Path(row["image_path"])
        if not img_path.exists():
            continue
        image = cv2.imread(str(img_path))
        if image is None:
            continue
        out_rows.append(row)
        for j in range(3):
            aug = AUG_PIPE(image=image)
            aug_img = aug["image"]
            aug_name = img_path.stem + f"_aug{j}.png"
            aug_out_path = aug_dir / aug_name
            cv2.imwrite(str(aug_out_path), aug_img)
            out_rows.append({"image_path": str(aug_out_path), "html": row["html"]})

    save_jsonl(out_jsonl, out_rows)
    print(f"[augment] wrote {len(out_rows)} rows -> {out_jsonl}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Augment raw dataset")
    parser.add_argument("--raw", type=str, default="ml/data/raw", help="Input raw dir")
    parser.add_argument("--out", type=str, default="ml/data/augmented", help="Output augmented dir")
    args = parser.parse_args()

    augment_dataset(Path(args.raw), Path(args.out))


if __name__ == "__main__":
    main()
