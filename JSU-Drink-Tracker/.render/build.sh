#!/bin/bash

echo "⚙️ Forcing build with Node.js (not Bun)..."

# Install dependencies with npm
npm install

# Run production build
npm run build
