#!/bin/bash
set -e
echo "=== SketchToCode ML Pipeline ==="
pip install -r ml/requirements.txt
python ml/scripts/01_collect_data.py --samples 10000
python ml/scripts/02_augment.py
python ml/scripts/03_tokenise.py
python ml/scripts/04_train.py
python ml/scripts/05_export.py
echo "=== Done. Start server with: python ml/scripts/06_serve.py ==="
