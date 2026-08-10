#!/bin/bash
# SYNOPSIS: Shell script — Build.
# Builds Taloa.app -- a real, launchable macOS app bundle for the floating
# overlay. See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="Taloa"
BUILD_DIR="build"
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

swiftc -O OverlayWindow.swift TaloaImageCharacterView.swift ContainerView.swift main.swift \
    -o "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

cp Info.plist "$APP_BUNDLE/Contents/Info.plist"
cp Assets/TaloaCharacter.png "$APP_BUNDLE/Contents/Resources/TaloaCharacter.png"

# Ad-hoc signature -- no Developer ID needed for local use; makes Gatekeeper
# and SMAppService registration behave like a normal installed app instead
# of an unsigned loose binary.
codesign --force --deep --sign - "$APP_BUNDLE"

echo "Built: $APP_BUNDLE"
