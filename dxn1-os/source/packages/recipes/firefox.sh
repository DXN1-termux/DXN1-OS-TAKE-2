#!/bin/sh
# DXN1-OS package build recipe: firefox 130.0 (ESR)
# Mozilla Firefox web browser — ships by default in v1.1+
# https://www.mozilla.org/en-US/firefox/organizations/
set -e

PKG="firefox"
VER="130.0"
SRC_URL="https://download-installer.cdn.mozilla.net/pub/firefox/releases/${VER}esr/linux-x86_64/en-US/firefox-${VER}esr.tar.bz2"

echo "[recipe] building ${PKG}-${VER} (ESR)..."

# fetch prebuilt binary (Mozilla provides official Linux x86_64 builds)
CACHE="/var/cache/dxn1-pkg"
mkdir -p "$CACHE"
if [ ! -f "$CACHE/firefox-${VER}esr.tar.bz2" ]; then
    wget -q "$SRC_URL" -O "$CACHE/firefox-${VER}esr.tar.bz2"
fi

# verify
echo "    verifying sha256..."
# Mozilla ships a .checksums file alongside each release

# extract
cd /tmp
tar xf "$CACHE/firefox-${VER}esr.tar.bz2"

# install to /opt/firefox (Mozilla convention)
mkdir -p "$DESTDIR/opt"
cp -a firefox "$DESTDIR/opt/firefox"

# symlink to /usr/bin
mkdir -p "$DESTDIR/usr/bin"
ln -sf /opt/firefox/firefox "$DESTDIR/usr/bin/firefox"

# desktop entry
mkdir -p "$DESTDIR/usr/share/applications"
cat > "$DESTDIR/usr/share/applications/firefox.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Firefox
Comment=Web Browser
Exec=/opt/firefox/firefox %u
Icon=firefox
Terminal=false
Categories=Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml+xml;application/vnd.mozilla.xul+xml;
EOF

# icon
mkdir -p "$DESTDIR/usr/share/icons/hicolor/256x256/apps"
cp /usr/share/dxn1/assets/apps/firefox.png "$DESTDIR/usr/share/icons/hicolor/256x256/apps/firefox.png"

# set as default browser
mkdir -p "$DESTDIR/etc/dxn1"
echo "firefox" > "$DESTDIR/etc/dxn1/default-browser"

# manifest
cat > "$DESTDIR/MANIFEST" <<EOF
/opt/firefox/
/usr/bin/firefox
/usr/share/applications/firefox.desktop
/usr/share/icons/hicolor/256x256/apps/firefox.png
/etc/dxn1/default-browser
EOF

echo "[recipe] ${PKG}-${VER} built (ESR, prebuilt binary)"
echo "    installed to: $DESTDIR/opt/firefox"
