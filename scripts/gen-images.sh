#!/bin/bash
# Generate DXN1-OS branding images
set -e
cd /home/z/my-project/public
mkdir -p dxn1-assets

echo "[1/3] Generating DXN1-OS logo..."
z-ai image \
  -p "Minimalist geometric operating system logo, hexagonal circuit emblem with a glowing emerald teal core, dark charcoal background, sharp vector style, futuristic terminal aesthetic, subtle amber accent ring, high quality, detailed, centered" \
  -o "./dxn1-assets/dxn1-logo.png" \
  -s 1024x1024

echo "[2/3] Generating boot splash wallpaper..."
z-ai image \
  -p "Dark futuristic operating system boot splash screen, deep black background with emerald green glowing circuit traces and hexagonal grid pattern, subtle amber particle accents, minimalist tech aesthetic, faint geometric OS symbol in center, cinematic lighting, high quality, detailed, 16:9 wallpaper" \
  -o "./dxn1-assets/dxn1-wallpaper.png" \
  -s 1440x720

echo "[3/3] Generating desktop screenshot..."
z-ai image \
  -p "Screenshot of a minimalist tiling window manager desktop on a custom Linux OS, dark charcoal interface, two terminal windows with emerald green monospace text, system monitor panel on the right with graphs, clean status bar at top showing CPU RAM network, professional dark theme, high quality, detailed, no readable text logos" \
  -o "./dxn1-assets/dxn1-desktop.png" \
  -s 1344x768

echo "Done generating all images."
ls -la ./dxn1-assets/
