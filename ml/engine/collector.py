import asyncio
import base64
import io
import json
import logging
import os
import sqlite3
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageDraw
from bs4 import BeautifulSoup
import re

logger = logging.getLogger(__name__)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def atomic_write(path: Path, data: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(data, encoding="utf-8")
    tmp.replace(path)


@dataclass
class CollectedPair:
    id: str
    image_path: Path
    html_path: Path
    quality_score: float
    used_in_training: int
    model_version: Optional[str]


class DataCollector:
    def __init__(
        self,
        db_path: str = "ml/data/collector.db",
        data_root: str = "ml/data",
        model_version: Optional[str] = None,
        event_sink: Optional[Callable[[Dict[str, str]], None]] = None,
    ) -> None:
        self.db_path = Path(db_path)
        self.data_root = Path(data_root)
        self.raw_img_dir = self.data_root / "raw" / "images"
        self.raw_html_dir = self.data_root / "raw" / "html"
        self.model_version = model_version
        self.event_sink = event_sink
        ensure_dir(self.db_path.parent)
        ensure_dir(self.raw_img_dir)
        ensure_dir(self.raw_html_dir)
        self._init_db()

    # ----------------------------- public API -----------------------------
    def handle_pair(self, image_base64: str, html: str, timestamp: Optional[float], session_id: Optional[str]) -> Dict[str, object]:
        pair_id = str(uuid.uuid4())
        image_path, html_path = self._persist_pair(pair_id, image_base64, html)
        score = self._score_pair(image_path, html)
        self._insert_db(pair_id, image_path, html_path, score)

        if score < 0.3:
            logger.info("pair %s rejected (score=%.3f)", pair_id, score)
        else:
            logger.info("pair %s accepted (score=%.3f)", pair_id, score)

        event = {
            "id": pair_id,
            "score": score,
            "timestamp": timestamp,
            "session_id": session_id,
            "image_path": str(image_path),
        }
        if self.event_sink:
            try:
                self.event_sink(event)
            except Exception:
                logger.exception("failed to emit event")

        return {"id": pair_id, "quality_score": score}

    def bootstrap_if_needed(self, target: int = 2000, threshold: int = 1000) -> None:
        count = self._count_pairs()
        if count >= threshold:
            return
        synthetic_needed = max(0, target - count)
        logger.info("bootstrapping synthetic data: %s pairs", synthetic_needed)
        rows: List[Tuple[str, str, float]] = []
        for _ in range(synthetic_needed):
            pid, img_path, html_path = self._generate_synthetic_pair()
            rows.append((pid, str(img_path), str(html_path), 0.7))
        self._bulk_insert(rows)
        logger.info("Bootstrap complete: %s synthetic pairs loaded", synthetic_needed)

    # ----------------------------- internals -----------------------------
    def _init_db(self) -> None:
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS pairs (
                    id TEXT PRIMARY KEY,
                    image_path TEXT,
                    html_path TEXT,
                    quality_score REAL,
                    used_in_training INTEGER DEFAULT 0,
                    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    model_version TEXT,
                    poisoned INTEGER DEFAULT 0
                )
                """
            )
            conn.commit()
        finally:
            conn.close()

    def _count_pairs(self) -> int:
        conn = sqlite3.connect(self.db_path)
        try:
            cur = conn.execute("SELECT COUNT(*) FROM pairs")
            row = cur.fetchone()
            return int(row[0]) if row else 0
        finally:
            conn.close()

    def _persist_pair(self, pair_id: str, image_base64: str, html: str) -> Tuple[Path, Path]:
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_path = self.raw_img_dir / f"{pair_id}.png"
        html_path = self.raw_html_dir / f"{pair_id}.html"
        image.save(img_path, format="PNG")
        atomic_write(html_path, html)
        return img_path, html_path

    def _insert_db(self, pair_id: str, image_path: Path, html_path: Path, score: float) -> None:
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute(
                "INSERT OR REPLACE INTO pairs (id, image_path, html_path, quality_score, used_in_training, model_version, poisoned) VALUES (?, ?, ?, ?, 0, ?, 0)",
                (pair_id, str(image_path), str(html_path), float(score), self.model_version),
            )
            conn.commit()
        finally:
            conn.close()

    def _bulk_insert(self, rows: List[Tuple[str, str, str, float]]) -> None:
        conn = sqlite3.connect(self.db_path)
        try:
            conn.executemany(
                "INSERT OR REPLACE INTO pairs (id, image_path, html_path, quality_score, used_in_training, model_version, poisoned) VALUES (?, ?, ?, ?, 0, ?, 0)",
                [(pid, img, html, score, self.model_version) for pid, img, html, score in rows],
            )
            conn.commit()
        finally:
            conn.close()

    def _score_pair(self, image_path: Path, html: str) -> float:
        scores: Dict[str, float] = {}

        # Image complexity
        img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
        laplacian_var = cv2.Laplacian(img, cv2.CV_64F).var() if img is not None else 0.0
        scores["image_complexity"] = min(1.0, laplacian_var / 500.0)

        # Length
        length = len(html)
        if length < 200:
            scores["length"] = 0.0
        elif length < 500:
            scores["length"] = 0.5
        elif length < 8000:
            scores["length"] = 1.0
        else:
            scores["length"] = 0.7

        # Tailwind usage
        tailwind_classes = re.findall(r'class="([^"]*)"', html)
        all_classes = " ".join(tailwind_classes).split()
        tw_pattern = re.compile(r"^(bg|text|flex|grid|p|m|w|h|rounded|border|shadow|font|items|justify|gap|space|col|row|max|min|overflow|z|top|left|right|bottom|absolute|relative|fixed|block|inline|hidden|hover|focus|sm|md|lg|xl|dark)[-:]")
        tw_count = sum(1 for c in all_classes if tw_pattern.match(c))
        scores["tailwind"] = min(1.0, tw_count / 20.0)

        # HTML validity
        try:
            soup = BeautifulSoup(html, "html.parser")
            scores["valid"] = 1.0 if soup.find("body") or soup.find("div") else 0.5
        except Exception:
            scores["valid"] = 0.0

        # Structure
        semantic_tags = ["nav", "main", "section", "footer", "header", "article", "aside"]
        found = sum(1 for tag in semantic_tags if f"<{tag}" in html.lower())
        scores["structure"] = min(1.0, found / 3.0)

        final = (
            scores["image_complexity"] * 0.30
            + scores["length"] * 0.20
            + scores["tailwind"] * 0.25
            + scores["valid"] * 0.15
            + scores["structure"] * 0.10
        )
        return round(max(0.0, min(1.0, final)), 4)

    def _generate_synthetic_pair(self) -> Tuple[str, Path, Path]:
        pid = str(uuid.uuid4())
        img = Image.new("RGB", (512, 512), color=(245, 246, 250))
        draw = ImageDraw.Draw(img)
        for i in range(8):
            x0, y0 = np.random.randint(20, 400), np.random.randint(20, 400)
            w, h = np.random.randint(60, 180), np.random.randint(40, 160)
            draw.rectangle([x0, y0, x0 + w, y0 + h], outline=(60, 60, 80), width=3)
        html = "<!DOCTYPE html><html><head><script src='https://cdn.tailwindcss.com'></script></head><body class='bg-slate-50 text-slate-900'><main class='max-w-4xl mx-auto p-8 space-y-4'>"  # noqa: E501
        for i in range(5):
            html += f"<section class='border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4'><div class='w-16 h-16 rounded-xl bg-slate-200'></div><div class='flex-1 space-y-2'><div class='h-4 bg-slate-200 rounded w-3/4'></div><div class='h-3 bg-slate-100 rounded w-1/2'></div></div><button class='px-4 py-2 rounded-lg bg-blue-600 text-white'>Action {i}</button></section>"  # noqa: E501
        html += "</main></body></html>"
        img_path = self.raw_img_dir / f"{pid}.png"
        html_path = self.raw_html_dir / f"{pid}.html"
        img.save(img_path, format="PNG")
        atomic_write(html_path, html)
        return pid, img_path, html_path


async def forward_to_collector(url: str, payload: Dict[str, object], timeout: float = 10.0) -> Dict[str, object]:
    import httpx

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()
