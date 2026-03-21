import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)


class FeedbackManager:
    def __init__(self, db_path: Path) -> None:
        self.db_path = Path(db_path)
        self.counter = 0

    def handle_feedback(self, generation_id: str, rating: str, html: str, image_b64: str) -> None:
        conn = sqlite3.connect(self.db_path)
        try:
            cur = conn.execute("SELECT quality_score FROM pairs WHERE id = ?", (generation_id,))
            row = cur.fetchone()
            if not row:
                return
            score = float(row[0])
            if rating == "good":
                score = min(1.0, score + 0.2)
            else:
                score = max(0.0, score - 0.3)
            poisoned = 1 if rating == "bad" and score < 0.1 else 0
            conn.execute(
                "UPDATE pairs SET quality_score = ?, poisoned = ? WHERE id = ?",
                (score, poisoned, generation_id),
            )
            conn.commit()
            self.counter += 1
            if self.counter >= 20:
                Path("ml/engine/FORCE_TRAIN").write_text("feedback_trigger", encoding="utf-8")
                self.counter = 0
        finally:
            conn.close()
