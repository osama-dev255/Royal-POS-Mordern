#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment process..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null
then
    echo "Netlify CLI could not be found. Installing..."
    npm install -g netlify-cli
fi

echo "Building the project..."
npm run build

echo "Deploying to Netlify..."
netlify deploy --prod --dir=dist

echo "Deployment completed!"