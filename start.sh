#!/bin/bash

# Exit immediately if a command fails
set -e

echo "🔧 Installing dependencies..."
npm install --legacy-peer-deps

echo "🏗️  Building Next.js app..."
npm run build

echo "🚀 Starting Next.js server..."
npm start
