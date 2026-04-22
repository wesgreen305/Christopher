#!/bin/bash
# Start the ChristopherOS backend
cd "$(dirname "$0")"

echo "🌿 Starting ChristopherOS Backend..."

# Create virtual env if needed
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q

echo "✅ Starting FastAPI on http://0.0.0.0:8000"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload