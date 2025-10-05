#!/bin/bash

sleep 10

xset s off
xset -dpms
xset s noblank

unclutter -idle 5 &

URL="https://localhost"

chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --fast \
  --fast-start \
  --disable-features=TranslateUI \
  --disk-cache-dir=/dev/null \
  --overscroll-history-navigation=0 \
  --disable-pinch \
  "$URL"