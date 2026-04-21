#!/bin/bash
echo "Building..."
npm run build
echo "Deploying to surge..."
surge dist broad-aunt.surge.sh
echo "Done! Open https://broad-aunt.surge.sh on iPad"
