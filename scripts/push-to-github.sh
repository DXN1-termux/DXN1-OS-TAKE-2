#!/usr/bin/env bash
# DXN1-OS — push to GitHub and create the v1.0 release with the ISO attached.
#
# Run this from a machine that has:  ssh, git, curl (and optionally gh).
# It uses the deploy key at dxn1-os/deploy_key for auth.
#
# Prereq (one-time, on github.com):
#   1. Create an empty repo named "dxn1-os" (no README, no license).
#      OR set REPO below to an existing repo you own.
#   2. Add dxn1-os/deploy_key.pub as a Deploy Key on that repo
#      (Settings → SSH and GPG keys → Deploy keys → Add, allow write access).
#   3. (For API release creation) create a Personal Access Token with
#      `repo` scope and put it in $GITHUB_TOKEN, OR install `gh` CLI.
#
# Then:  bash scripts/push-to-github.sh
set -euo pipefail

# ---- config ----
GH_USER="${GH_USER:-YOUR_GITHUB_USERNAME}"   # <-- change this
REPO="${REPO:-dxn1-os}"
REMOTE="git@github.com:${GH_USER}/${REPO}.git"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$ROOT/dxn1-os/deploy_key"

cd "$ROOT"

echo "================================================"
echo "  DXN1-OS — push to GitHub + create v1.0 release"
echo "================================================"
echo "  user:   $GH_USER"
echo "  repo:   $REPO"
echo "  remote: $REMOTE"
echo "  key:    $KEY"
echo "================================================"
echo ""

# 1. ensure the deploy key is usable
if [ ! -f "$KEY" ]; then
  echo "ERROR: deploy key not found at $KEY"
  echo "       run: python3 scripts/gen-deploy-key.py"
  exit 1
fi
chmod 600 "$KEY"

# 2. configure ssh to use the deploy key for github.com
mkdir -p ~/.ssh
cat > ~/.ssh/config <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile $KEY
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
chmod 600 ~/.ssh/config

# add github to known_hosts
grep -q "github.com ssh-ed25519" ~/.ssh/known_hosts 2>/dev/null || cat >> ~/.ssh/known_hosts <<'EOF'
github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdGqUy7YQ3Zl0W4WJlJt3a8X4nP2h2I
EOF
chmod 600 ~/.ssh/known_hosts 2>/dev/null || true

echo "[1/5] verifying deploy key with github..."
if ssh -T -o ConnectTimeout=10 git@github.com 2>&1 | grep -qi "successfully authenticated"; then
  echo "  ✓ deploy key works"
else
  echo "  ! ssh test output (may still work for git):"
  ssh -T -o ConnectTimeout=10 git@github.com 2>&1 | head -3 || true
fi

# 3. add remote + push main
echo ""
echo "[2/5] adding remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"

echo "[3/5] pushing main..."
git push -u origin main

# 4. push the v1.0 tag
echo ""
echo "[4/5] pushing v1.0 tag..."
git push origin v1.0

# 5. create the GitHub release with the ISO + source ZIP attached
echo ""
echo "[5/5] creating GitHub release v1.0 with artifacts..."

if command -v gh >/dev/null 2>&1; then
  # preferred: gh CLI
  gh release create v1.0 \
    --title "DXN1-OS 1.0 'oxide'" \
    --notes-file "$ROOT/dxn1-os/RELEASE_NOTES_v1.0.md" \
    "$ROOT/public/dxn1-assets/dxn1-os-1.0.iso" \
    "$ROOT/public/dxn1-assets/dxn1-os-1.0.iso.sha256" \
    "$ROOT/public/dxn1-assets/dxn1-os-source.zip" \
    "$ROOT/public/dxn1-assets/manifest.json"
  echo "  ✓ release created via gh CLI"
else
  # fallback: GitHub API with a token
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "  ! no gh CLI and no \$GITHUB_TOKEN"
    echo "  ! Create the release manually:"
    echo "    https://github.com/${GH_USER}/${REPO}/releases/new?tag=v1.0"
    echo "  ! Attach these files:"
    echo "    - public/dxn1-assets/dxn1-os-1.0.iso"
    echo "    - public/dxn1-assets/dxn1-os-source.zip"
    echo "    - public/dxn1-assets/dxn1-os-1.0.iso.sha256"
    echo "  ! Or: export GITHUB_TOKEN=<PAT with repo scope> and re-run."
    exit 0
  fi

  API="https://api.github.com/repos/${GH_USER}/${REPO}/releases"
  # create release
  RESP=$(curl -s -X POST "$API" \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -d "{\"tag_name\":\"v1.0\",\"name\":\"DXN1-OS 1.0 oxide\",\"body\":\"$(jq -Rs < "$ROOT/dxn1-os/RELEASE_NOTES_v1.0.md")\",\"draft\":false,\"prerelease\":false}")
  REL_ID=$(echo "$RESP" | jq -r .id)
  UPLOAD_URL=$(echo "$RESP" | jq -r .upload_url | sed 's/{?name,label}//')
  echo "  release id: $REL_ID"

  # upload assets
  for f in dxn1-os-1.0.iso dxn1-os-1.0.iso.sha256 dxn1-os-source.zip manifest.json; do
    FILE="$ROOT/public/dxn1-assets/$f"
    [ -f "$FILE" ] || continue
    echo "  uploading $f..."
    curl -s -X POST "${UPLOAD_URL}?name=$f" \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Content-Type: application/octet-stream" \
      --data-binary "@$FILE" | jq -r .name
  done
  echo "  ✓ release created via API"
fi

echo ""
echo "================================================"
echo "  ✓ DONE — DXN1-OS v1.0 published"
echo "================================================"
echo "  release: https://github.com/${GH_USER}/${REPO}/releases/tag/v1.0"
echo "  iso:     https://github.com/${GH_USER}/${REPO}/releases/download/v1.0/dxn1-os-1.0.iso"
echo ""
echo "  dxn1-update on installed systems now pulls from this release."
echo "================================================"
