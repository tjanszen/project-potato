#!/bin/bash
echo "🚀 Starting Project Potato server..."
echo "Environment: NODE_ENV=${NODE_ENV:-development}"
echo "PORT from environment: ${PORT:-'not set'}"
exec node index.js
