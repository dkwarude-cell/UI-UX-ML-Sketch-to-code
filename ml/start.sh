#!/bin/bash
set -e
echo "Bootstrapping..."
pip install -r ml/requirements.txt -q
playwright install chromium
python ml/daemon.py
