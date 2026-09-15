#!/bin/sh
# DXN1-OS package build recipe: KDE Plasma Shell 6.1.4
# Optional desktop environment — install with: dxn1-pkg install plasma-shell
# https://kde.org/plasma-desktop/
set -e

PKG="plasma-shell"
VER="6.1.4"

echo "[recipe] building ${PKG}-${VER} (optional desktop)..."

DEPENDS="xorg-server wayland pipewire mesa fontconfig noto-fonts qt6"
echo "    dependencies: $DEPENDS"

# KDE Plasma core components
COMPONENTS="
    qtbase-6.7.2
    qtdeclarative-6.7.2
    plasma-desktop-6.1.4
    plasma-workspace-6.1.4
    kwin-6.1.4
    sddm-0.21.0
    dolphin-24.05.2
    konsole-24.05.2
    kate-24.05.2
    plasma-systemmonitor-6.1.4
    discover-6.1.4
"

for comp in $COMPONENTS; do
    name="${comp%-*}"
    ver="${comp##*-}"
    echo "    staging $name-$ver..."
    SRC="/var/cache/dxn1-pkg/plasma/${comp}.tar.xz"
    if [ -f "$SRC" ]; then
        tar xf "$SRC" -C "$DESTDIR/"
    else
        echo "      (prebuilt artifact expected at $SRC — run build.sh --stage 04)"
    fi
done

# default desktop marker
mkdir -p "$DESTDIR/etc/dxn1"
echo "plasma" > "$DESTDIR/etc/dxn1/desktop-env"

# enable sddm (Simple Desktop Display Manager)
mkdir -p "$DESTDIR/etc/init.d"
cat > "$DESTDIR/etc/init.d/sddm" <<'EOF'
#!/bin/sh
case "$1" in
    start) /usr/bin/sddm ;;
    stop)  killall sddm ;;
    restart) $0 stop; sleep 1; $0 start ;;
    status) pgrep -x sddm > /dev/null && echo "running" || echo "stopped" ;;
esac
EOF
chmod +x "$DESTDIR/etc/init.d/sddm"

echo "[recipe] ${PKG}-${VER} staged (KDE Plasma desktop environment)"
echo "    set as default via: echo plasma > /etc/dxn1/desktop-env"
echo "    enable sddm:        /etc/init.d/sddm start"
