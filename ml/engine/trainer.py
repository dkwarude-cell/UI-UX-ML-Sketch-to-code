import json
import logging
import os
import shutil
import sqlite3
import time
from datetime import datetime
from multiprocessing import Process
from pathlib import Path
from typing import Dict, List

import numpy as np
from PIL import Image
from datasets import Dataset, DatasetDict, Features, Image as HFImage, Value
from tqdm import tqdm
import torch

logger = logging.getLogger(__name__)
HAS_GPU = torch.cuda.is_available()

PROMPT = (
    "Convert this wireframe to production HTML with Tailwind CSS. Output only valid HTML starting with <!DOCTYPE html>."
)


class TrainingOrchestrator:
    def __init__(self, db_path: str = "ml/data/collector.db") -> None:
        self.db_path = Path(db_path)
        self.status_path = Path("ml/engine/training_status.json")
        self.model_version_path = Path("ml/engine/model_version.json")
        self.lock_file = Path("ml/engine/TRAINING.lock")
        self.current_ckpt = Path("ml/checkpoints/current")
        self.archive_dir = Path("ml/checkpoints/archive")
        self.processed_root = Path("ml/data/processed")
        self.checkpoints_root = Path("ml/checkpoints")
        self.eval_root = Path("ml/engine")
        for p in [self.archive_dir, self.checkpoints_root, self.processed_root, self.eval_root]:
            p.mkdir(parents=True, exist_ok=True)

    def start_training(self, reason: str, use_process: bool = True) -> None:
        if self.lock_file.exists():
            logger.info("lock exists; training already running")
            return
        self.lock_file.parent.mkdir(parents=True, exist_ok=True)
        self.lock_file.write_text(reason, encoding="utf-8")
        if use_process:
            proc = Process(target=self._run_training, args=(reason,))
            proc.start()
        else:
            self._run_training(reason)

    # ----------------------------- internal pipeline -----------------------------
    def _run_training(self, reason: str) -> None:
        run_id = f"run_{int(time.time())}"
        try:
            self._write_status({
                "status": "training",
                "run_id": run_id,
                "reason": reason,
                "started_at": datetime.utcnow().isoformat(),
            })

            rows = self._load_rows()
            if len(rows) < 500:
                logger.info("insufficient data: %s rows", len(rows))
                self._write_status({"status": "idle", "last_run": datetime.utcnow().isoformat(), "last_score": None})
                return

            processed_dir = self.processed_root / run_id
            processed_dir.mkdir(parents=True, exist_ok=True)
            dataset_path, test_split = self._prepare_dataset(rows, processed_dir)

            merged_path = self._run_real_training(run_id, dataset_path)

            eval_report = self._run_real_evaluation(merged_path, test_split)
            if eval_report.get("decision") == "PROMOTE":
                self._promote(Path(merged_path).parent, run_id, eval_report.get("new_model_score", 0.0))
            else:
                archive_dst = self.archive_dir / run_id
                if archive_dst.exists():
                    shutil.rmtree(archive_dst)
                shutil.move(str(Path(merged_path).parent), archive_dst)
                logger.info("REJECTED: new model did not improve enough (+%.4f)", eval_report.get("delta", 0.0))

            self._cleanup(processed_dir)
            self._write_status({
                "status": "idle",
                "last_run": datetime.utcnow().isoformat(),
                "last_score": eval_report.get("new_model_score"),
            })
        except Exception:
            logger.exception("training run failed")
            self._write_status({"status": "error", "message": "training failed"})
        finally:
            self.lock_file.unlink(missing_ok=True)

    def _load_rows(self) -> List[Dict[str, object]]:
        conn = sqlite3.connect(self.db_path)
        try:
            cur = conn.execute(
                "SELECT id, image_path, html_path, quality_score FROM pairs WHERE quality_score >= 0.3 AND poisoned = 0"
            )
            rows = []
            for rid, img, html, score in cur.fetchall():
                try:
                    html_text = Path(html).read_text(encoding="utf-8")
                except Exception:
                    continue
                rows.append({"id": rid, "image_path": img, "html": html_text, "quality": float(score)})
            return rows
        finally:
            conn.close()

    def _prepare_dataset(self, rows: List[Dict[str, object]], out_dir: Path):
        images: List[Image.Image] = []
        htmls: List[str] = []
        used_ids: List[str] = []
        for row in rows:
            used_ids.append(row["id"])
            base_img = Image.open(row["image_path"]).convert("RGB")
            html = row["html"]
            images.append(base_img)
            htmls.append(html)
            if row["quality"] < 0.6:
                for _ in range(2):
                    aug_img = self._augment_image(base_img)
                    images.append(aug_img)
                    htmls.append(html)

        features = Features({"image": HFImage(), "html": Value("string")})
        ds = Dataset.from_dict({"image": images, "html": htmls}, features=features)
        ds = ds.shuffle(seed=42)
        n = len(ds)
        n_train = int(n * 0.9)
        n_val = int(n * 0.05)
        dsd = DatasetDict({
            "train": ds.select(range(n_train)),
            "validation": ds.select(range(n_train, n_train + n_val)),
            "test": ds.select(range(n_train + n_val, n)),
        })
        dsd.save_to_disk(str(out_dir))
        self._mark_used(used_ids)
        return str(out_dir), dsd["test"]

    def _augment_image(self, img: Image.Image) -> Image.Image:
        arr = np.array(img)
        noise = np.random.normal(0, 8, arr.shape).astype(np.int16)
        arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        return Image.fromarray(arr)

    def _run_real_training(self, run_id: str, dataset_path: str):
        import threading
        from transformers import (
            AutoProcessor,
            PaliGemmaForConditionalGeneration,
            BitsAndBytesConfig,
            TrainingArguments,
        )
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, PeftModel
        from trl import SFTTrainer
        from datasets import load_from_disk

        checkpoint_dir = f"ml/checkpoints/{run_id}"
        status_file = "ml/engine/training_status.json"
        dataset = load_from_disk(dataset_path)

        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        ) if HAS_GPU else None

        current_ckpt = "ml/checkpoints/current"
        base_model_id = current_ckpt if os.path.exists(current_ckpt) else "google/paligemma2-3b-pt-224"

        model = PaliGemmaForConditionalGeneration.from_pretrained(
            base_model_id,
            quantization_config=bnb_config,
            device_map="auto" if HAS_GPU else None,
            torch_dtype=torch.float16 if HAS_GPU else torch.float32,
        )
        processor = AutoProcessor.from_pretrained("google/paligemma2-3b-pt-224")

        if bnb_config:
            model = prepare_model_for_kbit_training(model)

        lora_config = LoraConfig(
            r=32,
            lora_alpha=64,
            lora_dropout=0.05,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            bias="none",
            task_type="CAUSAL_LM",
        )
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()

        total_samples = len(dataset["train"])
        per_device = 2 if HAS_GPU else 1
        grad_accum = 8 if HAS_GPU else 16
        num_epochs = 3 if HAS_GPU else 1

        training_args = TrainingArguments(
            output_dir=checkpoint_dir,
            num_train_epochs=num_epochs,
            per_device_train_batch_size=per_device,
            gradient_accumulation_steps=grad_accum,
            learning_rate=2e-4,
            lr_scheduler_type="cosine",
            warmup_ratio=0.05,
            fp16=HAS_GPU,
            logging_steps=25,
            eval_steps=100,
            save_steps=100,
            evaluation_strategy="steps",
            save_total_limit=3,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            report_to="tensorboard",
            logging_dir=f"{checkpoint_dir}/logs",
            dataloader_num_workers=2,
            remove_unused_columns=False,
        )

        start_time = time.time()
        total_steps = max(1, (total_samples // (per_device * grad_accum)) * num_epochs)
        self._stop_status_thread = False
        self._started_at = datetime.utcnow().isoformat()

        def collate_fn(batch):
            images = [item["image"] for item in batch]
            htmls = [item["html"] for item in batch]
            prompts = [f"{PROMPT}\nHTML:\n{h}" for h in htmls]
            inputs = processor(text=prompts, images=images, return_tensors="pt", padding=True, truncation=True, max_length=2048)
            inputs["labels"] = inputs["input_ids"].clone()
            return inputs

        from transformers import TrainerCallback

        class LiveMetricsCallback(TrainerCallback):
            def on_log(self, args, state, control, logs=None, **kwargs):
                if logs is None:
                    return
                eta = ((time.time() - start_time) / max(state.global_step, 1)) * (total_steps - state.global_step) / 60
                status = {
                    "status": "training",
                    "run_id": run_id,
                    "epoch": round(state.epoch or 0, 2),
                    "step": state.global_step,
                    "total_steps": total_steps,
                    "train_loss": round(logs.get("loss", 0), 4),
                    "val_loss": round(logs.get("eval_loss", 0), 4),
                    "eta_minutes": round(eta, 1),
                    "started_at": self._started_at,
                    "pairs_used": total_samples,
                }
                tmp = status_file + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(status, f)
                os.replace(tmp, status_file)

        trainer = SFTTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset["train"],
            eval_dataset=dataset["validation"],
            data_collator=collate_fn,
            callbacks=[LiveMetricsCallback()],
        )

        def status_thread():
            while not self._stop_status_thread:
                try:
                    state = trainer.state
                    eta = ((time.time() - start_time) / max(state.global_step, 1)) * (total_steps - state.global_step) / 60
                    status = {
                        "status": "training",
                        "run_id": run_id,
                        "step": state.global_step,
                        "total_steps": total_steps,
                        "eta_minutes": round(eta, 1),
                        "started_at": self._started_at,
                    }
                    tmp = status_file + ".tmp"
                    with open(tmp, "w", encoding="utf-8") as f:
                        json.dump(status, f)
                    os.replace(tmp, status_file)
                except Exception:
                    pass
                time.sleep(30)

        t = threading.Thread(target=status_thread, daemon=True)
        t.start()

        trainer.train(resume_from_checkpoint=os.path.join(checkpoint_dir, "checkpoint-last") if Path(checkpoint_dir, "checkpoint-last").exists() else None)
        trainer.save_model(checkpoint_dir)

        self._stop_status_thread = True
        merged_path = f"{checkpoint_dir}/merged"
        base = PaliGemmaForConditionalGeneration.from_pretrained(
            "google/paligemma2-3b-pt-224",
            torch_dtype=torch.float16 if HAS_GPU else torch.float32,
            device_map="cpu",
        )
        merged = PeftModel.from_pretrained(base, checkpoint_dir)
        merged = merged.merge_and_unload()
        merged.save_pretrained(merged_path, safe_serialization=True)
        processor.save_pretrained(merged_path)
        return merged_path

    def _run_real_evaluation(self, new_model_path: str, test_dataset) -> dict:
        import re
        from nltk.translate.bleu_score import corpus_bleu, SmoothingFunction
        from rouge_score import rouge_scorer
        from bs4 import BeautifulSoup
        from transformers import AutoProcessor, PaliGemmaForConditionalGeneration

        def load_model(path):
            return PaliGemmaForConditionalGeneration.from_pretrained(path, torch_dtype=torch.float16 if HAS_GPU else torch.float32, device_map="auto" if HAS_GPU else None)

        def generate_html(model, processor, image, max_tokens=512):
            prompt = "Convert this wireframe to production HTML with Tailwind CSS."
            inputs = processor(text=prompt, images=image, return_tensors="pt").to(model.device)
            with torch.no_grad():
                out = model.generate(**inputs, max_new_tokens=max_tokens, do_sample=False)
            return processor.decode(out[0], skip_special_tokens=True)

        def score_model(model, processor, test_data):
            bleu_refs, bleu_hyps = [], []
            rouge = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
            rouge_scores, validity_scores, tw_scores = [], [], []
            for item in tqdm(test_data, desc="Evaluating"):
                pred = generate_html(model, processor, item["image"])
                ref = item["html"]
                bleu_refs.append([ref.split()])
                bleu_hyps.append(pred.split())
                rs = rouge.score(ref, pred)
                rouge_scores.append(rs["rougeL"].fmeasure)
                try:
                    BeautifulSoup(pred, "html.parser")
                    validity_scores.append(1.0)
                except Exception:
                    validity_scores.append(0.0)
                tw = re.findall(r'class="([^"]*)"', pred)
                tw_count = len(" ".join(tw).split())
                tw_scores.append(min(1.0, tw_count / 20.0))
            bleu4 = corpus_bleu(bleu_refs, bleu_hyps, smoothing_function=SmoothingFunction().method4)
            rouge_avg = sum(rouge_scores) / len(rouge_scores) if rouge_scores else 0.0
            valid_avg = sum(validity_scores) / len(validity_scores) if validity_scores else 0.0
            tw_avg = sum(tw_scores) / len(tw_scores) if tw_scores else 0.0
            return {
                "bleu4": round(bleu4, 4),
                "rouge_l": round(rouge_avg, 4),
                "validity": round(valid_avg, 4),
                "tailwind": round(tw_avg, 4),
                "overall": round(bleu4 * 0.30 + rouge_avg * 0.30 + valid_avg * 0.20 + tw_avg * 0.20, 4),
            }

        new_model = load_model(new_model_path)
        new_proc = AutoProcessor.from_pretrained(new_model_path)
        new_scores = score_model(new_model, new_proc, test_dataset)

        curr_scores = {"overall": 0.0}
        if self.current_ckpt.exists():
            curr_model = load_model(str(self.current_ckpt))
            curr_proc = AutoProcessor.from_pretrained(str(self.current_ckpt))
            curr_scores = score_model(curr_model, curr_proc, test_dataset)

        decision = "PROMOTE" if new_scores["overall"] > curr_scores.get("overall", 0.0) + 0.02 else "REJECT"
        report = {
            "current_model_score": curr_scores.get("overall", 0.0),
            "new_model_score": new_scores["overall"],
            "new_model_detail": new_scores,
            "delta": round(new_scores["overall"] - curr_scores.get("overall", 0.0), 4),
            "decision": decision,
            "winner": "new" if decision == "PROMOTE" else "current",
        }
        report_path = self.eval_root / f"eval_report_{int(time.time())}.json"
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return report

    def _promote(self, new_ckpt: Path, run_id: str, score: float) -> None:
        staging = self.checkpoints_root / "staging"
        if staging.exists():
            shutil.rmtree(staging)
        shutil.copytree(new_ckpt, staging)
        try:
            import httpx

            httpx.post("http://localhost:11435/reload", timeout=5.0)
        except Exception:
            logger.info("reload ping failed; server may be down")
        time.sleep(1)
        if self.current_ckpt.exists():
            shutil.rmtree(self.current_ckpt)
        shutil.move(staging, self.current_ckpt)
        meta = {"version": run_id, "score": score, "promoted_at": datetime.utcnow().isoformat()}
        self.model_version_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        logger.info("PROMOTED: new model live (%s)", run_id)

    def _cleanup(self, processed_dir: Path) -> None:
        if processed_dir.exists():
            shutil.rmtree(processed_dir)

    def _write_status(self, payload: Dict[str, object]) -> None:
        tmp = self.status_path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        tmp.replace(self.status_path)

    def _mark_used(self, ids: List[str]) -> None:
        conn = sqlite3.connect(self.db_path)
        try:
            conn.executemany("UPDATE pairs SET used_in_training = 1 WHERE id = ?", [(i,) for i in ids])
            conn.commit()
        finally:
            conn.close()
