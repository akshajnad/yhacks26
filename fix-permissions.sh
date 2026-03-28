#!/bin/bash
echo "Fixing permissions. You may be prompted for your password."
sudo chown -R $(whoami):staff ~/.npm ./node_modules ./package-lock.json || true
sudo rm -rf ./node_modules ./package-lock.json || true
echo "Permissions fixed. You can now run 'npm install' without errors."
