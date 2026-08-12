#!/bin/bash
# SYNOPSIS: Shell script — Setup Signing.
# Creates the stable local code-signing identity Taloa is signed with, so macOS
# Accessibility and Screen Recording grants survive a rebuild.
#
# WHY THIS EXISTS
# Taloa was ad-hoc signed (`codesign --sign -`). An ad-hoc signature has no
# certificate, so macOS derives the app's designated requirement from the
# binary's own hash:
#
#     designated => cdhash H"ab724afa9d6f5bb..."
#
# TCC (the permissions database) stores that requirement alongside the grant.
# Recompiling changes one byte, changes the cdhash, and the grant silently stops
# matching -- the checkbox stays checked in System Settings while the app is
# refused. That is exactly the failure that burned days here: permissions were
# granted repeatedly and were dead again by the next build.
#
# Signing with a real certificate -- even a self-signed one -- changes the
# requirement to:
#
#     designated => identifier "org.hopkinsgroup.taloa.overlay"
#                   and certificate root = H"<cert hash>"
#
# which is stable across every future rebuild, because it names the signer
# rather than the bytes. Grant once, keep it.
#
# The identity lives in its own keychain rather than the login keychain on
# purpose: a key in the login keychain makes codesign block on a SecurityAgent
# password prompt (the partition list can only be modified with the login
# password), which cannot be automated. A dedicated keychain has a password we
# set here, so builds never prompt.
#
# Idempotent -- safe to re-run. Nothing here is secret: it is a self-signed
# local development identity with no authority beyond this machine.
set -euo pipefail

SIGN_DIR="$HOME/.taloa-signing"
KEYCHAIN="taloa.keychain"
KEYCHAIN_PATH="$HOME/Library/Keychains/$KEYCHAIN-db"
KEYCHAIN_PASSWORD_FILE="$SIGN_DIR/keychain-password"
CERT_NAME="Taloa Local Signing"

mkdir -p "$SIGN_DIR"
chmod 700 "$SIGN_DIR"

if [ ! -f "$KEYCHAIN_PASSWORD_FILE" ]; then
    umask 077
    /usr/bin/openssl rand -hex 24 > "$KEYCHAIN_PASSWORD_FILE"
fi
KEYCHAIN_PASSWORD="$(cat "$KEYCHAIN_PASSWORD_FILE")"

if [ ! -f "$SIGN_DIR/taloa-cert.pem" ]; then
    cat > "$SIGN_DIR/cert.cnf" <<'CNF'
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = Taloa Local Signing
O = Hopkins Group
[v3]
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
extendedKeyUsage = critical,codeSigning
CNF
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
        -keyout "$SIGN_DIR/taloa-key.pem" -out "$SIGN_DIR/taloa-cert.pem" \
        -config "$SIGN_DIR/cert.cnf" 2>/dev/null
    echo "Created certificate: $SIGN_DIR/taloa-cert.pem"
fi

# -legacy and the SHA-1 algorithms are required: OpenSSL 3 defaults to a PKCS#12
# MAC that macOS `security import` cannot verify ("MAC verification failed").
if [ ! -f "$SIGN_DIR/taloa.p12" ]; then
    openssl pkcs12 -export -legacy -macalg sha1 \
        -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES \
        -inkey "$SIGN_DIR/taloa-key.pem" -in "$SIGN_DIR/taloa-cert.pem" \
        -out "$SIGN_DIR/taloa.p12" -name "$CERT_NAME" -passout pass:taloa 2>/dev/null
fi

if [ ! -f "$KEYCHAIN_PATH" ]; then
    security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
    echo "Created keychain: $KEYCHAIN_PATH"
fi

# -u omitted deliberately: the keychain must not re-lock on sleep or a later
# build will start prompting again.
security set-keychain-settings "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"

if ! security find-identity -p codesigning "$KEYCHAIN" | grep -q "$CERT_NAME"; then
    security import "$SIGN_DIR/taloa.p12" -k "$KEYCHAIN" -P taloa -T /usr/bin/codesign -A
    security set-key-partition-list -S apple-tool:,apple:,codesign: \
        -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null 2>&1
fi

# codesign only searches the user's keychain list, so the new keychain has to
# join it -- while keeping every keychain that was already there.
if ! security list-keychains -d user | grep -q "$KEYCHAIN"; then
    EXISTING=$(security list-keychains -d user | sed -e 's/^[[:space:]]*"//' -e 's/"$//')
    # shellcheck disable=SC2086
    security list-keychains -d user -s "$KEYCHAIN_PATH" $EXISTING
fi

HASH=$(security find-certificate -c "$CERT_NAME" -Z "$KEYCHAIN" | awk '/SHA-1 hash:/ {print $3}')
if [ -z "$HASH" ]; then
    echo "FAILED: certificate not found in $KEYCHAIN after import" >&2
    exit 1
fi

echo "$HASH" > "$SIGN_DIR/identity-hash"
echo "Signing identity ready: $HASH ($CERT_NAME)"
echo "Grants bound to this identity survive rebuilds. Run build.sh to use it."
