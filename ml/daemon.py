import logging

from engine.collector import DataCollector
from engine.server import start_inference_server

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    """Start only the inference API; training is disabled."""
    print("Starting SketchToCode API (inference via external model)...")
    collector = DataCollector(db_path="ml/data/collector.db")
    start_inference_server(collector=collector)


if __name__ == "__main__":
    main()
