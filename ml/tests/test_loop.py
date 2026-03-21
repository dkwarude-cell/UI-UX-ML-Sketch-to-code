import base64
import io
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from engine.collector import DataCollector  # type: ignore  # noqa: E402
from engine.trainer import TrainingOrchestrator  # type: ignore  # noqa: E402


def test_training_loop(tmp_path, monkeypatch):
    db_path = tmp_path / "collector.db"
    data_root = tmp_path / "data"
    collector = DataCollector(db_path=str(db_path), data_root=str(data_root))

    # tiny white square
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(255, 255, 255)).save(buf, format="PNG")
    img_bytes = base64.b64encode(buf.getvalue())

    # insert synthetic pairs
    for _ in range(10):
        collector.handle_pair(img_bytes.decode(), "<html><body class='bg-slate-50'>ok</body></html>", None, "test")

    orch = TrainingOrchestrator(db_path=str(db_path))

    # stub out heavy parts
    def fake_sim(run_id, ckpt_dir, meta):
        ckpt_dir.mkdir(parents=True, exist_ok=True)
        (ckpt_dir / "done.txt").write_text("ok", encoding="utf-8")

    def fake_eval(run_id, ckpt, meta):
        return {"winner": "current", "delta": 0.0, "new_model_score": 0.5, "current_model_score": 0.5}

    monkeypatch.setattr(orch, "_simulate_training", fake_sim)
    monkeypatch.setattr(orch, "_evaluate_and_decide", fake_eval)

    orch.start_training(reason="test", use_process=False)

    status_path = Path("ml/engine/training_status.json")
    assert status_path.exists()
    data = status_path.read_text()
    assert "idle" in data
