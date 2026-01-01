#!/bin/bash
BASE="https://raw.githubusercontent.com/LimitlessOI/Lumin-LifeOS/main/%E2%80%A2%20Lumin-Memory/00_INBOX/raw"
DIR="• Lumin-Memory/00_INBOX/raw"
mkdir -p "$DIR"

FILES=(
  "DeepSeek dump 001"
  "GPT dump 01"
  "GPT dump 02"
  "GPT dump 03"
  "GPT dump 04"
  "GPT dump 05"
  "GPT dump 06"
  "Gemini Dump 001"
  "Gemini Dump 002"
  "Gemini Dump 003"
  "Gemini Dump 004"
  "Grok dump 001"
  "LifeOS_LimitlessOS dump 001"
  "LifeOS_LimitlessOS dump 002"
  "LifeOS_LimitlessOS dump 003"
  "Mission & North Star"
  "Directives and ideas log.md"
)

for FILE in "${FILES[@]}"; do
  echo "Downloading: $FILE"
  ENCODED=$(echo "$FILE" | sed 's/ /%20/g')
  curl -sL "$BASE/$ENCODED" -o "$DIR/$FILE"
done

echo "Done! Downloaded ${#FILES[@]} files"
ls -la "$DIR"
