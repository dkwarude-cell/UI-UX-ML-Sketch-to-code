import argparse
from pathlib import Path
from typing import Dict, Any

import torch
from datasets import load_from_disk
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from tqdm import tqdm
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
)
from trl import SFTTrainer, SFTConfig
import evaluate

PROMPT = (
    "<image>\n"
    "You are an expert frontend developer. Convert this wireframe sketch into production-ready HTML with Tailwind CSS classes. Output only valid HTML starting with <!DOCTYPE html>. Use Tailwind CDN. Make it fully responsive.\n"
    "### HTML:\n{html}\n"
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune PaliGemma2 with LoRA")
    parser.add_argument("--data", type=str, default="ml/data/processed", help="Path to tokenised dataset")
    parser.add_argument("--output", type=str, default="ml/checkpoints", help="Checkpoint output dir")
    parser.add_argument("--epochs", type=int, default=3)
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device != "cuda":
        print("[train] WARNING: CUDA not available; training will be very slow on CPU")

    ds = load_from_disk(args.data)
    tokenizer = AutoTokenizer.from_pretrained("google/paligemma2-3b-pt-224")
    tokenizer.padding_side = "right"
    tokenizer.pad_token = tokenizer.eos_token

    # Decode labels back to HTML and embed in the instruction prompt
    def build_prompt(example: Dict[str, Any]) -> Dict[str, Any]:
        ids = [i for i in example["labels"] if i != -100]
        html = tokenizer.decode(ids, skip_special_tokens=True)
        example["text"] = PROMPT.format(html=html)
        return example

    ds = ds.map(build_prompt)

    model = AutoModelForCausalLM.from_pretrained(
        "google/paligemma2-3b-pt-224",
        device_map="auto",
        quantization_config=BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        ),
        torch_dtype=torch.float16,
    )

    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=32,
        lora_alpha=64,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)

    def formatting_prompts_func(batch):
        return batch["text"]

    training_args = SFTConfig(
        output_dir=args.output,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        fp16=True,
        logging_steps=50,
        eval_steps=200,
        save_steps=200,
        save_total_limit=3,
        report_to=["tensorboard"],
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=ds["train"],
        eval_dataset=ds["val"],
        formatting_func=formatting_prompts_func,
        args=training_args,
    )

    bleu = evaluate.load("bleu")
    rouge = evaluate.load("rouge")

    def compute_metrics(eval_preds):
        preds, labels = eval_preds
        decoded_preds = tokenizer.batch_decode(preds, skip_special_tokens=True)
        decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
        bleu_res = bleu.compute(predictions=decoded_preds, references=[[l] for l in decoded_labels])
        rouge_res = rouge.compute(predictions=decoded_preds, references=decoded_labels)
        return {"bleu": bleu_res.get("bleu", 0.0), "rougeL": rouge_res.get("rougeL", 0.0)}

    trainer.add_callback(trainer.get_default_eval_callback(compute_metrics=compute_metrics))

    trainer.train()

    best_ckpt = Path(args.output) / "merged"
    best_ckpt.mkdir(parents=True, exist_ok=True)
    trainer.model.save_pretrained(best_ckpt)
    tokenizer.save_pretrained(best_ckpt)
    print(f"[train] saved merged checkpoint to {best_ckpt}")


if __name__ == "__main__":
    main()
