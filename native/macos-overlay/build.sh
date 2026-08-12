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

swiftc -O OverlayWindow.swift TaloaLog.swift ShowLayer.swift TaloaImageCharacterView.swift \
    ContainerView.swift ScreenControl.swift ScreenControlCommands.swift main.swift \
    -o "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

cp Info.plist "$APP_BUNDLE/Contents/Info.plist"
cp Assets/TaloaCharacter.png "$APP_BUNDLE/Contents/Resources/TaloaCharacter.png"
cp Assets/TaloaCharacterBlink.png "$APP_BUNDLE/Contents/Resources/TaloaCharacterBlink.png"
cp Assets/TaloaCharacterSpeak.png "$APP_BUNDLE/Contents/Resources/TaloaCharacterSpeak.png"

# Sign with the stable local identity if it exists. This is not cosmetic: an
# ad-hoc signature makes the app's designated requirement a hash of the binary,
# so every rebuild reads as a different app and silently voids the
# Accessibility and Screen Recording grants. See setup-signing.sh.
SIGN_DIR="$HOME/.taloa-signing"
if [ -f "$SIGN_DIR/identity-hash" ] && [ -f "$SIGN_DIR/keychain-password" ]; then
    security unlock-keychain -p "$(cat "$SIGN_DIR/keychain-password")" taloa.keychain 2>/dev/null || true
    codesign --force --deep --sign "$(cat "$SIGN_DIR/identity-hash")" "$APP_BUNDLE"
    echo "Signed with stable identity (permissions survive this rebuild)"
else
    codesign --force --deep --sign - "$APP_BUNDLE"
    echo "WARNING: ad-hoc signed -- every rebuild voids granted permissions."
    echo "         Run ./setup-signing.sh once to fix this permanently."
fi

echo "Built: $APP_BUNDLE"
