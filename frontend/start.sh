#!/bin/bash
# Start the ChristopherOS frontend
cd "$(dirname "$0")"

echo " Starting ChristopherOS Frontend..."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo " Starting React on http://0.0.0.0:5173"
npm run dev