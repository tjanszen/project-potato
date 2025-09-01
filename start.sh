#!/bin/bash
echo "Starting Project Potato server..."
echo "Compiling TypeScript..."
npx tsc server/index.ts --outDir . --esModuleInterop --moduleResolution node --target es2020 --module commonjs --lib es2020
echo "Starting server..."
node server/index.js