import logging
import logging.handlers
import os
import sqlite3
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from .trainer import TrainingOrchestrator

logger = logging.getLogger(__name__)


class TrainingWatcher:
    def __init__(
        self,
        orchestrator: TrainingOrchestrator,
        collector=None,
        db_path: str = "ml/data/collector.db",
        interval_seconds: int = 600,
    ) -> None:
        self.orchestrator = orchestrator
        self.collector = collector
        self.db_path = Path(db_path)
        self.interval_seconds = interval_seconds
        self.lock_file = Path("ml/engine/TRAINING.lock")
        self.force_file = Path("ml/engine/FORCE_TRAIN")
        self.log_path = Path("ml/engine/watcher.log")
        self._setup_logging()

    def _setup_logging(self) -> None:
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.handlers.RotatingFileHandler(
            self.log_path, maxBytes=10 * 1024 * 1024, backupCount=3
        )
        fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
        handler.setFormatter(fmt)
        root = logging.getLogger("ml.watcher")
        root.setLevel(logging.INFO)
        root.addHandler(handler)

    def run(self) -> None:
        logger.info("TrainingWatcher started")
        while True:
            try:
                self._tick()
            except Exception:
                logger.exception("watcher tick failed")
            time.sleep(self.interval_seconds)

    def _tick(self) -> None:
        if self.lock_file.exists():
            logger.info("training already in progress; skipping tick")
            return

        if self.force_file.exists():
            logger.info("FORCE_TRAIN detected; triggering retrain")
            self.force_file.unlink(missing_ok=True)
            self._trigger("force_file")
            return

        pending = self._count_pending()
        last_training = self._last_training_time()
        if pending >= 500:
            logger.info("trigger retrain: %s pending >= 500", pending)
            self._trigger("pending>=500")
        elif pending >= 100 and last_training and datetime.utcnow() - last_training > timedelta(hours=24):
            logger.info("trigger retrain: %s pending and last_training>24h", pending)
            self._trigger("pending>=100_24h")

    def _trigger(self, reason: str) -> None:
        if self.lock_file.exists():
            logger.info("lock present on trigger; skip")
            return
        self.lock_file.parent.mkdir(parents=True, exist_ok=True)
        self.lock_file.write_text(reason, encoding="utf-8")
        threading.Thread(target=self.orchestrator.start_training, args=(reason,), daemon=True).start()

    def _count_pending(self) -> int:
        conn = sqlite3.connect(self.db_path)
        try:
            cur = conn.execute(
                "SELECT COUNT(*) FROM pairs WHERE used_in_training = 0 AND quality_score >= 0.3 AND poisoned = 0"
            )
            row = cur.fetchone()
            return int(row[0]) if row else 0
        finally:
            conn.close()

    def _last_training_time(self) -> Optional[datetime]:
        status_path = Path("ml/engine/training_status.json")
        if not status_path.exists():
            return None
        try:
            import json

            data = json.loads(status_path.read_text())
            ts = data.get("last_run")
            if ts:
                return datetime.fromisoformat(ts)
        except Exception:
            return None
        return None
